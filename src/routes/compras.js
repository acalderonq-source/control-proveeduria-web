const express = require('express');
const router = express.Router();
const pool = require('../db'); // mysql2/promise pool

/* ===============================
   LISTADO DE COMPRAS
   GET /compras
================================ */
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        c.id,
        c.factura_id,
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

    const totalGeneral = rows.reduce(
      (sum, r) => sum + Number(r.total || 0),
      0
    );

    res.render('compras_list', {
      title: 'Listado de Compras',
      compras: rows,
      totalGeneral
    });
  } catch (error) {
    console.error('❌ ERROR LISTADO MYSQL:', error);
    res.status(500).send('Error consultando compras');
  }
});

/* ===============================
   FORM NUEVA FACTURA
   GET /compras/factura/nueva
================================ */
router.get('/factura/nueva', (req, res) => {
  res.render('factura_view', {
    title: 'Nueva factura',
    error: req.query.err || null
  });
});

/* ===============================
   GUARDAR FACTURA
   POST /compras/factura
================================ */
router.post('/factura', async (req, res) => {
  const { numero, fecha, proveedor, cedis } = req.body;

  try {
    const [result] = await pool.query(
      `
      INSERT INTO facturas (numero, fecha, proveedor, cedis)
      VALUES (?, ?, ?, ?)
      `,
      [numero, fecha, proveedor, cedis]
    );

    res.redirect(`/compras/factura/${result.insertId}`);
  } catch (error) {
    console.error('❌ ERROR GUARDANDO FACTURA:', error);
    res.redirect('/compras/factura/nueva?err=Error guardando la factura');
  }
});

/* ===============================
   VER FACTURA + ITEMS
   GET /compras/factura/:id
================================ */
router.get('/factura/:id', async (req, res) => {
  const facturaId = req.params.id;

  try {
    const [[factura]] = await pool.query(
      `SELECT * FROM facturas WHERE id = ?`,
      [facturaId]
    );

    if (!factura) {
      return res.status(404).render('404', {
        title: 'Factura no encontrada',
        path: req.originalUrl
      });
    }

    const [items] = await pool.query(
      `SELECT * FROM compras WHERE factura_id = ?`,
      [facturaId]
    );

    res.render('factura_items', {
      title: `Factura ${factura.numero}`,
      factura,
      items
    });
  } catch (error) {
    console.error('❌ ERROR CARGANDO FACTURA:', error);
    res.status(500).send('Error cargando factura');
  }
});

/* ===============================
   AGREGAR ITEM A FACTURA
   POST /compras/factura/:id/item
================================ */
router.post('/factura/:id/item', async (req, res) => {
  const facturaId = req.params.id;
  const { placa, producto, cantidad, precio_unitario, solicito, observacion } =
    req.body;

  try {
    await pool.query(
      `
      INSERT INTO compras
      (factura_id, placa, producto, cantidad, precio_unitario, solicito, observacion)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        facturaId,
        placa,
        producto,
        Number(cantidad),
        Number(precio_unitario),
        solicito,
        observacion || null
      ]
    );

    res.redirect(`/compras/factura/${facturaId}`);
  } catch (error) {
    console.error('❌ ERROR GUARDANDO COMPRA MYSQL:', {
      message: error.message,
      sqlMessage: error.sqlMessage,
      code: error.code
    });

    res.redirect(
      `/compras/factura/${facturaId}?err=Error guardando el ítem`
    );
  }
});

module.exports = router;
