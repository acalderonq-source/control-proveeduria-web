const mysql = require('mysql2/promise');

function parseMysqlUrl(url) {
  // Soporta: mysql://user:pass@host:port/db
  try {
    const u = new URL(url);
    return {
      host: u.hostname,
      port: u.port ? Number(u.port) : 3306,
      user: decodeURIComponent(u.username),
      password: decodeURIComponent(u.password),
      database: u.pathname.replace('/', ''),
    };
  } catch (e) {
    return null;
  }
}

function getDbConfig() {
  // 1) Railway / Render a veces dan URL completa
  const url = process.env.MYSQL_URL || process.env.DATABASE_URL;
  if (url) {
    const parsed = parseMysqlUrl(url);
    if (parsed) return parsed;
  }

  // 2) Variables separadas
  return {
    host: process.env.MYSQL_HOST,
    port: process.env.MYSQL_PORT ? Number(process.env.MYSQL_PORT) : 3306,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
  };
}

const cfg = getDbConfig();

// 👇 Log seguro (sin password)
console.log('MySQL config ✅', {
  host: cfg.host,
  port: cfg.port,
  user: cfg.user,
  database: cfg.database,
});

// Si falta algo, lo dejamos claro en logs
['host', 'user', 'database'].forEach((k) => {
  if (!cfg[k]) console.warn(`⚠️ Falta MYSQL ${k.toUpperCase()} en ENV`);
});

const pool = mysql.createPool({
  host: cfg.host,
  port: cfg.port,
  user: cfg.user,
  password: cfg.password,
  database: cfg.database,

  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,

  // recomendado con Railway proxies
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,

  // timezone consistente
  dateStrings: true,
});

module.exports = pool;
