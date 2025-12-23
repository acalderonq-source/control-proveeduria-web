const mysql = require('mysql2/promise');

if (!process.env.MYSQL_HOST) {
  console.error('❌ FALTAN VARIABLES MYSQL EN ENV');
}

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  port: Number(process.env.MYSQL_PORT),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASS,   // 🔥 ESTA LÍNEA ES CLAVE
  database: process.env.MYSQL_DB,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

console.log('MySQL pool listo ✅', {
  host: process.env.MYSQL_HOST,
  port: process.env.MYSQL_PORT,
  user: process.env.MYSQL_USER,
  database: process.env.MYSQL_DB
});
(async () => {
  try {
    const conn = await pool.getConnection();
    console.log('🔥 CONEXIÓN MYSQL OK');
    conn.release();
  } catch (err) {
    console.error('🔥 MYSQL NO CONECTA:', err.message);
  }
})();

module.exports = pool;
