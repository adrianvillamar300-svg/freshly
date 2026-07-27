import { useState, useRef, useEffect } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { Home, Leaf, ChefHat, BarChart3, Plus, PenLine, Mic, Sparkles, Receipt } from 'lucide-react'

const leftItems = [
  { to: '/dashboard', icon: Home, label: 'Inicio' },
  { to: '/inventory', icon: Leaf, label: 'Despensa' },
]
const rightItems = [
  { to: '/recipes', icon: ChefHat, label: 'Recetas' },
  { to: '/purchases', icon: BarChart3, label: 'Stats' },
]

const quickActions = [
  { icon: PenLine,   label: 'Manual',  tooltip: 'Agregar manualmente',              action: 'manual',  color: '#3ED598' },
  { icon: Mic,       label: 'Voz',     tooltip: 'Dictar alimentos con voz',         action: 'voice',   color: '#6495ED' },
  { icon: Sparkles,  label: 'Foto IA', tooltip: 'Foto → la IA identifica alimentos',action: 'photoIA', color: '#FF7F7F' },
  { icon: Receipt,   label: 'Factura', tooltip: 'Escanear ticket de compra',        action: 'receipt', color: '#F5B841' },
]

function MobileActionButton({ action, onPress }: { action: typeof quickActions[0]; onPress: () => void }) {
  const [showTip, setShowTip] = useState(false)
  const Icon = action.icon
  return (
    <button
      onClick={onPress}
      onMouseEnter={() => setShowTip(true)}
      onMouseLeave={() => setShowTip(false)}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', position: 'relative', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
    >
      {showTip && (
        <div style={{
          position: 'absolute', bottom: '60px', left: '50%', transform: 'translateX(-50%)',
          background: 'var(--surface-2)', border: `1px solid ${action.color}40`,
          borderRadius: 'var(--radius-sm)', padding: '5px 9px',
          fontSize: '11px', color: 'var(--text-secondary)', whiteSpace: 'nowrap',
          boxShadow: '0 4px 14px rgba(0,0,0,0.35)', pointerEvents: 'none',
          animation: 'fadeIn 0.15s ease', zIndex: 10,
        }}>
          {action.tooltip}
        </div>
      )}
      <div style={{
        width: '46px', height: '46px', borderRadius: '50%',
        background: `${action.color}1c`, border: `1px solid ${action.color}40`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: action.color, transition: 'all var(--transition)',
      }}>
        <Icon size={19} />
      </div>
      <span style={{ fontSize: '10.5px', fontWeight: 600, color: action.color }}>{action.label}</span>
    </button>
  )
}

function NavButton({ to, icon: Icon, label }: { to: string; icon: React.ElementType; label: string }) {
  const location = useLocation()
  const active = location.pathname === to
  return (
    <NavLink
      to={to}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
        flex: 1, padding: '8px 0',
        color: active ? 'var(--primary)' : 'var(--text-muted)',
        transition: 'color var(--transition), transform var(--transition)',
      }}
    >
      <Icon size={21} strokeWidth={active ? 2.4 : 2} style={{ transform: active ? 'translateY(-1px) scale(1.05)' : 'none', transition: 'transform var(--transition)' }} />
      <span style={{ fontSize: '10px', fontWeight: active ? 700 : 500, letterSpacing: '-0.01em' }}>{label}</span>
    </NavLink>
  )
}

export function MobileBottomNav() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const goTo = (action: string) => {
    setOpen(false)
    if (action === 'photoIA') {
      // Emitir evento global que las páginas escuchan
      window.dispatchEvent(new CustomEvent('freshly:openPhotoIA'))
    } else {
      navigate(`/purchases?action=${action}`)
    }
  }

  return (
    <div
      ref={ref}
      className="mobile-bottom-nav"
      style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 45,
        background: 'rgba(20,27,24,0.97)',
        backdropFilter: 'blur(16px)',
        borderTop: '1px solid var(--border-subtle)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {/* Menú rápido de agregar (Manual / Voz / Foto) */}
      {open && (
        <div style={{
          display: 'flex', justifyContent: 'center', gap: '12px',
          padding: '14px 12px 6px',
          animation: 'slideDown 0.2s ease',
        }}>
          {quickActions.map(a => (
            <MobileActionButton key={a.action} action={a} onPress={() => goTo(a.action)} />
          ))}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', height: '62px', padding: '0 6px' }}>
        {leftItems.map(item => <NavButton key={item.to} {...item} />)}

        {/* Botón central "+", elevado sobre la barra */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', position: 'relative' }}>
          <button
            onClick={() => setOpen(o => !o)}
            aria-label={open ? 'Cerrar menú' : 'Agregar alimento'}
            style={{
              width: '54px', height: '54px', borderRadius: '50%',
              background: open ? 'var(--surface-2)' : 'var(--primary)',
              border: open ? '1px solid var(--border)' : 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: open ? 'var(--text)' : '#0B0F0E',
              position: 'absolute', top: '-24px',
              boxShadow: open ? 'var(--shadow)' : '0 6px 22px rgba(62,213,152,0.55)',
              transition: 'all 0.3s cubic-bezier(0.34,1.56,0.64,1)',
              transform: open ? 'rotate(45deg)' : 'rotate(0)',
            }}
          >
            <Plus size={24} />
          </button>
        </div>

        {rightItems.map(item => <NavButton key={item.to} {...item} />)}
      </div>
    </div>
  )
}
