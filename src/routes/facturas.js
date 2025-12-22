const express = require('express');
const router = express.Router();

router.get('/factura/nueva', (req, res) => {
  res.render('factura_new', {
    title: 'Nueva factura',
    error: null
  });
});

module.exports = router;
