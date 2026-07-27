import { useState, useRef, useEffect } from 'react'
import { Plus, Leaf, Mic, Camera, X } from 'lucide-react'

interface DockAction {
  icon: React.ReactNode
  label: string
  onClick: () => void
  color: string
}

interface FloatingDockProps {
  actions: DockAction[]
}

export function FloatingDock({ actions }: FloatingDockProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dockRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dockRef.current && !dockRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const toggle = () => setIsOpen(prev => !prev)

  return (
    <div
      ref={dockRef}
      className="desktop-fab"
      style={{
        position: 'fixed',
        bottom: '28px',
        right: '28px',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '10px',
      }}
    >
      {/* Action items */}
      {isOpen && actions.map((action, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            animation: `dockExpand 0.2s ease ${i * 0.05}s both`,
          }}
        >
          {/* Label */}
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            padding: '5px 12px',
            fontSize: '13px',
            fontWeight: 500,
            color: 'var(--text)',
            whiteSpace: 'nowrap',
            boxShadow: 'var(--shadow)',
          }}>
            {action.label}
          </div>

          {/* Button */}
          <button
            onClick={() => { action.onClick(); setIsOpen(false) }}
            style={{
              width: '46px', height: '46px',
              borderRadius: '50%',
              background: `${action.color}18`,
              border: `1px solid ${action.color}30`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: action.color,
              cursor: 'pointer',
              transition: 'all var(--transition)',
              boxShadow: `0 4px 16px ${action.color}25`,
              flexShrink: 0,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = `${action.color}28`
              e.currentTarget.style.transform = 'scale(1.08)'
              e.currentTarget.style.boxShadow = `0 6px 20px ${action.color}40`
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = `${action.color}18`
              e.currentTarget.style.transform = ''
              e.currentTarget.style.boxShadow = `0 4px 16px ${action.color}25`
            }}
          >
            {action.icon}
          </button>
        </div>
      ))}

      {/* Main button */}
      <button
        onClick={toggle}
        aria-label={isOpen ? 'Cerrar menú' : 'Agregar alimento'}
        style={{
          width: '56px', height: '56px',
          borderRadius: '50%',
          background: isOpen
            ? 'var(--surface)'
            : 'var(--primary)',
          border: isOpen
            ? '1px solid var(--border-subtle)'
            : 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: isOpen ? 'var(--text-secondary)' : '#0B0F0E',
          cursor: 'pointer',
          transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
          boxShadow: isOpen ? 'var(--shadow)' : '0 4px 24px rgba(62,213,152,0.4)',
          transform: isOpen ? 'rotate(45deg)' : 'rotate(0)',
          flexShrink: 0,
        }}
        onMouseEnter={e => {
          if (!isOpen) {
            e.currentTarget.style.background = 'var(--primary-hover)'
            e.currentTarget.style.transform = 'scale(1.05)'
          }
        }}
        onMouseLeave={e => {
          if (!isOpen) {
            e.currentTarget.style.background = 'var(--primary)'
            e.currentTarget.style.transform = ''
          }
        }}
      >
        {isOpen ? <X size={22} /> : <Plus size={22} />}
      </button>
    </div>
  )
}

// Pre-configured dock with default actions
interface FreshlyDockProps {
  onManual: () => void
  onVoice: () => void
  onReceipt: () => void
  onPhoto?: () => void
}

export function FreshlyDock({ onManual, onVoice, onReceipt, onPhoto }: FreshlyDockProps) {
  const actions: DockAction[] = [
    {
      icon: <Leaf size={18} />,
      label: 'Agregar manualmente',
      onClick: onManual,
      color: '#3ED598',
    },
    {
      icon: <Mic size={18} />,
      label: 'Agregar por voz',
      onClick: onVoice,
      color: '#6495ED',
    },
    {
      icon: <Camera size={18} />,
      label: 'Foto de alimento (IA)',
      onClick: onPhoto ?? (() => {}),
      color: '#FF7F7F',
    },
    {
      icon: <Camera size={18} />,
      label: 'Foto de factura',
      onClick: onReceipt,
      color: '#F5B841',
    },
  ]

  return <FloatingDock actions={actions} />
}
