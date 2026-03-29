import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch, downloadPdf } from '../api/client'
import { useAuth } from '../hooks/useAuth'
import { StatsFilters } from '../components/StatsFilters'
import { InsightsPanel } from '../components/InsightsPanel'
import { statsQueryString, reportQueryString } from '../utils/statsQuery'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

const emptyFilters = { startDate: '', endDate: '', pair: '', strategy: '' }

export function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')
  const [draftFilters, setDraftFilters] = useState(emptyFilters)
  const [appliedFilters, setAppliedFilters] = useState(emptyFilters)
  const [pdfLoading, setPdfLoading] = useState('')
  const [balance, setBalance] = useState('10000')
  const [riskPct, setRiskPct] = useState('1')
  const [stopPoints, setStopPoints] = useState('20')
  const [pipValue, setPipValue] = useState('10')

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

  const suggestedLots = useMemo(() => {
    const b = Number(balance)
    const r = Number(riskPct)
    const s = Number(stopPoints)
    const p = Number(pipValue)
    if (![b, r, s, p].every((x) => Number.isFinite(x) && x > 0)) return null
    const riskAmount = b * (r / 100)
    const lossPerLot = s * p
    if (lossPerLot <= 0) return null
    return Math.round((riskAmount / lossPerLot) * 100) / 100
  }, [balance, riskPct, stopPoints, pipValue])

  const chartData = stats?.equityCurve?.length
    ? stats.equityCurve.map((pt, i) => ({
        n: i + 1,
        equity: pt.cumulative,
        date: pt.date,
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
        <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">
          Filters apply to stats below. Sessions use your profile timezone ({tz}).
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
          onClick={() => handlePdf('week')}
          className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-50"
        >
          {pdfLoading === 'week' ? 'PDF…' : 'PDF · Week'}
        </button>
        <button
          type="button"
          disabled={!!pdfLoading}
          onClick={() => handlePdf('month')}
          className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-50"
        >
          {pdfLoading === 'month' ? 'PDF…' : 'PDF · Month'}
        </button>
        <button
          type="button"
          disabled={!!pdfLoading}
          onClick={() => handlePdf('year')}
          className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-50"
        >
          {pdfLoading === 'year' ? 'PDF…' : 'PDF · Year'}
        </button>
      </div>

      <InsightsPanel filters={appliedFilters} timezone={tz} />

      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </p>
      )}

      {!stats && !error && <p className="text-sm text-slate-500">Loading stats…</p>}

      {stats && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard label="Total trades" value={stats.totalTrades} />
            <StatCard
              label="Win rate"
              value={stats.winRate != null ? `${stats.winRate}%` : '—'}
            />
            <StatCard
              label="Total P/L"
              value={formatPL(stats.totalPL)}
              highlight={stats.totalPL >= 0 ? 'up' : 'down'}
            />
            <StatCard label="Avg R:R (plan)" value={stats.avgRR ?? '—'} />
            <StatCard label="Avg R (realized)" value={stats.avgRMultiple ?? '—'} />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 lg:col-span-2">
              <h2 className="text-sm font-medium text-slate-300">Equity curve</h2>
              {chartData.length === 0 ? (
                <p className="mt-8 text-center text-sm text-slate-500">
                  No P/L in this filter — log closed trades or widen the date range.
                </p>
              ) : (
                <div className="mt-4 h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="n" stroke="#64748b" fontSize={11} />
                      <YAxis stroke="#64748b" fontSize={11} />
                      <Tooltip
                        contentStyle={{
                          background: '#0f172a',
                          border: '1px solid #334155',
                          borderRadius: 8,
                        }}
                        labelFormatter={(_, p) => p?.[0]?.payload?.date || ''}
                      />
                      <Line
                        type="monotone"
                        dataKey="equity"
                        stroke="#34d399"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
                <h2 className="text-sm font-medium text-slate-300">Risk calculator</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Rough lot estimate from balance, risk %, and stop distance (pip value is
                  instrument-specific).
                </p>
                <div className="mt-4 space-y-3">
                  <Field label="Account balance" value={balance} onChange={setBalance} />
                  <Field label="Risk per trade (%)" value={riskPct} onChange={setRiskPct} />
                  <Field label="Stop distance (points/pips)" value={stopPoints} onChange={setStopPoints} />
                  <Field label="$ per pip per lot" value={pipValue} onChange={setPipValue} />
                </div>
                <p className="mt-4 text-sm text-slate-300">
                  Suggested lots:{' '}
                  <span className="font-mono text-emerald-400">
                    {suggestedLots != null ? suggestedLots : '—'}
                  </span>
                </p>
              </div>
              <Link
                to="/trades/new"
                className="block rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-5 py-4 text-center text-sm font-medium text-emerald-400 hover:bg-emerald-500/15"
              >
                + Log a trade
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function StatCard({ label, value, highlight }) {
  const color =
    highlight === 'up' ? 'text-emerald-400' : highlight === 'down' ? 'text-red-400' : 'text-white'
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-semibold tabular-nums ${color}`}>{value}</p>
    </div>
  )
}

function Field({ label, value, onChange }) {
  return (
    <div>
      <label className="text-xs text-slate-500">{label}</label>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
      />
    </div>
  )
}

function formatPL(n) {
  if (n == null || Number.isNaN(n)) return '—'
  const rounded = Math.round(n * 100) / 100
  return rounded >= 0 ? `+${rounded}` : String(rounded)
}
