const express = require('express');
const path = require('path');

const comprasRoutes = require('./routes/compras');
const facturasRoutes = require('./routes/facturas');

const app = express();

// ===================
// CONFIG
// ===================
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ===================
// ROUTES
// ===================
app.use('/compras', comprasRoutes);
app.use('/compras/factura', facturasRoutes);
app.use('/compras', facturasRoutes);
app.use('/compras/nueva', facturasRoutes);
// ===================
// HOME
// ===================
app.get('/', (req, res) => {
  res.redirect('/compras');
});

// ===================
// 404
// ===================
app.use((req, res) => {
  res.status(404).render('404', {
    path: req.originalUrl
  });
});

// ===================
// SERVER
// ===================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
