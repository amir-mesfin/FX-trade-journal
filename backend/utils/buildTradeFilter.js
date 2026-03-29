/**
 * Build Mongo filter for trades from query (stats, reports, exports).
 */
function buildTradeFilter(userId, query) {
  const { startDate, endDate, pair, strategy } = query || {};
  const filter = { user: userId };
  if (pair) filter.pair = String(pair).trim().toUpperCase();
  if (strategy) {
    const esc = String(strategy).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.strategy = new RegExp(esc, 'i');
  }
  if (startDate || endDate) {
    filter.openedAt = {};
    if (startDate) filter.openedAt.$gte = new Date(startDate);
    if (endDate) filter.openedAt.$lte = new Date(endDate);
  }
  return filter;
}

module.exports = { buildTradeFilter };
