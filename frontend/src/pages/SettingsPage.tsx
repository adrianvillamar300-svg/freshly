import { useState } from 'react'
import { Globe, Shield, Smartphone, Info, ChevronRight } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'

interface ToggleProps {
  checked: boolean
  onChange: (v: boolean) => void
}

function Toggle({ checked, onChange }: ToggleProps) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{
        width: '44px', height: '24px', borderRadius: '100px',
        background: checked ? 'var(--primary)' : 'var(--surface-3)',
        border: 'none', cursor: 'pointer',
        position: 'relative', transition: 'background 0.2s ease',
        flexShrink: 0,
      }}
    >
      <span style={{
        position: 'absolute',
        top: '3px',
        left: checked ? '23px' : '3px',
        width: '18px', height: '18px',
        borderRadius: '50%',
        background: '#fff',
        transition: 'left 0.2s cubic-bezier(0.34,1.56,0.64,1)',
        boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
        display: 'block',
      }} />
    </button>
  )
}

interface SettingRowProps {
  icon: React.ReactNode
  label: string
  description?: string
  action?: React.ReactNode
  onClick?: () => void
}

function SettingRow({ icon, label, description, action, onClick }: SettingRowProps) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: '14px',
        padding: '14px 0',
        borderBottom: '1px solid var(--border-subtle)',
        cursor: onClick ? 'pointer' : undefined,
        transition: 'opacity var(--transition)',
      }}
      onMouseEnter={e => { if (onClick) e.currentTarget.style.opacity = '0.8' }}
      onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
    >
      <div style={{
        width: '36px', height: '36px',
        background: 'var(--surface-2)',
        borderRadius: 'var(--radius-sm)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--text-secondary)', flexShrink: 0,
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)', marginBottom: '2px' }}>
          {label}
        </div>
        {description && (
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {description}
          </div>
        )}
      </div>
      {action ?? (onClick ? <ChevronRight size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} /> : null)}
    </div>
  )
}

export function SettingsPage() {
  const [notifications, setNotifications] = useState(true)
  const [sounds, setSounds] = useState(false)
  const [analyticsConsent, setAnalyticsConsent] = useState(true)

  const version = '1.0.0'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeIn 0.4s ease', maxWidth: '600px' }}>
      <div>
        <h2 style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '2px' }}>
          Configuración
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          Personaliza tu experiencia en Freshly
        </p>
      </div>

      {/* Notifications */}
      <Card padding="0 20px">
        <div style={{ padding: '16px 0 8px', borderBottom: '1px solid var(--border-subtle)' }}>
          <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            Notificaciones
          </p>
        </div>
        <SettingRow
          icon={<Smartphone size={17} />}
          label="Notificaciones push"
          description="Alertas sobre tu inventario y recordatorios"
          action={<Toggle checked={notifications} onChange={setNotifications} />}
        />
        <SettingRow
          icon={<Globe size={17} />}
          label="Sonidos de la app"
          description="Efectos de sonido al realizar acciones"
          action={<Toggle checked={sounds} onChange={setSounds} />}
        />
      </Card>

      {/* Privacy */}
      <Card padding="0 20px">
        <div style={{ padding: '16px 0 8px', borderBottom: '1px solid var(--border-subtle)' }}>
          <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            Privacidad
          </p>
        </div>
        <SettingRow
          icon={<Shield size={17} />}
          label="Analíticas de uso"
          description="Ayuda a mejorar Freshly compartiendo datos anónimos"
          action={<Toggle checked={analyticsConsent} onChange={setAnalyticsConsent} />}
        />
      </Card>

      {/* App info */}
      <Card padding="0 20px">
        <div style={{ padding: '16px 0 8px', borderBottom: '1px solid var(--border-subtle)' }}>
          <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            Acerca de
          </p>
        </div>
        <SettingRow
          icon={<Info size={17} />}
          label="Versión de Freshly"
          description="Comprueba actualizaciones disponibles"
          action={<Badge variant="success">v{version}</Badge>}
        />
      </Card>

      {/* Tech stack note */}
      <div style={{
        padding: '16px',
        background: 'var(--surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius)',
        display: 'flex', flexDirection: 'column', gap: '8px',
      }}>
        <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          Stack tecnológico
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {['React 18', 'TypeScript', 'FastAPI', 'PostgreSQL', 'Amazon Bedrock', 'Cloudinary'].map(tech => (
            <span key={tech} style={{
              padding: '3px 10px',
              background: 'var(--surface-2)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '100px',
              fontSize: '12px', fontWeight: 500,
              color: 'var(--text-secondary)',
              fontFamily: 'IBM Plex Mono',
            }}>
              {tech}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
