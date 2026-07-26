import { ReactNode, ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  icon?: ReactNode
  iconRight?: ReactNode
  fullWidth?: boolean
  children?: ReactNode
}

const sizes: Record<Size, { padding: string; fontSize: string; height: string }> = {
  sm: { padding: '0 12px', fontSize: '13px', height: '32px' },
  md: { padding: '0 16px', fontSize: '14px', height: '40px' },
  lg: { padding: '0 24px', fontSize: '15px', height: '48px' },
}

const variantStyles: Record<Variant, React.CSSProperties> = {
  primary: {
    background: 'var(--primary)',
    color: '#0B0F0E',
    fontWeight: 600,
  },
  secondary: {
    background: 'var(--surface-2)',
    color: 'var(--text)',
    border: '1px solid var(--border-subtle)',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--text-secondary)',
  },
  danger: {
    background: 'var(--danger-dim)',
    color: 'var(--danger)',
    border: '1px solid rgba(255,107,107,0.2)',
  },
  outline: {
    background: 'transparent',
    color: 'var(--primary)',
    border: '1px solid var(--primary)',
  },
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconRight,
  fullWidth = false,
  children,
  disabled,
  style,
  ...props
}: ButtonProps) {
  const sz = sizes[size]

  return (
    <button
      disabled={disabled || loading}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        height: sz.height,
        padding: sz.padding,
        fontSize: sz.fontSize,
        fontFamily: 'inherit',
        fontWeight: 500,
        borderRadius: 'var(--radius-sm)',
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'all var(--transition)',
        width: fullWidth ? '100%' : undefined,
        whiteSpace: 'nowrap',
        letterSpacing: '-0.01em',
        ...variantStyles[variant],
        ...style,
      }}
      onMouseEnter={e => {
        if (disabled || loading) return
        const el = e.currentTarget
        if (variant === 'primary') el.style.background = 'var(--primary-hover)'
        else if (variant === 'ghost') { el.style.background = 'var(--surface-2)'; el.style.color = 'var(--text)' }
        else if (variant === 'secondary') el.style.background = 'var(--surface-3)'
      }}
      onMouseLeave={e => {
        if (disabled || loading) return
        const el = e.currentTarget
        Object.assign(el.style, variantStyles[variant])
      }}
      {...props}
    >
      {loading ? (
        <span style={{
          width: '14px', height: '14px',
          border: '2px solid currentColor',
          borderTopColor: 'transparent',
          borderRadius: '50%',
          display: 'inline-block',
          animation: 'spin 0.7s linear infinite',
          flexShrink: 0,
        }} />
      ) : icon}
      {children}
      {!loading && iconRight}
    </button>
  )
}
