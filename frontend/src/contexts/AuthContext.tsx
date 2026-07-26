import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import type { User } from '../types'
import { authApi } from '../lib/api'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (token: string, user: User) => void
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('freshly_token')
    if (token) {
      authApi.me()
        .then(setUser)
        .catch(() => localStorage.removeItem('freshly_token'))
        .finally(() => setIsLoading(false))
    } else {
      setIsLoading(false)
    }
  }, [])

  const login = (token: string, user: User) => {
    localStorage.setItem('freshly_token', token)
    setUser(user)
  }

  const logout = () => {
    localStorage.removeItem('freshly_token')
    setUser(null)
  }

  const refreshUser = async () => {
    const u = await authApi.me()
    setUser(u)
  }

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      isAuthenticated: !!user,
      login,
      logout,
      refreshUser,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
