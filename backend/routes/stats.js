const express = require('express');
const Trade = require('../models/Trade');
const { authRequired } = require('../middleware/auth');

const router = express.Router();
router.use(authRequired);

function sessionLabel(utcHour) {
  if (utcHour >= 7 && utcHour < 16) return 'London';
  if (utcHour >= 12 && utcHour < 21) return 'New York';
  if (utcHour >= 0 && utcHour < 9) return 'Asia';
  return 'Other';
}

function computeRR(t) {
  const { type, entryPrice, stopLoss, takeProfit } = t;
  if (entryPrice == null || stopLoss == null || takeProfit == null) return null;
  if (type === 'buy') {
    const risk = entryPrice - stopLoss;
    const reward = takeProfit - entryPrice;
    if (risk > 0 && reward > 0) return reward / risk;
  }
  if (type === 'sell') {
    const risk = stopLoss - entryPrice;
    const reward = entryPrice - takeProfit;
    if (risk > 0 && reward > 0) return reward / risk;
  }
  return null;
}

router.get('/summary', async (req, res) => {
  try {
    const trades = await Trade.find({ user: req.userId }).lean();
    const withPL = trades.filter((t) => t.profitLoss != null && !Number.isNaN(Number(t.profitLoss)));
    const wins = withPL.filter((t) => t.profitLoss > 0).length;
    const losses = withPL.filter((t) => t.profitLoss < 0).length;
    const flat = withPL.filter((t) => t.profitLoss === 0).length;
    const decided = wins + losses;
    const winRate = decided > 0 ? Math.round((wins / decided) * 1000) / 10 : null;
    const totalPL = withPL.reduce((s, t) => s + Number(t.profitLoss), 0);

    const byPair = {};
    for (const t of withPL) {
      const p = t.pair || 'UNKNOWN';
      if (!byPair[p]) byPair[p] = { count: 0, totalPL: 0, wins: 0, losses: 0 };
      byPair[p].count += 1;
      byPair[p].totalPL += Number(t.profitLoss);
      if (t.profitLoss > 0) byPair[p].wins += 1;
      if (t.profitLoss < 0) byPair[p].losses += 1;
    }
    const pairList = Object.entries(byPair).map(([pair, v]) => ({ pair, ...v }));
    const mostProfitablePair =
      pairList.length > 0
        ? pairList.reduce((a, b) => (a.totalPL >= b.totalPL ? a : b)).pair
        : null;

    const sessionStats = {};
    for (const t of withPL) {
      const d = new Date(t.closedAt || t.openedAt);
      const h = d.getUTCHours();
      const label = sessionLabel(h);
      if (!sessionStats[label]) sessionStats[label] = { trades: 0, totalPL: 0 };
      sessionStats[label].trades += 1;
      sessionStats[label].totalPL += Number(t.profitLoss);
    }

    const rrValues = trades.map(computeRR).filter((x) => x != null && Number.isFinite(x));
    const avgRR =
      rrValues.length > 0
        ? Math.round((rrValues.reduce((a, b) => a + b, 0) / rrValues.length) * 100) / 100
        : null;

    const sorted = [...withPL].sort(
      (a, b) => new Date(a.closedAt || a.openedAt) - new Date(b.closedAt || b.openedAt)
    );
    let cum = 0;
    const equityCurve = sorted.map((t) => {
      cum += Number(t.profitLoss);
      const day = (t.closedAt || t.openedAt).toISOString().slice(0, 10);
      return { date: day, cumulative: Math.round(cum * 100) / 100 };
    });

    const byStrategy = {};
    for (const t of withPL) {
      const key = (t.strategy || '').trim() || 'Untagged';
      if (!byStrategy[key]) byStrategy[key] = { trades: 0, totalPL: 0 };
      byStrategy[key].trades += 1;
      byStrategy[key].totalPL += Number(t.profitLoss);
    }

    res.json({
      totalTrades: trades.length,
      tradesWithPL: withPL.length,
      wins,
      losses,
      breakeven: flat,
      winRate,
      totalPL: Math.round(totalPL * 100) / 100,
      avgRR,
      mostProfitablePair,
      byPair: pairList.sort((a, b) => b.totalPL - a.totalPL),
      bySession: sessionStats,
      byStrategy: Object.entries(byStrategy).map(([strategy, v]) => ({ strategy, ...v })),
      equityCurve,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Could not compute stats' });
  }
});

module.exports = router;
