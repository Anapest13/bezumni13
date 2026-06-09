import express from 'express';
import { createServer as createViteServer } from 'vite';
import mysql from 'mysql2/promise';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Set Cache-Control for all API requests to prevent stale data
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// MySQL Connection Pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: process.env.DB_SSL_CA ? {
    ca: process.env.DB_SSL_CA === 'true' ? undefined : process.env.DB_SSL_CA,
    rejectUnauthorized: false
  } : undefined,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Database Initialization
async function initDb() {
  if (!process.env.DB_HOST) {
    console.warn('DB_HOST not set. Skipping DB initialization.');
    return;
  }
  try {
    const connection = await pool.getConnection();
    console.log('Connected to MySQL database.');

    // 0. Users
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        phone VARCHAR(20) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        role ENUM('user', 'admin') DEFAULT 'user',
        bonus_balance DECIMAL(10, 2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Migration: Add email column if it doesn't exist (for existing databases)
    try {
      const [columns]: any = await connection.query("SHOW COLUMNS FROM users LIKE 'email'");
      if (columns.length === 0) {
        console.log('Adding email column to users table...');
        await connection.query('ALTER TABLE users ADD COLUMN email VARCHAR(255) UNIQUE NOT NULL AFTER phone');
      }
    } catch (err) {
      console.warn('Migration failed or column already exists');
    }

    // 1. Categories
    await connection.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE
      )
    `);

    // 2. Products
    await connection.query(`
      CREATE TABLE IF NOT EXISTS products (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        category_id INT,
        image_url TEXT,
        is_available BOOLEAN DEFAULT TRUE,
        FOREIGN KEY (category_id) REFERENCES categories(id)
      )
    `);

    // 3. Product Variants (Sizes/Weights and Prices)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS product_variants (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_id INT,
        size_label VARCHAR(50) NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      )
    `);

    // 4. Orders
    await connection.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        customer_name VARCHAR(255),
        customer_phone VARCHAR(50),
        total_amount DECIMAL(10, 2) NOT NULL,
        discount_amount DECIMAL(10, 2) DEFAULT 0,
        bonuses_used DECIMAL(10, 2) DEFAULT 0,
        promo_code VARCHAR(50),
        status ENUM('pending', 'preparing', 'ready', 'delivered', 'cancelled') DEFAULT 'pending',
        estimated_time INT DEFAULT 20,
        review TEXT,
        rating INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Migration: ensure columns exist for existing tables
    try {
      const [columns]: any = await connection.query("SHOW COLUMNS FROM orders LIKE 'promo_code'");
      if (columns.length === 0) {
        console.log('Adding promo_code column to orders table...');
        await connection.query('ALTER TABLE orders ADD COLUMN promo_code VARCHAR(50) AFTER bonuses_used');
      }
    } catch (err) {
      console.warn('Migration for orders promo_code failed or column already exists');
    }

    try {
      const [colsMethod]: any = await connection.query("SHOW COLUMNS FROM orders LIKE 'payment_method'");
      if (colsMethod.length === 0) {
        console.log('Adding payment_method column to orders table...');
        await connection.query("ALTER TABLE orders ADD COLUMN payment_method VARCHAR(50) DEFAULT 'cash' AFTER promo_code");
      }
    } catch (err) {
      console.warn('Migration for orders payment_method failed:', err);
    }

    try {
      const [colsPaid]: any = await connection.query("SHOW COLUMNS FROM orders LIKE 'is_paid'");
      if (colsPaid.length === 0) {
        console.log('Adding is_paid column to orders table...');
        await connection.query("ALTER TABLE orders ADD COLUMN is_paid TINYINT(1) DEFAULT 0 AFTER payment_method");
      }
    } catch (err) {
      console.warn('Migration for orders is_paid failed:', err);
    }

    try {
      const [colsPlatega]: any = await connection.query("SHOW COLUMNS FROM orders LIKE 'platega_transaction_id'");
      if (colsPlatega.length === 0) {
        console.log('Adding platega_transaction_id column to orders table...');
        await connection.query("ALTER TABLE orders ADD COLUMN platega_transaction_id VARCHAR(100) DEFAULT NULL AFTER is_paid");
      }
    } catch (err) {
      console.warn('Migration for orders platega_transaction_id failed:', err);
    }

    // 7. News/Carousel
    await connection.query(`
      CREATE TABLE IF NOT EXISTS news (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        content TEXT,
        image_url TEXT,
        type ENUM('promo', 'news') DEFAULT 'news',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Bootstrap Admin
    const [adminRows]: any = await connection.query("SELECT * FROM users WHERE role = 'admin'");
    if (adminRows.length === 0) {
      console.log('Bootstrapping admin account...');
      await connection.query(
        "INSERT INTO users (phone, email, password, name, role) VALUES (?, ?, ?, ?, ?)",
        ['+79999999999', 'admin@shawarma.cool', 'admin123', 'Администратор', 'admin']
      );
    }

    // 5. Order Items (Linked to Variants)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT,
        variant_id INT,
        quantity INT NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        customization TEXT, -- JSON string for removed/added ingredients
        FOREIGN KEY (order_id) REFERENCES orders(id),
        FOREIGN KEY (variant_id) REFERENCES product_variants(id)
      )
    `);

    // 6. Promo Codes
    await connection.query(`
      CREATE TABLE IF NOT EXISTS promo_codes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(50) UNIQUE NOT NULL,
        discount_percent INT NOT NULL,
        min_order_amount DECIMAL(10, 2) DEFAULT 0,
        usage_limit INT DEFAULT NULL,
        used_count INT DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE
      )
    `);

    // 7. Cities
    await connection.query(`
      CREATE TABLE IF NOT EXISTS cities (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE
      )
    `);

    // 8. Branches
    await connection.query(`
      CREATE TABLE IF NOT EXISTS branches (
        id INT AUTO_INCREMENT PRIMARY KEY,
        city_id INT,
        name VARCHAR(255) NOT NULL,
        address VARCHAR(255) NOT NULL,
        is_24_7 BOOLEAN DEFAULT TRUE,
        latitude DECIMAL(10, 8) NOT NULL DEFAULT 56.0153,
        longitude DECIMAL(11, 8) NOT NULL DEFAULT 92.8932,
        FOREIGN KEY (city_id) REFERENCES cities(id) ON DELETE SET NULL
      )
    `);

    // 9. Branch Variant Stock
    await connection.query(`
      CREATE TABLE IF NOT EXISTS branch_variant_stock (
        id INT AUTO_INCREMENT PRIMARY KEY,
        branch_id INT NOT NULL,
        variant_id INT NOT NULL,
        stock INT NOT NULL DEFAULT 100,
        FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
        FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE,
        UNIQUE KEY unique_branch_variant (branch_id, variant_id)
      )
    `);

    // Migration: ensure columns exist for existing tables
    // Promo Codes Migrations
    try {
      const [pcUsageCol]: any = await connection.query("SHOW COLUMNS FROM promo_codes LIKE 'usage_limit'");
      if (pcUsageCol.length === 0) {
        console.log('Adding usage columns to promo_codes...');
        await connection.query('ALTER TABLE promo_codes ADD COLUMN usage_limit INT DEFAULT NULL, ADD COLUMN used_count INT DEFAULT 0 AFTER min_order_amount');
      }
    } catch (e) {
      console.warn('Promo codes usage migration error/already exists:', e);
    }
    
    try {
      const [pcActiveCol]: any = await connection.query("SHOW COLUMNS FROM promo_codes LIKE 'is_active'");
      if (pcActiveCol.length === 0) {
        console.log('Adding is_active column to promo_codes...');
        await connection.query('ALTER TABLE promo_codes ADD COLUMN is_active BOOLEAN DEFAULT TRUE');
      }
    } catch (e) {
      console.warn('Promo codes is_active migration error/already exists:', e);
    }

    try {
      const [pcMinCol]: any = await connection.query("SHOW COLUMNS FROM promo_codes LIKE 'min_order_amount'");
      if (pcMinCol.length === 0) {
        console.log('Adding min_order_amount column to promo_codes...');
        await connection.query('ALTER TABLE promo_codes ADD COLUMN min_order_amount DECIMAL(10, 2) DEFAULT 0 AFTER discount_percent');
      }
    } catch (e) {
      console.warn('Promo codes min_order_amount migration error/already exists:', e);
    }

    // Orders Migrations
    try {
      const [orderPromoCol]: any = await connection.query("SHOW COLUMNS FROM orders LIKE 'promo_code'");
      if (orderPromoCol.length === 0) {
        console.log('Adding promo_code column to orders table...');
        await connection.query('ALTER TABLE orders ADD COLUMN promo_code VARCHAR(50) AFTER bonuses_used');
      }
    } catch (e) {
      console.warn('Orders promo_code migration error/already exists:', e);
    }

    try {
      const [orderEstCol]: any = await connection.query("SHOW COLUMNS FROM orders LIKE 'estimated_time'");
      if (orderEstCol.length === 0) {
        console.log('Adding estimated_time column to orders table...');
        await connection.query('ALTER TABLE orders ADD COLUMN estimated_time INT DEFAULT 20 AFTER status');
      }
    } catch (e) {
      console.warn('Orders estimated_time migration error/already exists:', e);
    }

    try {
      const [orderBranchCol]: any = await connection.query("SHOW COLUMNS FROM orders LIKE 'branch_id'");
      if (orderBranchCol.length === 0) {
        console.log('Adding branch_id column to orders table...');
        await connection.query('ALTER TABLE orders ADD COLUMN branch_id INT AFTER user_id');
        await connection.query('ALTER TABLE orders ADD CONSTRAINT fk_orders_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL');
      }
    } catch (e) {
      console.warn('Orders branch_id migration error/already exists:', e);
    }

    // Branches City ID Migration
    try {
      const [branchCityCol]: any = await connection.query("SHOW COLUMNS FROM branches LIKE 'city_id'");
      if (branchCityCol.length === 0) {
        console.log('Adding city_id column to branches table...');
        await connection.query('ALTER TABLE branches ADD COLUMN city_id INT AFTER id');
        await connection.query('ALTER TABLE branches ADD CONSTRAINT fk_branches_city FOREIGN KEY (city_id) REFERENCES cities(id) ON DELETE SET NULL');
      }
    } catch (e) {
      console.warn('Branches city_id migration error/already exists:', e);
    }

    // News/Promo branch_id Migrations
    try {
      const [newsBranchCol]: any = await connection.query("SHOW COLUMNS FROM news LIKE 'branch_id'");
      if (newsBranchCol.length === 0) {
        console.log('Adding branch_id column to news table...');
        await connection.query('ALTER TABLE news ADD COLUMN branch_id INT AFTER image_url');
        await connection.query('ALTER TABLE news ADD CONSTRAINT fk_news_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE');
      }
    } catch (e) {
      console.warn('News branch_id migration error/already exists:', e);
    }

    try {
      const [promoBranchCol]: any = await connection.query("SHOW COLUMNS FROM promo_codes LIKE 'branch_id'");
      if (promoBranchCol.length === 0) {
        console.log('Adding branch_id column to promo_codes table...');
        await connection.query('ALTER TABLE promo_codes ADD COLUMN branch_id INT AFTER min_order_amount');
        await connection.query('ALTER TABLE promo_codes ADD CONSTRAINT fk_promo_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE');
      }
    } catch (e) {
      console.warn('Promo codes branch_id migration error/already exists:', e);
    }

    // Cities Latitude/Longitude Migrations
    try {
      const [cityLatCol]: any = await connection.query("SHOW COLUMNS FROM cities LIKE 'latitude'");
      if (cityLatCol.length === 0) {
        console.log('Adding latitude and longitude columns to cities table...');
        await connection.query('ALTER TABLE cities ADD COLUMN latitude DECIMAL(10, 8) DEFAULT NULL, ADD COLUMN longitude DECIMAL(11, 8) DEFAULT NULL');
        // Update existing Красноярск coordinates if present
        await connection.query("UPDATE cities SET latitude = 56.0153, longitude = 92.8932 WHERE name = 'Красноярск'");
      }
    } catch (e) {
      console.warn('Cities latitude/longitude migration error/already exists:', e);
    }

    // Seed cities and branches
    try {
      // Seed cities
      const [cityCount]: any = await connection.query('SELECT COUNT(*) as count FROM cities');
      if (cityCount[0].count === 0) {
        console.log('Seeding initial cities...');
        await connection.query("INSERT INTO cities (name, latitude, longitude) VALUES ('Красноярск', 56.0153, 92.8932)");
      }

      // Always get Krasnoyarsk ID
      const [krasnoyarskIdRow]: any = await connection.query("SELECT id FROM cities WHERE name = 'Красноярск' LIMIT 1");
      const kCityId = krasnoyarskIdRow[0]?.id;

      // Seed branches
      const [branchCount]: any = await connection.query('SELECT COUNT(*) as count FROM branches');
      if (branchCount[0].count === 0 && kCityId) {
        console.log('Seeding initial branches...');
        await connection.query(`
          INSERT INTO branches (city_id, name, address, is_24_7, latitude, longitude) VALUES 
          (?, 'Филиал Центр', 'пр. Мира, 85', TRUE, 56.012356, 92.868512),
          (?, 'Филиал Взлетка', 'ул. Весны, 16', FALSE, 56.038541, 92.915234),
          (?, 'Филиал Свободный', 'пр. Свободный, 48', TRUE, 56.021423, 92.798541),
          (?, 'Филиал на Красноярском Рабочем', 'проспект имени газеты Красноярский Рабочий, 127', TRUE, 55.9928, 92.9510)
        `, [kCityId, kCityId, kCityId, kCityId]);
      } else if (kCityId) {
        // Assign Krasnoyarsk to existing branches with NULL city_id
        await connection.query('UPDATE branches SET city_id = ? WHERE city_id IS NULL', [kCityId]);

        // Check if Krasnoyarsky Rabochiy branch exists, if not seed it!
        const [krasRabBranch]: any = await connection.query("SELECT id FROM branches WHERE address LIKE '%Красноярский Рабочий, 127%' LIMIT 1");
        if (krasRabBranch.length === 0) {
          console.log('Seeding Krasnoyarsky Rabochiy branch...');
          await connection.query(`
            INSERT INTO branches (city_id, name, address, is_24_7, latitude, longitude) VALUES 
            (?, 'Филиал на Красноярском Рабочем', 'проспект имени газеты Красноярский Рабочий, 127', TRUE, 55.9928, 92.9510)
          `, [kCityId]);
        }
      }

      // Initialize stock for all combinations
      await connection.query(`
        INSERT IGNORE INTO branch_variant_stock (branch_id, variant_id, stock)
        SELECT b.id, pv.id, IF(p.category_id = (SELECT id FROM categories WHERE name = 'Напитки' LIMIT 1), 15, 100)
        FROM branches b
        CROSS JOIN product_variants pv
        JOIN products p ON pv.product_id = p.id
      `);
    } catch (e) {
      console.warn('Seeding/stocks migration error:', e);
    }

    // SEEDING DATA FROM THE IMAGE
    const [catRows]: any = await connection.query('SELECT COUNT(*) as count FROM categories');
    if (catRows[0].count === 0) {
      console.log('Seeding database with menu data...');
      
      // Categories
      const categories = ['Шаурма', 'Добавки', 'Снеки', 'Напитки'];
      for (const cat of categories) {
        await connection.query('INSERT INTO categories (name) VALUES (?)', [cat]);
      }

      const getCatId = async (name: string) => {
        const [rows]: any = await connection.query('SELECT id FROM categories WHERE name = ?', [name]);
        return rows[0].id;
      };

      const shaurmaId = await getCatId('Шаурма');
      const addId = await getCatId('Добавки');
      const snackId = await getCatId('Снеки');
      const drinkId = await getCatId('Напитки');

      // Helper to add product with variants
      const addProd = async (catId: number, name: string, desc: string, variants: {s: string, p: number}[], imageUrl?: string) => {
        const [res]: any = await connection.query(
          'INSERT INTO products (category_id, name, description, image_url) VALUES (?, ?, ?, ?)',
          [catId, name, desc, imageUrl || `https://picsum.photos/seed/${encodeURIComponent(name)}/400/300`]
        );
        const pid = res.insertId;
        for (const v of variants) {
          await connection.query('INSERT INTO product_variants (product_id, size_label, price) VALUES (?, ?, ?)', [pid, v.s, v.p]);
        }
      };

      // SHAURMA
      await addProd(shaurmaId, 'Фирменная', 'Мясо цыпленка, ароматный лаваш, фирменный соус, томаты, свежий огурец, салат капустный', [
        {s: '300г', p: 220}, {s: '400г', p: 260}, {s: '500г', p: 290}
      ]);
      await addProd(shaurmaId, 'Пикантная', 'Мясо цыпленка, ароматный лаваш, фирменный соус, томаты, свежий огурец, салат капустный, перец халапеньо', [
        {s: '300г', p: 230}, {s: '400г', p: 270}, {s: '500г', p: 310}
      ]);
      await addProd(shaurmaId, 'Сырная', 'Мясо цыпленка, ароматный лаваш, фирменный соус, томаты, свежий огурец, салат капустный, сливочный сыр', [
        {s: '300г', p: 250}, {s: '400г', p: 295}, {s: '500г', p: 340}
      ]);
      await addProd(shaurmaId, 'Гавайская', 'Мясо цыпленка, ароматный лаваш, фирменный соус, сливочный сыр, нежная моцарелла, сочный ананас', [
        {s: '300г', p: 270}, {s: '400г', p: 320}, {s: '500г', p: 390}
      ]);
      await addProd(shaurmaId, 'Арабская', 'Мясо цыпленка, ароматный лаваш, фирменный соус, томаты, сочный гранат, картофель фри, маринованные огурчики', [
        {s: '300г', p: 270}, {s: '400г', p: 320}, {s: '500г', p: 390}
      ]);
      await addProd(shaurmaId, 'Вегетарианская', 'Ароматный лаваш, фирменный соус, томаты, свежий огурец, салат капустный, картофель фри', [
        {s: '300г', p: 195}, {s: '400г', p: 235}, {s: '500г', p: 275}
      ], 'https://www.google.com/url?sa=E&q=https%3A%2F%2Fsun9-54.userapi.com%2Fs%2Fv1%2Fig2%2F4XT1yEBVGU1cQA6VXHaYoxbU8t2eo30sOoM4W4MjtlaNW-S-PL_OFz1omJb3HFqmqH26XOe63JoNA6drRI75cth8.jpg%3Fquality%3D95%26as%3D32x32%2C48x48%2C72x72%2C108x108%2C160x160%2C240x240%2C360x360%2C480x480%2C540x540%2C640x640%2C720x720%2C1080x1080%2C1280x1279%2C1440x1439%2C2500x2499%26from%3Dbu%26u%3DgImAhdZfraPYi3Hksh5uLtJnNqTJpQ4G96VBTF7Km_g%26cs%3D540x0');
      await addProd(shaurmaId, 'Кавказская', 'Мясо цыпленка, ароматный лаваш, фирменный соус, томаты, маринованные огурчики и лук, картофель фри', [
        {s: '300г', p: 240}, {s: '400г', p: 285}, {s: '500г', p: 330}
      ]);

      // ADD-ONS
      await addProd(addId, 'Шрирача', 'Острый соус', [{s: '8г', p: 20}, {s: '12г', p: 30}, {s: '16г', p: 40}]);
      await addProd(addId, 'Халапеньо', 'Острый перец', [{s: '10г', p: 20}, {s: '20г', p: 30}, {s: '30г', p: 40}]);
      await addProd(addId, 'Сыр', 'Дополнительный сыр', [{s: '30г', p: 40}, {s: '40г', p: 50}, {s: '50г', p: 60}]);
      await addProd(addId, 'Картофель фри (добавка)', 'Внутрь шаурмы', [{s: '20г', p: 20}, {s: '30г', p: 30}, {s: '40г', p: 40}]);
      await addProd(addId, 'Мясо цыпленка (добавка)', 'Дополнительная порция мяса', [{s: '20г', p: 40}]);
      await addProd(addId, 'Лук маринованный', 'Для вкуса', [{s: '10г', p: 15}]);
      await addProd(addId, 'Морковча', 'Корейская морковь', [{s: '20г', p: 30}, {s: '30г', p: 40}, {s: '40г', p: 50}]);

      // SNACKS
      await addProd(snackId, 'Картофель фри', 'Хрустящий картофель', [{s: '100г', p: 120}]);
      await addProd(snackId, 'Картошечка по-деревенски', 'Специи и чеснок', [{s: '100г', p: 120}]);
      await addProd(snackId, 'Наггетсы', 'Куриное филе в панировке', [{s: '100г', p: 130}]);
      await addProd(snackId, 'Соус', 'Барбекю/горчичный/кисло-сладкий/сырный', [{s: '20г', p: 55}]);

      // DRINKS
      await addProd(drinkId, 'Кола', 'Освежающий напиток', [{s: '0.33л', p: 110}, {s: '0.5л', p: 120}]);
      await addProd(drinkId, 'Фанта', 'Апельсиновый вкус', [{s: '0.33л', p: 110}, {s: '0.5л', p: 120}]);
      await addProd(drinkId, 'Спрайт', 'Лимон-лайм', [{s: '0.33л', p: 110}, {s: '0.5л', p: 120}]);
      await addProd(drinkId, 'Морс', 'Ягодный домашний', [{s: '0.5л', p: 130}]);

      await connection.query(
        'UPDATE products SET image_url = ? WHERE name = ?',
        ['https://www.google.com/url?sa=E&q=https%3A%2F%2Fsun9-54.userapi.com%2Fs%2Fv1%2Fig2%2F4XT1yEBVGU1cQA6VXHaYoxbU8t2eo30sOoM4W4MjtlaNW-S-PL_OFz1omJb3HFqmqH26XOe63JoNA6drRI75cth8.jpg%3Fquality%3D95%26as%3D32x32%2C48x48%2C72x72%2C108x108%2C160x160%2C240x240%2C360x360%2C480x480%2C540x540%2C640x640%2C720x720%2C1080x1080%2C1280x1279%2C1440x1439%2C2500x2499%26from%3Dbu%26u%3DgImAhdZfraPYi3Hksh5uLtJnNqTJpQ4G96VBTF7Km_g%26cs%3D540x0', 'Вегетарианская']
      );
      console.log('Seeding complete.');
    }

    connection.release();
    console.log('Database tables initialized and ready.');
  } catch (err) {
    console.error('Error initializing database:', err);
  }
}

