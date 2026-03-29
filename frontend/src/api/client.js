const TOKEN_KEY = 'token'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

export async function apiFetch(path, options = {}) {
  const headers = { ...(options.headers || {}) }
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }
  const t = getToken()
  if (t) headers['Authorization'] = `Bearer ${t}`

  const r = await fetch(`/api${path}`, { ...options, headers })
  if (r.status === 204) return null
  const data = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(data.error || r.statusText || 'Request failed')
  return data
}

export async function downloadCsv(searchQuery = '') {
  const t = getToken()
  const path = `/api/trades/export/csv${searchQuery.startsWith('?') ? searchQuery : searchQuery ? `?${searchQuery}` : ''}`
  const r = await fetch(path, {
    headers: t ? { Authorization: `Bearer ${t}` } : {},
  })
  if (!r.ok) {
    const err = await r.json().catch(() => ({}))
    throw new Error(err.error || 'Export failed')
  }
  const blob = await r.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'trades.csv'
  a.click()
  URL.revokeObjectURL(url)
}

export async function downloadPdf(searchQuery = '') {
  const t = getToken()
  const path = `/api/reports/pdf${searchQuery.startsWith('?') ? searchQuery : searchQuery ? `?${searchQuery}` : ''}`
  const r = await fetch(path, {
    headers: t ? { Authorization: `Bearer ${t}` } : {},
  })
  if (!r.ok) {
    const err = await r.json().catch(() => ({}))
    throw new Error(err.error || 'PDF export failed')
  }
  const blob = await r.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `trade-journal-report-${new Date().toISOString().slice(0, 10)}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}
