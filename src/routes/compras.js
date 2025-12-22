const express = require('express');
const router = express.Router();
const pool = require('../db');

/* =========================
   LISTADO DE COMPRAS
   URL: /compras
========================= */
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
        f.numero   AS factura_numero,
        f.fecha    AS factura_fecha,
        f.proveedor,
        f.cedis
      FROM compras c
      INNER JOIN facturas f ON f.id = c.factura_id
      ORDER BY f.fecha DESC, c.id DESC
    `);

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

  } catch (error) {
    console.error(error);

    res.render('compras_list', {
      title: 'Control Proveeduría',
      compras: [],
      totalGeneral: 0,
      errorUI: 'Error consultando compras'
    });
  }
});

/* =========================
   NUEVA COMPRA (FORM)
   URL: /compras/nueva
========================= */
router.get('/nueva', (req, res) => {
  res.render('compras_new', {
    title: 'Registrar compra'
  });
});

module.exports = router;
