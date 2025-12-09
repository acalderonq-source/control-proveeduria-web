require('dotenv').config();
const path = require('path');
const express = require('express');
const morgan = require('morgan');
const comprasRouter = require('./routes/compras');
const { initDb } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Inicializar base de datos
initDb();

// Configuración de vistas
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Middlewares
app.use(morgan('dev'));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Ruta principal
app.get('/', (req, res) => {
  res.redirect('/compras');
});

// Rutas de compras
app.use('/compras', comprasRouter);

// Manejo 404
app.use((req, res) => {
  res.status(404);
  res.render('404', { title: 'No encontrado' });
});

app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
