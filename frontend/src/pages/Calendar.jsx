import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch } from '../api/client'

export function Calendar() {
  const [items, setItems] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch('/trades?limit=500')
      .then((d) => setItems(d.items || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const byDay = useMemo(() => {
    const map = new Map()
    for (const t of items) {
      const d = t.openedAt ? new Date(t.openedAt) : null
      if (!d || Number.isNaN(d.getTime())) continue
      const key = d.toISOString().slice(0, 10)
      if (!map.has(key)) map.set(key, { trades: [], pl: 0 })
      const bucket = map.get(key)
      bucket.trades.push(t)
      if (t.profitLoss != null) bucket.pl += Number(t.profitLoss)
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]))
  }, [items])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Calendar</h1>
        <p className="mt-1 text-sm text-slate-500">Trades grouped by day (open date)</p>
      </div>

      {error && (
        <p className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</p>
      )}
      {loading && <p className="text-sm text-slate-500">Loading…</p>}

      {!loading && byDay.length === 0 && (
        <p className="text-sm text-slate-500">No trades to show.</p>
      )}

      <div className="space-y-4">
        {byDay.map(([day, { trades, pl }]) => (
          <div
            key={day}
            className="rounded-xl border border-slate-800 bg-slate-900/40 p-5"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-lg font-medium text-white">{day}</h2>
              <span
                className={`font-mono text-sm tabular-nums ${
                  pl > 0 ? 'text-emerald-400' : pl < 0 ? 'text-red-400' : 'text-slate-400'
                }`}
              >
                Day P/L: {pl >= 0 ? '+' : ''}
                {Math.round(pl * 100) / 100}
              </span>
            </div>
            <ul className="mt-3 space-y-2 text-sm">
              {trades.map((t) => (
                <li
                  key={t._id}
                  className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/80 pt-2 first:border-0 first:pt-0"
                >
                  <span className="text-slate-300">
                    <span className="font-medium text-white">{t.pair}</span>{' '}
                    <span className="capitalize">({t.type})</span>
                    {t.strategy ? (
                      <span className="text-slate-500"> · {t.strategy}</span>
                    ) : null}
                  </span>
                  <span className="flex items-center gap-3">
                    {t.profitLoss != null && (
                      <span
                        className={
                          t.profitLoss > 0
                            ? 'text-emerald-400'
                            : t.profitLoss < 0
                              ? 'text-red-400'
                              : 'text-slate-400'
                        }
                      >
                        {t.profitLoss}
                      </span>
                    )}
                    <Link
                      to={`/trades/${t._id}/edit`}
                      className="text-emerald-400 hover:text-emerald-300"
                    >
                      Edit
                    </Link>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
