import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'

import { setUnauthorizedHandler, tokenStore } from '@/lib/api/client'
import { authApi } from '@/lib/api/endpoints/auth'
import type { LoginValues } from '@/lib/api/schemas'
import { ROLES, type User } from '@/lib/api/types'

import { AuthContext, type AuthContextValue, type AuthStatus } from './auth-context'

const isKnownRole = (user: User) => (ROLES as readonly string[]).includes(user.role)

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [user, setUserState] = useState<User | null>(null)
  const [status, setStatus] = useState<AuthStatus>(() => (tokenStore.get() ? 'loading' : 'unauthenticated'))

  const clearSession = useCallback(() => {
    tokenStore.clear()
    setUserState(null)
    setStatus('unauthenticated')
    queryClient.clear()
  }, [queryClient])

  // A 401 anywhere drops the session; the route guards then send the user to /login.
  useEffect(() => {
    setUnauthorizedHandler(clearSession)
    return () => setUnauthorizedHandler(null)
  }, [clearSession])

  // Restore the session from the stored token.
  useEffect(() => {
    if (!tokenStore.get()) return
    let cancelled = false
    authApi
      .me()
      .then((me) => {
        if (cancelled) return
        if (!isKnownRole(me)) return clearSession()
        setUserState(me)
        setStatus('authenticated')
      })
      .catch(() => {
        if (!cancelled) clearSession()
      })
    return () => {
      cancelled = true
    }
  }, [clearSession])

  const login = useCallback(
    async (values: LoginValues) => {
      const token = await authApi.login(values)
      tokenStore.set(token)
      try {
        const me = await authApi.me()
        if (!isKnownRole(me)) throw new Error('Unknown role')
        setUserState(me)
        setStatus('authenticated')
        return me
      } catch (error) {
        clearSession()
        throw error
      }
    },
    [clearSession],
  )

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } catch {
      // The token may already be invalid; clear locally either way.
    }
    clearSession()
  }, [clearSession])

  const setUser = useCallback((next: User) => setUserState(next), [])

  const value = useMemo<AuthContextValue>(
    () => ({ user, status, login, logout, setUser }),
    [user, status, login, logout, setUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
