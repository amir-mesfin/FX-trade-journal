import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { apiFetch } from '../api/client'

export function Profile() {
  const { user, refreshUser } = useAuth()
  const [name, setName] = useState(user?.name || '')

  useEffect(() => {
    if (user?.name != null) setName(user.name)
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
        body: JSON.stringify({ name }),
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
        <p className="mt-1 text-sm text-slate-500">Account details</p>
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
