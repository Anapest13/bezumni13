
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function fixOrderItemsTable() {
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

  try {
    const connection = await pool.getConnection();
    console.log('Connected to database.');

    const [columns]: any = await connection.query('SHOW COLUMNS FROM order_items');
    const columnNames = columns.map((c: any) => c.Field);

    if (!columnNames.includes('customization')) {
      console.log('Adding customization column to order_items...');
      await connection.query('ALTER TABLE order_items ADD COLUMN customization TEXT AFTER price');
    }

    console.log('order_items table fixed successfully.');
    connection.release();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

fixOrderItemsTable();
