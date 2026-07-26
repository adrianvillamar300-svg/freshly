import { ReactNode, CSSProperties } from 'react'

interface CardProps {
  children: ReactNode
  style?: CSSProperties
  className?: string
  hover?: boolean
  padding?: string
  onClick?: () => void
  glow?: boolean
  onMouseEnter?: (e: React.MouseEvent<HTMLDivElement>) => void
  onMouseLeave?: (e: React.MouseEvent<HTMLDivElement>) => void
}

export function Card({ children, style, hover = false, padding = '20px', onClick, glow = false, onMouseEnter, onMouseLeave }: CardProps) {
  return (
    <div
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius)',
        padding,
        transition: 'all var(--transition)',
        cursor: onClick ? 'pointer' : undefined,
        boxShadow: glow ? 'var(--glow)' : undefined,
        ...style,
      }}
      onMouseEnter={hover && !onClick ? undefined : onClick ? e => {
        e.currentTarget.style.borderColor = 'var(--border)'
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.boxShadow = 'var(--shadow)'
      } : undefined}
      onMouseLeave={onClick ? e => {
        e.currentTarget.style.borderColor = 'var(--border-subtle)'
        e.currentTarget.style.transform = ''
        e.currentTarget.style.boxShadow = glow ? 'var(--glow)' : ''
      } : undefined}
    >
      {children}
    </div>
  )
}

interface StatCardProps {
  label: string
  value: string | number
  icon: ReactNode
  trend?: { value: number; label: string }
  accent?: string
}

export function StatCard({ label, value, icon, trend, accent = 'var(--primary)' }: StatCardProps) {
  return (
    <Card style={{ position: 'relative', overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', top: 0, right: 0,
        width: '80px', height: '80px',
        background: `radial-gradient(circle at center, ${accent}15 0%, transparent 70%)`,
        borderRadius: '0 0 0 80px',
      }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{
          width: '36px', height: '36px',
          background: `${accent}18`,
          borderRadius: 'var(--radius-sm)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: accent,
        }}>
          {icon}
        </div>
        <div>
          <div style={{ fontSize: '26px', fontWeight: 700, fontFamily: 'Space Grotesk', letterSpacing: '-0.03em', color: 'var(--text)' }}>
            {value}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>{label}</div>
        </div>
        {trend && (
          <div style={{ fontSize: '12px', color: trend.value >= 0 ? 'var(--primary)' : 'var(--danger)' }}>
            {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
          </div>
        )}
      </div>
    </Card>
  )
}
