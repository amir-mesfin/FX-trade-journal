import { useEffect, useState } from 'react'
import { apiFetch, downloadPdf } from '../api/client'
import { useAuth } from '../hooks/useAuth'
import { StatsFilters } from '../components/StatsFilters'
import { InsightsPanel } from '../components/InsightsPanel'
import { statsQueryString, reportQueryString } from '../utils/statsQuery'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

const emptyFilters = { startDate: '', endDate: '', pair: '', strategy: '' }

export function Analytics() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')
  const [draftFilters, setDraftFilters] = useState(emptyFilters)
  const [appliedFilters, setAppliedFilters] = useState(emptyFilters)
  const [pdfLoading, setPdfLoading] = useState('')

  const tz = user?.timezone || 'UTC'

  useEffect(() => {
    let cancelled = false
    const qs = statsQueryString(appliedFilters, tz)
    setError('')
    apiFetch(`/stats/summary${qs}`)
      .then((s) => {
        if (!cancelled) setStats(s)
      })
      .catch((e) => {
        if (!cancelled) setError(e.message)
      })
    return () => {
      cancelled = true
    }
  }, [appliedFilters, tz])

  const sessionData = stats?.bySession
    ? Object.entries(stats.bySession).map(([name, v]) => ({
        name,
        pl: Math.round(v.totalPL * 100) / 100,
        trades: v.trades,
      }))
    : []

  async function handlePdf(range) {
    const q = reportQueryString({ range, filters: appliedFilters })
    setPdfLoading(range)
    try {
      await downloadPdf(q)
    } catch (e) {
      alert(e.message)
    } finally {
      setPdfLoading('')
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">Analytics</h1>
        <p className="mt-1 text-sm text-slate-500">
          Filtered performance · session buckets use your timezone ({stats?.timezoneUsed || tz})
        </p>
      </div>

      <StatsFilters
        filters={draftFilters}
        onChange={setDraftFilters}
        onApply={() => setAppliedFilters({ ...draftFilters })}
      />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!!pdfLoading}
          onClick={() => handlePdf('month')}
          className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-50"
        >
          {pdfLoading === 'month' ? 'PDF…' : 'Export PDF (month)'}
        </button>
      </div>

      <InsightsPanel filters={appliedFilters} timezone={tz} />

      {error && (
        <p className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</p>
      )}
      {!stats && !error && <p className="text-sm text-slate-500">Loading…</p>}

      {stats && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
              <p className="text-xs uppercase text-slate-500">Most profitable pair</p>
              <p className="mt-2 text-lg font-semibold text-emerald-400">
                {stats.mostProfitablePair || '—'}
              </p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
              <p className="text-xs uppercase text-slate-500">Win rate</p>
              <p className="mt-2 text-lg font-semibold text-white">
                {stats.winRate != null ? `${stats.winRate}%` : '—'}
              </p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
              <p className="text-xs uppercase text-slate-500">Avg planned R:R</p>
              <p className="mt-2 text-lg font-semibold text-white">{stats.avgRR ?? '—'}</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
              <p className="text-xs uppercase text-slate-500">Avg realized R</p>
              <p className="mt-2 text-lg font-semibold text-white">{stats.avgRMultiple ?? '—'}</p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
            <h2 className="text-sm font-medium text-slate-300">
              P/L by session (local time buckets)
            </h2>
            {sessionData.length === 0 ? (
              <p className="mt-6 text-center text-sm text-slate-500">
                No closed P/L in this filter.
              </p>
            ) : (
              <div className="mt-4 h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sessionData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={11} />
                    <Tooltip
                      contentStyle={{
                        background: '#0f172a',
                        border: '1px solid #334155',
                        borderRadius: 8,
                      }}
                    />
                    <Bar dataKey="pl" fill="#34d399" radius={[4, 4, 0, 0]} name="P/L" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
              <h2 className="text-sm font-medium text-slate-300">By pair</h2>
              {(stats.byPair || []).length === 0 ? (
                <p className="mt-4 text-sm text-slate-500">No data.</p>
              ) : (
                <ul className="mt-4 max-h-80 space-y-2 overflow-auto text-sm">
                  {(stats.byPair || []).map((row) => (
                    <li
                      key={row.pair}
                      className="flex justify-between border-b border-slate-800/80 py-2 text-slate-300"
                    >
                      <span className="font-medium text-white">{row.pair}</span>
                      <span className="font-mono tabular-nums text-slate-400">
                        {row.totalPL >= 0 ? '+' : ''}
                        {row.totalPL} <span className="text-slate-600">({row.count})</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
              <h2 className="text-sm font-medium text-slate-300">By strategy</h2>
              {(stats.byStrategy || []).length === 0 ? (
                <p className="mt-4 text-sm text-slate-500">No data.</p>
              ) : (
                <ul className="mt-4 max-h-80 space-y-2 overflow-auto text-sm">
                  {(stats.byStrategy || []).map((row) => (
                    <li
                      key={row.strategy}
                      className="flex justify-between border-b border-slate-800/80 py-2 text-slate-300"
                    >
                      <span className="max-w-[60%] truncate font-medium text-white">
                        {row.strategy}
                      </span>
                      <span className="font-mono tabular-nums text-slate-400">
                        {row.totalPL >= 0 ? '+' : ''}
                        {row.totalPL}{' '}
                        <span className="text-slate-600">({row.trades})</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
