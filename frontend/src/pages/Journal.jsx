import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiFetch } from '../api/client'

const MOODS = [
  { value: 'neutral', label: 'Neutral' },
  { value: 'calm', label: 'Calm' },
  { value: 'focused', label: 'Focused' },
  { value: 'confident', label: 'Confident' },
  { value: 'stressed', label: 'Stressed' },
  { value: 'tired', label: 'Tired' },
  { value: 'revenge', label: 'Revenge / tilt' },
]

function todayISO() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export function Journal() {
  const now = useMemo(() => new Date(), [])
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedDate, setSelectedDate] = useState(todayISO)
  const [mood, setMood] = useState('neutral')
  const [tags, setTags] = useState('')
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    apiFetch(`/journal?year=${year}&month=${month}`)
      .then((d) => setItems(d.items || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [year, month])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    let cancelled = false
    apiFetch(`/journal/day/${selectedDate}`)
      .then((entry) => {
        if (cancelled) return
        setMood(entry.mood || 'neutral')
        setTags((entry.tags || []).join(', '))
        setContent(entry.content || '')
      })
      .catch(() => {
        if (!cancelled) {
          setMood('neutral')
          setTags('')
          setContent('')
        }
      })
    return () => {
      cancelled = true
    }
  }, [selectedDate])

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    setError('')
    try {
      const tagList = tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
      await apiFetch('/journal', {
        method: 'POST',
        body: JSON.stringify({
          journalDate: selectedDate,
          mood,
          tags: tagList,
          content,
        }),
      })
      setMessage('Saved.')
      load()
    } catch (err) {
      setError(err.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this day’s journal entry?')) return
    try {
      await apiFetch(`/journal/day/${selectedDate}`, { method: 'DELETE' })
      setContent('')
      setTags('')
      setMood('neutral')
      load()
    } catch (err) {
      alert(err.message)
    }
  }

  const daysInMonth = new Date(year, month, 0).getDate()
  const monthLabel = new Date(year, month - 1).toLocaleString('default', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">Daily journal</h1>
        <p className="mt-1 text-sm text-slate-500">
          One entry per calendar day — psychology, recap, and discipline notes.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
        <label className="text-xs text-slate-500">Month</label>
        <select
          value={month}
          onChange={(e) => setMonth(Number(e.target.value))}
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
        >
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <option key={m} value={m}>
              {new Date(2000, m - 1).toLocaleString('default', { month: 'long' })}
            </option>
          ))}
        </select>
        <input
          type="number"
          min={2000}
          max={2100}
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="w-24 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
        />
        <span className="text-sm text-slate-400">{monthLabel}</span>
      </div>

      {loading && <p className="text-sm text-slate-500">Loading month…</p>}
      {error && !message && (
        <p className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <h2 className="text-sm font-medium text-slate-300">Days with entries</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
              const d = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              const has = items.some((it) => it.journalDate === d)
              const active = d === selectedDate
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setSelectedDate(d)}
                  className={[
                    'h-9 min-w-[2.25rem] rounded-lg text-sm font-medium',
                    active
                      ? 'bg-emerald-600 text-white'
                      : has
                        ? 'border border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                        : 'border border-slate-700 bg-slate-950 text-slate-400 hover:bg-slate-800',
                  ].join(' ')}
                >
                  {day}
                </button>
              )
            })}
          </div>
        </div>

        <form
          onSubmit={handleSave}
          className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/40 p-5"
        >
          <div>
            <label className="text-xs font-medium text-slate-400">Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400">Mood</label>
            <select
              value={mood}
              onChange={(e) => setMood(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            >
              {MOODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400">Tags (comma-separated)</label>
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="discipline, FOMO, NY session…"
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400">Journal</label>
            <textarea
              rows={8}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What went well? What will you change tomorrow?"
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            />
          </div>
          {message && (
            <p className="text-sm text-emerald-400">{message}</p>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save entry'}
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="rounded-lg border border-red-500/40 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10"
            >
              Delete day
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
