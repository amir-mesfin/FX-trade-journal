import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { apiFetch } from '../api/client'
import { resolveScreenshotUrl, screenshotKey } from '../utils/screenshotUrl'

function toLocalInput(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const CHECKLIST_ITEMS = [
  { key: 'newsChecked',     label: 'Check news before 9:30' },
  { key: 'liquidityMarked', label: 'Mark liquidity & PD array' },
  { key: 'waitedNYOpen',   label: 'Wait NY open (9:30)' },
  { key: 'liquiditySweep', label: 'Wait liquidity sweep' },
  { key: 'crtConfirmed',   label: 'CRT confirmation' },
  { key: 'reversalSign',   label: 'Reversal sign' },
  { key: 'mssDisplacement',label: 'MSS + displacement' },
  { key: 'bprIfvgFvg',     label: 'BPR → IFVG → FVG' },
  { key: 'entryTaken',     label: 'Enter trade' },
  { key: 'targetCRT',      label: 'Target CRT' },
  { key: 'journaled',      label: 'Journal' },
]

const emptyChecklist = Object.fromEntries(CHECKLIST_ITEMS.map(({ key }) => [key, false]))

const empty = {
  pair: '',
  type: 'buy',
  lotSize: '',
  entryPrice: '',
  stopLoss: '',
  takeProfit: '',
  exitPrice: '',
  profitLoss: '',
  rMultiple: '',
  riskAmount: '',
  riskPercent: '',
  strategy: '',
  notes: '',
  psychologyNote: '',
  openedAt: '',
  closedAt: '',
  status: 'closed',
  entryChecklist: { ...emptyChecklist },
}

export function TradeForm() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const [form, setForm] = useState(empty)
  const [files, setFiles] = useState([])
  const [existingShots, setExistingShots] = useState([])
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isEdit) {
      setForm((f) => ({ ...f, openedAt: toLocalInput(new Date().toISOString()) }))
      return
    }
    let cancelled = false
    apiFetch(`/trades/${id}`)
      .then((t) => {
        if (cancelled) return
        setExistingShots(Array.isArray(t.screenshots) ? t.screenshots : [])
        setForm({
          pair: t.pair || '',
          type: t.type || 'buy',
          lotSize: t.lotSize ?? '',
          entryPrice: t.entryPrice ?? '',
          stopLoss: t.stopLoss ?? '',
          takeProfit: t.takeProfit ?? '',
          exitPrice: t.exitPrice ?? '',
          profitLoss: t.profitLoss ?? '',
          rMultiple: t.rMultiple ?? '',
          riskAmount: t.riskAmount ?? '',
          riskPercent: t.riskPercent ?? '',
          strategy: t.strategy || '',
          notes: t.notes || '',
          psychologyNote: t.psychologyNote || '',
          openedAt: toLocalInput(t.openedAt),
          closedAt: t.closedAt ? toLocalInput(t.closedAt) : '',
          status: t.status || 'closed',
          entryChecklist: { ...emptyChecklist, ...(t.entryChecklist || {}) },
        })
      })
      .catch((e) => setError(e.message))
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id, isEdit])

  function set(k, v) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const payload = {
        pair: form.pair,
        type: form.type,
        lotSize: form.lotSize,
        entryPrice: form.entryPrice,
        stopLoss: form.stopLoss,
        takeProfit: form.takeProfit,
        exitPrice: form.exitPrice,
        profitLoss: form.profitLoss,
        rMultiple: form.rMultiple,
        riskAmount: form.riskAmount,
        riskPercent: form.riskPercent,
        strategy: form.strategy,
        notes: form.notes,
        psychologyNote: form.psychologyNote,
        status: form.status,
        openedAt: form.openedAt ? new Date(form.openedAt).toISOString() : undefined,
        closedAt: form.closedAt ? new Date(form.closedAt).toISOString() : '',
        entryChecklist: form.entryChecklist,
      }

      const hasFiles = files.length > 0

      // Multipart only when uploading images (Cloudinary on server). Otherwise JSON —
      // more reliable behind proxies (e.g. Render) than empty multipart bodies.
      if (hasFiles) {
        const fd = new FormData()
        for (const [key, val] of Object.entries(payload)) {
          if (val === undefined || val === '') continue
          if (key === 'rMultiple' && String(val).trim() === '') continue
          // Serialize nested checklist as JSON string for multipart
          if (key === 'entryChecklist') { fd.append(key, JSON.stringify(val)); continue }
          fd.append(key, String(val))
        }
        for (const f of files) fd.append('screenshots', f)
        await apiFetch(isEdit ? `/trades/${id}` : '/trades', {
          method: isEdit ? 'PATCH' : 'POST',
          body: fd,
        })
      } else {
        await apiFetch(isEdit ? `/trades/${id}` : '/trades', {
          method: isEdit ? 'PATCH' : 'POST',
          body: JSON.stringify(payload),
        })
      }
      navigate('/trades')
    } catch (err) {
      setError(err.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-500">Loading trade…</p>
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">
            {isEdit ? 'Edit trade' : 'Log trade'}
          </h1>
          <p className="mt-1 text-sm text-slate-500">Record setup, execution, and psychology</p>
        </div>
        <Link
          to="/trades"
          className="text-sm text-slate-400 hover:text-slate-200"
        >
          ← History
        </Link>
      </div>

      {error && (
        <p className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</p>
      )}

      <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border border-slate-800 bg-slate-900/40 p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-slate-400">Pair</label>
            <input
              required
              placeholder="XAUUSD, EURUSD…"
              value={form.pair}
              onChange={(e) => set('pair', e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white uppercase outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400">Type</label>
            <select
              value={form.type}
              onChange={(e) => set('type', e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
            >
              <option value="buy">Buy</option>
              <option value="sell">Sell</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400">Status</label>
            <select
              value={form.status}
              onChange={(e) => set('status', e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
            >
              <option value="closed">Closed</option>
              <option value="open">Open</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400">Lot size</label>
            <input
              required
              type="text"
              inputMode="decimal"
              value={form.lotSize}
              onChange={(e) => set('lotSize', e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400">Entry price</label>
            <input
              required
              type="text"
              inputMode="decimal"
              value={form.entryPrice}
              onChange={(e) => set('entryPrice', e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400">Stop loss</label>
            <input
              type="text"
              inputMode="decimal"
              value={form.stopLoss}
              onChange={(e) => set('stopLoss', e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400">Take profit</label>
            <input
              type="text"
              inputMode="decimal"
              value={form.takeProfit}
              onChange={(e) => set('takeProfit', e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400">Exit price</label>
            <input
              type="text"
              inputMode="decimal"
              value={form.exitPrice}
              onChange={(e) => set('exitPrice', e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400">Profit / loss</label>
            <input
              type="text"
              inputMode="decimal"
              value={form.profitLoss}
              onChange={(e) => set('profitLoss', e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400">Realized R (optional)</label>
            <input
              type="text"
              inputMode="decimal"
              value={form.rMultiple}
              onChange={(e) => set('rMultiple', e.target.value)}
              placeholder="Leave blank to auto from entry / SL / exit"
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
            />
            <p className="mt-1 text-xs text-slate-600">
              R = move to exit ÷ risk (entry → stop). Filled only when all three exist.
            </p>
          </div>

          {/* ── Risk section ──────────────────────────────────────────────────── */}
          <div className="sm:col-span-2 rounded-xl border border-amber-800/40 bg-amber-500/5 p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-amber-400">
              💰 Risk Management
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-slate-400">Dollar risk ($)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="e.g. 50"
                  value={form.riskAmount}
                  onChange={(e) => set('riskAmount', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
                />
                <p className="mt-1 text-xs text-slate-600">How many dollars you are risking on this trade.</p>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-400">Account risk (%)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="e.g. 1"
                  value={form.riskPercent}
                  onChange={(e) => set('riskPercent', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
                />
                <p className="mt-1 text-xs text-slate-600">Percentage of your total account balance at risk.</p>
              </div>
            </div>
            {/* Live implied account size */}
            {form.riskAmount !== '' && form.riskPercent !== '' && Number(form.riskPercent) > 0 && (
              <p className="mt-3 text-xs text-amber-400/80">
                → Implied account size:{' '}
                <span className="font-semibold text-amber-300">
                  ${(Number(form.riskAmount) / (Number(form.riskPercent) / 100)).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
              </p>
            )}
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400">Opened</label>
            <input
              required
              type="datetime-local"
              value={form.openedAt}
              onChange={(e) => set('openedAt', e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400">Closed</label>
            <input
              type="datetime-local"
              value={form.closedAt}
              onChange={(e) => set('closedAt', e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-slate-400">Strategy tag</label>
            <input
              placeholder="ICT breaker, order block, liquidity sweep…"
              value={form.strategy}
              onChange={(e) => set('strategy', e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-slate-400">Notes (setup)</label>
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-slate-400">Psychology</label>
            <textarea
              rows={2}
              placeholder="FOMO, hesitation, discipline…"
              value={form.psychologyNote}
              onChange={(e) => set('psychologyNote', e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
            />
          </div>

          {/* ── ICT Entry Checklist ───────────────────────────────────────── */}
          <div className="sm:col-span-2">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-400">
              ✅ ICT Entry Checklist
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {CHECKLIST_ITEMS.map(({ key, label }) => {
                const checked = form.entryChecklist[key] ?? false
                return (
                  <label
                    key={key}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                      checked
                        ? 'border-emerald-600 bg-emerald-600/10 text-emerald-400'
                        : 'border-slate-700 bg-slate-950 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          entryChecklist: { ...f.entryChecklist, [key]: e.target.checked },
                        }))
                      }
                      className="h-4 w-4 accent-emerald-500"
                    />
                    {label}
                  </label>
                )
              })}
            </div>
            {/* completion badge */}
            {(() => {
              const total = CHECKLIST_ITEMS.length
              const done = CHECKLIST_ITEMS.filter(({ key }) => form.entryChecklist[key]).length
              const pct = Math.round((done / total) * 100)
              return (
                <div className="mt-3 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-500">
                    {done}/{total} steps
                  </span>
                </div>
              )
            })()}
          </div>
          {isEdit && existingShots.length > 0 && (
            <div className="sm:col-span-2">
              <p className="text-xs font-medium text-slate-400">Current screenshots</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {existingShots.map((shot, i) => {
                  const src = resolveScreenshotUrl(shot)
                  if (!src) return null
                  return (
                    <a
                      key={screenshotKey(shot, i)}
                      href={src}
                      target="_blank"
                      rel="noreferrer"
                      className="block overflow-hidden rounded-lg border border-slate-700"
                    >
                      <img
                        src={src}
                        alt=""
                        className="h-24 w-auto max-w-[200px] object-cover"
                      />
                    </a>
                  )
                })}
              </div>
            </div>
          )}
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-slate-400">Screenshots</label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => setFiles(Array.from(e.target.files || []))}
              className="mt-2 block w-full text-sm text-slate-400 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-800 file:px-3 file:py-2 file:text-sm file:text-slate-200"
            />
            {isEdit && (
              <p className="mt-2 text-xs text-slate-500">
                Add more images; existing shots stay unless you remove them in a future update.
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {saving ? 'Saving…' : isEdit ? 'Update trade' : 'Save trade'}
          </button>
          <Link
            to="/trades"
            className="rounded-lg border border-slate-700 px-5 py-2.5 text-sm text-slate-300 hover:bg-slate-800"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
