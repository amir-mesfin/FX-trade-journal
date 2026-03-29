import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch, downloadCsv } from '../api/client'

export function TradeHistory() {
  const [data, setData] = useState({ items: [], total: 0 })
  const [filters, setFilters] = useState({ pair: '', strategy: '', startDate: '', endDate: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  function load() {
    setLoading(true)
    const q = new URLSearchParams()
    if (filters.pair) q.set('pair', filters.pair)
    if (filters.strategy) q.set('strategy', filters.strategy)
    if (filters.startDate) q.set('startDate', filters.startDate)
    if (filters.endDate) q.set('endDate', filters.endDate)
    const qs = q.toString()
    apiFetch(`/trades${qs ? `?${qs}` : ''}`)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleDelete(tid) {
    if (!confirm('Delete this trade?')) return
    try {
      await apiFetch(`/trades/${tid}`, { method: 'DELETE' })
      load()
    } catch (e) {
      alert(e.message)
    }
  }

  async function handleExport() {
    setExporting(true)
    try {
      await downloadCsv()
    } catch (e) {
      alert(e.message)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Trade history</h1>
          <p className="mt-1 text-sm text-slate-500">{data.total} trades</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-50"
          >
            {exporting ? 'Export…' : 'Export CSV'}
          </button>
          <Link
            to="/trades/new"
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
          >
            + Add trade
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
        <input
          placeholder="Pair"
          value={filters.pair}
          onChange={(e) => setFilters((f) => ({ ...f, pair: e.target.value }))}
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
        />
        <input
          placeholder="Strategy"
          value={filters.strategy}
          onChange={(e) => setFilters((f) => ({ ...f, strategy: e.target.value }))}
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
        />
        <input
          type="date"
          value={filters.startDate}
          onChange={(e) => setFilters((f) => ({ ...f, startDate: e.target.value }))}
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
        />
        <input
          type="date"
          value={filters.endDate}
          onChange={(e) => setFilters((f) => ({ ...f, endDate: e.target.value }))}
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
        />
        <button
          type="button"
          onClick={load}
          className="rounded-lg bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-700"
        >
          Apply filters
        </button>
      </div>

      {error && (
        <p className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</p>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : data.items.length === 0 ? (
        <p className="text-sm text-slate-500">No trades yet. Log your first one.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-slate-800 bg-slate-900/80 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Pair</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">P/L</th>
                <th className="px-4 py-3">Strategy</th>
                <th className="px-4 py-3">Opened</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {data.items.map((t) => (
                <tr key={t._id} className="bg-slate-950/40 hover:bg-slate-900/60">
                  <td className="px-4 py-3 font-medium text-white">{t.pair}</td>
                  <td className="px-4 py-3 capitalize text-slate-300">{t.type}</td>
                  <td
                    className={`px-4 py-3 font-mono tabular-nums ${
                      t.profitLoss == null
                        ? 'text-slate-500'
                        : t.profitLoss > 0
                          ? 'text-emerald-400'
                          : t.profitLoss < 0
                            ? 'text-red-400'
                            : 'text-slate-300'
                    }`}
                  >
                    {t.profitLoss != null ? t.profitLoss : '—'}
                  </td>
                  <td className="max-w-[140px] truncate px-4 py-3 text-slate-400">
                    {t.strategy || '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {t.openedAt ? new Date(t.openedAt).toLocaleString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to={`/trades/${t._id}/edit`}
                      className="mr-3 text-emerald-400 hover:text-emerald-300"
                    >
                      Edit
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDelete(t._id)}
                      className="text-red-400/90 hover:text-red-300"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
