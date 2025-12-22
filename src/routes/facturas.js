const express = require('express');
const router = express.Router();

// FORM NUEVA FACTURA
router.get('/factura/nueva', (req, res) => {
  res.render('factura_new', {
    title: 'Nueva factura'
  });
});

module.exports = router;
