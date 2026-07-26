import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { AppLayout } from './components/layout/AppLayout'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { DashboardPage } from './pages/DashboardPage'
import { InventoryPage } from './pages/InventoryPage'
import { PurchasesPage } from './pages/PurchasesPage'
import { RecipesPage } from './pages/RecipesPage'
import { ProfilePage } from './pages/ProfilePage'
import { SettingsPage } from './pages/SettingsPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()
  if (isLoading) return <FullScreenLoader />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()
  if (isLoading) return <FullScreenLoader />
  if (isAuthenticated) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

function FullScreenLoader() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: 'var(--bg)',
      flexDirection: 'column',
      gap: '16px',
    }}>
      <svg width="40" height="40" viewBox="0 0 32 32" fill="none">
        <rect width="32" height="32" rx="8" fill="#141B18"/>
        <path d="M16 6C16 6 10 10 10 17C10 20.3137 12.6863 23 16 23C19.3137 23 22 20.3137 22 17C22 10 16 6 16 6Z" fill="#3ED598"/>
        <path d="M16 14V26" stroke="#141B18" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
      <div style={{
        width: '24px',
        height: '24px',
        border: '2px solid rgba(62,213,152,0.2)',
        borderTopColor: '#3ED598',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
    </div>
  )
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
      <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="purchases" element={<PurchasesPage />} />
        <Route path="recipes" element={<RecipesPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}