initDb();

// API Routes

// Auth
app.post('/api/auth/register', async (req, res) => {
  const { phone, email, password, name } = req.body;
  console.log('Register attempt:', { phone, email, name });
  try {
    // In a real app, hash the password!
    const [result]: any = await pool.query(
      'INSERT INTO users (phone, email, password, name) VALUES (?, ?, ?, ?)',
      [phone, email, password, name]
    );
    const [user]: any = await pool.query('SELECT id, phone, email, name, role, bonus_balance FROM users WHERE id = ?', [result.insertId]);
    res.status(201).json(user[0]);
  } catch (err: any) {
    console.error('Registration error:', err);
    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Телефон или Email уже зарегистрированы' });
    res.status(500).json({ error: 'Ошибка регистрации: ' + err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { phone, password } = req.body;
  console.log('Login attempt:', { phone });
  try {
    // Allow login with phone OR email
    const [users]: any = await pool.query(
      'SELECT id, phone, email, name, role, bonus_balance FROM users WHERE (phone = ? OR email = ?) AND password = ?',
      [phone, phone, password]
    );
    if (users.length === 0) return res.status(401).json({ error: 'Неверный телефон/email или пароль' });
    res.json(users[0]);
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Ошибка входа: ' + err.message });
  }
});

app.get('/api/user/:id', async (req, res) => {
  try {
    const [users]: any = await pool.query('SELECT id, phone, email, name, role, bonus_balance FROM users WHERE id = ?', [req.params.id]);
    if (users.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(users[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

app.get('/api/user/:id/orders', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC', [req.params.id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user orders' });
  }
});

app.post('/api/orders/:id/review', async (req, res) => {
  const { rating, review } = req.body;
  try {
    await pool.query('UPDATE orders SET rating = ?, review = ? WHERE id = ?', [rating, review, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to submit review' });
  }
});

app.delete('/api/orders/:id', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query('DELETE FROM order_items WHERE order_id = ?', [req.params.id]);
    await connection.query('DELETE FROM orders WHERE id = ?', [req.params.id]);
    await connection.commit();
    res.json({ success: true });
  } catch (err) {
    await connection.rollback();
    console.error('Failed to delete order:', err);
    res.status(500).json({ error: 'Failed to delete order' });
  } finally {
    connection.release();
  }
});

app.delete('/api/orders/:id/review', async (req, res) => {
  try {
    await pool.query('UPDATE orders SET rating = NULL, review = NULL WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to delete review:', err);
    res.status(500).json({ error: 'Failed to delete review' });
  }
});

app.get('/api/news', async (req, res) => {
  try {
    const { branch_id } = req.query;
    let queryStr = 'SELECT * FROM news';
    const params: any[] = [];
    if (branch_id && branch_id !== 'all') {
      queryStr += ' WHERE branch_id IS NULL OR branch_id = ?';
      params.push(parseInt(branch_id as string));
    }
    queryStr += ' ORDER BY created_at DESC LIMIT 5';
    
    const [rows] = await pool.query(queryStr, params);
    if ((rows as any[]).length === 0) {
      // Mock news if none in DB
      return res.json([
        { id: 1, title: 'Скидка 15% на всё!', content: 'Используй промокод COOL при заказе!', image_url: 'https://picsum.photos/seed/promo1/800/400', type: 'promo', branch_id: null },
        { id: 2, title: 'Новинка: Гавайская!', content: 'Попробуй нашу новую шаурму с ананасом!', image_url: 'https://picsum.photos/seed/promo2/800/400', type: 'news', branch_id: null },
        { id: 3, title: 'Бонусы за каждый заказ', content: 'Копи 3% бонусами и оплачивай ими до 100% покупки!', image_url: 'https://picsum.photos/seed/promo3/800/400', type: 'news', branch_id: null }
      ]);
    }
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch news' });
  }
});

// Promo Codes
app.get('/api/promo/:code', async (req, res) => {
  try {
    const { branch_id } = req.query;
    let queryStr = 'SELECT * FROM promo_codes WHERE code = ? AND is_active = TRUE AND (usage_limit IS NULL OR used_count < usage_limit)';
    const params: any[] = [req.params.code];
    if (branch_id && branch_id !== 'all') {
      queryStr += ' AND (branch_id IS NULL OR branch_id = ?)';
      params.push(parseInt(branch_id as string));
    }
    const [rows]: any = await pool.query(queryStr, params);
    if (rows.length === 0) return res.status(404).json({ error: 'Промокод недействителен, исчерпан или не предназначен для этого филиала' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to check promo code' });
  }
});

app.get('/api/menu', async (req, res) => {
  if (!process.env.DB_HOST) return res.json([]);
  try {
    const { branch_id } = req.query;
    const [products]: any = await pool.query(`
      SELECT p.*, c.name as category_name 
      FROM products p 
      JOIN categories c ON p.category_id = c.id 
      WHERE p.is_available = TRUE
    `);
    
    let variants: any;
    if (branch_id) {
      [variants] = await pool.query(`
        SELECT pv.*, 
               CASE 
                 WHEN c.name = 'Напитки' THEN COALESCE(bvs.stock, 15)
                 ELSE COALESCE(bvs.stock, 100)
               END as stock
        FROM product_variants pv
        JOIN products p ON pv.product_id = p.id
        JOIN categories c ON p.category_id = c.id
        LEFT JOIN branch_variant_stock bvs ON pv.id = bvs.variant_id AND bvs.branch_id = ?
      `, [branch_id]);
    } else {
      [variants] = await pool.query('SELECT *, 999 as stock FROM product_variants');
    }
    
    const menu = products.map((p: any) => ({
      ...p,
      variants: variants.filter((v: any) => v.product_id === p.id).map((v: any) => ({
        ...v,
        stock: v.stock !== undefined ? parseInt(v.stock) : 999
      }))
    }));
    
    res.json(menu);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch menu' });
  }
});

app.get('/api/products/popular', async (req, res) => {
  try {
    const { branch_id } = req.query;
    const [products]: any = await pool.query(`
      SELECT p.*, c.name as category_name, SUM(oi.quantity) as sales_count
      FROM products p
      JOIN categories c ON p.category_id = c.id
      JOIN product_variants pv ON p.id = pv.product_id
      LEFT JOIN order_items oi ON pv.id = oi.variant_id
      LEFT JOIN orders o ON oi.order_id = o.id AND o.status != 'cancelled'
      WHERE p.is_available = TRUE
      GROUP BY p.id
      ORDER BY COALESCE(sales_count, 0) DESC, p.id ASC
      LIMIT 3
    `);
    
    let variants: any;
    if (branch_id) {
      [variants] = await pool.query(`
        SELECT pv.*, 
               CASE 
                 WHEN c.name = 'Напитки' THEN COALESCE(bvs.stock, 15)
                 ELSE COALESCE(bvs.stock, 100)
               END as stock
        FROM product_variants pv
        JOIN products p ON pv.product_id = p.id
        JOIN categories c ON p.category_id = c.id
        LEFT JOIN branch_variant_stock bvs ON pv.id = bvs.variant_id AND bvs.branch_id = ?
      `, [branch_id]);
    } else {
      [variants] = await pool.query('SELECT *, 999 as stock FROM product_variants');
    }
    
    const popular = products.map((p: any) => ({
      ...p,
      variants: variants.filter((v: any) => v.product_id === p.id).map((v: any) => ({
        ...v,
        stock: v.stock !== undefined ? parseInt(v.stock) : 999
      }))
    }));
    
    res.json(popular);
  } catch (err) {
    console.error('Failed to fetch popular products:', err);
    res.status(500).json({ error: 'Failed to fetch popular products' });
  }
});

app.post('/api/orders', async (req, res) => {
  if (!process.env.DB_HOST) return res.status(503).json({ error: 'Database not configured' });
  const { branch_id, user_id, customer_name, customer_phone, items, total_amount, discount_amount, bonuses_used, promo_code, payment_method } = req.body;
  const connection = await pool.getConnection();
  const paymentMethod = payment_method || 'cash';
  try {
    await connection.beginTransaction();
    
    // 1. Create Order with payment_method
    const [orderResult]: any = await connection.query(
      'INSERT INTO orders (user_id, branch_id, customer_name, customer_phone, total_amount, discount_amount, bonuses_used, promo_code, payment_method) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [user_id || null, branch_id || null, customer_name, customer_phone, total_amount, discount_amount || 0, bonuses_used || 0, promo_code || null, paymentMethod]
    );
    const orderId = orderResult.insertId;
 
    // 2. Create Order Items and update branch stock
    for (const item of items) {
      const customization = JSON.stringify({
        removed: item.removed_ingredients || [],
        added: item.added_extras || []
      });
      await connection.query(
        'INSERT INTO order_items (order_id, variant_id, quantity, price, customization) VALUES (?, ?, ?, ?, ?)',
        [orderId, item.variant_id, item.quantity, item.price, customization]
      );

      // Decrement stock for the branch
      if (branch_id) {
        await connection.query(
          'UPDATE branch_variant_stock SET stock = GREATEST(0, stock - ?) WHERE branch_id = ? AND variant_id = ?',
          [item.quantity, branch_id, item.variant_id]
        );
      }
    }
 
    // 3. Update User Bonuses (Loyalty: 3% back, subtract used)
    if (user_id) {
      const bonusEarned = total_amount * 0.03;
      await connection.query(
        'UPDATE users SET bonus_balance = bonus_balance - ? + ? WHERE id = ?',
        [bonuses_used || 0, bonusEarned, user_id]
      );
    }
 
    // 4. Increment Promo Usage
    if (promo_code) {
      await connection.query('UPDATE promo_codes SET used_count = used_count + 1 WHERE code = ?', [promo_code]);
    }
 
    await connection.commit();

    let platega_redirect: string | null = null;
    let platega_transaction_id: string | null = null;

    if (paymentMethod === 'platega') {
      const merchantId = process.env.PLATEGA_MERCHANT_ID;
      const secret = process.env.PLATEGA_SECRET;
      if (merchantId && secret) {
        try {
          const host = req.get('host') || 'localhost:3000';
          const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
          const protocol = isHttps ? 'https' : 'http';
          const isLocalHost = host.includes('localhost') || host.includes('127.0.0.1') || host.includes('::1');
          const successURL = (isLocalHost && !host.includes('bezumni13.onrender.com'))
            ? `${protocol}://${host}/?orderId=${orderId}&payment=success`
            : `https://bezumni13.onrender.com/?orderId=${orderId}&payment=success`;
          const failedURL = (isLocalHost && !host.includes('bezumni13.onrender.com'))
            ? `${protocol}://${host}/?orderId=${orderId}&payment=failed`
            : `https://bezumni13.onrender.com/?orderId=${orderId}&payment=failed`;

          const plategaRes = await fetch('https://app.platega.io/transaction/process', {
            method: 'POST',
            headers: {
              'X-MerchantId': merchantId,
              'X-Secret': secret,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              paymentMethod: 2,
              paymentDetails: { amount: total_amount, currency: 'RUB' },
              description: `Оплата заказа №${orderId} в Крутая Шаурма`,
              return: successURL,
              failedUrl: failedURL,
              payload: String(orderId)
            })
          });

          if (plategaRes.ok) {
            const plategaData = await plategaRes.json();
            platega_transaction_id = plategaData.transactionId || null;
            platega_redirect = plategaData.redirect || null;
            if (platega_transaction_id) {
              await pool.query('UPDATE orders SET platega_transaction_id = ? WHERE id = ?', [platega_transaction_id, orderId]);
            }
          } else {
            console.error('Platega API error:', await plategaRes.text());
          }
        } catch (plategaErr) {
          console.error('Platega payment creation failed:', plategaErr);
        }
      } else {
        console.warn('PLATEGA_MERCHANT_ID or PLATEGA_SECRET not set in environment');
      }
    }

    res.status(201).json({ id: orderId, status: 'pending', platega_redirect, platega_transaction_id });
  } catch (err) {
    await connection.rollback();
    console.error('Order error:', err);
    res.status(500).json({ error: 'Failed to create order' });
  } finally {
    connection.release();
  }
});

// Platega Webhook Receiver (СБП QR)
app.post('/api/payment/platega-webhook', async (req, res) => {
  console.log('Received Platega webhook:', req.body);

  // Verify credentials from Platega headers
  const incomingMerchantId = req.headers['x-merchantid'] as string;
  const incomingSecret = req.headers['x-secret'] as string;

  if (
    process.env.PLATEGA_MERCHANT_ID &&
    (incomingMerchantId !== process.env.PLATEGA_MERCHANT_ID || incomingSecret !== process.env.PLATEGA_SECRET)
  ) {
    console.warn('Platega webhook: invalid credentials');
    return res.status(401).send('Unauthorized');
  }

  const { id: transactionId, status, payload } = req.body;

  if (!payload) {
    return res.status(400).send('Missing payload');
  }

  const orderId = parseInt(payload);
  if (isNaN(orderId)) {
    return res.status(400).send('Invalid order id in payload');
  }

  if (status === 'CONFIRMED') {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [orders]: any = await connection.query('SELECT * FROM orders WHERE id = ?', [orderId]);
      if (orders.length === 0) {
        connection.release();
        return res.status(404).send('Order not found');
      }
      await connection.query(
        "UPDATE orders SET is_paid = 1, status = CASE WHEN status = 'pending' THEN 'preparing' ELSE status END, platega_transaction_id = ? WHERE id = ?",
        [transactionId || null, orderId]
      );
      await connection.commit();
      console.log(`Order #${orderId} marked as paid via Platega (txn: ${transactionId}).`);
    } catch (err) {
      await connection.rollback();
      console.error('Platega webhook processing error:', err);
      return res.status(500).send('Internal error');
    } finally {
      connection.release();
    }
  } else {
    console.log(`Platega webhook: order #${orderId} status = ${status} (no action)`);
  }

  res.status(200).send('OK');
});

// Create a fresh Platega payment link for an existing unpaid order
app.post('/api/orders/:id/platega-link', async (req, res) => {
  const orderId = parseInt(req.params.id);
  const merchantId = process.env.PLATEGA_MERCHANT_ID;
  const secret = process.env.PLATEGA_SECRET;

  try {
    const [orders]: any = await pool.query('SELECT * FROM orders WHERE id = ?', [orderId]);
    if (orders.length === 0) return res.status(404).json({ error: 'Order not found' });
    const order = orders[0];
    if (order.is_paid) return res.status(400).json({ error: 'Order already paid' });

    if (!merchantId || !secret) {
      return res.status(503).json({ error: 'Platega not configured' });
    }

    const host = req.get('host') || 'localhost:3000';
    const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
    const protocol = isHttps ? 'https' : 'http';
    const isLocalHost = host.includes('localhost') || host.includes('127.0.0.1') || host.includes('::1');
    const successURL = (isLocalHost && !host.includes('bezumni13.onrender.com'))
      ? `${protocol}://${host}/?orderId=${orderId}&payment=success`
      : `https://bezumni13.onrender.com/?orderId=${orderId}&payment=success`;
    const failedURL = (isLocalHost && !host.includes('bezumni13.onrender.com'))
      ? `${protocol}://${host}/?orderId=${orderId}&payment=failed`
      : `https://bezumni13.onrender.com/?orderId=${orderId}&payment=failed`;

    const plategaRes = await fetch('https://app.platega.io/transaction/process', {
      method: 'POST',
      headers: { 'X-MerchantId': merchantId, 'X-Secret': secret, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paymentMethod: 2,
        paymentDetails: { amount: order.total_amount, currency: 'RUB' },
        description: `Оплата заказа №${orderId} в Крутая Шаурма`,
        return: successURL,
        failedUrl: failedURL,
        payload: String(orderId)
      })
    });

    if (!plategaRes.ok) {
      return res.status(502).json({ error: 'Platega API error' });
    }
    const data = await plategaRes.json();
    if (data.transactionId) {
      await pool.query('UPDATE orders SET platega_transaction_id = ? WHERE id = ?', [data.transactionId, orderId]);
    }
    res.json({ redirect: data.redirect, transactionId: data.transactionId });
  } catch (err) {
    console.error('Failed to create Platega link:', err);
    res.status(500).json({ error: 'Failed to create payment link' });
  }
});

// Get Order Status endpoint
app.get('/api/orders/:id/status', async (req, res) => {
  const orderId = parseInt(req.params.id);
  try {
    const [orders]: any = await pool.query('SELECT is_paid, status FROM orders WHERE id = ?', [orderId]);
    if (orders.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json(orders[0]);
  } catch (err) {
    console.error('Failed to fetch order status:', err);
    res.status(500).json({ error: 'Failed to fetch order status' });
  }
});

// YooMoney Simulate Payment endpoint for sandbox / demo
app.post('/api/orders/:id/simulate-pay', async (req, res) => {
  const orderId = parseInt(req.params.id);
  try {
    const [orders]: any = await pool.query('SELECT * FROM orders WHERE id = ?', [orderId]);
    if (orders.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    await pool.query(
      "UPDATE orders SET is_paid = 1, status = CASE WHEN status = 'pending' THEN 'preparing' ELSE status END WHERE id = ?",
      [orderId]
    );
    
    res.json({ success: true, message: `Order #${orderId} paid successfully (simulated)` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Simulation failed' });
  }
});

// Admin Routes
app.get('/api/admin/promo', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM promo_codes');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch promo codes' });
  }
});

app.post('/api/admin/promo', async (req, res) => {
  const { code, discount_percent, min_order_amount, usage_limit, branch_id } = req.body;
  try {
    await pool.query(
      'INSERT INTO promo_codes (code, discount_percent, min_order_amount, usage_limit, branch_id) VALUES (?, ?, ?, ?, ?)',
      [code, discount_percent, min_order_amount, usage_limit || null, branch_id || null]
    );
    res.status(201).json({ success: true });
  } catch (err: any) {
    console.error('Failed to add promo code:', err);
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Такой промокод уже существует' });
    }
    res.status(500).json({ error: 'Ошибка при добавлении промокода' });
  }
});

app.patch('/api/admin/promo/:id', async (req, res) => {
  const { code, discount_percent, min_order_amount, usage_limit, is_active, branch_id } = req.body;
  try {
    await pool.query(
      'UPDATE promo_codes SET code = ?, discount_percent = ?, min_order_amount = ?, usage_limit = ?, is_active = ?, branch_id = ? WHERE id = ?',
      [code, discount_percent, min_order_amount, usage_limit || null, is_active, branch_id || null, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update promo code' });
  }
});

app.delete('/api/admin/promo/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM promo_codes WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete promo code' });
  }
});

app.get('/api/admin/stats/reviews', async (req, res) => {
  try {
    const { branch_id } = req.query;
    let statsQuery = `
      SELECT 
        AVG(CASE WHEN created_at >= CURDATE() THEN rating END) as avg_day,
        AVG(CASE WHEN created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) THEN rating END) as avg_week,
        AVG(CASE WHEN created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) THEN rating END) as avg_month,
        COUNT(rating) as total_reviews
      FROM orders 
      WHERE rating IS NOT NULL
    `;
    const params: any[] = [];
    if (branch_id && branch_id !== 'all') {
      statsQuery += ' AND branch_id = ?';
      params.push(parseInt(branch_id as string));
    }
    const [rows]: any = await pool.query(statsQuery, params);
    res.json(rows[0]);
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Failed to fetch review stats' });
  }
});

app.get('/api/admin/orders', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM orders ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

app.get('/api/admin/orders/:id/items', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT oi.*, p.name, pv.size_label 
       FROM order_items oi 
       JOIN product_variants pv ON oi.variant_id = pv.id 
       JOIN products p ON pv.product_id = p.id 
       WHERE oi.order_id = ?`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch order items' });
  }
});

app.get('/api/admin/categories', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM categories');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

app.post('/api/admin/menu', async (req, res) => {
  const { name, description, category_id, image_url, variants } = req.body;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    const [result]: any = await connection.query(
      'INSERT INTO products (name, description, category_id, image_url) VALUES (?, ?, ?, ?)',
      [name, description, category_id, image_url]
    );
    const productId = result.insertId;

    if (variants && Array.isArray(variants)) {
      for (const v of variants) {
        await connection.query(
          'INSERT INTO product_variants (product_id, size_label, price) VALUES (?, ?, ?)',
          [productId, v.size_label, v.price]
        );
      }
    }

    await connection.commit();
    res.status(201).json({ success: true, id: productId });
  } catch (err) {
    await connection.rollback();
    console.error('Failed to add menu item:', err);
    res.status(500).json({ error: 'Failed to add menu item' });
  } finally {
    connection.release();
  }
});

app.delete('/api/admin/menu/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM products WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

app.patch('/api/admin/menu/:id', async (req, res) => {
  const { name, description, image_url, is_available } = req.body;
  try {
    await pool.query(
      'UPDATE products SET name = ?, description = ?, image_url = ?, is_available = ? WHERE id = ?',
      [name, description, image_url, is_available !== undefined ? is_available : true, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to update product:', err);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

app.patch('/api/admin/orders/:id', async (req, res) => {
  const { status, estimated_time } = req.body;
  try {
    if (estimated_time !== undefined) {
      await pool.query('UPDATE orders SET status = ?, estimated_time = ? WHERE id = ?', [status, estimated_time, req.params.id]);
    } else {
      await pool.query('UPDATE orders SET status = ? WHERE id = ?', [status, req.params.id]);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update order' });
  }
});

// News Management
app.post('/api/admin/news', async (req, res) => {
  const { title, content, image_url, type, branch_id } = req.body;
  try {
    await pool.query(
      'INSERT INTO news (title, content, image_url, type, branch_id) VALUES (?, ?, ?, ?, ?)',
      [title, content, image_url, type || 'news', branch_id || null]
    );
    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add news' });
  }
});

app.patch('/api/admin/news/:id', async (req, res) => {
  const { title, content, image_url, type, branch_id } = req.body;
  try {
    await pool.query(
      'UPDATE news SET title = ?, content = ?, image_url = ?, type = ?, branch_id = ? WHERE id = ?',
      [title, content, image_url, type, branch_id || null, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update news' });
  }
});

app.delete('/api/admin/news/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM news WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete news' });
  }
});

// Cities API
app.get('/api/cities', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM cities ORDER BY name ASC');
    res.json(rows);
  } catch (err) {
    console.error('Failed to fetch cities:', err);
    res.status(500).json({ error: 'Failed to fetch cities' });
  }
});

app.post('/api/admin/cities', async (req, res) => {
  const { name, latitude, longitude } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Название города обязательно' });
  }
  const cleanName = name.trim();
  try {
    const [existing]: any = await pool.query(
      'SELECT id FROM cities WHERE LOWER(name) = LOWER(?)',
      [cleanName]
    );
    if (existing && existing.length > 0) {
      return res.status(400).json({ error: 'Город с таким названием уже существует!' });
    }

    const [result]: any = await pool.query(
      'INSERT INTO cities (name, latitude, longitude) VALUES (?, ?, ?)',
      [cleanName, latitude || null, longitude || null]
    );
    res.status(201).json({ success: true, id: result.insertId });
  } catch (err) {
    console.error('Failed to create city:', err);
    res.status(500).json({ error: 'Failed to create city' });
  }
});

app.delete('/api/admin/cities/:id', async (req, res) => {
  const cityId = req.params.id;
  try {
    // Delete branches in that city first
    await pool.query('DELETE FROM branches WHERE city_id = ?', [cityId]);
    
    // Delete the city
    await pool.query('DELETE FROM cities WHERE id = ?', [cityId]);
    
    res.json({ success: true, message: 'City and associated branches deleted successfully' });
  } catch (err) {
    console.error('Failed to delete city:', err);
    res.status(500).json({ error: 'Failed to delete city and its branches' });
  }
});

// Branches and Stock APIs
app.get('/api/branches', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT b.*, c.name as city_name 
      FROM branches b
      LEFT JOIN cities c ON b.city_id = c.id
      ORDER BY b.id ASC
    `);
    res.json(rows);
  } catch (err) {
    console.error('Failed to fetch branches:', err);
    res.status(500).json({ error: 'Failed to fetch branches' });
  }
});

