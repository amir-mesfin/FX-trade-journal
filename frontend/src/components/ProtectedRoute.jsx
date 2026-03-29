import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export function ProtectedRoute() {
  const { token, bootstrapping } = useAuth()

  if (bootstrapping) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
        <p className="text-sm">Loading…</p>
      </div>
    )
  }

  if (!token) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
