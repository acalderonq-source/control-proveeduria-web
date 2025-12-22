const express = require('express');
const router = express.Router();
const pool = require('../db');

// LISTADO DE COMPRAS
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        c.id,
        c.placa,
        c.producto,
        c.cantidad,
        c.precio_unitario,
        (c.cantidad * c.precio_unitario) AS total,
        c.solicito,
        c.observacion,
        f.numero AS factura_numero,
        f.fecha,
        f.proveedor,
        f.cedis
      FROM compras c
      INNER JOIN facturas f ON f.id = c.factura_id
      ORDER BY f.fecha DESC, c.id DESC
    `);

    // ✅ CALCULAR TOTAL GENERAL
    const totalGeneral = rows.reduce(
      (acc, r) => acc + Number(r.total || 0),
      0
    );

    res.render('compras_list', {
      title: 'Control Proveeduría',
      compras: rows,
      totalGeneral,
      errorUI: null
    });

  } catch (err) {
    console.error('❌ ERROR LISTADO MYSQL:', err);

    res.render('compras_list', {
      title: 'Control Proveeduría',
      compras: [],
      totalGeneral: 0,
      errorUI: 'Error consultando compras'
    });
  }
});

module.exports = router;
