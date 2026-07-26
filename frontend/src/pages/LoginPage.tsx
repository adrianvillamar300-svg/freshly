import { useState, FormEvent, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Mail, Lock, ArrowRight, Eye, EyeOff, User, Leaf, TrendingDown, Heart, Recycle, Star, ChevronDown } from 'lucide-react'
import { Logo } from '../components/ui/Logo'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { useAuth } from '../contexts/AuthContext'
import { authApi } from '../lib/api'

const GUEST = { email: 'invitado@freshly.app', password: 'invitado123' }

// ── Floating leaf particle ─────────────────────────────────
function Leaf2({ style }: { style: React.CSSProperties }) {
  return (
    <div style={{
      position: 'absolute',
      fontSize: '18px',
      opacity: 0,
      animation: 'leafFall linear infinite',
      pointerEvents: 'none',
      userSelect: 'none',
      ...style,
    }}>
      {['🍃','🌿','🍀','✦','⬡'][Math.floor(Math.random()*5)]}
    </div>
  )
}

function FloatingLeaves() {
  const leaves = Array.from({ length: 18 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 8}s`,
    duration: `${6 + Math.random() * 8}s`,
    size: `${12 + Math.random() * 16}px`,
    opacity: 0.15 + Math.random() * 0.25,
  }))

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 1 }}>
      {leaves.map(l => (
        <Leaf2 key={l.id} style={{
          left: l.left,
          top: '-40px',
          fontSize: l.size,
          opacity: 0,
          animationDuration: l.duration,
          animationDelay: l.delay,
        }} />
      ))}
    </div>
  )
}

// ── Nature info cards ──────────────────────────────────────
const infoCards = [
  {
    emoji: '🌍',
    tag: 'Medio Ambiente',
    title: 'Cada alimento que no tiras importa',
    body: 'El desperdicio de alimentos genera el 8% de las emisiones globales de gases de efecto invernadero. Gestionar mejor tu despensa es uno de los actos individuales más impactantes que puedes tomar.',
    bg: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=600&q=80',
    accent: '#3ED598',
  },
  {
    emoji: '💰',
    tag: 'Ahorro',
    title: 'Un hogar promedio pierde $1,500 al año',
    body: 'El 30% de los alimentos comprados se tiran a la basura. Con Freshly, los usuarios reportan ahorrar entre $80 y $200 al mes simplemente sabiendo qué tienen y cuándo caduca.',
    bg: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80',
    accent: '#F5B841',
  },
  {
    emoji: '♻️',
    tag: 'Sostenibilidad',
    title: 'Cocina con lo que tienes',
    body: 'La IA de Freshly analiza tu inventario y te sugiere recetas antes de que los alimentos caduquen. Menos desperdicio, más creatividad en la cocina, mejor planeta.',
    bg: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=600&q=80',
    accent: '#6495ED',
  },
  {
    emoji: '🥗',
    tag: 'Nutrición',
    title: 'Come mejor, sin desperdiciar',
    body: 'Planificar tus comidas reduce el estrés diario del "¿qué comemos hoy?" y te ayuda a mantener una dieta más variada y nutritiva, aprovechando cada ingrediente al máximo.',
    bg: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=600&q=80',
    accent: '#FF6B6B',
  },
]

const testimonials = [
  {
    name: 'María Rodríguez',
    role: 'Madre de familia · Quito',
    avatar: 'MR',
    color: '#3ED598',
    text: 'Antes tiraba frutas y verduras cada semana sin darme cuenta. Desde que uso Freshly, prácticamente no desperdicio nada. Ahorro fácil $60 al mes y me siento bien con el planeta.',
    stars: 5,
  },
  {
    name: 'Carlos Méndez',
    role: 'Estudiante universitario · Guayaquil',
    avatar: 'CM',
    color: '#6495ED',
    text: 'Vivir solo y no saber cocinar era un desastre. Freshly me dice exactamente qué tengo y me sugiere qué hacer con eso. Las recetas con IA son increíbles y súper fáciles.',
    stars: 5,
  },
  {
    name: 'Sofía Torres',
    role: 'Chef amateur · Cuenca',
    avatar: 'ST',
    color: '#F5B841',
    text: 'La función de foto de factura es mágica. Escaneo mi compra del supermercado y en segundos todo está en mi inventario. Me ha cambiado la forma de cocinar completamente.',
    stars: 5,
  },
]

// ── Info card with parallax hover ─────────────────────────
function InfoCard({ card, index }: { card: typeof infoCards[0]; index: number }) {
  const [hovered, setHovered] = useState(false)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const ref = useRef<HTMLDivElement>(null)

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 12
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * -12
    setTilt({ x, y })
  }

  return (
    <div
      ref={ref}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setTilt({ x: 0, y: 0 }) }}
      onMouseMove={onMouseMove}
      style={{
        position: 'relative',
        borderRadius: '20px',
        overflow: 'hidden',
        height: '320px',
        cursor: 'pointer',
        transform: hovered ? `perspective(800px) rotateX(${tilt.y}deg) rotateY(${tilt.x}deg) translateY(-6px)` : 'perspective(800px) rotateX(0) rotateY(0)',
        transition: hovered ? 'transform 0.1s ease' : 'transform 0.5s cubic-bezier(0.4,0,0.2,1)',
        boxShadow: hovered ? `0 24px 48px rgba(0,0,0,0.5), 0 0 0 1px ${card.accent}30` : '0 8px 24px rgba(0,0,0,0.3)',
        animation: `fadeIn 0.6s ease ${index * 0.1}s both`,
      }}
    >
      {/* Background image */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `url(${card.bg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        transform: hovered ? 'scale(1.08)' : 'scale(1)',
        transition: 'transform 0.6s cubic-bezier(0.4,0,0.2,1)',
        filter: 'brightness(0.35)',
      }}/>

      {/* Gradient overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `linear-gradient(to top, rgba(11,15,14,0.95) 0%, rgba(11,15,14,0.5) 60%, transparent 100%)`,
        transition: 'opacity var(--transition)',
      }}/>

      {/* Glow on hover */}
      {hovered && (
        <div style={{
          position: 'absolute', inset: 0,
          background: `radial-gradient(circle at 50% 100%, ${card.accent}15 0%, transparent 70%)`,
          animation: 'fadeIn 0.3s ease',
        }}/>
      )}

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 2, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '24px' }}>
        {/* Tag */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          padding: '4px 10px', borderRadius: '100px',
          background: `${card.accent}20`, border: `1px solid ${card.accent}40`,
          color: card.accent, fontSize: '11px', fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.08em',
          marginBottom: '12px', width: 'fit-content',
          transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
          transition: 'transform 0.4s cubic-bezier(0.4,0,0.2,1)',
        }}>
          {card.emoji} {card.tag}
        </div>

        <h3 style={{
          fontSize: '18px', fontWeight: 700, lineHeight: 1.3,
          color: '#fff', marginBottom: '10px',
          transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
          transition: 'transform 0.4s cubic-bezier(0.4,0,0.2,1) 0.02s',
        }}>
          {card.title}
        </h3>

        <p style={{
          fontSize: '13px', color: 'rgba(255,255,255,0.65)', lineHeight: 1.6,
          maxHeight: hovered ? '120px' : '0',
          overflow: 'hidden',
          opacity: hovered ? 1 : 0,
          transition: 'all 0.4s cubic-bezier(0.4,0,0.2,1)',
        }}>
          {card.body}
        </p>
      </div>
    </div>
  )
}

