import { ReactNode } from 'react'
import { Button } from './Button'

interface EmptyStateProps {
  icon: ReactNode
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
  }
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '60px 24px',
      textAlign: 'center',
      gap: '16px',
      animation: 'fadeIn 0.4s ease',
    }}>
      <div style={{
        width: '64px', height: '64px',
        background: 'var(--surface-2)',
        borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--text-muted)',
        fontSize: '28px',
        border: '1px solid var(--border-subtle)',
      }}>
        {icon}
      </div>
      <div>
        <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text)', marginBottom: '6px' }}>
          {title}
        </h3>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', maxWidth: '300px', lineHeight: 1.6 }}>
          {description}
        </p>
      </div>
      {action && (
        <Button onClick={action.onClick} size="sm">
          {action.label}
        </Button>
      )}
    </div>
  )
}
