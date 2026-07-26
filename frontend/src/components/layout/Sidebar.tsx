import { NavLink, useLocation } from 'react-router-dom'
import { LayoutDashboard, Package, ShoppingBag, ChefHat, User, Settings, X } from 'lucide-react'
import { Logo } from '../ui/Logo'
import { useAuth } from '../../contexts/AuthContext'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/inventory', icon: Package, label: 'Inventario' },
  { to: '/purchases', icon: ShoppingBag, label: 'Compras' },
  { to: '/recipes', icon: ChefHat, label: 'Recetas' },
]

const bottomItems = [
  { to: '/profile', icon: User, label: 'Perfil' },
  { to: '/settings', icon: Settings, label: 'Configuración' },
]

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user } = useAuth()
  const location = useLocation()

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(11,15,14,0.7)',
            backdropFilter: 'blur(4px)',
            zIndex: 39,
          }}
        />
      )}

      {/* Sidebar */}
      <aside style={{
        position: 'fixed',
        top: 0, left: 0, bottom: 0,
        width: '240px',
        background: 'var(--surface)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 40,
        transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 20px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border-subtle)',
        }}>
          <Logo size={28} showText />
          <button
            onClick={onClose}
            style={{
              width: '28px', height: '28px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: '6px', background: 'none', border: 'none',
              color: 'var(--text-secondary)', cursor: 'pointer',
              transition: 'all var(--transition)',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.color = 'var(--text)' }}
            onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'var(--text-secondary)' }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '12px 12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', padding: '8px 8px 4px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Principal
          </div>
          {navItems.map(({ to, icon: Icon, label }) => {
            const active = location.pathname === to
            return (
              <NavLink
                key={to}
                to={to}
                onClick={onClose}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '9px 10px',
                  borderRadius: 'var(--radius-sm)',
                  color: active ? 'var(--primary)' : 'var(--text-secondary)',
                  background: active ? 'var(--primary-dim)' : 'transparent',
                  fontSize: '14px',
                  fontWeight: active ? 500 : 400,
                  transition: 'all var(--transition)',
                  textDecoration: 'none',
                  letterSpacing: '-0.01em',
                  border: active ? '1px solid rgba(62,213,152,0.15)' : '1px solid transparent',
                }}
                onMouseEnter={e => {
                  if (!active) {
                    e.currentTarget.style.background = 'var(--surface-2)'
                    e.currentTarget.style.color = 'var(--text)'
                  }
                }}
                onMouseLeave={e => {
                  if (!active) {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = 'var(--text-secondary)'
                  }
                }}
              >
                <Icon size={16} />
                {label}
              </NavLink>
            )
          })}
        </nav>

        {/* Bottom */}
        <div style={{ padding: '12px', borderTop: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {bottomItems.map(({ to, icon: Icon, label }) => {
            const active = location.pathname === to
            return (
              <NavLink
                key={to}
                to={to}
                onClick={onClose}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '9px 10px',
                  borderRadius: 'var(--radius-sm)',
                  color: active ? 'var(--primary)' : 'var(--text-secondary)',
                  background: active ? 'var(--primary-dim)' : 'transparent',
                  fontSize: '14px', fontWeight: active ? 500 : 400,
                  transition: 'all var(--transition)',
                  textDecoration: 'none',
                }}
                onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.color = 'var(--text)' } }}
                onMouseLeave={e => { if (!active) { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'var(--text-secondary)' } }}
              >
                <Icon size={16} />
                {label}
              </NavLink>
            )
          })}

          {/* User pill */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '10px',
            marginTop: '4px',
            background: 'var(--surface-2)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
          }}>
            {user?.profile_image_url ? (
              <img src={user.profile_image_url} alt="" style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              <div style={{
                width: '28px', height: '28px', borderRadius: '50%',
                background: 'var(--primary-dim)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--primary)', fontSize: '12px', fontWeight: 600, flexShrink: 0,
              }}>
                {user?.name?.[0]?.toUpperCase() ?? 'U'}
              </div>
            )}
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.name}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.email}
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
