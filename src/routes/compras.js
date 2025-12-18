const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const ExcelJS = require('exceljs');

/**
 * ============================
 * LISTADO + FILTROS + SEMANA
 * ============================
 */
router.get('/', (req, res) => {
  const db = getDb();

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

  db.query(sql, params, (err, rows) => {
    if (err) {
      console.error('ERROR LISTADO:', err);
      return res.status(500).send('Error cargando compras');
    }

    let totalGeneral = 0;
    rows.forEach(r => totalGeneral += Number(r.total || 0));

    res.render('compras_list', {
      title: 'Control de compras',
      compras: rows,
      totalGeneral,
      filtros: { placa, proveedor, cedis, desde, hasta, semana }
    });
  });
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
router.post('/nueva', (req, res) => {
  const db = getDb();

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

  const params = [
    fecha,
    cedis,
    proveedorFinal,
    placa,
    producto,
    cantidad,
    precio_unitario,
    solicito,
    observacion
  ];

  db.query(sql, params, (err) => {
    if (err) {
      console.error('ERROR GUARDAR:', err);
      return res.status(500).send('Error guardando compra');
    }

    res.redirect('/compras');
  });
});

/**
 * ============================
 * EXPORTAR EXCEL
 * ============================
 */
router.get('/excel', (req, res) => {
  const db = getDb();
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

  db.query(sql, params, async (err, rows) => {
    if (err) {
      console.error('ERROR EXCEL:', err);
      return res.status(500).send('Error generando Excel');
    }

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
});

module.exports = router;