// ── Testimonial card ───────────────────────────────────────
function TestimonialCard({ t, index }: { t: typeof testimonials[0]; index: number }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? 'var(--surface-2)' : 'var(--surface)',
        border: `1px solid ${hovered ? t.color + '30' : 'var(--border-subtle)'}`,
        borderRadius: '16px',
        padding: '24px',
        transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        boxShadow: hovered ? `0 12px 32px rgba(0,0,0,0.3), 0 0 0 1px ${t.color}20` : 'none',
        animation: `fadeIn 0.6s ease ${index * 0.15}s both`,
        cursor: 'default',
      }}
    >
      {/* Stars */}
      <div style={{ display: 'flex', gap: '3px', marginBottom: '14px' }}>
        {Array.from({ length: t.stars }).map((_, i) => (
          <Star key={i} size={13} fill={t.color} color={t.color} style={{ transition: `transform 0.2s ease ${i * 0.05}s`, transform: hovered ? 'scale(1.2)' : 'scale(1)' }} />
        ))}
      </div>

      {/* Text */}
      <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '20px', fontStyle: 'italic' }}>
        "{t.text}"
      </p>

      {/* Author */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          width: '38px', height: '38px', borderRadius: '50%',
          background: `${t.color}18`, border: `2px solid ${t.color}40`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '12px', fontWeight: 700, color: t.color,
          transition: 'transform 0.3s ease',
          transform: hovered ? 'scale(1.1)' : 'scale(1)',
        }}>
          {t.avatar}
        </div>
        <div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>{t.name}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t.role}</div>
        </div>
      </div>
    </div>
  )
}

