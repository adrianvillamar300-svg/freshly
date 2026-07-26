import { Menu, Bell } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { Logo } from '../ui/Logo'

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/inventory': 'Inventario',
  '/purchases': 'Compras',
  '/recipes': 'Recetas',
  '/profile': 'Perfil',
  '/settings': 'Configuración',
}

interface NavbarProps {
  onMenuOpen: () => void
}

export function Navbar({ onMenuOpen }: NavbarProps) {
  const location = useLocation()
  const title = pageTitles[location.pathname] ?? 'Freshly'

  return (
    <header style={{
      height: '56px',
      background: 'rgba(11,15,14,0.85)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid var(--border-subtle)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 16px',
      position: 'sticky',
      top: 0,
      zIndex: 30,
    }}>
      {/* Left */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          onClick={onMenuOpen}
          style={{
            width: '36px', height: '36px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 'var(--radius-sm)',
            background: 'none', border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            transition: 'all var(--transition)',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.color = 'var(--text)' }}
          onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'var(--text-secondary)' }}
        >
          <Menu size={18} />
        </button>

        {/* Logo visible only on desktop when sidebar is closed */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Logo size={24} showText={false} />
          <h1 style={{
            fontSize: '16px',
            fontWeight: 600,
            color: 'var(--text)',
            letterSpacing: '-0.02em',
          }}>
            {title}
          </h1>
        </div>
      </div>

      {/* Right */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          style={{
            width: '36px', height: '36px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 'var(--radius-sm)',
            background: 'none', border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            transition: 'all var(--transition)',
            position: 'relative',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.color = 'var(--text)' }}
          onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'var(--text-secondary)' }}
        >
          <Bell size={16} />
          <span style={{
            position: 'absolute', top: '8px', right: '8px',
            width: '6px', height: '6px',
            background: 'var(--primary)',
            borderRadius: '50%',
            border: '1.5px solid var(--bg)',
          }} />
        </button>
      </div>
    </header>
  )
}
