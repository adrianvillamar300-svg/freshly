import { useState, FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Mail, Lock, User, ArrowRight, CheckCircle } from 'lucide-react'
import { Logo } from '../components/ui/Logo'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { useAuth } from '../contexts/AuthContext'
import { authApi } from '../lib/api'

export function RegisterPage() {
  const { login } = useAuth()
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const update = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [key]: e.target.value }))

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.email || !form.password) { setError('Completa todos los campos'); return }
    if (form.password !== form.confirm) { setError('Las contraseñas no coinciden'); return }
    if (form.password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return }
    setLoading(true)
    setError('')
    try {
      const data = await authApi.register({ name: form.name, email: form.email, password: form.password })
      login(data.access_token, data.user)
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } }
      setError(e?.response?.data?.detail ?? 'Error al crear la cuenta')
    } finally {
      setLoading(false)
    }
  }

  const perks = [
    'Inventario inteligente de alimentos',
    'Recetas con IA según lo que tienes',
    'Registro por voz y foto de factura',
  ]

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
      <div style={{
        position: 'absolute',
        top: '40%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '700px', height: '700px',
        background: 'radial-gradient(circle, rgba(62,213,152,0.05) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ width: '100%', maxWidth: '420px', animation: 'fadeIn 0.4s ease' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '40px' }}>
          <Logo size={36} showText />
        </div>

        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: '32px',
          boxShadow: 'var(--shadow-lg)',
        }}>
          <div style={{ marginBottom: '24px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '6px', letterSpacing: '-0.03em' }}>
              Crea tu cuenta
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
              Empieza a gestionar tu despensa con IA
            </p>
          </div>

          {/* Perks */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '24px' }}>
            {perks.map(p => (
              <div key={p} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                <CheckCircle size={13} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                {p}
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <Input
              label="Nombre"
              placeholder="Tu nombre"
              value={form.name}
              onChange={update('name')}
              icon={<User size={16} />}
              autoComplete="name"
              autoFocus
            />
            <Input
              type="email"
              label="Correo electrónico"
              placeholder="tu@email.com"
              value={form.email}
              onChange={update('email')}
              icon={<Mail size={16} />}
              autoComplete="email"
            />
            <Input
              type="password"
              label="Contraseña"
              placeholder="Mínimo 6 caracteres"
              value={form.password}
              onChange={update('password')}
              icon={<Lock size={16} />}
              autoComplete="new-password"
            />
            <Input
              type="password"
              label="Confirmar contraseña"
              placeholder="Repite tu contraseña"
              value={form.confirm}
              onChange={update('confirm')}
              icon={<Lock size={16} />}
              autoComplete="new-password"
              error={form.confirm && form.confirm !== form.password ? 'Las contraseñas no coinciden' : undefined}
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

            <Button type="submit" fullWidth loading={loading} size="lg" iconRight={<ArrowRight size={16} />} style={{ marginTop: '4px' }}>
              Crear cuenta
            </Button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px', color: 'var(--text-secondary)' }}>
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 500, textDecoration: 'none' }}>
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  )
}