// ── Stat pill ──────────────────────────────────────────────
function StatPill({ emoji, value, label }: { emoji: string; value: string; label: string }) {
  const [vis, setVis] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVis(true) }, { threshold: 0.5 })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])

  return (
    <div ref={ref} style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
      padding: '20px 24px',
      background: 'var(--surface)',
      border: '1px solid var(--border-subtle)',
      borderRadius: '16px',
      opacity: vis ? 1 : 0,
      transform: vis ? 'translateY(0)' : 'translateY(20px)',
      transition: 'all 0.6s cubic-bezier(0.4,0,0.2,1)',
    }}>
      <span style={{ fontSize: '28px' }}>{emoji}</span>
      <span style={{ fontSize: '26px', fontWeight: 800, fontFamily: 'Space Grotesk', color: 'var(--primary)', letterSpacing: '-0.04em' }}>{value}</span>
      <span style={{ fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'center' }}>{label}</span>
    </div>
  )
}

// ── Login form ─────────────────────────────────────────────
function LoginForm() {
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
    } catch { setError('Correo o contraseña incorrectos') }
    finally { setLoading(false) }
  }

  const handleGuest = async () => {
    setGuestLoading(true); setError('')
    try {
      const data = await authApi.login(GUEST.email, GUEST.password)
      login(data.access_token, data.user)
    } catch {
      try {
        const data = await authApi.register({ name: 'Invitado', email: GUEST.email, password: GUEST.password })
        login(data.access_token, data.user)
      } catch { setError('No se pudo entrar como invitado.') }
    } finally { setGuestLoading(false) }
  }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '32px', boxShadow: 'var(--shadow-lg)' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '4px', letterSpacing: '-0.03em' }}>Bienvenido de vuelta</h2>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Inicia sesión en tu cuenta de Freshly</p>
      </div>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <Input type="email" label="Correo" placeholder="tu@email.com" value={email} onChange={e => setEmail(e.target.value)} icon={<Mail size={15} />} autoComplete="email" />
        <Input
          type={showPass ? 'text' : 'password'} label="Contraseña" placeholder="••••••••"
          value={password} onChange={e => setPassword(e.target.value)} icon={<Lock size={15} />}
          iconRight={<button type="button" onClick={() => setShowPass(p => !p)} style={{ color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}>{showPass ? <EyeOff size={14} /> : <Eye size={14} />}</button>}
          autoComplete="current-password"
        />
        {error && <div style={{ padding: '10px 14px', background: 'var(--danger-dim)', border: '1px solid rgba(255,107,107,0.2)', borderRadius: 'var(--radius-sm)', fontSize: '13px', color: 'var(--danger)' }}>{error}</div>}
        <Button type="submit" fullWidth loading={loading} size="lg" iconRight={<ArrowRight size={15} />} style={{ marginTop: '4px' }}>Iniciar sesión</Button>
      </form>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '16px 0' }}>
        <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>o</span>
        <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
      </div>
      <Button variant="secondary" fullWidth loading={guestLoading} icon={<User size={14} />} onClick={handleGuest}>Entrar como invitado</Button>
      <div style={{ marginTop: '12px', padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
        💡 El modo invitado te permite explorar la app. Para guardar tus datos crea una cuenta gratis.
      </div>
      <p style={{ textAlign: 'center', marginTop: '18px', fontSize: '13px', color: 'var(--text-secondary)' }}>
        ¿No tienes cuenta?{' '}
        <Link to="/register" style={{ color: 'var(--primary)', fontWeight: 600 }}>Regístrate gratis</Link>
      </p>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────
export function LoginPage() {
  const [scrollY, setScrollY] = useState(0)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const scrollDown = () => contentRef.current?.scrollIntoView({ behavior: 'smooth' })

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      {/* CSS animations */}
      <style>{`
        @keyframes leafFall {
          0%   { opacity:0; transform: translateY(-20px) rotate(0deg); }
          10%  { opacity: 0.6; }
          90%  { opacity: 0.3; }
          100% { opacity:0; transform: translateY(105vh) rotate(360deg) translateX(40px); }
        }
        @keyframes heroGlow {
          0%,100% { opacity: 0.4; transform: scale(1); }
          50%     { opacity: 0.7; transform: scale(1.08); }
        }
        @keyframes badgeFloat {
          0%,100% { transform: translateY(0) rotate(-2deg); }
          50%     { transform: translateY(-8px) rotate(1deg); }
        }
        @keyframes spin-slow {
          to { transform: rotate(360deg); }
        }
        .feature-pill:hover { background: var(--primary-dim) !important; color: var(--primary) !important; border-color: var(--border) !important; transform: scale(1.04); }
        .feature-pill { transition: all 0.25s cubic-bezier(0.4,0,0.2,1) !important; }
      `}</style>

      {/* ── HERO ─────────────────────────────────────────── */}
      <section style={{
        minHeight: '100vh',
        display: 'flex',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Animated bg glows */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', top: '10%', left: '20%', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(62,213,152,0.08) 0%, transparent 70%)', animation: 'heroGlow 6s ease infinite' }} />
          <div style={{ position: 'absolute', bottom: '20%', right: '15%', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(100,149,237,0.06) 0%, transparent 70%)', animation: 'heroGlow 8s ease infinite 2s' }} />
          <div style={{ position: 'absolute', top: '50%', left: '50%', width: '300px', height: '300px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(245,184,65,0.04) 0%, transparent 70%)', animation: 'heroGlow 10s ease infinite 4s', transform: 'translate(-50%,-50%)' }} />
        </div>

        {/* Grid pattern */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(62,213,152,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(62,213,152,0.03) 1px, transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none' }} />

        <FloatingLeaves />

        {/* Content */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '60px',
          width: '100%',
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '80px 40px',
          alignItems: 'center',
          position: 'relative', zIndex: 2,
        }}>
          {/* Left — copy */}
          <div style={{ animation: 'fadeIn 0.6s ease' }}>
            <div style={{ marginBottom: '32px' }}>
              <Logo size={42} showText />
            </div>

            {/* Badge */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '6px 14px', borderRadius: '100px',
              background: 'var(--primary-dim)', border: '1px solid var(--border)',
              color: 'var(--primary)', fontSize: '12px', fontWeight: 600,
              marginBottom: '28px', animation: 'badgeFloat 4s ease infinite',
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--primary)', animation: 'pulse 1.5s ease infinite' }} />
              Gestión inteligente de alimentos con IA
            </div>

            <h1 style={{
              fontSize: 'clamp(32px, 4vw, 52px)',
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: '-0.04em',
              marginBottom: '20px',
              color: 'var(--text)',
            }}>
              Come mejor.{' '}
              <span style={{
                background: 'linear-gradient(135deg, #3ED598 0%, #6495ED 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                Gasta menos.
              </span>
              {' '}Desperdicia nada.
            </h1>

            <p style={{ fontSize: '17px', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '36px', maxWidth: '480px' }}>
              Freshly usa inteligencia artificial para gestionar tu inventario de alimentos, sugerirte recetas y avisarte antes de que algo caduque. Ahorra dinero y cuida el planeta.
            </p>

            {/* Feature pills */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '40px' }}>
              {[
                { icon: <Leaf size={13}/>, label: 'Inventario IA' },
                { icon: <TrendingDown size={13}/>, label: 'Ahorra dinero' },
                { icon: <Recycle size={13}/>, label: 'Cero desperdicio' },
                { icon: <Heart size={13}/>, label: 'Recetas personalizadas' },
              ].map(f => (
                <div key={f.label} className="feature-pill" style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '7px 14px', borderRadius: '100px',
                  background: 'var(--surface)', border: '1px solid var(--border-subtle)',
                  fontSize: '13px', color: 'var(--text-secondary)', cursor: 'default',
                }}>
                  {f.icon} {f.label}
                </div>
              ))}
            </div>

            {/* Scroll indicator */}
            <button onClick={scrollDown} style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              color: 'var(--text-muted)', fontSize: '13px', cursor: 'pointer',
              background: 'none', border: 'none',
              animation: 'float 2s ease infinite',
            }}>
              <ChevronDown size={18}/> Descubre más
            </button>
          </div>

          {/* Right — login form */}
          <div style={{ animation: 'fadeIn 0.6s ease 0.2s both' }}>
            <LoginForm />
          </div>
        </div>

        {/* Scroll progress line */}
        <div style={{
          position: 'fixed', top: 0, left: 0,
          height: '2px', zIndex: 100,
          background: 'var(--primary)',
          width: `${Math.min(100, (scrollY / (document.body.scrollHeight - window.innerHeight)) * 100)}%`,
          transition: 'width 0.1s linear',
          boxShadow: '0 0 8px var(--primary)',
        }} />
      </section>

      {/* ── STATS ──────────────────────────────────────────── */}
      <section ref={contentRef} style={{ padding: '80px 40px', maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '10px' }}>
            El problema es real
          </h2>
          <p style={{ fontSize: '15px', color: 'var(--text-secondary)' }}>
            Cada año, el mundo desperdicia 1.300 millones de toneladas de alimentos
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px' }}>
          <StatPill emoji="🗑️" value="30%" label="de alimentos comprados se tiran" />
          <StatPill emoji="💸" value="$1.5k" label="pérdida anual por hogar" />
          <StatPill emoji="🌡️" value="8%" label="emisiones CO₂ por desperdicio" />
          <StatPill emoji="🍽️" value="828M" label="personas con inseguridad alimentaria" />
        </div>
      </section>

      {/* ── INFO CARDS ─────────────────────────────────────── */}
      <section style={{ padding: '0 40px 80px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>¿Por qué importa?</span>
          <h2 style={{ fontSize: '32px', fontWeight: 700, letterSpacing: '-0.03em', marginTop: '8px', marginBottom: '10px' }}>
            Pequeñas acciones, gran impacto
          </h2>
          <p style={{ fontSize: '15px', color: 'var(--text-secondary)', maxWidth: '480px', margin: '0 auto' }}>
            Gestionar tu despensa no es solo ahorrar dinero — es contribuir a un futuro más sostenible.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
          {infoCards.map((card, i) => <InfoCard key={i} card={card} index={i} />)}
        </div>
      </section>

      {/* ── TESTIMONIALS ───────────────────────────────────── */}
      <section style={{ padding: '0 40px 80px', maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Testimonios</span>
          <h2 style={{ fontSize: '32px', fontWeight: 700, letterSpacing: '-0.03em', marginTop: '8px', marginBottom: '10px' }}>
            Lo que dicen nuestros usuarios
          </h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          {testimonials.map((t, i) => <TestimonialCard key={i} t={t} index={i} />)}
        </div>
      </section>

      {/* ── CTA footer ─────────────────────────────────────── */}
      <section style={{
        padding: '80px 40px',
        textAlign: 'center',
        background: 'linear-gradient(to bottom, transparent, rgba(62,213,152,0.04))',
        borderTop: '1px solid var(--border-subtle)',
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px', animation: 'float 3s ease infinite' }}>🌿</div>
        <h2 style={{ fontSize: '28px', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '12px' }}>
          Empieza hoy, es gratis
        </h2>
        <p style={{ fontSize: '15px', color: 'var(--text-secondary)', marginBottom: '28px', maxWidth: '380px', margin: '0 auto 28px' }}>
          Únete a miles de personas que ya están ahorrando dinero y cuidando el planeta con Freshly.
        </p>
        <Link to="/register">
          <Button size="lg" iconRight={<ArrowRight size={16}/>} style={{ margin: '0 auto' }}>
            Crear cuenta gratis
          </Button>
        </Link>
        <p style={{ marginTop: '40px', fontSize: '12px', color: 'var(--text-muted)' }}>
          © 2026 Freshly · Hecho con 💚 para un planeta mejor
        </p>
      </section>
    </div>
  )
}
