import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthProvider'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Layout } from './components/Layout'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { Dashboard } from './pages/Dashboard'
import { TradeForm } from './pages/TradeForm'
import { TradeHistory } from './pages/TradeHistory'
import { Analytics } from './pages/Analytics'
import { Profile } from './pages/Profile'
import { Calendar } from './pages/Calendar'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="trades" element={<TradeHistory />} />
              <Route path="trades/new" element={<TradeForm />} />
              <Route path="trades/:id/edit" element={<TradeForm />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="calendar" element={<Calendar />} />
              <Route path="profile" element={<Profile />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
