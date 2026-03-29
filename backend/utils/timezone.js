function isValidTimezone(tz) {
  if (!tz || typeof tz !== 'string') return false;
  try {
    Intl.DateTimeFormat('en-US', { timeZone: tz.trim() });
    return true;
  } catch {
    return false;
  }
}

/** Local hour (0–23) for `date` in IANA `timeZone`. */
function hourInTimezone(date, timeZone) {
  const d = date instanceof Date ? date : new Date(date);
  const tz = timeZone && isValidTimezone(timeZone) ? timeZone : 'UTC';
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    hour: 'numeric',
    hour12: false,
  });
  const parts = fmt.formatToParts(d);
  const h = parts.find((p) => p.type === 'hour');
  return h ? parseInt(h.value, 10) : 0;
}

/** Session buckets in the user's local clock (good for ICT-style review). */
function sessionLabelLocalHour(h) {
  if (h >= 2 && h < 8) return 'Asia / early';
  if (h >= 8 && h < 13) return 'London overlap';
  if (h >= 13 && h < 18) return 'New York overlap';
  if (h >= 18 && h < 22) return 'Late NY';
  return 'Off hours';
}

module.exports = { isValidTimezone, hourInTimezone, sessionLabelLocalHour };
