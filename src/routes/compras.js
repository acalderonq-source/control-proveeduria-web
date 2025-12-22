const express = require('express');
const router = express.Router();
const pool = require('../db');

/**
 * LISTADO DE COMPRAS (por factura)
 */
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

    // ✅ TOTAL GENERAL (OBLIGATORIO)
    const totalGeneral = rows.reduce(
      (acc, row) => acc + Number(row.total || 0),
      0
    );

    res.render('compras_list', {
      title: 'Control de Proveeduría',
      compras: rows,
      totalGeneral,
      errorUI: null
    });

  } catch (error) {
    console.error('❌ ERROR LISTADO MYSQL:', error);

    res.render('compras_list', {
      title: 'Control de Proveeduría',
      compras: [],
      totalGeneral: 0,
      errorUI: 'Error consultando compras en la base de datos'
    });
  }
});

module.exports = router;
