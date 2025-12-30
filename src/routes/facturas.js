const express = require('express');
const router = express.Router();
const pool = require('../db');

// FORM NUEVA FACTURA
router.get('/nueva', (req, res) => {
  res.render('factura_new', {
    title: 'Nueva factura',
    errorUI: null,
    form: {}
  });
});

// GUARDAR FACTURA
router.post('/', async (req, res) => {
  try {
    const { numero, fecha, proveedor, cedis } = req.body;

    if (!numero || !fecha || !proveedor || !cedis) {
      return res.render('factura_new', {
        title: 'Nueva factura',
        errorUI: 'Faltan datos obligatorios',
        form: req.body
      });
    }

    await pool.query(
      `INSERT INTO facturas (numero, fecha, proveedor, cedis)
       VALUES (?, ?, ?, ?)`,
      [numero, fecha, proveedor, cedis]
    );

    res.redirect('/compras/nueva');

  } catch (err) {
    console.error('❌ ERROR FACTURA:', err);
    res.render('factura_new', {
      title: 'Nueva factura',
      errorUI: 'Error guardando factura',
      form: req.body
    });
  }
});

module.exports = router;
