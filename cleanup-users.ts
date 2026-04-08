import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

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
});

async function cleanup() {
  try {
    const connection = await pool.getConnection();
    console.log('Connected to database...');

    console.log('Disabling foreign key checks...');
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');

    console.log('Deleting order items...');
    await connection.query('DELETE FROM order_items');

    console.log('Deleting orders...');
    await connection.query('DELETE FROM orders');

    console.log('Deleting users...');
    await connection.query('DELETE FROM users');

    console.log('Enabling foreign key checks...');
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');

    console.log('Cleanup successful! All users and orders have been deleted.');
    console.log('The admin account will be recreated automatically when you start the server.');

    connection.release();
    process.exit(0);
  } catch (err) {
    console.error('Error during cleanup:', err);
    process.exit(1);
  }
}

cleanup();
