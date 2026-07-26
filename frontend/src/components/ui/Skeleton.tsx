import { CSSProperties } from 'react'

interface SkeletonProps {
  width?: string | number
  height?: string | number
  borderRadius?: string
  style?: CSSProperties
}

export function Skeleton({ width = '100%', height = '16px', borderRadius = 'var(--radius-sm)', style }: SkeletonProps) {
  return (
    <div
      className="skeleton"
      style={{ width, height, borderRadius, flexShrink: 0, ...style }}
    />
  )
}

export function CardSkeleton() {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius)',
      padding: '20px',
      display: 'flex', flexDirection: 'column', gap: '12px',
    }}>
      <Skeleton width="36px" height="36px" borderRadius="var(--radius-sm)" />
      <Skeleton width="60px" height="28px" />
      <Skeleton width="100px" height="14px" />
    </div>
  )
}

export function ListItemSkeleton() {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius)',
      padding: '16px',
      display: 'flex', alignItems: 'center', gap: '12px',
    }}>
      <Skeleton width="40px" height="40px" borderRadius="50%" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <Skeleton width="60%" height="14px" />
        <Skeleton width="40%" height="12px" />
      </div>
      <Skeleton width="80px" height="14px" />
    </div>
  )
}

export function TableRowSkeleton({ cols = 4 }: { cols?: number }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${cols}, 1fr)`,
      gap: '16px',
      padding: '16px',
      borderBottom: '1px solid var(--border-subtle)',
    }}>
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={i} height="14px" width={i === 0 ? '70%' : '50%'} />
      ))}
    </div>
  )
}
