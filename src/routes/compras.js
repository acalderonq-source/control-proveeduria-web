const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const ExcelJS = require('exceljs');

/* =========================
   Helpers
========================= */
function formatFecha(value) {
  if (!value) return '';
  const d = new Date(value);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/* =========================
   LISTADO (SEMANAL + FILTROS)
========================= */
router.get('/', (req, res) => {
  const db = getDb();
  const { placa, proveedor, cedis, desde, hasta, semana } = req.query;

  let conditions = [];
  let params = [];

  if (placa) { conditions.push('c.placa LIKE ?'); params.push(`%${placa}%`); }
  if (proveedor) { conditions.push('f.proveedor LIKE ?'); params.push(`%${proveedor}%`); }
  if (cedis) { conditions.push('f.cedis LIKE ?'); params.push(`%${cedis}%`); }
  if (desde) { conditions.push('f.fecha >= ?'); params.push(desde); }
  if (hasta) { conditions.push('f.fecha <= ?'); params.push(hasta); }

  // Semana ISO: YYYY-Www
  if (semana) {
    const [yy, ww] = semana.split('-W');
    conditions.push('YEARWEEK(f.fecha, 1) = YEARWEEK(STR_TO_DATE(?, "%x-W%v"), 1)');
    params.push(`${yy}-W${ww}`);
  }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

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
      return res.status(500).send('Error consultando listado');
    }

    let total = 0;
    rows.forEach(r => {
      r.fecha_formateada = formatFecha(r.fecha);
      r.semana_label = `Semana ${String(r.semana).slice(4)} / ${String(r.semana).slice(0,4)}`;
      total += Number(r.precio_total || 0);
    });

    res.render('compras_list', {
      title: 'Control semanal de compras',
      compras: rows,
      total,
      filtros: { placa, proveedor, cedis, desde, hasta, semana }
    });
  });
});

/* =========================
   PASO 1: CREAR FACTURA (ENCABEZADO)
========================= */
router.get('/factura/nueva', (req, res) => {
  res.render('factura_new', {
    title: 'Nueva factura',
    error: null,
    form: {}
  });
});

router.post('/factura', (req, res) => {
  const db = getDb();
  const { numero, proveedor, cedis, fecha } = req.body;

  if (!numero || !proveedor || !cedis || !fecha) {
    return res.render('factura_new', {
      title: 'Nueva factura',
      error: 'Complete todos los campos obligatorios.',
      form: req.body
    });
  }

  const fechaFinal = new Date(fecha).toISOString().slice(0,10);

  const sql = `
    INSERT INTO facturas (numero, proveedor, cedis, fecha)
    VALUES (?, ?, ?, ?)
  `;

  db.query(sql, [numero.trim(), proveedor.trim(), cedis.trim(), fechaFinal], (err, result) => {
    if (err) {
      // Si ya existe (proveedor+numero)
      if (String(err.message || '').includes('uq_factura_proveedor_numero')) {
        // buscar el id y redirigir
        const q = `SELECT id FROM facturas WHERE proveedor = ? AND numero = ? LIMIT 1`;
        return db.query(q, [proveedor.trim(), numero.trim()], (e2, r2) => {
          if (e2 || !r2.length) {
            return res.render('factura_new', { title:'Nueva factura', error:'Factura ya existe, pero no se pudo abrir.', form:req.body });
          }
          return res.redirect(`/compras/factura/${r2[0].id}/items`);
        });
      }

      console.error('ERROR CREANDO FACTURA:', err);
      return res.render('factura_new', {
        title: 'Nueva factura',
        error: 'Error creando factura. Intente de nuevo.',
        form: req.body
      });
    }

    res.redirect(`/compras/factura/${result.insertId}/items`);
  });
});

/* =========================
   PASO 2: AGREGAR ÍTEMS A FACTURA
========================= */
router.get('/factura/:id/items', (req, res) => {
  const db = getDb();
  const facturaId = req.params.id;

  const sqlFactura = `SELECT * FROM facturas WHERE id = ? LIMIT 1`;
  const sqlItems = `
    SELECT * FROM compras
    WHERE factura_id = ?
    ORDER BY id DESC
  `;

  db.query(sqlFactura, [facturaId], (err, fRows) => {
    if (err || !fRows.length) return res.status(404).render('404', { title: '404', path: req.originalUrl });

    const factura = fRows[0];

    db.query(sqlItems, [facturaId], (err2, items) => {
      if (err2) {
        console.error('ERROR ITEMS FACTURA:', err2);
        return res.status(500).send('Error consultando items');
      }

      let total = 0;
      items.forEach(i => total += Number(i.precio_total || 0));

      res.render('factura_items', {
        title: `Factura ${factura.numero}`,
        factura,
        items,
        total,
        error: null,
        form: {}
      });
    });
  });
});

