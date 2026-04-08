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
        customer_name VARCHAR(255),
        customer_phone VARCHAR(50),
        total_amount DECIMAL(10, 2) NOT NULL,
        status ENUM('pending', 'preparing', 'ready', 'delivered', 'cancelled') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 5. Order Items (Linked to Variants)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT,
        variant_id INT,
        quantity INT NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        FOREIGN KEY (order_id) REFERENCES orders(id),
        FOREIGN KEY (variant_id) REFERENCES product_variants(id)
      )
    `);

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
      const addProd = async (catId: number, name: string, desc: string, variants: {s: string, p: number}[]) => {
        const [res]: any = await connection.query(
          'INSERT INTO products (category_id, name, description, image_url) VALUES (?, ?, ?, ?)',
          [catId, name, desc, `https://picsum.photos/seed/${encodeURIComponent(name)}/400/300`]
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
      ]);
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

      console.log('Seeding complete.');
    }

    connection.release();
    console.log('Database tables initialized.');
  } catch (err) {
    console.error('Error initializing database:', err);
  }
}

initDb();

// API Routes
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

app.post('/api/orders', async (req, res) => {
  if (!process.env.DB_HOST) return res.status(503).json({ error: 'Database not configured' });
  const { customer_name, customer_phone, items, total_amount } = req.body;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [orderResult]: any = await connection.query(
      'INSERT INTO orders (customer_name, customer_phone, total_amount) VALUES (?, ?, ?)',
      [customer_name, customer_phone, total_amount]
    );
    const orderId = orderResult.insertId;
    for (const item of items) {
      await connection.query(
        'INSERT INTO order_items (order_id, variant_id, quantity, price) VALUES (?, ?, ?, ?)',
        [orderId, item.variant_id, item.quantity, item.price]
      );
    }
    await connection.commit();
    res.status(201).json({ id: orderId, status: 'pending' });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ error: 'Failed to create order' });
  } finally {
    connection.release();
  }
});

// Admin Routes
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

app.post('/api/admin/menu', async (req, res) => {
  const { name, description, price, category, image_url } = req.body;
  try {
    await pool.query(
      'INSERT INTO menu_items (name, description, price, category, image_url) VALUES (?, ?, ?, ?, ?)',
      [name, description, price, category, image_url]
    );
    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add menu item' });
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

app.patch('/api/admin/orders/:id', async (req, res) => {
  const { status } = req.body;
  try {
    await pool.query('UPDATE orders SET status = ? WHERE id = ?', [status, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update order' });
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
