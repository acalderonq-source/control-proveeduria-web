const express = require('express');
const router = express.Router();
const pool = require('../db');

/* =========================
   LISTADO DE COMPRAS
   URL: /compras
========================= */
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        c.id,
        c.placa,
        c.producto,
        c.cantidad,
        c.precio_unitario,
        (c.cantidad * c.precio_unitario) AS total,
        c.solicito,
        c.observacion,
        f.id       AS factura_id,
        f.numero   AS factura_numero,
        f.fecha    AS factura_fecha,
        f.proveedor,
        f.cedis
      FROM compras c
      INNER JOIN facturas f ON f.id = c.factura_id
      ORDER BY f.fecha DESC, c.id DESC
    `);

    const totalGeneral = rows.reduce((acc, r) => acc + Number(r.total || 0), 0);

    res.render('compras_list', {
      title: 'Control Proveeduría',
      compras: rows,
      totalGeneral,
      errorUI: null
    });
  } catch (error) {
    console.error('❌ ERROR LISTADO MYSQL:', error);

    res.render('compras_list', {
      title: 'Control Proveeduría',
      compras: [],
      totalGeneral: 0,
      errorUI: 'Error consultando compras'
    });
  }
});

/* =========================
   FORM NUEVA COMPRA
   URL: /compras/nueva
========================= */
router.get('/nueva', (req, res) => {
  res.render('compras_new', {
    title: 'Registrar compra',
    errorUI: null,
    form: {
      proveedor: '',
      factura_numero: '',
      fecha: '',
      cedis: '',
      placa: '',
      producto: '',
      cantidad: '',
      total: '',
      solicito: '',
      observacion: ''
    }
  });
});

/* =========================
   GUARDAR NUEVA COMPRA
   URL: /compras/nueva  (POST)
========================= */
router.post('/nueva', async (req, res) => {
  const {
    proveedor,
    factura_numero,
    fecha,
    cedis,
    placa,
    producto,
    cantidad,
    total,
    solicito,
    observacion
  } = req.body;

  const form = {
    proveedor,
    factura_numero,
    fecha,
    cedis,
    placa,
    producto,
    cantidad,
    total,
    solicito,
    observacion
  };

  // Validaciones mínimas (sin inventos raros)
  if (!proveedor || !factura_numero || !fecha || !cedis || !placa || !producto) {
    return res.status(400).render('compras_new', {
      title: 'Registrar compra',
      errorUI: 'Faltan datos obligatorios (proveedor, factura, fecha, cedis, placa, producto).',
      form
    });
  }

  const cantidadNum = Number(cantidad);
  const totalNum = Number(total);

  if (!Number.isFinite(cantidadNum) || cantidadNum <= 0) {
    return res.status(400).render('compras_new', {
      title: 'Registrar compra',
      errorUI: 'Cantidad inválida.',
      form
    });
  }

  if (!Number.isFinite(totalNum) || totalNum < 0) {
    return res.status(400).render('compras_new', {
      title: 'Registrar compra',
      errorUI: 'Total inválido.',
      form
    });
  }

  // Guardamos en tu esquema: precio_unitario = total / cantidad
  const precioUnitario = totalNum / cantidadNum;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1) Buscar si existe factura (por numero + proveedor) para no duplicar
    const [fExist] = await conn.query(
      `SELECT id FROM facturas WHERE numero = ? AND proveedor = ? LIMIT 1`,
      [factura_numero, proveedor]
    );

    let facturaId;

    if (fExist.length) {
      facturaId = fExist[0].id;
    } else {
      // 2) Crear factura
      const [insFactura] = await conn.query(
        `INSERT INTO facturas (numero, fecha, proveedor, cedis) VALUES (?, ?, ?, ?)`,
        [factura_numero, fecha, proveedor, cedis]
      );
      facturaId = insFactura.insertId;
    }

    // 3) Insertar compra ligada a factura
    await conn.query(
      `INSERT INTO compras
        (factura_id, placa, producto, cantidad, precio_unitario, solicito, observacion)
       VALUES
        (?, ?, ?, ?, ?, ?, ?)`,
      [
        facturaId,
        placa,
        producto,
        cantidadNum,
        precioUnitario,
        solicito || null,
        observacion || null
      ]
    );

    await conn.commit();

    res.redirect('/compras');
  } catch (error) {
    await conn.rollback();
    console.error('❌ ERROR GUARDANDO COMPRA:', error);

    res.status(500).render('compras_new', {
      title: 'Registrar compra',
      errorUI: 'Error guardando la compra en MySQL',
      form
    });
  } finally {
    conn.release();
  }
});

module.exports = router;
