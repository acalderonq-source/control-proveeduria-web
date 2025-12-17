const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const ExcelJS = require('exceljs');

/* =====================================================
   UTILIDAD: FORMATEAR FECHA DD/MM/YYYY
===================================================== */
function formatFecha(value) {
  if (!value) return '';
  const d = new Date(value);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/* =====================================================
   LISTADO GENERAL + FILTRO POR SEMANA
===================================================== */
router.get('/', (req, res) => {
  const db = getDb();
  const { placa, proveedor, cedis, desde, hasta, semana } = req.query;

  let conditions = [];
  let params = [];

  if (placa) {
    conditions.push('placa LIKE ?');
    params.push(`%${placa}%`);
  }

  if (proveedor) {
    conditions.push('proveedor LIKE ?');
    params.push(`%${proveedor}%`);
  }

  if (cedis) {
    conditions.push('cedis LIKE ?');
    params.push(`%${cedis}%`);
  }

  if (desde) {
    conditions.push('fecha >= ?');
    params.push(desde);
  }

  if (hasta) {
    conditions.push('fecha <= ?');
    params.push(hasta);
  }

  // ⭐ FILTRO POR SEMANA ISO
  if (semana) {
    const [year, week] = semana.split('-W');
    conditions.push(
      'YEARWEEK(fecha, 1) = YEARWEEK(STR_TO_DATE(?, "%x-W%v"), 1)'
    );
    params.push(`${year}-W${week}`);
  }

  const where = conditions.length
    ? 'WHERE ' + conditions.join(' AND ')
    : '';

  const sql = `
    SELECT id,
           fecha,
           YEARWEEK(fecha, 1) AS semana,
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
    ${where}
    ORDER BY fecha DESC, id DESC
  `;

  db.query(sql, params, (err, rows) => {
    if (err) {
      console.error('ERROR LISTADO:', err);
      return res.status(500).send('Error consultando compras');
    }

    let totalSemana = 0;

    rows.forEach(r => {
      r.fecha_formateada = formatFecha(r.fecha);
      r.semana_label = `Semana ${String(r.semana).slice(4)} / ${String(r.semana).slice(0, 4)}`;
      totalSemana += r.precio_total;
    });

    res.render('compras_list', {
      title: 'Control semanal de compras',
      compras: rows,
      totalSemana,
      filtros: { placa, proveedor, cedis, desde, hasta, semana },
    });
  });
});

/* =====================================================
   FORMULARIO NUEVA COMPRA
===================================================== */
router.get('/nueva', (req, res) => {
  res.render('compras_new', {
    title: 'Registrar compra',
    error: null,
    form: {},
  });
});

/* =====================================================
   INSERTAR NUEVA COMPRA
===================================================== */
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
    return res.render('compras_new', {
      title: 'Registrar compra',
      error: 'Todos los campos marcados con * son obligatorios.',
      form: req.body,
    });
  }

  const cantidadNum = parseFloat(cantidad);
  const precioUnitNum = parseFloat(precio_unitario);
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

  db.query(sql, params, err => {
    if (err) {
      console.error('ERROR INSERT:', err);
      return res.render('compras_new', {
        title: 'Registrar compra',
        error: 'Error guardando la compra',
        form: req.body,
      });
    }

    res.redirect(`/compras/placa/${placa.trim().toUpperCase()}`);
  });
});

/* =====================================================
   HISTORIAL POR PLACA
===================================================== */
router.get('/placa/:placa', (req, res) => {
  const db = getDb();
  const placa = req.params.placa;

  const sql = `
    SELECT fecha,
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
    WHERE placa = ?
    ORDER BY fecha DESC
  `;

  db.query(sql, [placa], (err, rows) => {
    if (err) return res.status(500).send('Error consultando placa');

    let totalMonto = 0;
    let totalCantidad = 0;

    rows.forEach(r => {
      r.fecha_formateada = formatFecha(r.fecha);
      totalMonto += r.precio_total;
      totalCantidad += r.cantidad;
    });

    res.render('compras_by_placa', {
      title: `Historial ${placa}`,
      placa,
      compras: rows,
      totalMonto,
      totalCantidad,
    });
  });
});

/* =====================================================
   DESCARGAR EXCEL (RESPETA FILTROS Y SEMANA)
===================================================== */
router.get('/excel', (req, res) => {
  const db = getDb();
  const { placa, proveedor, cedis, desde, hasta, semana } = req.query;

  let conditions = [];
  let params = [];

  if (placa) { conditions.push('placa LIKE ?'); params.push(`%${placa}%`); }
  if (proveedor) { conditions.push('proveedor LIKE ?'); params.push(`%${proveedor}%`); }
  if (cedis) { conditions.push('cedis LIKE ?'); params.push(`%${cedis}%`); }
  if (desde) { conditions.push('fecha >= ?'); params.push(desde); }
  if (hasta) { conditions.push('fecha <= ?'); params.push(hasta); }

  if (semana) {
    const [year, week] = semana.split('-W');
    conditions.push(
      'YEARWEEK(fecha, 1) = YEARWEEK(STR_TO_DATE(?, "%x-W%v"), 1)'
    );
    params.push(`${year}-W${week}`);
  }

  const where = conditions.length
    ? 'WHERE ' + conditions.join(' AND ')
    : '';

  const sql = `
    SELECT fecha, cedis, proveedor, placa, producto,
           cantidad, precio_unitario, precio_total,
           solicito, observacion
    FROM compras
    ${where}
    ORDER BY fecha DESC
  `;

  db.query(sql, params, async (err, rows) => {
    if (err) return res.status(500).send('Error generando Excel');

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Compras');

    ws.columns = [
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

    rows.forEach(r => {
      ws.addRow({
        ...r,
        fecha: formatFecha(r.fecha),
      });
    });

    res.setHeader(
      'Content-Disposition',
      `attachment; filename="reporte_compras_${semana || 'todas'}.xlsx"`
    );
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );

    await wb.xlsx.write(res);
    res.end();
  });
});

module.exports = router;
