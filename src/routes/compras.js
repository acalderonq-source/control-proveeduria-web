const express = require('express');
const { getDb } = require('../db');
const router = express.Router();

/**
 * FORMATEADOR DE FECHA
 * Convierte fecha de MySQL a formato 09/12/2025
 */
function formatFecha(value) {
  if (!value) return '';
  const d = (value instanceof Date) ? value : new Date(value);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

// =============================================================
// LISTADO GENERAL
// =============================================================
router.get('/', (req, res) => {
  const db = getDb();
  const { placa, proveedor, cedis } = req.query;

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

  let whereClause = '';
  if (conditions.length > 0) {
    whereClause = 'WHERE ' + conditions.join(' AND ');
  }

  const sql = `
    SELECT id, fecha, cedis, proveedor, placa, producto,
           cantidad, precio_unitario, precio_total, solicito, observacion
    FROM compras
    ${whereClause}
    ORDER BY fecha DESC, id DESC
  `;

  db.query(sql, params, (err, rows) => {
    if (err) {
      console.error('ERROR LISTANDO:', err);
      return res.status(500).send('Error consultando MySQL');
    }

    // 👉 FORMATEAMOS FECHA PARA LISTADO
    rows.forEach(r => {
      r.fecha_formateada = formatFecha(r.fecha);
    });

    res.render('compras_list', {
      title: 'Compras',
      compras: rows,
      filtros: { placa, proveedor, cedis },
    });
  });
});

// =============================================================
// FORMULARIO NUEVO
// =============================================================
router.get('/nueva', (req, res) => {
  res.render('compras_new', { title: 'Nueva compra', error: null, form: {} });
});

// =============================================================
// HISTORIAL POR PLACA
// =============================================================
router.get('/placa/:placa', (req, res) => {
  const db = getDb();
  const placa = req.params.placa;

  const sql = `
    SELECT id, fecha, cedis, proveedor, placa, producto,
           cantidad, precio_unitario, precio_total, solicito, observacion
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
      c.fecha_formateada = formatFecha(c.fecha);   // 👉 FECHA BONITA
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

// =============================================================
// INSERTAR NUEVA COMPRA
// =============================================================
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

  if (!fecha || !cedis || !proveedor || !placa || !producto || !cantidad || !precio_unitario || !solicito) {
    return res.status(400).render('compras_new', {
      title: 'Nueva compra',
      error: 'Todos los campos marcados con * son obligatorios.',
      form: req.body,
    });
  }

  const cantidadNum = parseFloat(cantidad);
  const precioUnitNum = parseFloat(precio_unitario);
  const precioTotal = cantidadNum * precioUnitNum;

  // 👉 FECHA PARA MYSQL
  const fechaFinal = new Date(fecha).toISOString().slice(0, 10);

  // 👉 TIMESTAMP PARA MYSQL
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

  db.query(sql, params, function (err, result) {
    if (err) {
      console.error('⚠️ ERROR INSERT:', err);
      return res.status(500).render('compras_new', {
        title: 'Nueva compra',
        error: `⚠️ ERROR MySQL: ${err.message}`,
        form: req.body,
      });
    }

    res.redirect(`/compras/placa/${placa.trim().toUpperCase()}`);
  });
});

module.exports = router;
