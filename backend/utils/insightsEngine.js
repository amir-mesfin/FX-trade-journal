/**
 * Deterministic coaching-style tips from your own data — no external AI API.
 */
function generateInsights(stats, trades, timeZone) {
  const tz = timeZone || 'UTC';
  const out = [];

  const n = stats.totalTrades || 0;
  const withPL = stats.tradesWithPL || 0;

  if (n < 5) {
    out.push({
      kind: 'tip',
      title: 'Build sample size',
      text: 'With fewer than five trades, statistics swing a lot. Keep journaling — patterns get clearer around 20–30 closed trades.',
    });
  }

  if (withPL >= 10 && stats.winRate != null && stats.winRate < 42) {
    out.push({
      kind: 'warn',
      title: 'Win rate is low',
      text: `Your win rate is about ${stats.winRate}% over ${withPL} closed trades. Review losing setups: are stops too tight, entries too early, or risk-reward inverted?`,
    });
  }

  if (withPL >= 10 && stats.winRate != null && stats.winRate > 58) {
    out.push({
      kind: 'good',
      title: 'Solid win rate',
      text: `Win rate near ${stats.winRate}% — keep doing what works, and watch position sizing so one loss doesn’t erase many wins.`,
    });
  }

  if (stats.totalPL < 0 && withPL >= 8) {
    out.push({
      kind: 'warn',
      title: 'Net negative in this range',
      text: `Total P/L is ${stats.totalPL}. Focus on the worst pair or session below and cut what repeats.`,
    });
  }

  if (stats.totalPL > 0 && withPL >= 8) {
    out.push({
      kind: 'good',
      title: 'Net positive',
      text: `Total P/L is +${stats.totalPL} in this filter. Double down on the process behind your best tags and sessions.`,
    });
  }

  const pairs = stats.byPair || [];
  if (pairs.length >= 2) {
    const worst = pairs.reduce((a, b) => (a.totalPL <= b.totalPL ? a : b));
    if (worst.totalPL < 0) {
      out.push({
        kind: 'warn',
        title: `Weakest pair: ${worst.pair}`,
        text: `${worst.pair} shows about ${worst.totalPL} over ${worst.count} trades. Consider sitting out or tightening rules until you have a clear edge.`,
      });
    }
    const best = pairs.reduce((a, b) => (a.totalPL >= b.totalPL ? a : b));
    if (best.totalPL > 0 && best.pair !== worst.pair) {
      out.push({
        kind: 'good',
        title: `Strongest pair: ${best.pair}`,
        text: `${best.pair} contributed about +${best.totalPL}. Your playbook may align well with this instrument.`,
      });
    }
  }

  const sessions = Object.entries(stats.bySession || {});
  if (sessions.length) {
    const worstS = sessions.reduce((a, b) => (a[1].totalPL <= b[1].totalPL ? a : b));
    if (worstS[1].totalPL < -50 || (withPL > 5 && worstS[1].totalPL < 0 && worstS[1].trades >= 3)) {
      out.push({
        kind: 'tip',
        title: `Tough session: ${worstS[0]}`,
        text: `In your timezone, "${worstS[0]}" shows about ${worstS[1].totalPL} P/L over ${worstS[1].trades} trades. Try trading less or with stricter rules in that window.`,
      });
    }
  }

  const tagged = trades.filter((t) => (t.strategy || '').trim()).length;
  if (n >= 12 && tagged / n < 0.4) {
    out.push({
      kind: 'tip',
      title: 'Tag more strategies',
      text: 'Most trades are untagged. Strategy tags unlock clearer analytics on what actually works for you.',
    });
  }

  if (n >= 10) {
    const top = pairs[0];
    if (top && top.count / n >= 0.75) {
      out.push({
        kind: 'tip',
        title: 'Concentration',
        text: `A large share of trades are on ${top.pair}. Diversification isn’t required, but blind spots show up when one market regime changes.`,
      });
    }
  }

  if (stats.avgRMultiple != null && withPL >= 8) {
    if (stats.avgRMultiple < -0.15) {
      out.push({
        kind: 'warn',
        title: 'Negative average R',
        text: `Average realized R is about ${stats.avgRMultiple}. Winners may be too small vs losers — check targets, partials, and stop placement.`,
      });
    } else if (stats.avgRMultiple > 0.5) {
      out.push({
        kind: 'good',
        title: 'Positive average R',
        text: `Average realized R around ${stats.avgRMultiple} suggests your winners are larger vs risk on average — keep validating with more trades.`,
      });
    }
  }

  // Weekday loss pattern (user-local weekday)
  const lossByWeekday = {};
  const countByWeekday = {};
  for (const t of trades) {
    if (t.profitLoss == null) continue;
    const d = new Date(t.closedAt || t.openedAt);
    const wd = weekdayShort(d, tz);
    countByWeekday[wd] = (countByWeekday[wd] || 0) + 1;
    if (t.profitLoss < 0) {
      lossByWeekday[wd] = (lossByWeekday[wd] || 0) + 1;
    }
  }
  let worstDay = null;
  let worstRatio = 0;
  for (const wd of Object.keys(countByWeekday)) {
    const c = countByWeekday[wd];
    if (c < 3) continue;
    const l = lossByWeekday[wd] || 0;
    const ratio = l / c;
    if (ratio > worstRatio && ratio >= 0.55) {
      worstRatio = ratio;
      worstDay = wd;
    }
  }
  if (worstDay && withPL >= 10) {
    out.push({
      kind: 'tip',
      title: `${worstDay}s look rough`,
      text: `About ${Math.round(worstRatio * 100)}% of closed trades on ${worstDay} (your timezone) were losses. Consider lighter size or no trading that day until you verify edge.`,
    });
  }

  // Streak of losses (recent by time)
  const sorted = [...trades]
    .filter((t) => t.profitLoss != null)
    .sort((a, b) => new Date(b.closedAt || b.openedAt) - new Date(a.closedAt || a.openedAt));
  let streak = 0;
  for (const t of sorted) {
    if (t.profitLoss < 0) streak += 1;
    else break;
  }
  if (streak >= 4) {
    out.push({
      kind: 'warn',
      title: 'Losing streak',
      text: `Last ${streak} closed trades were losses. Step down risk, review rules, and avoid revenge trading until process is clear.`,
    });
  }

  if (out.length === 0) {
    out.push({
      kind: 'tip',
      title: 'Keep journaling',
      text: 'Not enough signal yet for strong patterns. Log trades with P/L, tags, and psychology notes — insights get sharper over time.',
    });
  }

  return out.slice(0, 12);
}

function weekdayShort(date, timeZone) {
  try {
    return new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(date);
  } catch {
    return new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(date);
  }
}

module.exports = { generateInsights };
