const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

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

// =====================================================
// LISTADO GENERAL DE COMPRAS
// =====================================================
router.get('/', (req, res) => {
  const db = getDb();
  const { placa, proveedor, cedis } = req.query;

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

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const sql = `
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
    ${whereClause}
    ORDER BY fecha DESC, id DESC
  `;

  db.query(sql, params, (err, rows) => {
    if (err) {
      console.error('ERROR LISTADO:', err);
      return res.status(500).send('Error consultando compras');
    }

    rows.forEach(r => {
      r.fecha_formateada = formatFecha(r.fecha);
    });

    res.render('compras_list', {
      title: 'Compras',
      compras: rows,
      filtros: { placa, proveedor, cedis }
    });
  });
});

// =====================================================
// FORMULARIO NUEVA COMPRA
// =====================================================
router.get('/nueva', (req, res) => {
  res.render('compras_new', {
    title: 'Registrar compra',
    error: null,
    form: {}
  });
});

// =====================================================
// INSERTAR NUEVA COMPRA
// =====================================================
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
    observacion
  } = req.body;

  if (!fecha || !cedis || !proveedor || !placa || !producto || !cantidad || !precio_unitario || !solicito) {
    return res.render('compras_new', {
      title: 'Registrar compra',
      error: 'Todos los campos marcados con * son obligatorios',
      form: req.body
    });
  }

  const cantidadNum = parseFloat(cantidad);
  const precioUnitNum = parseFloat(precio_unitario);
  const precioTotal = cantidadNum * precioUnitNum;

  const sql = `
    INSERT INTO compras (
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
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const params = [
    fecha,
    cedis.trim(),
    proveedor.trim(),
    placa.trim().toUpperCase(),
    producto.trim(),
    cantidadNum,
    precioUnitNum,
    precioTotal,
    solicito.trim(),
    observacion ? observacion.trim() : null
  ];

  db.query(sql, params, (err) => {
    if (err) {
      console.error('ERROR INSERT:', err);
      return res.render('compras_new', {
        title: 'Registrar compra',
        error: 'Error guardando la compra',
        form: req.body
      });
    }

    res.redirect('/compras');
  });
});

// =====================================================
// HISTORIAL POR PLACA
// =====================================================
router.get('/placa/:placa', (req, res) => {
  const db = getDb();
  const placa = req.params.placa;

  const sql = `
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
    WHERE placa = ?
    ORDER BY fecha DESC, id DESC
  `;

  db.query(sql, [placa], (err, rows) => {
    if (err) {
      console.error('ERROR POR PLACA:', err);
      return res.status(500).send('Error consultando historial');
    }

    let totalMonto = 0;
    let totalCantidad = 0;

    rows.forEach(r => {
      totalMonto += r.precio_total;
      totalCantidad += r.cantidad;
      r.fecha_formateada = formatFecha(r.fecha);
    });

    res.render('compras_by_placa', {
      title: `Historial ${placa}`,
      placa,
      compras: rows,
      totalMonto,
      totalCantidad
    });
  });
});

// =====================================================
// RUTA FACTURAS (DESHABILITADA POR AHORA)
// =====================================================
router.get('/factura/:id/items', (req, res) => {
  return res.status(501).send('Función de facturas no habilitada todavía');
});

module.exports = router;
