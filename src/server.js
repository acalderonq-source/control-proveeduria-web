// ===============================
// server.js
// ===============================

require('dotenv').config();

const express = require('express');
const path = require('path');

const app = express();

// ===============================
// CONFIGURACIÓN BÁSICA
// ===============================

const PORT = process.env.PORT || 3000;

// Body parser
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// View engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// ===============================
// RUTAS
// ===============================

// Importar rutas (ASEGURATE que existan los archivos)
const comprasRoutes = require('./routes/compras');
const facturasRoutes = require('./routes/facturas');

// Rutas principales
app.use('/compras', comprasRoutes);
app.use('/compras/factura', facturasRoutes);

// Home → redirige al listado
app.get('/', (req, res) => {
  res.redirect('/compras');
});

// ===============================
// 404 – ÚLTIMA RUTA
// ===============================
app.use((req, res) => {
  res.status(404).render('404', {
    title: 'Página no encontrada',
    path: req.originalUrl
  });
});

// ===============================
// INICIAR SERVIDOR
// ===============================
app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
