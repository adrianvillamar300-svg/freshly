import { ReactNode } from 'react'

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info'

const colors: Record<BadgeVariant, { bg: string; text: string }> = {
  default: { bg: 'var(--surface-2)', text: 'var(--text-secondary)' },
  success: { bg: 'var(--primary-dim)', text: 'var(--primary)' },
  warning: { bg: 'var(--warning-dim)', text: 'var(--warning)' },
  danger: { bg: 'var(--danger-dim)', text: 'var(--danger)' },
  info: { bg: 'rgba(100,149,237,0.15)', text: '#6495ED' },
}

interface BadgeProps {
  children: ReactNode
  variant?: BadgeVariant
}

export function Badge({ children, variant = 'default' }: BadgeProps) {
  const { bg, text } = colors[variant]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 8px',
      background: bg,
      color: text,
      borderRadius: '100px',
      fontSize: '12px',
      fontWeight: 500,
      letterSpacing: '-0.01em',
      whiteSpace: 'nowrap',
    }}>
      {children}
    </span>
  )
}

export function SourceBadge({ source }: { source: string }) {
  const map: Record<string, BadgeVariant> = {
    manual: 'default',
    voice: 'info',
    receipt: 'warning',
  }
  const labels: Record<string, string> = {
    manual: '✍️ Manual',
    voice: '🎤 Voz',
    receipt: '📷 Foto',
  }
  return <Badge variant={map[source] ?? 'default'}>{labels[source] ?? source}</Badge>
}
