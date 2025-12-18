const express = require('express');
const router = express.Router();
const pool = require('../db');
const ExcelJS = require('exceljs');

/**
 * ============================
 * LISTADO + CONTROL SEMANAL
 * ============================
 */
router.get('/', async (req, res) => {
  const { placa, proveedor, cedis, desde, hasta, semana } = req.query;

  let where = [];
  let params = [];

  if (placa) {
    where.push('placa LIKE ?');
    params.push(`%${placa}%`);
  }

  if (proveedor) {
    where.push('proveedor LIKE ?');
    params.push(`%${proveedor}%`);
  }

  if (cedis) {
    where.push('cedis LIKE ?');
    params.push(`%${cedis}%`);
  }

  if (desde) {
    where.push('fecha >= ?');
    params.push(desde);
  }

  if (hasta) {
    where.push('fecha <= ?');
    params.push(hasta);
  }

  if (semana) {
    where.push('YEARWEEK(fecha, 1) = ?');
    params.push(semana);
  }

  const whereSQL = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const sql = `
    SELECT
      id,
      fecha,
      YEARWEEK(fecha, 1) AS semana,
      cedis,
      proveedor,
      placa,
      producto,
      cantidad,
      precio_unitario,
      (cantidad * precio_unitario) AS total,
      solicito,
      observacion
    FROM compras
    ${whereSQL}
    ORDER BY fecha DESC, id DESC
  `;

  try {
    const [compras] = await pool.query(sql, params);

    let totalGeneral = 0;
    compras.forEach(c => totalGeneral += Number(c.total || 0));

    res.render('compras_list', {
      title: 'Control de compras',
      compras,
      totalGeneral,
      filtros: { placa, proveedor, cedis, desde, hasta, semana }
    });

  } catch (err) {
    console.error(err);
    res.status(500).send('Error cargando compras');
  }
});

/**
 * ============================
 * FORM NUEVA COMPRA
 * ============================
 */
router.get('/nueva', (req, res) => {
  res.render('compras_new', {
    title: 'Registrar compra',
    proveedores: [
      'PURDY',
      'MAXI',
      'SERVI',
      'DAITOMA',
      'AROS Y LLANTAS MUNDIALES',
      'ET BATERIAS',
      'LAPA GREEN',
      'OTRO'
    ]
  });
});

/**
 * ============================
 * GUARDAR COMPRA
 * ============================
 */
router.post('/nueva', async (req, res) => {
  const {
    fecha,
    cedis,
    proveedor,
    proveedor_otro,
    placa,
    producto,
    cantidad,
    precio_unitario,
    solicito,
    observacion
  } = req.body;

  const proveedorFinal =
    proveedor === 'OTRO' ? proveedor_otro : proveedor;

  const sql = `
    INSERT INTO compras
    (fecha, cedis, proveedor, placa, producto, cantidad, precio_unitario, solicito, observacion)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  try {
    await pool.query(sql, [
      fecha,
      cedis,
      proveedorFinal,
      placa,
      producto,
      cantidad,
      precio_unitario,
      solicito,
      observacion
    ]);

    res.redirect('/compras');

  } catch (err) {
    console.error(err);
    res.status(500).send('Error guardando compra');
  }
});

/**
 * ============================
 * DESCARGAR EXCEL
 * ============================
 */
router.get('/excel', async (req, res) => {
  const { desde, hasta } = req.query;

  let where = [];
  let params = [];

  if (desde) {
    where.push('fecha >= ?');
    params.push(desde);
  }

  if (hasta) {
    where.push('fecha <= ?');
    params.push(hasta);
  }

  const whereSQL = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const sql = `
    SELECT
      fecha,
      cedis,
      proveedor,
      placa,
      producto,
      cantidad,
      precio_unitario,
      (cantidad * precio_unitario) AS total,
      solicito
    FROM compras
    ${whereSQL}
    ORDER BY fecha ASC
  `;

  const [rows] = await pool.query(sql, params);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Compras');

  sheet.columns = [
    { header: 'Fecha', key: 'fecha' },
    { header: 'CEDIS', key: 'cedis' },
    { header: 'Proveedor', key: 'proveedor' },
    { header: 'Placa', key: 'placa' },
    { header: 'Producto', key: 'producto' },
    { header: 'Cantidad', key: 'cantidad' },
    { header: 'Precio Unitario', key: 'precio_unitario' },
    { header: 'Total', key: 'total' },
    { header: 'Solicitó', key: 'solicito' }
  ];

  rows.forEach(r => sheet.addRow(r));

  res.setHeader(
    'Content-Disposition',
    'attachment; filename=compras.xlsx'
  );

  await workbook.xlsx.write(res);
  res.end();
});

module.exports = router;
