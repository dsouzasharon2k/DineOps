import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { refreshTokenApi, logoutApi } from '../api/auth'
import { tokenStore } from '../auth/tokenStore'

interface AuthContextValue {
  token: string | null
  isAuthenticated: boolean
  login: (token: string) => void
  logout: () => Promise<void>
  initializing: boolean
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export const AuthProvider = ({
  children,
  skipBootstrap = false,
  initialToken = null,
}: {
  children: React.ReactNode
  skipBootstrap?: boolean
  initialToken?: string | null
}) => {
  const [token, setToken] = useState<string | null>(initialToken)
  const [initializing, setInitializing] = useState(!initialToken)

  useEffect(() => {
    if (skipBootstrap) {
      setInitializing(false)
      return
    }
    const bootstrap = async () => {
      try {
        const data = await refreshTokenApi()
        setToken(data.token)
        tokenStore.setToken(data.token)
      } catch {
        setToken(null)
        tokenStore.clear()
      } finally {
        setInitializing(false)
      }
    }
    bootstrap()
  }, [skipBootstrap])

  const login = (newToken: string) => {
    setToken(newToken)
    tokenStore.setToken(newToken)
  }

  const logout = async () => {
    try {
      await logoutApi()
    } catch {
      // Ignore logout API failure; always clear local auth state.
    }
    setToken(null)
    tokenStore.clear()
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      isAuthenticated: Boolean(token),
      login,
      logout,
      initializing,
    }),
    [token, initializing]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
