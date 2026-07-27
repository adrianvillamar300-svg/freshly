import { useState, useRef, useEffect } from 'react'
import { Plus, Leaf, Mic, Camera, X, Sparkles, Receipt } from 'lucide-react'

interface DockAction {
  icon: React.ReactNode
  label: string
  tooltip: string
  onClick: () => void
  color: string
}

interface FloatingDockProps {
  actions: DockAction[]
}

function DockItem({ action, index, onClose }: { action: DockAction; index: number; onClose: () => void }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        animation: `dockExpand 0.2s ease ${index * 0.05}s both`,
        position: 'relative',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Tooltip */}
      {hovered && (
        <div style={{
          position: 'absolute',
          right: '56px',
          background: 'var(--surface-2)',
          border: `1px solid ${action.color}40`,
          borderRadius: 'var(--radius-sm)',
          padding: '6px 10px',
          fontSize: '11.5px',
          color: 'var(--text-secondary)',
          whiteSpace: 'nowrap',
          boxShadow: `0 4px 16px rgba(0,0,0,0.3)`,
          pointerEvents: 'none',
          animation: 'fadeIn 0.15s ease',
          zIndex: 10,
        }}>
          {action.tooltip}
        </div>
      )}

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
        onClick={() => { action.onClick(); onClose() }}
        style={{
          width: '46px', height: '46px',
          borderRadius: '50%',
          background: hovered ? `${action.color}28` : `${action.color}18`,
          border: `1px solid ${action.color}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: action.color,
          cursor: 'pointer',
          transition: 'all var(--transition)',
          boxShadow: hovered ? `0 6px 20px ${action.color}40` : `0 4px 16px ${action.color}25`,
          transform: hovered ? 'scale(1.08)' : 'scale(1)',
          flexShrink: 0,
        }}
      >
        {action.icon}
      </button>
    </div>
  )
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
        <DockItem key={i} action={action} index={i} onClose={() => setIsOpen(false)} />
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
            : '#6495ED',
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
      label: 'Manual',
      tooltip: 'Escribe el nombre, cantidad y ubicación del alimento',
      onClick: onManual,
      color: '#3ED598',
    },
    {
      icon: <Mic size={18} />,
      label: 'Por voz',
      tooltip: 'Dicta los alimentos y la IA los interpreta',
      onClick: onVoice,
      color: '#6495ED',
    },
    {
      icon: <Sparkles size={18} />,
      label: 'Foto IA',
      tooltip: 'Saca foto a tus alimentos y la IA los identifica',
      onClick: onPhoto ?? (() => {}),
      color: '#FF7F7F',
    },
    {
      icon: <Receipt size={18} />,
      label: 'Factura',
      tooltip: 'Escanea un ticket de compra para importar todo',
      onClick: onReceipt,
      color: '#F5B841',
    },
  ]

  return <FloatingDock actions={actions} />
}
