import express from 'express';
import { createServer as createViteServer } from 'vite';
import mysql from 'mysql2/promise';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

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
      const [columns]: any = await connection.query('SHOW COLUMNS FROM users LIKE "email"');
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
        status ENUM('pending', 'preparing', 'ready', 'delivered', 'cancelled') DEFAULT 'pending',
        estimated_time INT DEFAULT 20,
        review TEXT,
        rating INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

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

    // Migration: Add min_order_amount column if it doesn't exist
    try {
      const [columns]: any = await connection.query('SHOW COLUMNS FROM promo_codes LIKE "min_order_amount"');
      if (columns.length === 0) {
        console.log('Adding min_order_amount column to promo_codes table...');
        await connection.query('ALTER TABLE promo_codes ADD COLUMN min_order_amount DECIMAL(10, 2) DEFAULT 0 AFTER discount_percent');
      }
      
      const [limitCol]: any = await connection.query('SHOW COLUMNS FROM promo_codes LIKE "usage_limit"');
      if (limitCol.length === 0) {
        console.log('Adding usage columns to promo_codes...');
        await connection.query('ALTER TABLE promo_codes ADD COLUMN usage_limit INT DEFAULT NULL, ADD COLUMN used_count INT DEFAULT 0');
      }
    } catch (err) {
      console.warn('Migration for promo_codes failed or column already exists');
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

app.get('/api/news', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM news ORDER BY created_at DESC LIMIT 5');
    if ((rows as any[]).length === 0) {
      // Mock news if none in DB
      return res.json([
        { id: 1, title: 'Скидка 15% на всё!', content: 'Используй промокод COOL при заказе!', image_url: 'https://picsum.photos/seed/promo1/800/400', type: 'promo' },
        { id: 2, title: 'Новинка: Гавайская!', content: 'Попробуй нашу новую шаурму с ананасом!', image_url: 'https://picsum.photos/seed/promo2/800/400', type: 'news' },
        { id: 3, title: 'Бонусы за каждый заказ', content: 'Копи 3% бонусами и оплачивай ими до 100% покупки!', image_url: 'https://picsum.photos/seed/promo3/800/400', type: 'news' }
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
    const [rows]: any = await pool.query(
      'SELECT * FROM promo_codes WHERE code = ? AND is_active = TRUE AND (usage_limit IS NULL OR used_count < usage_limit)',
      [req.params.code]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Промокод недействителен или исчерпан' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to check promo code' });
  }
});

app.get('/api/menu', async (req, res) => {
  if (!process.env.DB_HOST) return res.json([]);
  try {
    const [products]: any = await pool.query(`
      SELECT p.*, c.name as category_name 
      FROM products p 
      JOIN categories c ON p.category_id = c.id 
      WHERE p.is_available = TRUE
    `);
    
    const [variants]: any = await pool.query('SELECT * FROM product_variants');
    
    const menu = products.map((p: any) => ({
      ...p,
      variants: variants.filter((v: any) => v.product_id === p.id)
    }));
    
    res.json(menu);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch menu' });
  }
});

app.get('/api/products/popular', async (req, res) => {
  try {
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
    
    const [variants]: any = await pool.query('SELECT * FROM product_variants');
    
    const popular = products.map((p: any) => ({
      ...p,
      variants: variants.filter((v: any) => v.product_id === p.id)
    }));
    
    res.json(popular);
  } catch (err) {
    console.error('Failed to fetch popular products:', err);
    res.status(500).json({ error: 'Failed to fetch popular products' });
  }
});

app.post('/api/orders', async (req, res) => {
  if (!process.env.DB_HOST) return res.status(503).json({ error: 'Database not configured' });
  const { user_id, customer_name, customer_phone, items, total_amount, discount_amount, bonuses_used, promo_code } = req.body;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    // 1. Create Order
    const [orderResult]: any = await connection.query(
      'INSERT INTO orders (user_id, customer_name, customer_phone, total_amount, discount_amount, bonuses_used) VALUES (?, ?, ?, ?, ?, ?)',
      [user_id || null, customer_name, customer_phone, total_amount, discount_amount || 0, bonuses_used || 0]
    );
    const orderId = orderResult.insertId;

    // 2. Create Order Items
    for (const item of items) {
      const customization = JSON.stringify({
        removed: item.removed_ingredients || [],
        added: item.added_extras || []
      });
      await connection.query(
        'INSERT INTO order_items (order_id, variant_id, quantity, price, customization) VALUES (?, ?, ?, ?, ?)',
        [orderId, item.variant_id, item.quantity, item.price, customization]
      );
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
    res.status(201).json({ id: orderId, status: 'pending' });
  } catch (err) {
    await connection.rollback();
    console.error('Order error:', err);
    res.status(500).json({ error: 'Failed to create order' });
  } finally {
    connection.release();
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
  const { code, discount_percent, min_order_amount, usage_limit } = req.body;
  try {
    await pool.query(
      'INSERT INTO promo_codes (code, discount_percent, min_order_amount, usage_limit) VALUES (?, ?, ?, ?)',
      [code, discount_percent, min_order_amount, usage_limit || null]
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
  const { code, discount_percent, min_order_amount, usage_limit, is_active } = req.body;
  try {
    await pool.query(
      'UPDATE promo_codes SET code = ?, discount_percent = ?, min_order_amount = ?, usage_limit = ?, is_active = ? WHERE id = ?',
      [code, discount_percent, min_order_amount, usage_limit || null, is_active, req.params.id]
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
    const statsQuery = `
      SELECT 
        AVG(CASE WHEN created_at >= CURDATE() THEN rating END) as avg_day,
        AVG(CASE WHEN created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) THEN rating END) as avg_week,
        AVG(CASE WHEN created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) THEN rating END) as avg_month,
        COUNT(rating) as total_reviews
      FROM orders 
      WHERE rating IS NOT NULL
    `;
    const [rows]: any = await pool.query(statsQuery);
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
  const { title, content, image_url, type } = req.body;
  try {
    await pool.query(
      'INSERT INTO news (title, content, image_url, type) VALUES (?, ?, ?, ?)',
      [title, content, image_url, type || 'news']
    );
    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add news' });
  }
});

app.patch('/api/admin/news/:id', async (req, res) => {
  const { title, content, image_url, type } = req.body;
  try {
    await pool.query(
      'UPDATE news SET title = ?, content = ?, image_url = ?, type = ? WHERE id = ?',
      [title, content, image_url, type, req.params.id]
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
