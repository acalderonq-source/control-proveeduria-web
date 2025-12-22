const express = require('express');
const ExcelJS = require('exceljs');
const router = express.Router();
const pool = require('../db');

// helpers
function buildWhere({ placa, proveedor, cedis, desde, hasta, semana }) {
  const where = [];
  const params = [];

  if (placa) {
    where.push('placa LIKE ?');
    params.push(`%${placa}%`);
  }
  if (proveedor) {
    where.push('proveedor = ?');
    params.push(proveedor);
  }
  if (cedis) {
    where.push('cedis LIKE ?');
    params.push(`%${cedis}%`);
  }

  // semana en formato YYYY-WW (ej: 2025-51)
  if (semana) {
    const [y, w] = semana.split('-').map(x => Number(x));
    if (!Number.isNaN(y) && !Number.isNaN(w)) {
      // YEARWEEK(fecha,1) => yyyymm (ej 202551)
      where.push('YEARWEEK(fecha, 1) = ?');
      params.push(y * 100 + w);
    }
  } else {
    // rango de fechas
    if (desde) {
      where.push('fecha >= ?');
      params.push(desde);
    }
    if (hasta) {
      where.push('fecha <= ?');
      params.push(hasta);
    }
  }

  const sqlWhere = where.length ? `WHERE ${where.join(' AND ')}` : '';
  return { sqlWhere, params };
}

// LISTADO
router.get('/', async (req, res) => {
  try {
    const filtros = {
      placa: (req.query.placa || '').trim(),
      proveedor: (req.query.proveedor || '').trim(),
      cedis: (req.query.cedis || '').trim(),
      desde: (req.query.desde || '').trim(),
      hasta: (req.query.hasta || '').trim(),
      semana: (req.query.semana || '').trim()
    };

    const { sqlWhere, params } = buildWhere(filtros);

    // semanas disponibles (últimas 20)
    const [wkRows] = await pool.query(`
      SELECT YEARWEEK(fecha, 1) AS yw
      FROM compras
      GROUP BY yw
      ORDER BY yw DESC
      LIMIT 20
    `);

    const semanas = wkRows.map(r => {
      const yw = Number(r.yw); // 202551
      const y = Math.floor(yw / 100);
      const w = yw % 100;
      const ww = String(w).padStart(2, '0');
      return { value: `${y}-${ww}`, label: `Semana ${ww} / ${y}` };
    });

    const [rows] = await pool.query(
      `
      SELECT
        id,
        DATE_FORMAT(fecha, '%d/%m/%Y') AS fecha_fmt,
        fecha,
        cedis,
        proveedor,
        placa,
        producto,
        cantidad,
        precio_unitario,
        (cantidad * precio_unitario) AS total,
        solicito,
        observacion,
        YEARWEEK(fecha, 1) AS yearweek
      FROM compras
      ${sqlWhere}
      ORDER BY fecha DESC, id DESC
      `,
      params
    );

    const totalGeneral = rows.reduce((s, r) => s + Number(r.total || 0), 0);

    res.render('compras_list', {
      title: 'Compras',
      filtros,
      semanas,
      selectedSemana: filtros.semana || '',
      compras: rows,
      totalGeneral,
      errorUI: ''
    });
  } catch (err) {
    console.error('❌ ERROR LISTADO MYSQL:', err);
    res.status(500).render('compras_list', {
      title: 'Compras',
      filtros: {},
      semanas: [],
      selectedSemana: '',
      compras: [],
      totalGeneral: 0,
      errorUI: 'Error consultando MySQL'
    });
  }
});

// FORM NUEVA COMPRA
router.get('/nueva', (req, res) => {
  res.render('compras_new', { title: 'Nueva compra', errorUI: '' });
});

