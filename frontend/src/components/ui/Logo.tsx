interface LogoProps {
  size?: number
  showText?: boolean
  className?: string
}

export function Logo({ size = 32, showText = true }: LogoProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="32" height="32" rx="9" fill="#141B18"/>
        <rect width="32" height="32" rx="9" fill="url(#logoGrad)" opacity="0.5"/>
        {/* Leaf / drop shape */}
        <path
          d="M16 5C16 5 9 9.5 9 17.5C9 21.366 12.134 24.5 16 24.5C19.866 24.5 23 21.366 23 17.5C23 9.5 16 5 16 5Z"
          fill="#3ED598"
        />
        {/* Stem */}
        <path
          d="M16 15V27"
          stroke="#0B0F0E"
          strokeWidth="2"
          strokeLinecap="round"
        />
        {/* Vein */}
        <path
          d="M16 18L13 21"
          stroke="#0B0F0E"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.5"
        />
        <defs>
          <linearGradient id="logoGrad" x1="0" y1="0" x2="32" y2="32">
            <stop offset="0%" stopColor="#3ED598" stopOpacity="0.2"/>
            <stop offset="100%" stopColor="#3ED598" stopOpacity="0"/>
          </linearGradient>
        </defs>
      </svg>
      {showText && (
        <span style={{
          fontFamily: 'Space Grotesk, sans-serif',
          fontWeight: 600,
          fontSize: size * 0.6,
          color: 'var(--text)',
          letterSpacing: '-0.03em',
        }}>
          freshly
        </span>
      )}
    </div>
  )
}
