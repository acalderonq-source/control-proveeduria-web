const express = require('express');
const path = require('path');

const comprasRoutes = require('./routes/compras');

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use('/css', express.static(path.join(__dirname, 'public', 'css')));

app.use('/compras', comprasRoutes);

// Home redirect
app.get('/', (req, res) => res.redirect('/compras'));

// 404 bonito
app.use((req, res) => {
  res.status(404).render('compras_list', {
    title: '404',
    filtros: {},
    semanas: [],
    selectedSemana: '',
    compras: [],
    totalGeneral: 0,
    errorUI: `La página no existe: ${req.originalUrl}`
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor escuchando en http://localhost:${PORT}`));
