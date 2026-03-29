const { parse } = require('csv-parse/sync');
const { computeRealizedRMultiple } = require('./tradeMath');

function normHeader(h) {
  return String(h || '')
    .replace(/^\uFEFF/, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/** Map normalized header -> canonical key */
const ALIASES = {
  ticket: ['ticket', 'order', 'deal', 'position id'],
  symbol: ['item', 'symbol', 'pair', 'instrument'],
  type: ['type', 'direction', 'cmd', 'action'],
  volume: ['size', 'volume', 'lots', 'lot', 'quantity'],
  openprice: ['open price', 'price', 'openprice', 'entry price', 'entry'],
  closeprice: ['close price', 'price.1', 'exit price', 'closeprice'],
  sl: ['s/l', 'sl', 'stop loss', 'stoploss'],
  tp: ['t/p', 'tp', 'take profit', 'takeprofit'],
  profit: ['profit', 'p/l', 'pl', 'net profit', 'gain'],
  opentime: ['open time', 'entry time', 'opened'],
  closetime: ['close time', 'exit time', 'closed'],
};

function buildHeaderMap(headers) {
  const map = {};
  const normalized = headers.map(normHeader);
  for (const [key, aliases] of Object.entries(ALIASES)) {
    for (let i = 0; i < normalized.length; i += 1) {
      const h = normalized[i];
      if (aliases.includes(h) || aliases.some((a) => h === a || h.endsWith(a))) {
        map[key] = headers[i];
        break;
      }
    }
  }
  // Fallback: first column matching
  for (let i = 0; i < headers.length; i += 1) {
    const h = normHeader(headers[i]);
    if (!map.symbol && (h.includes('symbol') || h.includes('item'))) map.symbol = headers[i];
    if (!map.profit && h.includes('profit')) map.profit = headers[i];
  }
  return map;
}

function parseFlexibleDate(s) {
  if (!s) return null;
  const str = String(s).trim();
  let d = new Date(str);
  if (!Number.isNaN(d.getTime())) return d;
  const m = str.match(/(\d{4})\.(\d{2})\.(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/);
  if (m) {
    d = new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}`);
    if (!Number.isNaN(d.getTime())) return d;
  }
  const m2 = str.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m2) {
    d = new Date(str.replace(' ', 'T'));
    if (!Number.isNaN(d.getTime())) return d;
  }
  return null;
}

function parseType(raw) {
  const s = String(raw || '').toLowerCase();
  if (s.includes('sell') || s.includes('short') || s === '1') return 'sell';
  if (s.includes('buy') || s.includes('long') || s === '0') return 'buy';
  return null;
}

function num(v) {
  if (v === undefined || v === null || v === '') return undefined;
  const n = Number(String(v).replace(/,/g, ''));
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Parse MT4/MT5-style account history CSV (export from terminal). Returns rows ready for Trade.create.
 */
function parseTradeCsv(buffer) {
  const text = buffer.toString('utf8');
  const records = parse(text, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
    bom: true,
  });
  if (!records.length) {
    return { rows: [], errors: ['No rows in CSV'] };
  }

  const headers = Object.keys(records[0]);
  const hm = buildHeaderMap(headers);
  const errors = [];
  const rows = [];

  if (!hm.symbol) {
    errors.push('Could not find a symbol column (look for Symbol, Item, or Pair).');
    return { rows: [], errors };
  }

  records.forEach((rec, idx) => {
    const line = idx + 2;
    try {
      const pair = String(rec[hm.symbol] || '')
        .trim()
        .toUpperCase()
        .replace(/\s+/g, '');
      if (!pair) return;

      const type = parseType(hm.type ? rec[hm.type] : rec['Type'] || rec['type']);
      if (!type) {
        return;
      }

      const lotSize = num(hm.volume ? rec[hm.volume] : rec['Volume'] || rec['Lots']);
      if (lotSize === undefined || lotSize < 0) {
        errors.push(`Line ${line}: invalid lot size`);
        return;
      }

      let entryPrice = num(hm.openprice ? rec[hm.openprice] : undefined);
      if (entryPrice === undefined) entryPrice = num(rec['Open Price'] ?? rec['Price']);
      let exitPrice = num(hm.closeprice ? rec[hm.closeprice] : undefined);
      if (exitPrice === undefined) {
        exitPrice = num(
          rec['Close Price'] ?? rec['Price_1'] ?? rec['Price.1'] ?? rec['Price_2'] ?? rec['ClosePrice']
        );
      }
      if (entryPrice === undefined) {
        errors.push(`Line ${line}: missing open price`);
        return;
      }

      const stopLoss = num(hm.sl ? rec[hm.sl] : undefined);
      const takeProfit = num(hm.tp ? rec[hm.tp] : undefined);
      const profitLoss = num(hm.profit ? rec[hm.profit] : rec['Profit']);

      let openedAt =
        parseFlexibleDate(hm.opentime ? rec[hm.opentime] : null) ||
        parseFlexibleDate(rec['Open Time']) ||
        new Date();
      let closedAt =
        parseFlexibleDate(hm.closetime ? rec[hm.closetime] : null) ||
        parseFlexibleDate(rec['Close Time']) ||
        undefined;

      const externalId =
        hm.ticket && rec[hm.ticket] != null && String(rec[hm.ticket]).trim()
          ? `csv:${String(rec[hm.ticket]).trim()}`
          : `csv:${line}:${pair}:${openedAt.getTime()}`;

      const payload = {
        pair,
        type,
        lotSize,
        entryPrice,
        stopLoss,
        takeProfit,
        exitPrice,
        profitLoss,
        strategy: 'CSV import',
        notes: `Imported from CSV (row ${line})`,
        openedAt,
        closedAt,
        status: exitPrice != null || closedAt ? 'closed' : 'open',
        importSource: 'csv',
        externalId,
        screenshots: [],
      };
      const r = computeRealizedRMultiple(payload);
      if (r !== undefined) payload.rMultiple = r;
      rows.push(payload);
    } catch (e) {
      errors.push(`Line ${line}: ${e.message || 'parse error'}`);
    }
  });

  if (!rows.length && !errors.length) {
    errors.push(
      'No trade rows found. Export Account History from MT4/MT5 as CSV with Symbol, Type, Size, prices, and Profit.'
    );
  }

  return { rows, errors };
}

module.exports = { parseTradeCsv };
