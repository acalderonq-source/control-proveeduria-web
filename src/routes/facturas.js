const express = require('express');
const router = express.Router();
const pool = require('../db');

// ========================
// NUEVA FACTURA (FORM)
// ========================
router.get('/nueva', (req, res) => {
  res.render('factura_new', {
    title: 'Nueva factura'
  });
});

// ========================
// GUARDAR FACTURA
// ========================
router.post('/nueva', async (req, res) => {
  try {
    const { numero, fecha, proveedor, cedis } = req.body;

    await pool.query(
      `INSERT INTO facturas (numero, fecha, proveedor, cedis)
       VALUES (?, ?, ?, ?)`,
      [numero, fecha, proveedor, cedis]
    );

    res.redirect('/compras');
  } catch (error) {
    console.error('❌ Error guardando factura:', error);
    res.redirect('/compras/factura/nueva?err=Error al guardar factura');
  }
});

module.exports = router;
