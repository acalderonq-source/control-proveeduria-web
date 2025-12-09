const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const ExcelJS = require('exceljs');

/**
 * Formatea fecha YYYY-MM-DD → DD/MM/YYYY
 */
function formatFecha(value) {
  if (!value) return '';
  const d = new Date(value);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * ==========================
 * LISTADO GENERAL
 * ==========================
 */
router.get('/', (req, res) => {
  const db = getDb();
  const { placa, proveedor, cedis, desde, hasta } = req.query;

  let conditions = [];
  let params = [];

  if (placa) {
    conditions.push('placa LIKE ?');
    params.push('%' + placa + '%');
  }
  if (proveedor) {
    conditions.push('proveedor LIKE ?');
    params.push('%' + proveedor + '%');
  }
  if (cedis) {
    conditions.push('cedis LIKE ?');
    params.push('%' + cedis + '%');
  }
  if (desde) {
    conditions.push('fecha >= ?');
    params.push(desde);
  }
  if (hasta) {
    conditions.push('fecha <= ?');
    params.push(hasta);
  }

  let whereClause = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

  const sql = `
    SELECT id, fecha, cedis, proveedor, placa, producto,
           cantidad, precio_unitario, precio_total,
           solicito, observacion
    FROM compras
    ${whereClause}
    ORDER BY fecha DESC, id DESC
  `;

  db.query(sql, params, (err, rows) => {
    if (err) {
      console.error('ERROR LISTANDO:', err);
      return res.status(500).send('Error consultando MySQL');
    }

    rows.forEach((r) => {
      r.fecha_formateada = formatFecha(r.fecha);
    });

    res.render('compras_list', {
      title: 'Compras registradas',
      compras: rows,
      filtros: { placa, proveedor, cedis, desde, hasta },
    });
  });
});

/**
 * ==========================
 * FORMULARIO NUEVA COMPRA
 * ==========================
 */
router.get('/nueva', (req, res) => {
  res.render('compras_new', {
    title: 'Registrar nueva compra',
    error: null,
    form: {},
  });
});

/**
 * ==========================
 * HISTORIAL POR PLACA
 * ==========================
 */
router.get('/placa/:placa', (req, res) => {
  const db = getDb();
  const placa = req.params.placa;

  const sql = `
    SELECT id, fecha, cedis, proveedor, placa, producto,
           cantidad, precio_unitario, precio_total,
           solicito, observacion
    FROM compras
    WHERE placa = ?
    ORDER BY fecha DESC, id DESC
  `;

  db.query(sql, [placa], (err, rows) => {
    if (err) {
      console.error('ERROR POR PLACA:', err);
      return res.status(500).send('Error consultando MySQL');
    }

    let totalMonto = 0;
    let totalCantidad = 0;

    rows.forEach((c) => {
      totalMonto += c.precio_total;
      totalCantidad += c.cantidad;
      c.fecha_formateada = formatFecha(c.fecha);
    });

    res.render('compras_by_placa', {
      title: `Historial placa ${placa}`,
      placa,
      compras: rows,
      totalMonto,
      totalCantidad,
    });
  });
});

/**
 * ==========================
 * INSERTAR NUEVA COMPRA
 * ==========================
 */
router.post('/', (req, res) => {
  const db = getDb();
  const {
    fecha,
    cedis,
    proveedor,
    placa,
    producto,
    cantidad,
    precio_unitario,
    solicito,
    observacion,
  } = req.body;

  if (
    !fecha ||
    !cedis ||
    !proveedor ||
    !placa ||
    !producto ||
    !cantidad ||
    !precio_unitario ||
    !solicito
  ) {
    return res.status(400).render('compras_new', {
      title: 'Registrar nueva compra',
      error: 'Todos los campos marcados con * son obligatorios.',
      form: req.body,
    });
  }

  const cantidadNum = parseFloat(cantidad);
  const precioUnitNum = parseFloat(precio_unitario);

  if (isNaN(cantidadNum) || isNaN(precioUnitNum)) {
    return res.status(400).render('compras_new', {
      title: 'Registrar nueva compra',
      error: 'Cantidad y precio unitario deben ser números válidos.',
      form: req.body,
    });
  }

  const precioTotal = cantidadNum * precioUnitNum;

  const fechaFinal = new Date(fecha).toISOString().slice(0, 10);
  const createdAt = new Date().toISOString().slice(0, 19).replace('T', ' ');

  const sql = `
    INSERT INTO compras (
      fecha, cedis, proveedor, placa, producto,
      cantidad, precio_unitario, precio_total,
      solicito, observacion, created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const params = [
    fechaFinal,
    cedis.trim(),
    proveedor.trim(),
    placa.trim().toUpperCase(),
    producto.trim(),
    cantidadNum,
    precioUnitNum,
    precioTotal,
    solicito.trim(),
    observacion ? observacion.trim() : null,
    createdAt,
  ];

  db.query(sql, params, (err, result) => {
    if (err) {
      console.error('ERROR INSERTANDO COMPRA:', err);
      return res.status(500).render('compras_new', {
        title: 'Registrar nueva compra',
        error: `Error guardando la compra en MySQL: ${err.message}`,
        form: req.body,
      });
    }

    res.redirect(`/compras/placa/${placa.trim().toUpperCase()}`);
  });
});

/**
 * ==========================
 * DESCARGAR EXCEL SEGÚN FILTRO
 * ==========================
 */
router.get('/excel', (req, res) => {
  const db = getDb();
  const { placa, proveedor, cedis, desde, hasta } = req.query;

  let conditions = [];
  let params = [];

  if (placa) {
    conditions.push('placa LIKE ?');
    params.push('%' + placa + '%');
  }
  if (proveedor) {
    conditions.push('proveedor LIKE ?');
    params.push('%' + proveedor + '%');
  }
  if (cedis) {
    conditions.push('cedis LIKE ?');
    params.push('%' + cedis + '%');
  }
  if (desde) {
    conditions.push('fecha >= ?');
    params.push(desde);
  }
  if (hasta) {
    conditions.push('fecha <= ?');
    params.push(hasta);
  }

  let whereClause = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

  const sql = `
    SELECT fecha, cedis, proveedor, placa, producto,
           cantidad, precio_unitario, precio_total,
           solicito, observacion
    FROM compras
    ${whereClause}
    ORDER BY fecha DESC
  `;

  db.query(sql, params, async (err, rows) => {
    if (err) {
      console.error('ERROR EXCEL:', err);
      return res.status(500).send('Error generando Excel');
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Reporte Compras');

    sheet.columns = [
      { header: 'Fecha', key: 'fecha', width: 15 },
      { header: 'CEDIS', key: 'cedis', width: 15 },
      { header: 'Proveedor', key: 'proveedor', width: 25 },
      { header: 'Placa', key: 'placa', width: 12 },
      { header: 'Producto', key: 'producto', width: 30 },
      { header: 'Cantidad', key: 'cantidad', width: 10 },
      { header: 'P.Unitario', key: 'precio_unitario', width: 14 },
      { header: 'Total', key: 'precio_total', width: 14 },
      { header: 'Solicitó', key: 'solicito', width: 15 },
      { header: 'Obs', key: 'observacion', width: 25 },
    ];

    rows.forEach((r) => {
      sheet.addRow({
        fecha: formatFecha(r.fecha),
        cedis: r.cedis,
        proveedor: r.proveedor,
        placa: r.placa,
        producto: r.producto,
        cantidad: r.cantidad,
        precio_unitario: r.precio_unitario,
        precio_total: r.precio_total,
        solicito: r.solicito,
        observacion: r.observacion || '',
      });
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="reporte_compras.xlsx"'
    );

    await workbook.xlsx.write(res);
    res.end();
  });
});

module.exports = router;