app.post('/api/admin/branches', async (req, res) => {
  const { name, address, is_24_7, latitude, longitude, city_id } = req.body;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    const [result]: any = await connection.query(
      'INSERT INTO branches (city_id, name, address, is_24_7, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?)',
      [city_id || null, name, address, is_24_7 !== undefined ? is_24_7 : true, latitude || 56.0153, longitude || 92.8932]
    );
    const branchId = result.insertId;

    // Auto seed stock for all product variants for this new branch!
    await connection.query(`
      INSERT IGNORE INTO branch_variant_stock (branch_id, variant_id, stock)
      SELECT ?, pv.id, IF(p.category_id = (SELECT id FROM categories WHERE name = 'Напитки' LIMIT 1), 15, 100)
      FROM product_variants pv
      JOIN products p ON pv.product_id = p.id
    `, [branchId]);

    await connection.commit();
    res.status(201).json({ success: true, id: branchId });
  } catch (err) {
    await connection.rollback();
    console.error('Failed to create branch:', err);
    res.status(500).json({ error: 'Failed to create branch' });
  } finally {
    connection.release();
  }
});

app.patch('/api/admin/branches/:id', async (req, res) => {
  const { name, address, is_24_7, latitude, longitude, city_id } = req.body;
  try {
    await pool.query(
      'UPDATE branches SET city_id = ?, name = ?, address = ?, is_24_7 = ?, latitude = ?, longitude = ? WHERE id = ?',
      [city_id || null, name, address, is_24_7 !== undefined ? is_24_7 : true, latitude, longitude, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to update branch:', err);
    res.status(500).json({ error: 'Failed to update branch' });
  }
});

app.delete('/api/admin/branches/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM branches WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to delete branch:', err);
    res.status(500).json({ error: 'Failed to delete branch' });
  }
});

