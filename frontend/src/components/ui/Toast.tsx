import { useState, useCallback, createContext, useContext, ReactNode } from 'react'
import { CheckCircle, AlertCircle, X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: string
  type: ToastType
  message: string
}

interface ToastContextType {
  toast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { id, type, message }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500)
  }, [])

  const remove = (id: string) => setToasts(prev => prev.filter(t => t.id !== id))

  const colors: Record<ToastType, string> = {
    success: 'var(--primary)',
    error: 'var(--danger)',
    info: 'var(--warning)',
  }

  const icons: Record<ToastType, ReactNode> = {
    success: <CheckCircle size={16} />,
    error: <AlertCircle size={16} />,
    info: <AlertCircle size={16} />,
  }

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div style={{
        position: 'fixed', bottom: '24px', right: '24px',
        display: 'flex', flexDirection: 'column', gap: '8px',
        zIndex: 9999,
        maxWidth: '340px',
      }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            background: 'var(--surface)',
            border: `1px solid ${colors[t.type]}30`,
            borderLeft: `3px solid ${colors[t.type]}`,
            borderRadius: 'var(--radius-sm)',
            padding: '12px 16px',
            boxShadow: 'var(--shadow-lg)',
            animation: 'slideIn 0.3s ease',
            color: 'var(--text)',
            fontSize: '14px',
          }}>
            <span style={{ color: colors[t.type], flexShrink: 0 }}>{icons[t.type]}</span>
            <span style={{ flex: 1 }}>{t.message}</span>
            <button
              onClick={() => remove(t.id)}
              style={{ color: 'var(--text-muted)', cursor: 'pointer', flexShrink: 0, padding: '2px', background: 'none', border: 'none', display: 'flex' }}
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
