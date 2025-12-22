const express = require('express');
const router = express.Router();
const pool = require('../db');

/*
========================================
 LISTADO GENERAL DE FACTURAS
========================================
*/
router.get('/', async (req, res) => {
  try {
    const [facturas] = await pool.query(`
      SELECT
        f.id AS factura_id,
        f.numero,
        f.fecha,
        f.proveedor,
        f.cedis,
        IFNULL(SUM(c.cantidad * c.precio_unitario), 0) AS total
      FROM facturas f
      LEFT JOIN compras c ON c.factura_id = f.id
      GROUP BY f.id
      ORDER BY f.fecha DESC, f.id DESC
    `);

    res.render('compras_list', {
      title: 'Control de facturas',
      facturas,
      errorUI: null
    });

  } catch (error) {
    console.error('❌ ERROR LISTADO MYSQL:', error);

    res.render('compras_list', {
      title: 'Control de facturas',
      facturas: [],
      errorUI: 'Error consultando compras en MySQL'
    });
  }
});

/*
========================================
 FORMULARIO NUEVA FACTURA
========================================
*/
router.get('/factura/nueva', (req, res) => {
  res.render('factura_view', {
    title: 'Nueva factura',
    errorUI: null,
    successUI: null
  });
});

/*
========================================
 GUARDAR FACTURA + ITEMS
========================================
*/
router.post('/factura/guardar', async (req, res) => {
  const {
    numero,
    fecha,
    proveedor,
    cedis,
    items = []
  } = req.body;

  if (!numero || !fecha || !proveedor || !cedis) {
    return res.render('factura_view', {
      title: 'Nueva factura',
      errorUI: 'Faltan datos obligatorios de la factura',
      successUI: null
    });
  }

  if (!Array.isArray(items) || items.length === 0) {
    return res.render('factura_view', {
      title: 'Nueva factura',
      errorUI: 'Debe agregar al menos un item',
      successUI: null
    });
  }

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // 1️⃣ Insertar factura
    const [facturaResult] = await conn.query(
      `INSERT INTO facturas (numero, fecha, proveedor, cedis)
       VALUES (?, ?, ?, ?)`,
      [numero, fecha, proveedor, cedis]
    );

    const facturaId = facturaResult.insertId;

    // 2️⃣ Insertar items
    for (const item of items) {
      const {
        placa,
        producto,
        cantidad,
        precio_unitario,
        solicito,
        observacion
      } = item;

      if (!placa || !producto || !cantidad || !precio_unitario) {
        throw new Error('Item incompleto');
      }

      await conn.query(
        `INSERT INTO compras
          (factura_id, placa, producto, cantidad, precio_unitario, solicito, observacion)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          facturaId,
          placa,
          producto,
          cantidad,
          precio_unitario,
          solicito || null,
          observacion || null
        ]
      );
    }

    await conn.commit();

    res.redirect('/compras');

  } catch (error) {
    await conn.rollback();
    console.error('❌ ERROR GUARDANDO FACTURA:', error);

    res.render('factura_view', {
      title: 'Nueva factura',
      errorUI: 'Error guardando la factura en MySQL',
      successUI: null
    });
  } finally {
    conn.release();
  }
});

/*
========================================
 VER FACTURA + ITEMS
========================================
*/
router.get('/factura/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const [[factura]] = await pool.query(
      `SELECT * FROM facturas WHERE id = ?`,
      [id]
    );

    if (!factura) {
      return res.redirect('/compras');
    }

    const [items] = await pool.query(
      `SELECT *,
        (cantidad * precio_unitario) AS total
       FROM compras
       WHERE factura_id = ?
       ORDER BY id`,
      [id]
    );

    res.render('factura_view', {
      title: `Factura ${factura.numero}`,
      factura,
      items,
      errorUI: null,
      successUI: null
    });

  } catch (error) {
    console.error('❌ ERROR CONSULTANDO FACTURA:', error);
    res.redirect('/compras');
  }
});

module.exports = router;
