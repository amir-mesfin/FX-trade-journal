import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const linkClass = ({ isActive }) =>
  [
    'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
    isActive
      ? 'bg-emerald-500/15 text-emerald-400'
      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200',
  ].join(' ')

export function Layout() {
  const { user, logout } = useAuth()

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between md:py-4">
          <div className="flex items-center gap-3">
            <NavLink to="/" className="text-lg font-semibold tracking-tight text-white">
              Trade Journal
            </NavLink>
            <span className="hidden text-slate-600 sm:inline">·</span>
            <span className="hidden truncate text-sm text-slate-500 sm:inline">{user?.name}</span>
          </div>
          <nav className="flex flex-wrap items-center gap-1">
            <NavLink to="/" end className={linkClass}>
              Dashboard
            </NavLink>
            <NavLink to="/trades/new" className={linkClass}>
              Add trade
            </NavLink>
            <NavLink to="/trades" className={linkClass}>
              History
            </NavLink>
            <NavLink to="/calendar" className={linkClass}>
              Calendar
            </NavLink>
            <NavLink to="/analytics" className={linkClass}>
              Analytics
            </NavLink>
            <NavLink to="/journal" className={linkClass}>
              Journal
            </NavLink>
            <NavLink to="/profile" className={linkClass}>
              Profile
            </NavLink>
            <button
              type="button"
              onClick={logout}
              className="ml-1 rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-slate-800 hover:text-slate-300"
            >
              Log out
            </button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-8">
        <Outlet />
      </main>
    </div>
  )
}
