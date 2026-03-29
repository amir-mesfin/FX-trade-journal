const express = require('express');
const Trade = require('../models/Trade');
const User = require('../models/User');
const { authRequired } = require('../middleware/auth');
const { buildTradeFilter } = require('../utils/buildTradeFilter');
const { aggregateTradeStats } = require('../utils/aggregateStats');
const { isValidTimezone } = require('../utils/timezone');

const router = express.Router();
router.use(authRequired);

router.get('/summary', async (req, res) => {
  try {
    let tz = (req.query.timezone && String(req.query.timezone).trim()) || '';
    if (!tz || !isValidTimezone(tz)) {
      const u = await User.findById(req.userId).select('timezone').lean();
      tz = (u && u.timezone) || 'UTC';
    }
    const filter = buildTradeFilter(req.userId, req.query);
    const trades = await Trade.find(filter).sort({ openedAt: -1 }).lean();
    const stats = aggregateTradeStats(trades, tz);
    res.json(stats);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Could not compute stats' });
  }
});

module.exports = router;
