import { useState, FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Mail, Lock, ArrowRight } from 'lucide-react'
import { Logo } from '../components/ui/Logo'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { useAuth } from '../contexts/AuthContext'
import { authApi } from '../lib/api'

export function LoginPage() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!email || !password) { setError('Completa todos los campos'); return }
    setLoading(true)
    setError('')
    try {
      const data = await authApi.login(email, password)
      login(data.access_token, data.user)
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } }
      setError(e?.response?.data?.detail ?? 'Credenciales incorrectas')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background glow */}
      <div style={{
        position: 'absolute',
        top: '30%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '600px', height: '600px',
        background: 'radial-gradient(circle, rgba(62,213,152,0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{
        width: '100%',
        maxWidth: '400px',
        animation: 'fadeIn 0.4s ease',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '40px' }}>
          <Logo size={36} showText />
        </div>

        {/* Card */}
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: '32px',
          boxShadow: 'var(--shadow-lg)',
        }}>
          <div style={{ marginBottom: '28px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '6px', letterSpacing: '-0.03em' }}>
              Bienvenido de vuelta
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
              Inicia sesión en tu cuenta de Freshly
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Input
              type="email"
              label="Correo electrónico"
              placeholder="tu@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              icon={<Mail size={16} />}
              autoComplete="email"
              autoFocus
            />

            <Input
              type="password"
              label="Contraseña"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              icon={<Lock size={16} />}
              autoComplete="current-password"
            />

            {error && (
              <div style={{
                padding: '10px 14px',
                background: 'var(--danger-dim)',
                border: '1px solid rgba(255,107,107,0.2)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '13px',
                color: 'var(--danger)',
              }}>
                {error}
              </div>
            )}

            <Button
              type="submit"
              fullWidth
              loading={loading}
              size="lg"
              iconRight={<ArrowRight size={16} />}
              style={{ marginTop: '4px' }}
            >
              Iniciar sesión
            </Button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px', color: 'var(--text-secondary)' }}>
          ¿No tienes cuenta?{' '}
          <Link
            to="/register"
            style={{ color: 'var(--primary)', fontWeight: 500, textDecoration: 'none' }}
          >
            Regístrate
          </Link>
        </p>
      </div>
    </div>
  )
}
