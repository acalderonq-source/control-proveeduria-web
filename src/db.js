require('dotenv').config();
const mysql = require('mysql2');

let db;

function initDb() {
  db = mysql.createPool({
    host: process.env.MYSQL_HOST,
    port: process.env.MYSQL_PORT,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASS,
    database: process.env.MYSQL_DB,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  // Crear tabla si no existe
  db.query(`
    CREATE TABLE IF NOT EXISTS compras (
      id INT AUTO_INCREMENT PRIMARY KEY,
      fecha DATE NOT NULL,
      cedis VARCHAR(100) NOT NULL,
      proveedor VARCHAR(100) NOT NULL,
      placa VARCHAR(100) NOT NULL,
      producto VARCHAR(255) NOT NULL,
      cantidad DECIMAL(10,2) NOT NULL,
      precio_unitario DECIMAL(10,2) NOT NULL,
      precio_total DECIMAL(12,2) NOT NULL,
      solicito VARCHAR(255) NOT NULL,
      observacion TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) console.error('ERROR creando tabla:', err);
    else console.log('TABLA COMPRAS lista 👍');
  });
}

function getDb() {
  if (!db) throw new Error('DB no inicializada');
  return db;
}

module.exports = { initDb, getDb };
