import { ReactNode, useEffect } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg'
}

const sizes = {
  sm: '400px',
  md: '560px',
  lg: '720px',
}

export function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  if (!isOpen) return null

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(11,15,14,0.8)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000,
        padding: '20px',
        animation: 'fadeIn 0.15s ease',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          width: '100%',
          maxWidth: sizes[size],
          maxHeight: '90vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow-lg)',
          animation: 'scaleIn 0.2s ease',
        }}
      >
        {title && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '20px 24px',
            borderBottom: '1px solid var(--border-subtle)',
            flexShrink: 0,
          }}>
            <h2 style={{ fontSize: '17px', fontWeight: 600, letterSpacing: '-0.02em' }}>{title}</h2>
            <button
              onClick={onClose}
              style={{
                width: '32px', height: '32px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: '8px',
                color: 'var(--text-secondary)',
                transition: 'all var(--transition)',
                cursor: 'pointer',
                background: 'none', border: 'none',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.color = 'var(--text)' }}
              onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'var(--text-secondary)' }}
            >
              <X size={16} />
            </button>
          </div>
        )}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {children}
        </div>
      </div>
    </div>
  )
}
