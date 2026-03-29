import { startTransition, useCallback, useEffect, useMemo, useState } from 'react'
import { AuthContext } from './authContext'
import { apiFetch, setToken, getToken } from '../api/client'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setTokenState] = useState(() => getToken())
  const [sessionChecked, setSessionChecked] = useState(() => !getToken())

  useEffect(() => {
    if (!token) return

    let cancelled = false
    startTransition(() => setSessionChecked(false))
    apiFetch('/auth/me')
      .then((u) => {
        if (!cancelled) setUser(u)
      })
      .catch(() => {
        if (!cancelled) {
          setToken(null)
          setTokenState(null)
          setUser(null)
        }
      })
      .finally(() => {
        if (!cancelled) setSessionChecked(true)
      })
    return () => {
      cancelled = true
    }
  }, [token])

  const login = useCallback(async (email, password) => {
    const data = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    setToken(data.token)
    setTokenState(data.token)
    setUser(data.user)
  }, [])

  const register = useCallback(async (name, email, password) => {
    const data = await apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    })
    setToken(data.token)
    setTokenState(data.token)
    setUser(data.user)
  }, [])

  const logout = useCallback(() => {
    setToken(null)
    setTokenState(null)
    setUser(null)
    setSessionChecked(true)
  }, [])

  const refreshUser = useCallback(async () => {
    const u = await apiFetch('/auth/me')
    setUser(u)
    return u
  }, [])

  const resolvedUser = token ? user : null

  const value = useMemo(
    () => ({
      user: resolvedUser,
      token,
      bootstrapping: Boolean(token) && !sessionChecked,
      login,
      register,
      logout,
      refreshUser,
    }),
    [resolvedUser, token, sessionChecked, login, register, logout, refreshUser]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
