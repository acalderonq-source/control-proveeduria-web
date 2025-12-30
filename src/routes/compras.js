const express = require('express');
const router = express.Router();
const ExcelJS = require('exceljs');
const pool = require('../db'); // mysql2/promise pool

// ============================
// LISTADO + FILTROS
// ============================
router.get('/', async (req, res) => {
  try {
    const { semana, placa, proveedor, cedis } = req.query;

    let where = [];
    let params = [];

    // FILTRO SEMANA
    if (semana) {
      where.push(`YEARWEEK(fecha, 1) = YEARWEEK(?, 1)`);
      params.push(`${semana}-1`);
    }

    // FILTRO PLACA
    if (placa) {
      where.push(`placa LIKE ?`);
      params.push(`%${placa}%`);
    }

    // FILTRO PROVEEDOR
    if (proveedor) {
      where.push(`proveedor LIKE ?`);
      params.push(`%${proveedor}%`);
    }

    // FILTRO CEDIS
    if (cedis) {
      where.push(`cedis = ?`);
      params.push(cedis);
    }

    const whereSQL = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [compras] = await pool.query(
      `
      SELECT
        DATE_FORMAT(fecha, '%d/%m/%Y') AS fecha,
        proveedor,
        cedis,
        placa,
        producto,
        cantidad,
        precio_unitario,
        precio_total,
        solicito
      FROM compras
      ${whereSQL}
      ORDER BY fecha DESC, id DESC
      `,
      params
    );

    const totalGeneral = compras.reduce(
      (sum, c) => sum + Number(c.precio_total || 0),
      0
    );

    res.render('compras_list', {
      compras,
      totalGeneral,
      query: req.query
    });

  } catch (error) {
    console.error('❌ ERROR LISTADO MYSQL:', error);
    res.status(500).send('Error cargando listado de compras');
  }
});

// ============================
// FORM NUEVA COMPRA
// ============================
router.get('/nueva', (req, res) => {
  res.render('compras_new');
});

// ============================
// GUARDAR COMPRA
// ============================
router.post('/', async (req, res) => {
  try {
    const {
      fecha,
      proveedor,
      cedis,
      placa,
      producto,
      cantidad,
      precio_unitario,
      solicito,
      observacion
    } = req.body;

    // VALIDACIÓN BÁSICA
    if (!fecha || !proveedor || !cedis || !placa || !producto || !cantidad || !precio_unitario) {
      return res.status(400).send('Faltan datos obligatorios');
    }

    const precio_total = Number(cantidad) * Number(precio_unitario);

    await pool.query(
      `
      INSERT INTO compras
      (
        fecha,
        proveedor,
        cedis,
        placa,
        producto,
        cantidad,
        precio_unitario,
        precio_total,
        solicito,
        observacion
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        fecha,
        proveedor,
        cedis,
        placa,
        producto,
        cantidad,
        precio_unitario,
        precio_total,
        solicito || null,
        observacion || null
      ]
    );

    res.redirect('/compras');

  } catch (error) {
    console.error('❌ ERROR GUARDANDO COMPRA:', error);
    res.status(500).send('Error guardando la compra');
  }
});

// ============================
// EXPORTAR EXCEL
// ============================
router.get('/export/excel', async (req, res) => {
  try {
    const { semana, placa, proveedor, cedis } = req.query;

    let where = [];
    let params = [];

    if (semana) {
      where.push(`YEARWEEK(fecha, 1) = YEARWEEK(?, 1)`);
      params.push(`${semana}-1`);
    }
    if (placa) {
      where.push(`placa LIKE ?`);
      params.push(`%${placa}%`);
    }
    if (proveedor) {
      where.push(`proveedor LIKE ?`);
      params.push(`%${proveedor}%`);
    }
    if (cedis) {
      where.push(`cedis = ?`);
      params.push(cedis);
    }

    const whereSQL = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [rows] = await pool.query(
      `
      SELECT
        fecha,
        cedis,
        proveedor,
        placa,
        producto,
        cantidad,
        precio_unitario,
        precio_total,
        solicito
      FROM compras
      ${whereSQL}
      ORDER BY fecha DESC
      `,
      params
    );

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Compras');

    ws.columns = [
      { header: 'Fecha', key: 'fecha', width: 12 },
      { header: 'CEDIS', key: 'cedis', width: 15 },
      { header: 'Proveedor', key: 'proveedor', width: 25 },
      { header: 'Placa', key: 'placa', width: 15 },
      { header: 'Producto', key: 'producto', width: 30 },
      { header: 'Cantidad', key: 'cantidad', width: 10 },
      { header: 'Precio', key: 'precio_unitario', width: 15 },
      { header: 'Total', key: 'precio_total', width: 15 },
      { header: 'Solicitó', key: 'solicito', width: 20 }
    ];

    rows.forEach(r => ws.addRow(r));

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=compras.xlsx'
    );

    await wb.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('❌ ERROR EXCEL:', error);
    res.status(500).send('Error exportando Excel');
  }
});

module.exports = router;
