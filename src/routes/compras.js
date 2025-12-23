const express = require('express');
const router = express.Router();
const { pool } = require('../db');

/**
 * LISTADO DE COMPRAS
 * Muestra compras con datos de la factura
 */
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        c.id,
        c.fecha,
        c.placa,
        c.producto,
        c.cantidad,
        c.precio_unitario,
        (c.cantidad * c.precio_unitario) AS total,
        c.solicito,
        c.observacion,
        f.numero   AS factura_numero,
        f.proveedor,
        f.cedis
      FROM compras c
      INNER JOIN facturas f ON f.id = c.factura_id
      ORDER BY c.fecha DESC, c.id DESC
    `);

    let totalGeneral = 0;
    rows.forEach(r => {
      totalGeneral += Number(r.total || 0);
    });

    res.render('compras_list', {
      title: 'Compras',
      compras: rows,
      totalGeneral
    });

  } catch (err) {
    console.error('❌ ERROR LISTADO MYSQL:', err);
    res.status(500).render('compras_list', {
      title: 'Compras',
      compras: [],
      totalGeneral: 0,
      errorUI: 'Error consultando compras en MySQL'
    });
  }
});

/**
 * FORMULARIO NUEVA COMPRA
 */
router.get('/nueva', async (req, res) => {
  try {
    // Facturas para seleccionar
    const [facturas] = await pool.query(`
      SELECT id, numero, proveedor
      FROM facturas
      ORDER BY fecha DESC
    `);

    res.render('compras_new', {
      title: 'Nueva compra',
      facturas,
      errorUI: null
    });

  } catch (err) {
    console.error('❌ ERROR CARGANDO FORM:', err);
    res.status(500).send('Error cargando formulario');
  }
});

/**
 * GUARDAR COMPRA
 */
router.post('/', async (req, res) => {
  try {
    const {
      factura_id,
      fecha,
      placa,
      producto,
      cantidad,
      precio_unitario,
      solicito,
      observacion
    } = req.body;

    // Validaciones mínimas
    if (
      !factura_id ||
      !fecha ||
      !placa ||
      !producto ||
      !cantidad ||
      !precio_unitario
    ) {
      return res.status(400).send('Faltan datos obligatorios');
    }

    const sql = `
      INSERT INTO compras (
        factura_id,
        fecha,
        placa,
        producto,
        cantidad,
        precio_unitario,
        solicito,
        observacion
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      factura_id,
      fecha, // YYYY-MM-DD
      placa.trim().toUpperCase(),
      producto.trim(),
      Number(cantidad),
      Number(precio_unitario),
      solicito ? solicito.trim() : null,
      observacion || null
    ];

    await pool.query(sql, params);

    res.redirect('/compras');

  } catch (err) {
    console.error('❌ ERROR GUARDANDO COMPRA:', err);
    res.status(500).send('Error guardando la compra en MySQL');
  }
});

module.exports = router;
