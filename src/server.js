const express = require('express');
const path = require('path');
require('dotenv').config();

const comprasRoutes = require('./routes/compras');

const app = express();
const PORT = process.env.PORT || 3000;

/* =========================
   CONFIGURACIÓN
========================= */
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

/* =========================
   RUTAS
========================= */
app.use('/compras', comprasRoutes);

// Home
app.get('/', (req, res) => {
  res.redirect('/compras');
});

/* =========================
   404 FINAL
========================= */
app.use((req, res) => {
  res.status(404).render('404', {
    title: 'Página no encontrada',
    path: req.originalUrl
  });
});

/* =========================
   SERVIDOR
========================= */
app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
