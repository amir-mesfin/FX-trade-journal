export function StatsFilters({ filters, onChange, onApply, showApply = true }) {
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
      <div>
        <label className="text-xs text-slate-500">From</label>
        <input
          type="date"
          value={filters.startDate}
          onChange={(e) => onChange({ ...filters, startDate: e.target.value })}
          className="mt-1 block rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
        />
      </div>
      <div>
        <label className="text-xs text-slate-500">To</label>
        <input
          type="date"
          value={filters.endDate}
          onChange={(e) => onChange({ ...filters, endDate: e.target.value })}
          className="mt-1 block rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
        />
      </div>
      <div>
        <label className="text-xs text-slate-500">Pair</label>
        <input
          placeholder="XAUUSD"
          value={filters.pair}
          onChange={(e) => onChange({ ...filters, pair: e.target.value })}
          className="mt-1 block w-28 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
        />
      </div>
      <div>
        <label className="text-xs text-slate-500">Strategy</label>
        <input
          placeholder="Tag"
          value={filters.strategy}
          onChange={(e) => onChange({ ...filters, strategy: e.target.value })}
          className="mt-1 block w-36 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
        />
      </div>
      {showApply && (
        <button
          type="button"
          onClick={onApply}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
        >
          Apply
        </button>
      )}
      <button
        type="button"
        onClick={() => onChange({ startDate: '', endDate: '', pair: '', strategy: '' })}
        className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-400 hover:bg-slate-800"
      >
        Clear
      </button>
    </div>
  )
}