router.post('/factura/:id/items', (req, res) => {
  const db = getDb();
  const facturaId = req.params.id;

  const { placa, producto, cantidad, precio_unitario, solicito, observacion } = req.body;

  if (!placa || !producto || !cantidad || !precio_unitario || !solicito) {
    // volver con error
    return res.redirect(`/compras/factura/${facturaId}/items?err=1`);
  }

  const cant = Number(cantidad);
  const pu = Number(precio_unitario);
  const pt = cant * pu;

  const sql = `
    INSERT INTO compras (factura_id, placa, producto, cantidad, precio_unitario, precio_total, solicito, observacion)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [
      facturaId,
      placa.trim().toUpperCase(),
      producto.trim(),
      cant,
      pu,
      pt,
      solicito.trim(),
      observacion ? observacion.trim() : null
    ],
    (err) => {
      if (err) {
        console.error('ERROR INSERT ITEM:', err);
        return res.status(500).send('Error guardando ítem');
      }
      // guardar y seguir
      res.redirect(`/compras/factura/${facturaId}/items`);
    }
  );
});

/* =========================
   VISTA FACTURA DESGLOSADA
========================= */
router.get('/factura/:id', (req, res) => {
  const db = getDb();
  const facturaId = req.params.id;

  const sqlFactura = `SELECT * FROM facturas WHERE id = ? LIMIT 1`;
  const sqlItems = `SELECT * FROM compras WHERE factura_id = ? ORDER BY id DESC`;

  db.query(sqlFactura, [facturaId], (err, fRows) => {
    if (err || !fRows.length) return res.status(404).render('404', { title: '404', path: req.originalUrl });
    const factura = fRows[0];

    db.query(sqlItems, [facturaId], (err2, items) => {
      if (err2) return res.status(500).send('Error consultando factura');
      let total = 0;
      items.forEach(i => total += Number(i.precio_total || 0));
      factura.fecha_formateada = formatFecha(factura.fecha);

      res.render('factura_view', {
        title: `Factura ${factura.numero}`,
        factura,
        items,
        total
      });
    });
  });
});

/* =========================
   HISTORIAL POR PLACA
========================= */
router.get('/placa/:placa', (req, res) => {
  const db = getDb();
  const placa = req.params.placa;

  const sql = `
    SELECT
      f.fecha,
      f.cedis,
      f.proveedor,
      f.numero AS factura_numero,
      c.placa,
      c.producto,
      c.cantidad,
      c.precio_unitario,
      c.precio_total,
      c.solicito,
      c.observacion
    FROM compras c
    INNER JOIN facturas f ON f.id = c.factura_id
    WHERE c.placa = ?
    ORDER BY f.fecha DESC, c.id DESC
  `;

  db.query(sql, [placa], (err, rows) => {
    if (err) return res.status(500).send('Error consultando placa');

    let totalMonto = 0;
    let totalCantidad = 0;

    rows.forEach(r => {
      r.fecha_formateada = formatFecha(r.fecha);
      totalMonto += Number(r.precio_total || 0);
      totalCantidad += Number(r.cantidad || 0);
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

/* =========================
   EXCEL POR FACTURA
========================= */
router.get('/factura/:id/excel', (req, res) => {
  const db = getDb();
  const facturaId = req.params.id;

  const sqlFactura = `SELECT * FROM facturas WHERE id = ? LIMIT 1`;
  const sqlItems = `
    SELECT placa, producto, cantidad, precio_unitario, precio_total, solicito, observacion
    FROM compras
    WHERE factura_id = ?
    ORDER BY id ASC
  `;

  db.query(sqlFactura, [facturaId], (err, fRows) => {
    if (err || !fRows.length) return res.status(404).send('Factura no encontrada');
    const factura = fRows[0];

    db.query(sqlItems, [facturaId], async (err2, items) => {
      if (err2) return res.status(500).send('Error generando Excel');

      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Factura');

      ws.addRow([`Factura: ${factura.numero}`]);
      ws.addRow([`Proveedor: ${factura.proveedor}`]);
      ws.addRow([`CEDIS: ${factura.cedis}`]);
      ws.addRow([`Fecha: ${formatFecha(factura.fecha)}`]);
      ws.addRow([]);

      ws.columns = [
        { header: 'Placa', key: 'placa', width: 12 },
        { header: 'Producto', key: 'producto', width: 35 },
        { header: 'Cantidad', key: 'cantidad', width: 10 },
        { header: 'P. Unitario', key: 'precio_unitario', width: 14 },
        { header: 'Total', key: 'precio_total', width: 14 },
        { header: 'Solicitó', key: 'solicito', width: 14 },
        { header: 'Obs', key: 'observacion', width: 25 }
      ];

      items.forEach(i => ws.addRow(i));

      res.setHeader('Content-Disposition', `attachment; filename="factura_${factura.numero}.xlsx"`);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

      await wb.xlsx.write(res);
      res.end();
    });
  });
});

module.exports = router;