// GUARDAR COMPRA
router.post('/nueva', async (req, res) => {
  try {
    const data = {
      fecha: req.body.fecha,
      cedis: (req.body.cedis || '').trim(),
      proveedor: (req.body.proveedor || '').trim(),
      placa: (req.body.placa || '').trim(),
      producto: (req.body.producto || '').trim(),
      cantidad: Number(req.body.cantidad || 0),
      precio_unitario: Number(req.body.precio_unitario || 0),
      solicito: (req.body.solicito || '').trim(),
      observacion: (req.body.observacion || '').trim()
    };

    if (!data.fecha || !data.cedis || !data.proveedor || !data.placa || !data.producto) {
      return res.status(400).render('compras_new', {
        title: 'Nueva compra',
        errorUI: 'Faltan datos obligatorios (fecha, cedis, proveedor, placa, producto).'
      });
    }

    await pool.query(
      `
      INSERT INTO compras
      (fecha, cedis, proveedor, placa, producto, cantidad, precio_unitario, solicito, observacion)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        data.fecha,
        data.cedis,
        data.proveedor,
        data.placa,
        data.producto,
        data.cantidad,
        data.precio_unitario,
        data.solicito,
        data.observacion
      ]
    );

    res.redirect('/compras');
  } catch (err) {
    console.error('❌ ERROR INSERT:', err);
    res.status(500).render('compras_new', {
      title: 'Nueva compra',
      errorUI: 'Error guardando la compra en MySQL'
    });
  }
});

// DESCARGAR EXCEL (con filtros)
router.get('/export/excel', async (req, res) => {
  try {
    const filtros = {
      placa: (req.query.placa || '').trim(),
      proveedor: (req.query.proveedor || '').trim(),
      cedis: (req.query.cedis || '').trim(),
      desde: (req.query.desde || '').trim(),
      hasta: (req.query.hasta || '').trim(),
      semana: (req.query.semana || '').trim()
    };

    const { sqlWhere, params } = buildWhere(filtros);

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
        (cantidad * precio_unitario) AS total,
        solicito,
        observacion,
        YEARWEEK(fecha, 1) AS yearweek
      FROM compras
      ${sqlWhere}
      ORDER BY fecha DESC
      `,
      params
    );

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Compras');

    ws.columns = [
      { header: 'Semana', key: 'semana', width: 14 },
      { header: 'Fecha', key: 'fecha', width: 14 },
      { header: 'CEDIS', key: 'cedis', width: 14 },
      { header: 'Proveedor', key: 'proveedor', width: 22 },
      { header: 'Placa', key: 'placa', width: 12 },
      { header: 'Producto', key: 'producto', width: 40 },
      { header: 'Cantidad', key: 'cantidad', width: 10 },
      { header: 'P. Unitario', key: 'precio_unitario', width: 14 },
      { header: 'Total', key: 'total', width: 14 },
      { header: 'Solicitó', key: 'solicito', width: 14 },
      { header: 'Observación', key: 'observacion', width: 30 }
    ];

    rows.forEach(r => {
      const yw = Number(r.yearweek);
      const y = Math.floor(yw / 100);
      const w = yw % 100;
      const ww = String(w).padStart(2, '0');

      ws.addRow({
        semana: `Semana ${ww}/${y}`,
        fecha: new Date(r.fecha).toLocaleDateString('es-CR'),
        cedis: r.cedis,
        proveedor: r.proveedor,
        placa: r.placa,
        producto: r.producto,
        cantidad: Number(r.cantidad || 0),
        precio_unitario: Number(r.precio_unitario || 0),
        total: Number(r.total || 0),
        solicito: r.solicito || '',
        observacion: r.observacion || ''
      });
    });

    // estilos básicos de Excel
    ws.getRow(1).font = { bold: true };
    ws.autoFilter = { from: 'A1', to: 'K1' };

    res.setHeader(
      'Content-Disposition',
      `attachment; filename="compras_${Date.now()}.xlsx"`
    );
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );

    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('❌ ERROR EXCEL:', err);
    res.status(500).send('Error generando Excel');
  }
});

module.exports = router;
