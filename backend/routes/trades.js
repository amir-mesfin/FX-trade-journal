const express = require('express');
const multer = require('multer');
const Trade = require('../models/Trade');
const { authRequired } = require('../middleware/auth');
const { uploadScreenshots } = require('../middleware/upload');
const { filesToScreenshots, removeStoredScreenshots } = require('../utils/screenshots');
const { buildTradeFilter } = require('../utils/buildTradeFilter');
const { computeRealizedRMultiple } = require('../utils/tradeMath');
const { parseTradeCsv } = require('../utils/csvImportTrades');

const router = express.Router();

const uploadCsv = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    cb(null, /\.csv$/i.test(file.originalname || ''));
  },
});

router.use(authRequired);

function handleUpload(req, res, next) {
  const ct = req.headers['content-type'] || '';
  if (!ct.includes('multipart/form-data')) {
    return next();
  }
  uploadScreenshots(req, res, (err) => {
    if (err) return res.status(400).json({ error: String(err.message || err) });
    next();
  });
}

function numField(v) {
  if (v === undefined || v === null || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

router.post('/', handleUpload, async (req, res) => {
  try {
    const b = req.body;
    const pair = (b.pair || '').trim().toUpperCase();
    if (!pair) return res.status(400).json({ error: 'Pair is required' });
    const type = String(b.type || '').toLowerCase();
    if (!['buy', 'sell'].includes(type)) {
      return res.status(400).json({ error: 'Trade type must be buy or sell' });
    }
    const lotSize = numField(b.lotSize);
    if (lotSize === undefined || lotSize < 0) {
      return res.status(400).json({ error: 'Valid lot size is required' });
    }
    const entryPrice = numField(b.entryPrice);
    if (entryPrice === undefined) {
      return res.status(400).json({ error: 'Entry price is required' });
    }

    const openedAt = b.openedAt ? new Date(b.openedAt) : new Date();
    if (Number.isNaN(openedAt.getTime())) {
      return res.status(400).json({ error: 'Invalid opened date' });
    }
    let closedAt;
    if (b.closedAt) {
      closedAt = new Date(b.closedAt);
      if (Number.isNaN(closedAt.getTime())) {
        return res.status(400).json({ error: 'Invalid closed date' });
      }
    }

    let screenshots = [];
    try {
      screenshots = await filesToScreenshots(req.files || []);
    } catch (upErr) {
      return res.status(upErr.statusCode || 500).json({ error: upErr.message });
    }

    const payload = {
      user: req.userId,
      pair,
      type,
      lotSize,
      entryPrice,
      stopLoss: numField(b.stopLoss),
      takeProfit: numField(b.takeProfit),
      exitPrice: numField(b.exitPrice),
      profitLoss: numField(b.profitLoss),
      strategy: (b.strategy || '').trim(),
      notes: b.notes || '',
      psychologyNote: b.psychologyNote || '',
      openedAt,
      closedAt,
      status: b.status === 'open' ? 'open' : 'closed',
      screenshots,
    };
    const manualR = numField(b.rMultiple);
    if (manualR !== undefined) payload.rMultiple = manualR;
    else {
      const autoR = computeRealizedRMultiple(payload);
      if (autoR !== undefined) payload.rMultiple = autoR;
    }
    // Parse entryChecklist (arrives as JSON string from multipart, object from JSON body)
    if (b.entryChecklist !== undefined) {
      try {
        payload.entryChecklist = typeof b.entryChecklist === 'string'
          ? JSON.parse(b.entryChecklist)
          : b.entryChecklist;
      } catch (_) { /* ignore malformed */ }
    }
    const trade = await Trade.create(payload);
    res.status(201).json(trade);
  } catch (e) {
    console.error(e);
    if (e.name === 'ValidationError') {
      const msg = Object.values(e.errors || {})
        .map((x) => x.message)
        .join('; ');
      return res.status(400).json({ error: msg || 'Invalid trade data' });
    }
    if (e.code === 11000) {
      return res.status(409).json({ error: 'Duplicate trade (import id conflict)' });
    }
    res.status(500).json({ error: 'Could not create trade' });
  }
});

router.get('/export/csv', async (req, res) => {
  try {
    const filter = buildTradeFilter(req.userId, req.query);
    const trades = await Trade.find(filter).sort({ openedAt: -1 }).lean();
    const headers = [
      'pair',
      'type',
      'lotSize',
      'entryPrice',
      'exitPrice',
      'stopLoss',
      'takeProfit',
      'profitLoss',
      'rMultiple',
      'strategy',
      'openedAt',
      'closedAt',
      'notes',
      'psychologyNote',
    ];
    const esc = (v) => {
      if (v == null) return '""';
      const s = v instanceof Date ? v.toISOString() : String(v);
      return `"${s.replace(/"/g, '""')}"`;
    };
    const lines = [
      headers.join(','),
      ...trades.map((t) => headers.map((h) => esc(t[h])).join(',')),
    ];
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="trades.csv"');
    res.send(lines.join('\n'));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Export failed' });
  }
});

router.post('/import/csv', uploadCsv.single('file'), async (req, res) => {
  try {
    if (!req.file?.buffer) {
      return res.status(400).json({ error: 'Upload a .csv file (form field name: file)' });
    }
    const { rows, errors: parseErrors } = parseTradeCsv(req.file.buffer);
    if (!rows.length) {
      return res.status(400).json({
        error: parseErrors[0] || 'No valid rows parsed',
        errors: parseErrors,
      });
    }
    let imported = 0;
    let skipped = 0;
    const rowErrors = [...parseErrors];
    for (const row of rows) {
      try {
        await Trade.create({ ...row, user: req.userId });
        imported += 1;
      } catch (e) {
        if (e.code === 11000) skipped += 1;
        else rowErrors.push(String(e.message || e));
      }
    }
    res.json({
      imported,
      skipped,
      totalParsed: rows.length,
      errors: rowErrors.slice(0, 40),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Import failed' });
  }
});

router.get('/', async (req, res) => {
  try {
    const { page = '1', limit = '50' } = req.query;
    const filter = buildTradeFilter(req.userId, req.query);
    const p = Math.max(1, parseInt(page, 10) || 1);
    const lim = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const [items, total] = await Promise.all([
      Trade.find(filter)
        .sort({ openedAt: -1 })
        .skip((p - 1) * lim)
        .limit(lim)
        .lean(),
      Trade.countDocuments(filter),
    ]);
    res.json({ items, total, page: p, limit: lim });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Could not list trades' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const trade = await Trade.findOne({
      _id: req.params.id,
      user: req.userId,
    }).lean();
    if (!trade) return res.status(404).json({ error: 'Trade not found' });
    res.json(trade);
  } catch (e) {
    if (e.name === 'CastError') return res.status(400).json({ error: 'Invalid trade id' });
    console.error(e);
    res.status(500).json({ error: 'Could not load trade' });
  }
});

router.patch('/:id', handleUpload, async (req, res) => {
  try {
    const trade = await Trade.findOne({ _id: req.params.id, user: req.userId });
    if (!trade) return res.status(404).json({ error: 'Trade not found' });

    const b = req.body;
    const fields = [
      'pair',
      'type',
      'lotSize',
      'entryPrice',
      'stopLoss',
      'takeProfit',
      'exitPrice',
      'profitLoss',
      'strategy',
      'notes',
      'psychologyNote',
      'status',
    ];
    for (const key of fields) {
      if (b[key] === undefined) continue;
      if (key === 'pair') trade.pair = String(b.pair).trim().toUpperCase();
      else if (key === 'type') {
        const t = String(b.type).toLowerCase();
        if (['buy', 'sell'].includes(t)) trade.type = t;
      } else if (key === 'status') {
        trade.status = b.status === 'open' ? 'open' : 'closed';
      } else if (['lotSize', 'entryPrice', 'stopLoss', 'takeProfit', 'exitPrice', 'profitLoss'].includes(key)) {
        const n = numField(b[key]);
        trade[key] = n;
      } else {
        trade[key] = b[key];
      }
    }
    if (b.openedAt) {
      const d = new Date(b.openedAt);
      if (!Number.isNaN(d.getTime())) trade.openedAt = d;
    }
    if (b.closedAt !== undefined) {
      if (!b.closedAt) trade.closedAt = undefined;
      else {
        const d = new Date(b.closedAt);
        if (!Number.isNaN(d.getTime())) trade.closedAt = d;
      }
    }
    let newShots = [];
    try {
      newShots = await filesToScreenshots(req.files || []);
    } catch (upErr) {
      return res.status(upErr.statusCode || 500).json({ error: upErr.message });
    }
    if (newShots.length) {
      trade.screenshots = [...(trade.screenshots || []), ...newShots];
    }
    const manualR = numField(b.rMultiple);
    if (manualR !== undefined) {
      trade.rMultiple = manualR;
    } else if (
      ['entryPrice', 'stopLoss', 'exitPrice', 'type'].some((k) => b[k] !== undefined)
    ) {
      trade.rMultiple = computeRealizedRMultiple(trade.toObject());
    } else if (trade.rMultiple == null) {
      trade.rMultiple = computeRealizedRMultiple(trade.toObject());
    }
    // Parse and merge entryChecklist
    if (b.entryChecklist !== undefined) {
      try {
        const cl = typeof b.entryChecklist === 'string'
          ? JSON.parse(b.entryChecklist)
          : b.entryChecklist;
        trade.entryChecklist = { ...(trade.entryChecklist?.toObject?.() ?? trade.entryChecklist ?? {}), ...cl };
      } catch (_) { /* ignore malformed */ }
    }
    await trade.save();
    res.json(trade);
  } catch (e) {
    if (e.name === 'CastError') return res.status(400).json({ error: 'Invalid trade id' });
    console.error(e);
    res.status(500).json({ error: 'Could not update trade' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const trade = await Trade.findOne({ _id: req.params.id, user: req.userId });
    if (!trade) return res.status(404).json({ error: 'Trade not found' });
    await removeStoredScreenshots(trade.screenshots);
    await trade.deleteOne();
    res.status(204).send();
  } catch (e) {
    if (e.name === 'CastError') return res.status(400).json({ error: 'Invalid trade id' });
    console.error(e);
    res.status(500).json({ error: 'Could not delete trade' });
  }
});

module.exports = router;
