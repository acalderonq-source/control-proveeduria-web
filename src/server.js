require('dotenv').config();
const express = require('express');
const path = require('path');

const comprasRoutes = require('./routes/compras');
const facturasRoutes = require('./routes/facturas');

const app = express();
const PORT = process.env.PORT || 3000;

// ========================
// MIDDLEWARES
// ========================
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(express.static(path.join(__dirname, 'public')));

// ========================
// EJS
// ========================
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ========================
// RUTAS
// ========================
app.use('/compras', comprasRoutes);
app.use('/compras/factura', facturasRoutes);

// 👉 OPCIONAL: redirigir /compras/nueva
app.get('/compras/nueva', (req, res) => {
  res.redirect('/compras/factura/nueva');
});

// Home
app.get('/', (req, res) => {
  res.redirect('/compras');
});

// ========================
// 404 – SIEMPRE AL FINAL
// ========================
app.use((req, res) => {
  res.status(404).render('404', {
    title: 'Página no encontrada',
    path: req.originalUrl
  });
});

// ========================
// START SERVER
// ========================
app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
