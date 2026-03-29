const express = require('express');
const Trade = require('../models/Trade');
const User = require('../models/User');
const { authRequired } = require('../middleware/auth');
const { buildTradeFilter } = require('../utils/buildTradeFilter');
const { aggregateTradeStats } = require('../utils/aggregateStats');
const { isValidTimezone } = require('../utils/timezone');
const { generateInsights } = require('../utils/insightsEngine');

const router = express.Router();
router.use(authRequired);

router.get('/', async (req, res) => {
  try {
    let tz = (req.query.timezone && String(req.query.timezone).trim()) || '';
    if (!tz || !isValidTimezone(tz)) {
      const u = await User.findById(req.userId).select('timezone').lean();
      tz = (u && u.timezone) || 'UTC';
    }
    const filter = buildTradeFilter(req.userId, req.query);
    const trades = await Trade.find(filter).sort({ openedAt: -1 }).lean();
    const stats = aggregateTradeStats(trades, tz);
    const insights = generateInsights(stats, trades, tz);
    res.json({ insights, timezoneUsed: tz, tradesAnalyzed: trades.length });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Could not generate insights' });
  }
});

module.exports = router;
