import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { Logo } from '../ui/Logo'
import { ToastProvider } from '../ui/Toast'
import { useLocation } from 'react-router-dom'

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/inventory': 'Inventario',
  '/purchases': 'Compras',
  '/recipes': 'Recetas',
  '/profile': 'Perfil',
  '/settings': 'Configuración',
}

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const title = pageTitles[location.pathname] ?? 'Freshly'

  return (
    <ToastProvider>
      <div className="app-shell">
        <Sidebar isOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

        <div className="main-content">
          {/* Mobile navbar */}
          <header style={{
            height: '52px',
            background: 'rgba(11,15,14,0.9)',
            backdropFilter: 'blur(16px)',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 16px',
            position: 'sticky', top: 0, zIndex: 30,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {/* Hamburger — only mobile */}
              <button
                onClick={() => setMobileOpen(true)}
                style={{
                  width: '34px', height: '34px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-secondary)', cursor: 'pointer',
                  transition: 'all var(--transition)',
                }}
                className="mobile-only"
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.color = 'var(--text)' }}
                onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'var(--text-secondary)' }}
              >
                <Menu size={17} />
              </button>
              <Logo size={22} showText={false} />
              <h1 style={{ fontSize: '15px', fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text)' }}>
                {title}
              </h1>
            </div>
          </header>

          <main style={{
            flex: 1,
            padding: '24px 20px 80px',
            maxWidth: '1100px',
            width: '100%',
            margin: '0 auto',
          }}>
            <Outlet />
          </main>
        </div>
      </div>

      <style>{`
        @media (min-width: 769px) {
          .mobile-only { display: none !important; }
        }
      `}</style>
    </ToastProvider>
  )
}
