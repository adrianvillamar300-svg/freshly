import { useState, FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Mail, Lock, ArrowRight, Eye, EyeOff, User } from 'lucide-react'
import { Logo } from '../components/ui/Logo'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { useAuth } from '../contexts/AuthContext'
import { authApi } from '../lib/api'

const GUEST = { email: 'invitado@freshly.app', password: 'invitado123' }

export function LoginPage() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [guestLoading, setGuestLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!email || !password) { setError('Completa todos los campos'); return }
    setLoading(true); setError('')
    try {
      const data = await authApi.login(email, password)
      login(data.access_token, data.user)
    } catch {
      setError('Correo o contraseña incorrectos')
    } finally { setLoading(false) }
  }

  const handleGuest = async () => {
    setGuestLoading(true); setError('')
    try {
      const data = await authApi.login(GUEST.email, GUEST.password)
      login(data.access_token, data.user)
    } catch {
      // If guest account doesn't exist, try to create it
      try {
        const data = await authApi.register({ name: 'Invitado', email: GUEST.email, password: GUEST.password })
        login(data.access_token, data.user)
      } catch {
        setError('No se pudo entrar como invitado. Crea una cuenta.')
      }
    } finally { setGuestLoading(false) }
  }

  return (
    <div style={{
      minHeight:'100vh', background:'var(--bg)',
      display:'flex', alignItems:'center', justifyContent:'center',
      padding:'20px', position:'relative', overflow:'hidden',
    }}>
      <div style={{ position:'absolute', top:'30%', left:'50%', transform:'translate(-50%,-50%)', width:'600px', height:'600px', background:'radial-gradient(circle, rgba(62,213,152,0.06) 0%, transparent 70%)', pointerEvents:'none' }}/>

      <div style={{ width:'100%', maxWidth:'400px', animation:'fadeIn 0.4s ease' }}>
        <div style={{ display:'flex', justifyContent:'center', marginBottom:'36px' }}>
          <Logo size={36} showText />
        </div>

        <div style={{ background:'var(--surface)', border:'1px solid var(--border-subtle)', borderRadius:'var(--radius-lg)', padding:'32px', boxShadow:'var(--shadow-lg)' }}>
          <div style={{ marginBottom:'24px' }}>
            <h1 style={{ fontSize:'21px', fontWeight:700, marginBottom:'5px', letterSpacing:'-0.03em' }}>Bienvenido de vuelta</h1>
            <p style={{ fontSize:'13px', color:'var(--text-secondary)' }}>Inicia sesión en tu cuenta</p>
          </div>

          <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
            <Input type="email" label="Correo electrónico" placeholder="tu@email.com" value={email} onChange={e=>setEmail(e.target.value)} icon={<Mail size={15}/>} autoComplete="email" autoFocus />
            <Input
              type={showPass?'text':'password'}
              label="Contraseña" placeholder="••••••••"
              value={password} onChange={e=>setPassword(e.target.value)}
              icon={<Lock size={15}/>}
              iconRight={
                <button type="button" onClick={()=>setShowPass(p=>!p)} style={{ color:'var(--text-muted)', cursor:'pointer', display:'flex' }}>
                  {showPass?<EyeOff size={14}/>:<Eye size={14}/>}
                </button>
              }
              autoComplete="current-password"
            />

            {error && (
              <div style={{ padding:'10px 14px', background:'var(--danger-dim)', border:'1px solid rgba(255,107,107,0.2)', borderRadius:'var(--radius-sm)', fontSize:'13px', color:'var(--danger)' }}>
                {error}
              </div>
            )}

            <Button type="submit" fullWidth loading={loading} size="lg" iconRight={<ArrowRight size={15}/>} style={{ marginTop:'4px' }}>
              Iniciar sesión
            </Button>
          </form>

          {/* Divider */}
          <div style={{ display:'flex', alignItems:'center', gap:'12px', margin:'16px 0' }}>
            <div style={{ flex:1, height:'1px', background:'var(--border-subtle)' }}/>
            <span style={{ fontSize:'12px', color:'var(--text-muted)' }}>o</span>
            <div style={{ flex:1, height:'1px', background:'var(--border-subtle)' }}/>
          </div>

          {/* Guest access */}
          <Button variant="secondary" fullWidth loading={guestLoading} icon={<User size={14}/>} onClick={handleGuest}>
            Entrar como invitado
          </Button>

          <div style={{ marginTop:'12px', padding:'10px 12px', background:'var(--surface-2)', borderRadius:'var(--radius-sm)', fontSize:'11px', color:'var(--text-muted)', lineHeight:1.5 }}>
            💡 El modo invitado te permite explorar la app. Para guardar tus datos y usar todas las funciones, crea una cuenta gratis.
          </div>
        </div>

        <p style={{ textAlign:'center', marginTop:'20px', fontSize:'13px', color:'var(--text-secondary)' }}>
          ¿No tienes cuenta?{' '}
          <Link to="/register" style={{ color:'var(--primary)', fontWeight:600 }}>Regístrate gratis</Link>
        </p>
      </div>
    </div>
  )
}
