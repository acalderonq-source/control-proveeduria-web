const path = require('path');
const express = require('express');

const comprasRoutes = require('./routes/compras');

const app = express();

// ✅ Para Render: usa el PORT que te dan
const PORT = process.env.PORT || 3000;

// ✅ Parsers (MUY IMPORTANTE para que req.body no venga vacío)
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ✅ Static
app.use(express.static(path.join(__dirname, 'public')));

// ✅ Views
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ✅ Rutas
app.get('/', (req, res) => res.redirect('/compras'));
app.use('/compras', comprasRoutes);

// ✅ 404 (sin variables indefinidas)
app.use((req, res) => {
  res.status(404).render('404', {
    title: '404',
    path: req.originalUrl
  });
});

// ✅ Middleware de errores (para que el 500 deje rastro claro)
app.use((err, req, res, next) => {
  console.error('🔥 ERROR NO CAPTURADO:', err);

  // si el response ya arrancó, delega
  if (res.headersSent) return next(err);

  res.status(500).send('Internal server error');
});

app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
