const mysql = require('mysql2');

/**
 * Pool de conexiones MySQL
 * Se crea UNA sola vez y se reutiliza
 */
let pool = null;

function getDb() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,

      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });

    console.log('MySQL pool listo ✅');
    console.log({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      database: process.env.DB_NAME,
    });
  }

  return pool;
}

module.exports = { getDb };
