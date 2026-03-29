import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { apiFetch } from '../api/client'

const TIMEZONES = [
  'UTC',
  'Africa/Addis_Ababa',
  'America/Chicago',
  'America/Los_Angeles',
  'America/New_York',
  'Asia/Dubai',
  'Asia/Tokyo',
  'Australia/Sydney',
  'Europe/Berlin',
  'Europe/London',
]

export function Profile() {
  const { user, refreshUser } = useAuth()
  const [name, setName] = useState(user?.name || '')
  const [timezone, setTimezone] = useState(user?.timezone || 'UTC')

  const zoneOptions = [
    ...new Set([...TIMEZONES, user?.timezone, timezone].filter(Boolean)),
  ].sort()

  useEffect(() => {
    if (user?.name != null) setName(user.name)
    if (user?.timezone != null) setTimezone(user.timezone)
  }, [user])

  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setMessage('')
    setSaving(true)
    try {
      await apiFetch('/auth/me', {
        method: 'PATCH',
        body: JSON.stringify({ name, timezone }),
      })
      await refreshUser()
      setMessage('Profile updated.')
    } catch (err) {
      setError(err.message || 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Profile</h1>
        <p className="mt-1 text-sm text-slate-500">
          Timezone drives session buckets on Dashboard and Analytics.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/40 p-6"
      >
        {message && (
          <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
            {message}
          </p>
        )}
        {error && (
          <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>
        )}
        <div>
          <label className="text-xs font-medium text-slate-400">Email</label>
          <p className="mt-1 text-sm text-slate-300">{user?.email}</p>
        </div>
        <div>
          <label htmlFor="name" className="text-xs font-medium text-slate-400">
            Display name
          </label>
          <input
            id="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
          />
        </div>
        <div>
          <label htmlFor="tz" className="text-xs font-medium text-slate-400">
            Timezone (IANA)
          </label>
          <select
            id="tz"
            value={zoneOptions.includes(timezone) ? timezone : 'UTC'}
            onChange={(e) => setTimezone(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
          >
            {zoneOptions.map((z) => (
              <option key={z} value={z}>
                {z}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-600">
            If yours isn’t listed, pick the closest region; full list:{' '}
            <a
              href="https://en.wikipedia.org/wiki/List_of_tz_database_time_zones"
              className="text-emerald-500 hover:text-emerald-400"
              target="_blank"
              rel="noreferrer"
            >
              tz database
            </a>
            .
          </p>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </form>
    </div>
  )
}
