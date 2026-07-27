import logoImg from '../../assets/logo.png'

interface LogoProps {
  size?: number
  showText?: boolean
  className?: string
}

export function Logo({ size = 32, showText = true }: LogoProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <img
        src={logoImg}
        alt="Freshly"
        width={size}
        height={size}
        style={{
          width: size,
          height: size,
          borderRadius: size * 0.28,
          objectFit: 'cover',
          flexShrink: 0,
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        }}
      />
      {showText && (
        <span style={{
          fontFamily: 'Space Grotesk, sans-serif',
          fontWeight: 600,
          fontSize: size * 0.6,
          color: 'var(--text)',
          letterSpacing: '-0.03em',
        }}>
          Freshly
        </span>
      )}
    </div>
  )
}
