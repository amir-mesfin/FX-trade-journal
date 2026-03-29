const express = require('express');
const PDFDocument = require('pdfkit');
const Trade = require('../models/Trade');
const User = require('../models/User');
const { authRequired } = require('../middleware/auth');
const { buildTradeFilter } = require('../utils/buildTradeFilter');
const { aggregateTradeStats } = require('../utils/aggregateStats');

const router = express.Router();
router.use(authRequired);

function periodQuery(req) {
  const { range, startDate, endDate, pair, strategy } = req.query;
  const q = {};
  if (pair) q.pair = pair;
  if (strategy) q.strategy = strategy;
  if (range === 'week' || range === 'month' || range === 'year') {
    const end = new Date();
    const start = new Date();
    if (range === 'week') start.setDate(start.getDate() - 7);
    if (range === 'month') start.setMonth(start.getMonth() - 1);
    if (range === 'year') start.setFullYear(start.getFullYear() - 1);
    q.startDate = start.toISOString().slice(0, 10);
    q.endDate = end.toISOString().slice(0, 10);
  } else {
    if (startDate) q.startDate = startDate;
    if (endDate) q.endDate = endDate;
  }
  return q;
}

router.get('/pdf', async (req, res) => {
  try {
    const pq = periodQuery(req);
    const u = await User.findById(req.userId).select('timezone name').lean();
    const tz = u?.timezone || 'UTC';
    const filter = buildTradeFilter(req.userId, pq);
    const trades = await Trade.find(filter).sort({ openedAt: -1 }).limit(150).lean();
    const stats = aggregateTradeStats(trades, tz);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="trade-journal-report-${new Date().toISOString().slice(0, 10)}.pdf"`
    );

    const doc = new PDFDocument({ margin: 48, size: 'A4' });
    doc.pipe(res);

    doc.fontSize(20).fillColor('#0f172a').text('Trade journal report', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor('#334155');
    doc.text(`Trader: ${u?.name || '—'}`);
    doc.text(`Generated: ${new Date().toLocaleString()}`);
    doc.text(`Session timezone: ${tz}`);
    if (pq.startDate || pq.endDate) {
      doc.text(`Period: ${pq.startDate || '…'} → ${pq.endDate || '…'}`);
    }
    doc.moveDown();
    doc.fillColor('#0f172a').fontSize(12).text('Summary');
    doc.fontSize(10).fillColor('#334155');
    doc.text(`Total trades: ${stats.totalTrades}`);
    doc.text(`Win rate: ${stats.winRate != null ? `${stats.winRate}%` : '—'}`);
    doc.text(`Total P/L: ${stats.totalPL}`);
    doc.text(`Avg planned R:R: ${stats.avgRR ?? '—'}`);
    doc.text(`Avg realized R: ${stats.avgRMultiple ?? '—'}`);
    doc.text(`Best pair: ${stats.mostProfitablePair || '—'}`);
    doc.moveDown();

    doc.fillColor('#0f172a').fontSize(12).text('Trades (latest 40 in filter)');
    doc.moveDown(0.3);
    doc.fontSize(8).fillColor('#475569');
    const rows = trades.slice(0, 40);
    for (const t of rows) {
      const line = [
        t.pair,
        t.type,
        t.profitLoss != null ? String(t.profitLoss) : '—',
        t.strategy || '—',
        t.openedAt ? new Date(t.openedAt).toISOString().slice(0, 10) : '—',
      ].join('  |  ');
      doc.text(line, { width: 500 });
    }

    if (rows.length === 0) {
      doc.text('No trades in this filter.', { width: 500 });
    }

    doc.end();
  } catch (e) {
    console.error(e);
    if (!res.headersSent) res.status(500).json({ error: 'Could not build PDF' });
  }
});

module.exports = router;
