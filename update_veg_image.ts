import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const NEW_URL = 'https://sun9-49.userapi.com/s/v1/ig2/BgKJG0BV8q2uC6CRWV_N8Cfp4Z2mhzSYdgf9Ijw4CiGhogneTe21tefnaO6lXBQBmERziszBk90jZLL-VrI_3woc.jpg?quality=95&as=32x32,48x48,72x72,108x108,160x160,240x240,360x360,480x480,540x540&from=bu&u=o_OK75DSaZRuKDJtxLHLAKAQSBO6DaI1wYHzCLxq4jg&cs=360x0';

async function updateImage() {
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

  try {
    console.log('Connecting to database...');
    const [result]: any = await pool.query(
      'UPDATE products SET image_url = ? WHERE name = ?',
      [NEW_URL, 'Вегетарианская']
    );

    if (result.affectedRows > 0) {
      console.log('Successfully updated image URL for "Вегетарианская"');
    } else {
      console.log('Product "Вегетарианская" not found in database.');
    }
  } catch (err) {
    console.error('Error updating image:', err);
  } finally {
    await pool.end();
  }
}

updateImage();
