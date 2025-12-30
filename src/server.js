require('dotenv').config();
const express = require('express');
const path = require('path');

const comprasRoutes = require('./routes/compras');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));

// RUTAS
app.use('/compras', comprasRoutes);

app.get('/', (req, res) => {
  res.redirect('/compras');
});

// 404
app.use((req, res) => {
  res.status(404).render('404', {
    title: 'Página no encontrada'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
});
