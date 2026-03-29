import { startTransition, useEffect, useState } from 'react'
import { apiFetch } from '../api/client'
import { statsQueryString } from '../utils/statsQuery'

const styles = {
  tip: 'border-slate-700 bg-slate-900/60',
  warn: 'border-amber-500/40 bg-amber-500/5',
  good: 'border-emerald-500/40 bg-emerald-500/5',
}

export function InsightsPanel({ filters, timezone }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const qs = statsQueryString(filters || {}, timezone || 'UTC')
    startTransition(() => {
      setLoading(true)
      setError('')
    })
    apiFetch(`/insights${qs}`)
      .then((d) => {
        if (!cancelled) setData(d)
      })
      .catch((e) => {
        if (!cancelled) setError(e.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [filters, timezone])

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
      <h2 className="text-sm font-medium text-slate-300">Smart insights</h2>
      <p className="mt-1 text-xs text-slate-500">
        Rule-based tips from your own stats — no external AI API. Respects Dashboard filters.
      </p>
      {loading && <p className="mt-4 text-sm text-slate-500">Analyzing…</p>}
      {error && (
        <p className="mt-4 text-sm text-red-400">{error}</p>
      )}
      {!loading && data && (
        <p className="mt-2 text-xs text-slate-600">
          {data.tradesAnalyzed} trades · TZ {data.timezoneUsed}
        </p>
      )}
      {!loading && data?.insights?.length > 0 && (
        <ul className="mt-4 space-y-3">
          {data.insights.map((item, i) => (
            <li
              key={i}
              className={`rounded-lg border p-4 ${styles[item.kind] || styles.tip}`}
            >
              <p className="text-sm font-medium text-white">{item.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-400">{item.text}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
