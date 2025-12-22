const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// ===============================
// LISTADO DE COMPRAS
// ===============================
router.get('/', async (req, res) => {
  try {
    const placa = req.query.placa || '';
    const proveedor = req.query.proveedor || '';
    const cedis = req.query.cedis || '';

    const [compras] = await pool.query(
      `
      SELECT
        id,
        fecha,
        cedis,
        proveedor,
        placa,
        producto,
        cantidad,
        precio_unitario,
        precio_total,
        solicito,
        observacion
      FROM compras
      WHERE placa LIKE ?
        AND proveedor LIKE ?
        AND cedis LIKE ?
      ORDER BY fecha DESC, id DESC
      `,
      [`%${placa}%`, `%${proveedor}%`, `%${cedis}%`]
    );

    // ===============================
    // TOTAL GENERAL
    // ===============================
    let totalGeneral = 0;
    compras.forEach(c => {
      totalGeneral += Number(c.precio_total || 0);
    });

    res.render('compras_list', {
      title: 'Control de Compras',
      compras,
      filtros: { placa, proveedor, cedis },
      totalGeneral
    });

  } catch (error) {
    console.error('❌ ERROR LISTADO MYSQL:', error);
    res.status(500).send('Error consultando MySQL');
  }
});

// ===============================
// FORMULARIO NUEVA COMPRA
// ===============================
router.get('/nueva', (req, res) => {
  res.render('compras_new', {
    title: 'Nueva Compra',
    error: null,
    form: {}
  });
});

// ===============================
// GUARDAR COMPRA
// ===============================
router.post('/', async (req, res) => {
  try {
    const {
      fecha,
      cedis,
      proveedor,
      placa,
      producto,
      cantidad,
      precio_unitario,
      solicito,
      observacion
    } = req.body;

    if (!fecha || !cedis || !proveedor || !placa || !producto || !cantidad || !precio_unitario || !solicito) {
      return res.render('compras_new', {
        title: 'Nueva Compra',
        error: 'Complete todos los campos obligatorios',
        form: req.body
      });
    }

    const cantidadNum = Number(cantidad);
    const precioUnitNum = Number(precio_unitario);
    const precioTotal = cantidadNum * precioUnitNum;

    const fechaMysql = new Date(fecha).toISOString().slice(0, 10);
    const createdAt = new Date().toISOString().slice(0, 19).replace('T', ' ');

    await pool.query(
      `
      INSERT INTO compras (
        fecha, cedis, proveedor, placa, producto,
        cantidad, precio_unitario, precio_total,
        solicito, observacion, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        fechaMysql,
        cedis.trim(),
        proveedor.trim(),
        placa.trim().toUpperCase(),
        producto.trim(),
        cantidadNum,
        precioUnitNum,
        precioTotal,
        solicito.trim(),
        observacion || null,
        createdAt
      ]
    );

    res.redirect('/compras');

  } catch (error) {
    console.error('❌ ERROR INSERT MYSQL:', error);
    res.status(500).send('Error guardando la compra');
  }
});

module.exports = router;
