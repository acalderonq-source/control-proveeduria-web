require('dotenv').config(); // 👈 SIEMPRE PRIMERO

const express = require('express');
const path = require('path');

const comprasRoutes = require('./routes/compras');

const app = express();

// ============================
// CONFIG GENERAL
// ============================
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Archivos estáticos
app.use('/css', express.static(path.join(__dirname, 'public/css')));

// ============================
// RUTAS
// ============================
app.get('/', (req, res) => {
  res.redirect('/compras');
});

app.use('/compras', comprasRoutes);

// ============================
// 404
// ============================
app.use((req, res) => {
  res.status(404).render('404', { title: '404 - No encontrado' });
});

// ============================
// SERVER
// ============================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
