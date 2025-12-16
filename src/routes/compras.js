const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const ExcelJS = require('exceljs');

/* ===============================
   FORMATO FECHA DD/MM/YYYY
================================ */
function formatFecha(value) {
  if (!value) return '';
  const d = new Date(value);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

/* ===============================
   LISTADO GENERAL + SEMANA
================================ */
router.get('/', (req, res) => {
  const db = getDb();
  const { placa, proveedor, cedis, desde, hasta, semana } = req.query;

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

  // ⭐ FILTRO POR SEMANA ISO
  if (semana) {
    const [year, week] = semana.split('-W');
    conditions.push(
      'YEARWEEK(fecha, 1) = YEARWEEK(STR_TO_DATE(?, "%x-W%v"), 1)'
    );
    params.push(`${year}-W${week}`);
  }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

  const sql = `
    SELECT id, fecha,
           YEARWEEK(fecha, 1) AS semana,
           cedis, proveedor, placa, producto,
           cantidad, precio_unitario, precio_total,
           solicito, observacion
    FROM compras
    ${where}
    ORDER BY fecha DESC, id DESC
  `;

  db.query(sql, params, (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Error consultando MySQL');
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

/* ===============================
   DESCARGAR EXCEL POR SEMANA
================================ */
router.get('/excel', (req, res) => {
  const db = getDb();
  const { placa, proveedor, cedis, desde, hasta, semana } = req.query;

  let conditions = [];
  let params = [];

  if (placa) { conditions.push('placa LIKE ?'); params.push('%' + placa + '%'); }
  if (proveedor) { conditions.push('proveedor LIKE ?'); params.push('%' + proveedor + '%'); }
  if (cedis) { conditions.push('cedis LIKE ?'); params.push('%' + cedis + '%'); }
  if (desde) { conditions.push('fecha >= ?'); params.push(desde); }
  if (hasta) { conditions.push('fecha <= ?'); params.push(hasta); }

  if (semana) {
    const [year, week] = semana.split('-W');
    conditions.push(
      'YEARWEEK(fecha, 1) = YEARWEEK(STR_TO_DATE(?, "%x-W%v"), 1)'
    );
    params.push(`${year}-W${week}`);
  }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

  const sql = `
    SELECT fecha, cedis, proveedor, placa, producto,
           cantidad, precio_unitario, precio_total,
           solicito, observacion
    FROM compras
    ${where}
    ORDER BY fecha DESC
  `;

  db.query(sql, params, async (err, rows) => {
    if (err) return res.status(500).send('Error creando Excel');

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Compras Semana');

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
      `attachment; filename="reporte_semana_${semana || 'todas'}.xlsx"`
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
