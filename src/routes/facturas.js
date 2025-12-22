const express = require('express');
const router = express.Router();
const pool = require('../db');

// ==============================
// FORM NUEVA FACTURA
// ==============================
router.get('/nueva', async (req, res) => {
  try {
    res.render('factura_new', {
      title: 'Nueva factura'
    });
  } catch (error) {
    console.error(error);
    res.send('Error cargando formulario');
  }
});

module.exports = router;