app.get('/api/admin/stock', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        b.id as branch_id,
        b.name as branch_name,
        p.name as product_name,
        p.image_url,
        pv.id as variant_id,
        pv.size_label,
        pv.price,
        c.name as category_name,
        COALESCE(bvs.stock, 15) as stock
      FROM branches b
      CROSS JOIN product_variants pv
      JOIN products p ON pv.product_id = p.id
      JOIN categories c ON p.category_id = c.id
      LEFT JOIN branch_variant_stock bvs ON bvs.branch_id = b.id AND bvs.variant_id = pv.id
      WHERE c.name = 'Напитки'
      ORDER BY b.id, c.name, p.name, pv.id
    `);
    res.json(rows);
  } catch (err) {
    console.error('Failed to fetch stock:', err);
    res.status(500).json({ error: 'Failed to fetch stock' });
  }
});

app.post('/api/admin/stock', async (req, res) => {
  const { branch_id, variant_id, stock } = req.body;
  try {
    await pool.query(`
      INSERT INTO branch_variant_stock (branch_id, variant_id, stock)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE stock = VALUES(stock)
    `, [branch_id, variant_id, stock]);
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to update stock:', err);
    res.status(500).json({ error: 'Failed to update stock' });
  }
});

// Support request endpoint
app.post('/api/support', async (req, res) => {
  const { name, phone, email, subject, message } = req.body;
  if (!subject || !message) {
    return res.status(400).json({ error: 'Заполните тему и сообщение' });
  }

  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const supportEmail = process.env.SUPPORT_EMAIL || smtpUser;

  if (!smtpUser || !smtpPass) {
    console.error('SMTP credentials not configured');
    return res.status(500).json({ error: 'Почта не настроена на сервере' });
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: { user: smtpUser, pass: smtpPass },
  });

  const html = `
    <h2>Новая заявка в поддержку — ${subject}</h2>
    <p><b>Имя:</b> ${name || '—'}</p>
    <p><b>Телефон:</b> ${phone || '—'}</p>
    <p><b>Email:</b> ${email || '—'}</p>
    <p><b>Тема:</b> ${subject}</p>
    <hr/>
    <p><b>Сообщение:</b></p>
    <p>${message.replace(/\n/g, '<br/>')}</p>
  `;

  try {
    await transporter.sendMail({
      from: `"Безумно Крутая Шаурма" <${smtpUser}>`,
      to: supportEmail,
      subject: `[Поддержка] ${subject}`,
      html,
    });
    res.json({ success: true });
  } catch (err: any) {
    console.error('Failed to send support email:', err);
    res.status(500).json({ error: 'Не удалось отправить письмо' });
  }
});

// Vite Integration
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    console.log(`Serving static files from: ${distPath}`);
    
    // Serve static files from dist
    app.use(express.static(distPath, {
      setHeaders: (res, filePath) => {
        // Disable caching to ensure changes are seen immediately
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        
        if (filePath.endsWith('.js')) {
          res.setHeader('Content-Type', 'application/javascript');
        }
      }
    }));

    // SPA fallback: serve index.html for any non-file requests
    app.get('*', (req, res) => {
      const indexPath = path.join(distPath, 'index.html');
      res.sendFile(indexPath);
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
