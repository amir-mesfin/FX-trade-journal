import { useEffect, useState } from 'react'
import './App.css'

function App() {
  const [status, setStatus] = useState({ loading: true, error: null, data: null })

  useEffect(() => {
    let cancelled = false
    fetch('/api/health')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((data) => {
        if (!cancelled) setStatus({ loading: false, error: null, data })
      })
      .catch((err) => {
        if (!cancelled)
          setStatus({ loading: false, error: err.message, data: null })
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="app">
      <header className="header">
        <h1>Trade journal</h1>
        <p className="subtitle">React + Node + MongoDB Atlas</p>
      </header>
      <main className="card">
        <h2>API status</h2>
        {status.loading && <p className="muted">Checking backend…</p>}
        {status.error && (
          <p className="error">
            Could not reach the API. Start the backend with{' '}
            <code>npm run dev</code> in <code>backend/</code> (port 5000).
            <br />
            <span className="muted">{status.error}</span>
          </p>
        )}
        {status.data && (
          <ul className="status-list">
            <li>
              API: <strong>{status.data.ok ? 'ok' : 'not ok'}</strong>
            </li>
            <li>
              MongoDB:{' '}
              <strong>{status.data.dbReady ? 'connected' : 'not connected'}</strong>
            </li>
          </ul>
        )}
      </main>
    </div>
  )
}

export default App
