const { hourInTimezone, sessionLabelLocalHour } = require('./timezone');
const { computePlannedRR } = require('./tradeMath');

function aggregateTradeStats(trades, timeZone) {
  const tz = timeZone || 'UTC';
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
    const h = hourInTimezone(d, tz);
    const label = sessionLabelLocalHour(h);
    if (!sessionStats[label]) sessionStats[label] = { trades: 0, totalPL: 0 };
    sessionStats[label].trades += 1;
    sessionStats[label].totalPL += Number(t.profitLoss);
  }

  const rrValues = trades.map(computePlannedRR).filter((x) => x != null && Number.isFinite(x));
  const avgRR =
    rrValues.length > 0
      ? Math.round((rrValues.reduce((a, b) => a + b, 0) / rrValues.length) * 100) / 100
      : null;

  const rVals = trades
    .map((t) => t.rMultiple)
    .filter((x) => x != null && Number.isFinite(Number(x)))
    .map(Number);
  const avgRMultiple =
    rVals.length > 0
      ? Math.round((rVals.reduce((a, b) => a + b, 0) / rVals.length) * 100) / 100
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

  return {
    totalTrades: trades.length,
    tradesWithPL: withPL.length,
    wins,
    losses,
    breakeven: flat,
    winRate,
    totalPL: Math.round(totalPL * 100) / 100,
    avgRR,
    avgRMultiple,
    mostProfitablePair,
    byPair: pairList.sort((a, b) => b.totalPL - a.totalPL),
    bySession: sessionStats,
    byStrategy: Object.entries(byStrategy).map(([strategy, v]) => ({ strategy, ...v })),
    equityCurve,
    timezoneUsed: tz,
  };
}

module.exports = { aggregateTradeStats };
