import { NavLink, useLocation } from 'react-router-dom'
import { LayoutDashboard, Package, ShoppingBag, ChefHat, User, Settings, LogOut, X } from 'lucide-react'
import { Logo } from '../ui/Logo'
import { useAuth } from '../../contexts/AuthContext'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', emoji: '📊' },
  { to: '/inventory', icon: Package, label: 'Inventario', emoji: '📦' },
  { to: '/purchases', icon: ShoppingBag, label: 'Compras', emoji: '🛒' },
  { to: '/recipes', icon: ChefHat, label: 'Recetas', emoji: '🍽️' },
]
const bottomItems = [
  { to: '/profile', icon: User, label: 'Perfil', emoji: '👤' },
  { to: '/settings', icon: Settings, label: 'Configuración', emoji: '⚙️' },
]

function NavItem({ to, icon: Icon, label, onClick }: { to: string; icon: React.ElementType; label: string; onClick?: () => void }) {
  const location = useLocation()
  const active = location.pathname === to

  return (
    <NavLink
      to={to}
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '9px 12px',
        borderRadius: 'var(--radius-sm)',
        color: active ? 'var(--primary)' : 'var(--text-secondary)',
        background: active ? 'var(--primary-dim)' : 'transparent',
        fontSize: '13.5px',
        fontWeight: active ? 600 : 400,
        transition: 'all var(--transition)',
        textDecoration: 'none',
        border: active ? '1px solid var(--border)' : '1px solid transparent',
        letterSpacing: '-0.01em',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={e => {
        if (!active) {
          e.currentTarget.style.background = 'var(--surface-2)'
          e.currentTarget.style.color = 'var(--text)'
          e.currentTarget.style.borderColor = 'var(--border-subtle)'
          e.currentTarget.style.transform = 'translateX(3px)'
        }
      }}
      onMouseLeave={e => {
        if (!active) {
          e.currentTarget.style.background = 'transparent'
          e.currentTarget.style.color = 'var(--text-secondary)'
          e.currentTarget.style.borderColor = 'transparent'
          e.currentTarget.style.transform = ''
        }
      }}
    >
      {active && (
        <span style={{
          position: 'absolute', left: 0, top: '20%', bottom: '20%',
          width: '3px', borderRadius: '0 4px 4px 0',
          background: 'var(--primary)',
          boxShadow: '0 0 8px var(--primary)',
        }} />
      )}
      <Icon size={15} style={{ flexShrink: 0, marginLeft: active ? '4px' : '0', transition: 'margin var(--transition)' }} />
      {label}
    </NavLink>
  )
}

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
  variant?: 'desktop' | 'mobile'
}

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const { user, logout } = useAuth()

  return (
    <div style={{
      height: '100%',
      background: 'var(--surface)',
      borderRight: '1px solid var(--border-subtle)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Logo */}
      <div style={{
        padding: '18px 16px 14px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid var(--border-subtle)',
      }}>
        <Logo size={26} showText />
        {onClose && (
          <button
            onClick={onClose}
            style={{
              width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: '6px', color: 'var(--text-muted)', cursor: 'pointer',
              transition: 'all var(--transition)',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.color = 'var(--text)' }}
            onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'var(--text-muted)' }}
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '10px 10px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', padding: '8px 12px 4px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Menú
        </div>
        {navItems.map(item => (
          <NavItem key={item.to} {...item} onClick={onClose} />
        ))}

        <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', padding: '16px 12px 4px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Cuenta
        </div>
        {bottomItems.map(item => (
          <NavItem key={item.to} {...item} onClick={onClose} />
        ))}
      </nav>

      {/* User + Logout */}
      <div style={{ padding: '10px', borderTop: '1px solid var(--border-subtle)' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '10px',
          background: 'var(--surface-2)',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-subtle)',
          marginBottom: '6px',
        }}>
          {user?.profile_image_url ? (
            <img src={user.profile_image_url} alt="" style={{ width: '30px', height: '30px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
          ) : (
            <div style={{
              width: '30px', height: '30px', borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--primary-dim), var(--surface-3))',
              border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--primary)', fontSize: '12px', fontWeight: 700, flexShrink: 0,
            }}>
              {user?.name?.[0]?.toUpperCase() ?? 'U'}
            </div>
          )}
          <div style={{ overflow: 'hidden', flex: 1 }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.name}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.email}
            </div>
          </div>
        </div>

        <button
          onClick={logout}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
            padding: '8px 12px', borderRadius: 'var(--radius-sm)',
            fontSize: '13px', color: 'var(--text-secondary)',
            transition: 'all var(--transition)', cursor: 'pointer',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--danger-dim)'; e.currentTarget.style.color = 'var(--danger)' }}
          onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'var(--text-secondary)' }}
        >
          <LogOut size={13} /> Cerrar sesión
        </button>
      </div>
    </div>
  )
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  return (
    <>
      {/* Desktop — always visible */}
      <aside className="sidebar-desktop">
        <SidebarContent />
      </aside>

      {/* Mobile — overlay */}
      {isOpen && (
        <>
          <div
            onClick={onClose}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(11,15,14,0.7)',
              backdropFilter: 'blur(4px)',
              zIndex: 39,
            }}
          />
          <aside style={{
            position: 'fixed', top: 0, left: 0, bottom: 0,
            width: '220px',
            zIndex: 40,
            animation: 'slideInLeft 0.25s ease',
          }}>
            <SidebarContent onClose={onClose} />
          </aside>
        </>
      )}
    </>
  )
}
