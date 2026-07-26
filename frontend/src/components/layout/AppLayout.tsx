import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Navbar } from './Navbar'
import { ToastProvider } from '../ui/Toast'

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <ToastProvider>
      <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Main */}
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
        }}>
          <Navbar onMenuOpen={() => setSidebarOpen(true)} />
          <main style={{
            flex: 1,
            padding: '24px 16px',
            maxWidth: '1200px',
            width: '100%',
            margin: '0 auto',
            boxSizing: 'border-box',
          }}>
            <Outlet />
          </main>
        </div>
      </div>
    </ToastProvider>
  )
}
