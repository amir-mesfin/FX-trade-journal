/**
 * Realized R from entry, stop, exit (risk = distance to SL in price).
 * Returns undefined if not computable.
 */
function computeRealizedRMultiple(t) {
  const type = t.type;
  const entryPrice = t.entryPrice;
  const stopLoss = t.stopLoss;
  const exitPrice = t.exitPrice;
  if (entryPrice == null || stopLoss == null || exitPrice == null) return undefined;
  if (type === 'buy') {
    const risk = entryPrice - stopLoss;
    if (!(risk > 0)) return undefined;
    const r = (exitPrice - entryPrice) / risk;
    return Math.round(r * 1000) / 1000;
  }
  if (type === 'sell') {
    const risk = stopLoss - entryPrice;
    if (!(risk > 0)) return undefined;
    const r = (entryPrice - exitPrice) / risk;
    return Math.round(r * 1000) / 1000;
  }
  return undefined;
}

function computePlannedRR(t) {
  const { type, entryPrice, stopLoss, takeProfit } = t;
  if (entryPrice == null || stopLoss == null || takeProfit == null) return null;
  if (type === 'buy') {
    const risk = entryPrice - stopLoss;
    const reward = takeProfit - entryPrice;
    if (risk > 0 && reward > 0) return Math.round((reward / risk) * 100) / 100;
  }
  if (type === 'sell') {
    const risk = stopLoss - entryPrice;
    const reward = entryPrice - takeProfit;
    if (risk > 0 && reward > 0) return Math.round((reward / risk) * 100) / 100;
  }
  return null;
}

module.exports = { computeRealizedRMultiple, computePlannedRR };
