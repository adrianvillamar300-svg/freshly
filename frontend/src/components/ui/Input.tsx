import { InputHTMLAttributes, ReactNode, useState } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  icon?: ReactNode
  iconRight?: ReactNode
  fullWidth?: boolean
}

export function Input({
  label,
  error,
  hint,
  icon,
  iconRight,
  fullWidth = true,
  style,
  ...props
}: InputProps) {
  const [focused, setFocused] = useState(false)

  return (
    <div style={{ width: fullWidth ? '100%' : undefined, display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {label && (
        <label style={{
          fontSize: '13px',
          fontWeight: 500,
          color: 'var(--text-secondary)',
          letterSpacing: '-0.01em',
        }}>
          {label}
        </label>
      )}
      <div style={{ position: 'relative' }}>
        {icon && (
          <span style={{
            position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
            color: focused ? 'var(--primary)' : 'var(--text-muted)',
            display: 'flex', alignItems: 'center',
            transition: 'color var(--transition)',
            pointerEvents: 'none',
          }}>
            {icon}
          </span>
        )}
        <input
          style={{
            width: '100%',
            height: '42px',
            padding: `0 ${iconRight ? '40px' : '14px'} 0 ${icon ? '40px' : '14px'}`,
            background: 'var(--surface)',
            border: `1px solid ${error ? 'var(--danger)' : focused ? 'var(--primary)' : 'var(--border-subtle)'}`,
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text)',
            fontSize: '14px',
            transition: 'all var(--transition)',
            boxShadow: focused ? (error ? '0 0 0 3px var(--danger-dim)' : '0 0 0 3px var(--primary-dim)') : 'none',
            ...style,
          }}
          onFocus={e => { setFocused(true); props.onFocus?.(e) }}
          onBlur={e => { setFocused(false); props.onBlur?.(e) }}
          {...props}
        />
        {iconRight && (
          <span style={{
            position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
            color: 'var(--text-muted)',
            display: 'flex', alignItems: 'center',
          }}>
            {iconRight}
          </span>
        )}
      </div>
      {error && <p style={{ fontSize: '12px', color: 'var(--danger)', marginTop: '2px' }}>{error}</p>}
      {hint && !error && <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{hint}</p>}
    </div>
  )
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
}

export function Textarea({ label, error, hint, style, ...props }: TextareaProps) {
  const [focused, setFocused] = useState(false)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {label && (
        <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>
          {label}
        </label>
      )}
      <textarea
        style={{
          width: '100%',
          minHeight: '100px',
          padding: '12px 14px',
          background: 'var(--surface)',
          border: `1px solid ${error ? 'var(--danger)' : focused ? 'var(--primary)' : 'var(--border-subtle)'}`,
          borderRadius: 'var(--radius-sm)',
          color: 'var(--text)',
          fontSize: '14px',
          resize: 'vertical',
          transition: 'all var(--transition)',
          boxShadow: focused ? '0 0 0 3px var(--primary-dim)' : 'none',
          fontFamily: 'inherit',
          ...style,
        }}
        onFocus={e => { setFocused(true); props.onFocus?.(e) }}
        onBlur={e => { setFocused(false); props.onBlur?.(e) }}
        {...props}
      />
      {error && <p style={{ fontSize: '12px', color: 'var(--danger)' }}>{error}</p>}
      {hint && !error && <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{hint}</p>}
    </div>
  )
}
