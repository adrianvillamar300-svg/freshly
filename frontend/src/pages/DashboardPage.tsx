import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { DollarSign, ShoppingBag, Package, TrendingUp, TrendingDown, AlertTriangle, Check, Plus, Mic, MicOff, Camera, Leaf, BarChart2, Activity, ChevronRight, Flame, Clock, Upload, Loader, X as XIcon, Sparkles, Receipt, CheckCircle2, Minus, Info, Apple, ShoppingCart, ArrowUpRight, ArrowDownRight, Lightbulb, Target } from 'lucide-react'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts'
import { format, differenceInDays, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { Card, StatCard } from '../components/ui/Card'
import { CardSkeleton, Skeleton } from '../components/ui/Skeleton'
import { EmptyState } from '../components/ui/EmptyState'
import { Modal } from '../components/ui/Modal'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../components/ui/Toast'
import { dashboardApi, inventoryApi, purchasesApi } from '../lib/api'

// ── Photo analysis types & constants ──────────────────────
type DetectedItem = { food_name: string; quantity: number; unit: string; storage_location: string }
const PHOTO_UNITS = ['unidad','kg','g','L','ml','docena','caja','bolsa','lata','paquete']
const PHOTO_LOCATIONS = [
  { value:'refrigerator', label:'🧊 Refrigerador', color:'#6495ED' },
  { value:'freezer',      label:'❄️ Congelador',   color:'#89CFF0' },
  { value:'pantry',       label:'🏠 Despensa',      color:'#3ED598' },
  { value:'cabinet',      label:'🗄️ Armario',       color:'#F5B841' },
]
import { getFoodEmoji } from '../lib/foodEmoji'
import type { SpendingByDate, DashboardSummary, PurchaseItemCreate, InventoryItem } from '../types'


const UNITS = ['unidad','kg','g','L','ml','docena','caja','bolsa','lata','paquete']
const LOCATIONS = [
  { value: 'refrigerator', label: '🧊 Refrigerador', days: 'Dura más' },
  { value: 'freezer', label: '❄️ Congelador', days: 'Mucho más' },
  { value: 'pantry', label: '🏠 Despensa', days: 'Normal' },
  { value: 'cabinet', label: '🗄️ Armario', days: 'Seco' },
]

// ── Floating leaves ────────────────────────────────────────
function FloatingLeaves() {
  const leaves = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    left: `${5 + (i * 8.5) % 92}%`,
    delay: `${(i * 1.3) % 9}s`,
    duration: `${9 + (i * 1.7) % 8}s`,
    size: `${13 + (i * 3) % 14}px`,
    char: ['🍃','🌿','🍀','✦','⬡'][i % 5],
  }))
  return (
    <div style={{ position:'fixed', inset:0, overflow:'hidden', pointerEvents:'none', zIndex:0 }}>
      {leaves.map(l => (
        <div key={l.id} style={{
          position:'absolute', top:'-40px', left:l.left,
          fontSize:l.size, opacity:0,
          animation:`leafFall ${l.duration} linear ${l.delay} infinite`,
          userSelect:'none',
        }}>{l.char}</div>
      ))}
    </div>
  )
}

// ── Expiry color helpers ───────────────────────────────────
function getExpiryColor(daysRemaining: number | null | undefined) {
  if (daysRemaining === null || daysRemaining === undefined) return 'var(--text-muted)'
  if (daysRemaining <= 0) return 'var(--danger)'
  if (daysRemaining <= 2) return 'var(--danger)'
  if (daysRemaining <= 5) return 'var(--warning)'
  if (daysRemaining <= 10) return '#A3E07A'
  return 'var(--primary)'
}
function getExpiryBg(daysRemaining: number | null | undefined) {
  if (daysRemaining === null || daysRemaining === undefined) return 'transparent'
  if (daysRemaining <= 2) return 'rgba(255,107,107,0.14)'
  if (daysRemaining <= 5) return 'rgba(245,184,65,0.14)'
  return 'transparent'
}
function getExpiryLabel(daysRemaining: number | null | undefined) {
  if (daysRemaining === null || daysRemaining === undefined) return '?'
  if (daysRemaining <= 0) return '¡Caducado!'
  if (daysRemaining === 1) return 'Hoy'
  if (daysRemaining <= 5) return `${daysRemaining}d`
  return `${daysRemaining}d`
}
function getStorageIcon(loc?: string | null) {
  if (loc === 'refrigerator') return '🧊'
  if (loc === 'freezer') return '❄️'
  if (loc === 'pantry') return '🏠'
  if (loc === 'cabinet') return '🗄️'
  return '📦'
}

// ── Tooltip ────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{value:number}>; label?: string }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background:'var(--surface)', border:'1px solid var(--border-subtle)', borderRadius:'var(--radius-sm)', padding:'8px 14px', boxShadow:'var(--shadow)' }}>
      <div style={{ fontSize:'11px', color:'var(--text-secondary)', marginBottom:'4px' }}>{label}</div>
      <div style={{ fontSize:'16px', fontWeight:700, color:'var(--primary)', fontFamily:'Space Grotesk' }}>${payload[0].value.toFixed(2)}</div>
    </div>
  )
}

// ── MODAL: Total Gastado ───────────────────────────────────
function SpendingDetailModal({ isOpen, onClose, summary, spending }: {
  isOpen: boolean; onClose: () => void
  summary: DashboardSummary | null; spending: SpendingByDate[]
}) {
  const total = summary?.total_spent ?? 0
  const avgPerPurchase = summary && summary.purchases_count > 0
    ? total / summary.purchases_count : 0

  const chartData = spending.slice(-14).map(s => ({
    date: format(new Date(s.date + 'T00:00:00'), 'dd MMM', { locale: es }),
    total: s.total,
  }))

  const tips = [
    { icon:'📋', text:'Haz una lista antes de comprar — evita compras impulsivas y reduces hasta 20% tu gasto.' },
    { icon:'📦', text:'Compra en cantidad alimentos no perecederos cuando estén en oferta.' },
    { icon:'🗓️', text:'Planifica el menú semanal con anticipación para comprar solo lo necesario.' },
    { icon:'🏷️', text:'Compara precios por unidad o kg, no por precio total del envase.' },
    { icon:'🛒', text:'Evita ir al supermercado con hambre — tiendes a gastar más.' },
    { icon:'🌱', text:'Los productos de temporada y locales suelen ser más baratos y frescos.' },
  ]

  const COLORS = ['#3ED598','#F5B841','#6495ED','#FF7F7F','#A3E07A','#C084FC']
  const topFoods = (summary?.top_foods ?? []).slice(0, 5)

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="💰 Análisis de gasto" size="lg">
      <div style={{ display:'flex', flexDirection:'column', gap:'20px' }}>
        {/* Stats row */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'10px' }}>
          {[
            { label:'Total gastado', value:`$${total.toFixed(2)}`, color:'var(--primary)' },
            { label:'Promedio/compra', value:`$${avgPerPurchase.toFixed(2)}`, color:'var(--warning)' },
            { label:'Compras totales', value:summary?.purchases_count ?? 0, color:'var(--info)' },
          ].map(s => (
            <div key={s.label} style={{ background:'var(--surface-2)', borderRadius:'var(--radius-sm)', padding:'12px', textAlign:'center' }}>
              <div style={{ fontSize:'18px', fontWeight:700, color:s.color, fontFamily:'Space Grotesk' }}>{s.value}</div>
              <div style={{ fontSize:'11px', color:'var(--text-muted)', marginTop:'2px' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Chart */}
        {chartData.length > 0 && (
          <div>
            <h4 style={{ fontSize:'13px', fontWeight:600, marginBottom:'10px', color:'var(--text-secondary)' }}>Últimas 2 semanas</h4>
            <ResponsiveContainer width="100%" height={140}>
              <AreaChart data={chartData} margin={{top:4,right:4,left:-20,bottom:0}}>
                <defs>
                  <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3ED598" stopOpacity={0.3}/>
                    <stop offset="100%" stopColor="#3ED598" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{fill:'var(--text-muted)',fontSize:9}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fill:'var(--text-muted)',fontSize:9}} axisLine={false} tickLine={false}/>
                <Tooltip content={<CustomTooltip/>}/>
                <Area type="monotone" dataKey="total" stroke="#3ED598" strokeWidth={2} fill="url(#spendGrad)" dot={false}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Top foods pie */}
        {topFoods.length > 0 && (
          <div>
            <h4 style={{ fontSize:'13px', fontWeight:600, marginBottom:'10px', color:'var(--text-secondary)' }}>En qué gastas más</h4>
            <div style={{ display:'flex', alignItems:'center', gap:'16px', flexWrap:'wrap' }}>
              <PieChart width={100} height={100}>
                <Pie data={topFoods} cx={45} cy={45} innerRadius={30} outerRadius={45} dataKey="quantity" paddingAngle={2}>
                  {topFoods.map((_,i) => <Cell key={i} fill={COLORS[i % COLORS.length]}/>)}
                </Pie>
              </PieChart>
              <div style={{ display:'flex', flexDirection:'column', gap:'6px', flex:1 }}>
                {topFoods.map((f, i) => (
                  <div key={f.food_name} style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                    <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:COLORS[i % COLORS.length], flexShrink:0 }}/>
                    <span style={{ fontSize:'12px', color:'var(--text)', flex:1 }}>{f.food_name}</span>
                    <span style={{ fontSize:'11px', color:'var(--text-muted)', fontFamily:'IBM Plex Mono' }}>{f.quantity} {f.unit}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tips */}
        <div>
          <h4 style={{ fontSize:'13px', fontWeight:600, marginBottom:'10px', color:'var(--text-secondary)', display:'flex', alignItems:'center', gap:'6px' }}>
            <Lightbulb size={14} style={{ color:'var(--warning)' }}/> Tips para ahorrar
          </h4>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
            {tips.map((tip, i) => (
              <div key={i} style={{ padding:'10px 12px', background:'var(--surface-2)', borderRadius:'var(--radius-sm)', border:'1px solid var(--border-subtle)', display:'flex', gap:'8px', alignItems:'flex-start' }}>
                <span style={{ fontSize:'16px', flexShrink:0 }}>{tip.icon}</span>
                <span style={{ fontSize:'11.5px', color:'var(--text-secondary)', lineHeight:1.4 }}>{tip.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  )
}

// ── MODAL: Compras ─────────────────────────────────────────
function PurchasesDetailModal({ isOpen, onClose, summary }: {
  isOpen: boolean; onClose: () => void; summary: DashboardSummary | null
}) {
  const count = summary?.purchases_count ?? 0
  const total = summary?.total_spent ?? 0
  const avg = count > 0 ? total / count : 0

  const insights = [
    { icon:'🛍️', label:'Total compras registradas', value: count },
    { icon:'💵', label:'Gasto promedio por compra', value: `$${avg.toFixed(2)}` },
    { icon:'🍽️', label:'Alimentos distintos comprados', value: summary?.distinct_foods ?? 0 },
  ]

  const howTos = [
    { icon:'🎤', title:'Por voz', desc:'Di lo que compraste y la IA lo interpreta. Rápido y sin escribir.' },
    { icon:'📸', title:'Foto de factura', desc:'Toma foto al ticket y se importa todo automáticamente.' },
    { icon:'✍️', title:'Manual', desc:'Escribe cada alimento con su cantidad y dónde lo guardas.' },
    { icon:'🤖', title:'Foto IA', desc:'Toma foto a tus alimentos y la IA identifica qué hay.' },
  ]

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="🛒 Detalle de compras" size="md">
      <div style={{ display:'flex', flexDirection:'column', gap:'18px' }}>
        <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
          {insights.map(ins => (
            <div key={ins.label} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'12px 14px', background:'var(--surface-2)', borderRadius:'var(--radius-sm)', border:'1px solid var(--border-subtle)' }}>
              <span style={{ fontSize:'20px' }}>{ins.icon}</span>
              <span style={{ flex:1, fontSize:'13px', color:'var(--text-secondary)' }}>{ins.label}</span>
              <span style={{ fontSize:'16px', fontWeight:700, color:'var(--primary)', fontFamily:'Space Grotesk' }}>{ins.value}</span>
            </div>
          ))}
        </div>

        <div>
          <h4 style={{ fontSize:'13px', fontWeight:600, marginBottom:'10px', color:'var(--text-secondary)' }}>Cómo registrar compras</h4>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
            {howTos.map(h => (
              <div key={h.title} style={{ padding:'12px', background:'var(--surface-2)', borderRadius:'var(--radius-sm)', border:'1px solid var(--border-subtle)' }}>
                <div style={{ fontSize:'20px', marginBottom:'6px' }}>{h.icon}</div>
                <div style={{ fontSize:'12px', fontWeight:600, color:'var(--text)', marginBottom:'3px' }}>{h.title}</div>
                <div style={{ fontSize:'11px', color:'var(--text-muted)', lineHeight:1.4 }}>{h.desc}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding:'12px 14px', background:'var(--primary-dim)', border:'1px solid rgba(62,213,152,0.2)', borderRadius:'var(--radius-sm)' }}>
          <div style={{ fontSize:'12px', color:'var(--primary)', fontWeight:600, marginBottom:'4px' }}>💡 ¿Sabías que?</div>
          <div style={{ fontSize:'12px', color:'var(--text-secondary)', lineHeight:1.5 }}>
            Registrar tus compras te permite conocer tus patrones de consumo, evitar desperdicios y planificar mejor tu presupuesto mensual.
          </div>
        </div>
      </div>
    </Modal>
  )
}

// ── MODAL: Alimentos (con info nutricional IA) ─────────────
function FoodsDetailModal({ isOpen, onClose, inventory, summary }: {
  isOpen: boolean; onClose: () => void
  inventory: InventoryItem[]; summary: DashboardSummary | null
}) {
  const [selectedFood, setSelectedFood] = useState<InventoryItem | null>(null)
  const [nutritionInfo, setNutritionInfo] = useState<string | null>(null)
  const [loadingNutrition, setLoadingNutrition] = useState(false)

  const fetchNutrition = async (food: InventoryItem) => {
    setSelectedFood(food)
    setNutritionInfo(null)
    setLoadingNutrition(true)
    try {
      const data = await inventoryApi.nutrition(food.food_name)
      // Convert structured NutritionInfo to the text format parseNutrition expects
      const lines: string[] = []
      if (data.calories) lines.push(`CALORIAS: ${data.calories.replace(/[^\d]/g, '')}`)
      if (data.benefits?.length) lines.push(`BENEFICIO CLAVE: ${data.benefits[0]}`)
      const vitamins = [...(data.vitamins ?? []), ...(data.minerals ?? [])].slice(0, 3).join(', ')
      if (vitamins) lines.push(`VITAMINAS: ${vitamins}`)
      if (data.benefits?.length) lines.push(`PARA QUE SIRVE: ${data.benefits.join('. ')}`)
      if (data.tips) lines.push(`CONSEJO: ${data.tips}`)
      setNutritionInfo(lines.join('\n'))
    } catch {
      setNutritionInfo('No se pudo cargar la información nutricional.')
    } finally { setLoadingNutrition(false) }
  }

  const parseNutrition = (text: string) => {
    const lines = text.split('\n').filter(l => l.trim())
    const result: Record<string, string> = {}
    lines.forEach(line => {
      const [key, ...rest] = line.split(':')
      if (key && rest.length) result[key.trim()] = rest.join(':').trim()
    })
    return result
  }

  return (
    <Modal isOpen={isOpen} onClose={selectedFood ? () => setSelectedFood(null) : onClose}
      title={selectedFood ? `${getFoodEmoji(selectedFood.food_name)} ${selectedFood.food_name}` : '🥗 Tus alimentos'}
      size="md">
      {!selectedFood ? (
        <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
          <p style={{ fontSize:'12.5px', color:'var(--text-secondary)' }}>
            Tienes <strong style={{ color:'var(--primary)' }}>{inventory.length} alimentos</strong> en tu despensa. Toca uno para ver detalles nutricionales.
          </p>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(120px, 1fr))', gap:'8px', maxHeight:'400px', overflowY:'auto' }}>
            {inventory.map(item => (
              <button key={item.id} onClick={() => fetchNutrition(item)} style={{
                padding:'12px 8px', background:'var(--surface-2)', border:'1px solid var(--border-subtle)',
                borderRadius:'var(--radius)', cursor:'pointer', textAlign:'center',
                transition:'all var(--transition)',
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.background = 'var(--primary-dim)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.background = 'var(--surface-2)' }}>
                <div style={{ fontSize:'24px', marginBottom:'6px' }}>{getFoodEmoji(item.food_name)}</div>
                <div style={{ fontSize:'11.5px', fontWeight:600, color:'var(--text)', lineHeight:1.2 }}>{item.food_name}</div>
                <div style={{ fontSize:'10px', color:'var(--text-muted)', marginTop:'3px' }}>{item.quantity} {item.unit}</div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
          <button onClick={() => setSelectedFood(null)} style={{ alignSelf:'flex-start', fontSize:'12px', color:'var(--text-muted)', background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:'4px', padding:0 }}>
            ← Volver a la lista
          </button>

          {loadingNutrition ? (
            <div style={{ textAlign:'center', padding:'40px 0', color:'var(--text-secondary)' }}>
              <Loader size={24} style={{ animation:'spin 1s linear infinite', marginBottom:'8px', color:'var(--primary)' }}/>
              <p style={{ fontSize:'13px' }}>Analizando con IA...</p>
            </div>
          ) : nutritionInfo ? (() => {
            const info = parseNutrition(nutritionInfo)
            return (
              <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                {/* Calorias + beneficio */}
                <div style={{ display:'grid', gridTemplateColumns:'auto 1fr', gap:'10px' }}>
                  {info['CALORIAS'] && (
                    <div style={{ background:'var(--primary-dim)', border:'1px solid rgba(62,213,152,0.2)', borderRadius:'var(--radius-sm)', padding:'14px', textAlign:'center', minWidth:'90px' }}>
                      <div style={{ fontSize:'24px', fontWeight:800, color:'var(--primary)', fontFamily:'Space Grotesk' }}>{info['CALORIAS'].replace(/[^\d]/g,'')}</div>
                      <div style={{ fontSize:'10px', color:'var(--text-muted)', marginTop:'2px' }}>kcal / 100g</div>
                    </div>
                  )}
                  {info['BENEFICIO CLAVE'] && (
                    <div style={{ background:'rgba(245,184,65,0.08)', border:'1px solid rgba(245,184,65,0.2)', borderRadius:'var(--radius-sm)', padding:'14px' }}>
                      <div style={{ fontSize:'10px', fontWeight:700, color:'var(--warning)', marginBottom:'4px', textTransform:'uppercase', letterSpacing:'0.05em' }}>⭐ Beneficio clave</div>
                      <div style={{ fontSize:'13px', color:'var(--text)', fontWeight:500, lineHeight:1.4 }}>{info['BENEFICIO CLAVE']}</div>
                    </div>
                  )}
                </div>

                {info['VITAMINAS'] && (
                  <div style={{ padding:'10px 12px', background:'var(--surface-2)', borderRadius:'var(--radius-sm)', border:'1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize:'11px', fontWeight:600, color:'var(--text-secondary)', marginBottom:'5px' }}>💊 Vitaminas y minerales</div>
                    <div style={{ fontSize:'13px', color:'var(--text)' }}>{info['VITAMINAS']}</div>
                  </div>
                )}

                {info['PARA QUE SIRVE'] && (
                  <div style={{ padding:'10px 12px', background:'var(--surface-2)', borderRadius:'var(--radius-sm)', border:'1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize:'11px', fontWeight:600, color:'var(--text-secondary)', marginBottom:'5px' }}>✅ Para qué sirve</div>
                    <div style={{ fontSize:'13px', color:'var(--text)', lineHeight:1.5 }}>{info['PARA QUE SIRVE']}</div>
                  </div>
                )}

                {info['CONSUMIR'] && (
                  <div style={{ padding:'10px 12px', background:'var(--surface-2)', borderRadius:'var(--radius-sm)', border:'1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize:'11px', fontWeight:600, color:'var(--text-secondary)', marginBottom:'5px' }}>🗓️ Frecuencia recomendada</div>
                    <div style={{ fontSize:'13px', color:'var(--text)' }}>{info['CONSUMIR']}</div>
                  </div>
                )}

                {info['CONSEJO'] && (
                  <div style={{ padding:'10px 12px', background:'rgba(100,149,237,0.08)', borderRadius:'var(--radius-sm)', border:'1px solid rgba(100,149,237,0.2)' }}>
                    <div style={{ fontSize:'11px', fontWeight:600, color:'var(--info)', marginBottom:'5px' }}>💡 Consejo</div>
                    <div style={{ fontSize:'13px', color:'var(--text)' }}>{info['CONSEJO']}</div>
                  </div>
                )}
              </div>
            )
          })() : null}
        </div>
      )}
    </Modal>
  )
}

// ── MODAL: Semana Anterior ─────────────────────────────────
function WeekComparisonModal({ isOpen, onClose, summary, spending }: {
  isOpen: boolean; onClose: () => void
  summary: DashboardSummary | null; spending: SpendingByDate[]
}) {
  const wc = summary?.week_comparison
  const diff = wc?.difference ?? 0
  const pct = wc?.percentage ?? 0
  const isUp = diff > 0
  const current = wc?.current_week ?? 0
  const previous = wc?.previous_week ?? 0

  const weeklyData = [
    { name: 'Semana anterior', total: previous, fill: '#6495ED' },
    { name: 'Esta semana', total: current, fill: isUp ? '#FF7F7F' : '#3ED598' },
  ]

  const advice = isUp
    ? [
        'Revisa si hubo compras impulsivas no planeadas.',
        'Trata de planificar el menú antes de comprar.',
        'Compara precios entre diferentes tiendas.',
        'Evalúa si compraste alimentos que ya tenías en casa.',
      ]
    : [
        '¡Excelente! Estás optimizando tu presupuesto.',
        'Sigue planificando tus comidas con anticipación.',
        'Considera guardar el ahorro para semanas de más gasto.',
        'Comparte tus hábitos de ahorro con tu familia.',
      ]

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="📊 Comparación semanal" size="md">
      <div style={{ display:'flex', flexDirection:'column', gap:'18px' }}>
        {/* Comparison visual */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr auto 1fr', gap:'10px', alignItems:'center' }}>
          <div style={{ background:'var(--surface-2)', borderRadius:'var(--radius-sm)', padding:'14px', textAlign:'center' }}>
            <div style={{ fontSize:'11px', color:'var(--text-muted)', marginBottom:'4px' }}>Semana anterior</div>
            <div style={{ fontSize:'22px', fontWeight:800, color:'#6495ED', fontFamily:'Space Grotesk' }}>${previous.toFixed(2)}</div>
          </div>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'4px' }}>
            {isUp
              ? <ArrowUpRight size={20} style={{ color:'var(--danger)' }}/>
              : <ArrowDownRight size={20} style={{ color:'var(--primary)' }}/>}
            <span style={{ fontSize:'13px', fontWeight:700, color: isUp ? 'var(--danger)' : 'var(--primary)' }}>
              {isUp ? '+' : ''}{pct.toFixed(1)}%
            </span>
          </div>
          <div style={{ background: isUp ? 'rgba(255,107,107,0.08)' : 'var(--primary-dim)', border:`1px solid ${isUp ? 'rgba(255,107,107,0.2)' : 'rgba(62,213,152,0.2)'}`, borderRadius:'var(--radius-sm)', padding:'14px', textAlign:'center' }}>
            <div style={{ fontSize:'11px', color:'var(--text-muted)', marginBottom:'4px' }}>Esta semana</div>
            <div style={{ fontSize:'22px', fontWeight:800, color: isUp ? 'var(--danger)' : 'var(--primary)', fontFamily:'Space Grotesk' }}>${current.toFixed(2)}</div>
          </div>
        </div>

        {/* Bar chart */}
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={weeklyData} margin={{top:4,right:4,left:-20,bottom:0}}>
            <XAxis dataKey="name" tick={{fill:'var(--text-muted)',fontSize:11}} axisLine={false} tickLine={false}/>
            <YAxis tick={{fill:'var(--text-muted)',fontSize:10}} axisLine={false} tickLine={false}/>
            <Bar dataKey="total" radius={[6,6,0,0]}>
              {weeklyData.map((entry, i) => <Cell key={i} fill={entry.fill}/>)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Difference summary */}
        <div style={{ padding:'12px 14px', background: isUp ? 'rgba(255,107,107,0.08)' : 'var(--primary-dim)', border:`1px solid ${isUp ? 'rgba(255,107,107,0.2)' : 'rgba(62,213,152,0.2)'}`, borderRadius:'var(--radius-sm)' }}>
          <div style={{ fontSize:'12px', fontWeight:600, color: isUp ? 'var(--danger)' : 'var(--primary)', marginBottom:'4px' }}>
            {isUp ? '⬆️ Gastaste más esta semana' : '⬇️ Ahorraste esta semana'}
          </div>
          <div style={{ fontSize:'13px', color:'var(--text)' }}>
            {isUp ? `Gastaste $${Math.abs(diff).toFixed(2)} más que la semana pasada.` : `Ahorraste $${Math.abs(diff).toFixed(2)} comparado a la semana pasada.`}
          </div>
        </div>

        {/* Advice */}
        <div>
          <h4 style={{ fontSize:'13px', fontWeight:600, marginBottom:'10px', color:'var(--text-secondary)', display:'flex', alignItems:'center', gap:'6px' }}>
            <Target size={13}/> {isUp ? 'Cómo mejorar' : 'Sigue así'}
          </h4>
          <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
            {advice.map((a, i) => (
              <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:'8px', padding:'8px 10px', background:'var(--surface-2)', borderRadius:'var(--radius-sm)' }}>
                <span style={{ fontSize:'14px', marginTop:'1px' }}>{isUp ? '💡' : '✅'}</span>
                <span style={{ fontSize:'12px', color:'var(--text-secondary)', lineHeight:1.4 }}>{a}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  )
}

// ── Consume Confirm Modal ──────────────────────────────────
function ConsumeModal({ item, onClose, onConsumed }: {
  item: InventoryItem; onClose: () => void; onConsumed: () => void
}) {
  const { toast } = useToast()
  const [amount, setAmount] = useState(1)
  const [loading, setLoading] = useState(false)

  const step = item.unit === 'kg' || item.unit === 'g' || item.unit === 'L' || item.unit === 'ml' ? 0.1 : 1
  const max = item.quantity

  const handleConsume = async () => {
    setLoading(true)
    try {
      await inventoryApi.consume(item.id, amount)
      toast(`✅ ${item.food_name} actualizado`)
      onConsumed()
      onClose()
    } catch {
      toast('Error al actualizar', 'error')
    } finally { setLoading(false) }
  }

  return (
    <Modal isOpen onClose={onClose} title="✅ Ya lo consumí" size="sm">
      <div style={{ display:'flex', flexDirection:'column', gap:'18px' }}>
        <div style={{ textAlign:'center', padding:'8px 0' }}>
          <div style={{ fontSize:'40px', marginBottom:'8px' }}>{getFoodEmoji(item.food_name)}</div>
          <div style={{ fontSize:'16px', fontWeight:700, color:'var(--text)' }}>{item.food_name}</div>
          <div style={{ fontSize:'12px', color:'var(--text-muted)', marginTop:'2px' }}>
            Disponible: {item.quantity} {item.unit}
          </div>
        </div>

        <div>
          <label style={{ fontSize:'13px', fontWeight:500, color:'var(--text-secondary)', marginBottom:'10px', display:'block' }}>
            ¿Cuánto consumiste?
          </label>
          <div style={{ display:'flex', alignItems:'center', gap:'12px', justifyContent:'center' }}>
            <button
              onClick={() => setAmount(a => Math.max(step, parseFloat((a - step).toFixed(2))))}
              style={{ width:'36px', height:'36px', borderRadius:'50%', background:'var(--surface-2)', border:'1px solid var(--border-subtle)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'var(--text)' }}>
              <Minus size={15}/>
            </button>
            <div style={{ textAlign:'center', minWidth:'80px' }}>
              <div style={{ fontSize:'24px', fontWeight:700, color:'var(--primary)', fontFamily:'Space Grotesk' }}>{amount}</div>
              <div style={{ fontSize:'12px', color:'var(--text-muted)' }}>{item.unit}</div>
            </div>
            <button
              onClick={() => setAmount(a => Math.min(max, parseFloat((a + step).toFixed(2))))}
              style={{ width:'36px', height:'36px', borderRadius:'50%', background:'var(--surface-2)', border:'1px solid var(--border-subtle)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'var(--text)' }}>
              <Plus size={15}/>
            </button>
          </div>
          {amount >= max && (
            <p style={{ textAlign:'center', fontSize:'11px', color:'var(--warning)', marginTop:'8px' }}>
              ⚠️ Esto eliminará el alimento del inventario
            </p>
          )}
        </div>

        <div style={{ display:'flex', gap:'10px', justifyContent:'flex-end' }}>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button loading={loading} icon={<CheckCircle2 size={15}/>} onClick={handleConsume}>
            Confirmar
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ── Modals ─────────────────────────────────────────────────
function ManualModal({ isOpen, onClose, onSaved }: { isOpen:boolean; onClose:()=>void; onSaved:()=>void }) {
  const { toast } = useToast()
  const [form, setForm] = useState({ food_name:'', quantity:'1', unit:'unidad', storage_location:'pantry', price:'0' })
  const [loading, setLoading] = useState(false)
  const u = (k: string) => (e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement>) => setForm(p => ({...p,[k]:e.target.value}))
  const save = async () => {
    if (!form.food_name.trim()) { toast('Escribe el nombre del alimento','error'); return }
    setLoading(true)
    try {
      await inventoryApi.create({ food_name:form.food_name, quantity:parseFloat(form.quantity)||1, unit:form.unit, storage_location:form.storage_location })
      toast('✅ Alimento agregado')
      setForm({ food_name:'', quantity:'1', unit:'unidad', storage_location:'pantry', price:'0' })
      onSaved(); onClose()
    } catch { toast('Error al agregar','error') } finally { setLoading(false) }
  }
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Agregar alimento" size="sm">
      <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
        <Input label="Nombre del alimento" placeholder="Ej: Manzanas, Arroz, Leche..." value={form.food_name} onChange={u('food_name')} autoFocus icon={<Leaf size={15}/>} />
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
          <Input type="number" label="Cantidad" placeholder="1" min="0" step="0.1" value={form.quantity} onChange={u('quantity')} />
          <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
            <label style={{ fontSize:'13px', fontWeight:500, color:'var(--text-secondary)' }}>Unidad</label>
            <select value={form.unit} onChange={u('unit')} style={{ height:'42px', padding:'0 10px', background:'var(--surface)', border:'1px solid var(--border-subtle)', borderRadius:'var(--radius-sm)', color:'var(--text)', fontSize:'13px' }}>
              {UNITS.map(u=><option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
          <label style={{ fontSize:'13px', fontWeight:500, color:'var(--text-secondary)' }}>¿Dónde lo guardas?</label>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'6px' }}>
            {LOCATIONS.map(loc => (
              <button key={loc.value} onClick={() => setForm(p=>({...p, storage_location:loc.value}))} style={{
                padding:'10px', borderRadius:'var(--radius-sm)', textAlign:'left',
                background: form.storage_location===loc.value ? 'var(--primary-dim)' : 'var(--surface-2)',
                border: `1px solid ${form.storage_location===loc.value ? 'var(--primary)' : 'var(--border-subtle)'}`,
                cursor:'pointer', transition:'all var(--transition)',
              }}>
                <div style={{ fontSize:'13px', fontWeight:500, color: form.storage_location===loc.value ? 'var(--primary)' : 'var(--text)' }}>{loc.label}</div>
                <div style={{ fontSize:'11px', color:'var(--text-muted)', marginTop:'2px' }}>{loc.days}</div>
              </button>
            ))}
          </div>
        </div>
        <div style={{ display:'flex', gap:'10px', justifyContent:'flex-end', paddingTop:'4px' }}>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button loading={loading} icon={<Check size={15}/>} onClick={save}>Guardar</Button>
        </div>
      </div>
    </Modal>
  )
}

function VoiceModal({ isOpen, onClose, onSaved }: { isOpen:boolean; onClose:()=>void; onSaved:()=>void }) {
  const { toast } = useToast()
  const [recording, setRecording] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [preview, setPreview] = useState<PurchaseItemCreate[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const recRef = useRef<SpeechRecognition|null>(null)
  const startRec = () => {
    const SR = ((window as unknown as Record<string,unknown>).SpeechRecognition || (window as unknown as Record<string,unknown>).webkitSpeechRecognition) as (new() => SpeechRecognition)|undefined
    if (!SR) { toast('Usa Chrome para voz','error'); return }
    navigator.mediaDevices?.getUserMedia({audio:true}).then(()=>{
      const r = new SR(); r.lang='es-ES'; r.continuous=true; r.interimResults=true
      r.onresult=(e:SpeechRecognitionEvent)=>setTranscript(Array.from(e.results).map(r=>r[0].transcript).join(' '))
      r.onerror=()=>{setRecording(false); toast('Error micrófono','error')}
      r.onend=()=>setRecording(false)
      r.start(); recRef.current=r; setRecording(true)
    }).catch(()=>toast('Permiso de micrófono denegado','error'))
  }
  const stopRec = () => { recRef.current?.stop(); setRecording(false) }
  const parse = async () => {
    if (!transcript.trim()) { toast('Di algo primero','error'); return }
    setLoading(true)
    try { const r=await purchasesApi.parseVoice(transcript); setPreview(r.items) }
    catch { toast('Error al analizar con IA','error') } finally { setLoading(false) }
  }
  const save = async () => {
    setSaving(true)
    try {
      await purchasesApi.create({source:'voice',items:preview})
      toast('✅ Registrado por voz')
      setTranscript(''); setPreview([]); onSaved(); onClose()
    } catch { toast('Error al guardar','error') } finally { setSaving(false) }
  }
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Agregar por voz">
      <div style={{ display:'flex', flexDirection:'column', gap:'20px' }}>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'12px', padding:'16px 0' }}>
          <button onClick={recording?stopRec:startRec} style={{
            width:'80px', height:'80px', borderRadius:'50%',
            background:recording?'var(--danger-dim)':'var(--primary-dim)',
            border:`2px solid ${recording?'var(--danger)':'var(--primary)'}`,
            display:'flex', alignItems:'center', justifyContent:'center',
            color:recording?'var(--danger)':'var(--primary)',
            cursor:'pointer', animation:recording?'pulse 1.5s ease infinite':'none',
          }}>
            {recording?<MicOff size={28}/>:<Mic size={28}/>}
          </button>
          <p style={{ fontSize:'13px', color:'var(--text-secondary)' }}>{recording?'🔴 Grabando... toca para detener':'Toca para grabar'}</p>
        </div>
        <Input label="O escribe directamente" placeholder="Ej: compré 2kg arroz y una docena de huevos..." value={transcript} onChange={e=>setTranscript(e.target.value)} />
        {transcript && !preview.length && <Button loading={loading} onClick={parse} fullWidth>Analizar con IA</Button>}
        {preview.length>0 && (
          <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
            {preview.map((it,i)=>(
              <div key={i} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'10px 14px', background:'var(--surface-2)', borderRadius:'var(--radius-sm)', border:'1px solid var(--primary-dim)' }}>
                <span>🌿</span>
                <span style={{ flex:1, fontSize:'14px' }}>{it.food_name}</span>
                <span style={{ fontSize:'12px', color:'var(--text-secondary)', fontFamily:'IBM Plex Mono' }}>{it.quantity} {it.unit}</span>
              </div>
            ))}
            <div style={{ display:'flex', gap:'10px', justifyContent:'flex-end' }}>
              <Button variant="ghost" onClick={()=>{setPreview([]);setTranscript('')}}>Reintentar</Button>
              <Button loading={saving} icon={<Check size={15}/>} onClick={save}>Confirmar</Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

function ReceiptModal({ isOpen, onClose, onSaved }: { isOpen:boolean; onClose:()=>void; onSaved:()=>void }) {
  const { toast } = useToast()
  const fileRef = useRef<HTMLInputElement|null>(null)
  const [preview, setPreview] = useState<PurchaseItemCreate[]>([])
  const [receiptUrl, setReceiptUrl] = useState<string|null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const processFile = async (file: File) => {
    setLoading(true)
    try { const r=await purchasesApi.parseReceipt(file); setPreview(r.items); setReceiptUrl(r.receipt_image_url??null) }
    catch { toast('Error al procesar imagen','error') } finally { setLoading(false) }
  }
  const save = async () => {
    setSaving(true)
    try {
      await purchasesApi.create({source:'receipt',items:preview,receipt_image_url:receiptUrl})
      toast('✅ Factura registrada')
      setPreview([]); setReceiptUrl(null); onSaved(); onClose()
    } catch { toast('Error al guardar','error') } finally { setSaving(false) }
  }
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Agregar con foto de factura">
      <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
        {!preview.length && (
          <>
            <div
              onDragOver={e=>{e.preventDefault();setDragOver(true)}}
              onDragLeave={()=>setDragOver(false)}
              onDrop={e=>{e.preventDefault();setDragOver(false);const f=e.dataTransfer.files[0];if(f)processFile(f)}}
              style={{ border:`2px dashed ${dragOver?'var(--primary)':'var(--border-subtle)'}`, borderRadius:'var(--radius-lg)', padding:'36px 20px', textAlign:'center', background:dragOver?'var(--primary-dim)':'transparent', transition:'all var(--transition)' }}
            >
              {loading ? (
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'10px' }}>
                  <div style={{ width:'28px', height:'28px', border:'2px solid var(--border-subtle)', borderTopColor:'var(--primary)', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
                  <p style={{ fontSize:'13px', color:'var(--text-secondary)' }}>Analizando con IA...</p>
                </div>
              ) : (
                <><Camera size={28} style={{ color:'var(--text-muted)', margin:'0 auto 10px' }}/><p style={{ fontSize:'14px', fontWeight:500, marginBottom:'4px' }}>Arrastra tu factura aquí</p><p style={{ fontSize:'12px', color:'var(--text-secondary)' }}>JPG, PNG o PDF</p></>
              )}
            </div>
            {!loading && <Button variant="outline" icon={<Camera size={15}/>} onClick={()=>fileRef.current?.click()} fullWidth>Seleccionar archivo</Button>}
            <input ref={fileRef} type="file" accept="image/*,.pdf" style={{ display:'none' }} onChange={e=>{const f=e.target.files?.[0];if(f)processFile(f)}}/>
          </>
        )}
        {preview.length>0 && (
          <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
            <p style={{ fontSize:'13px', fontWeight:500, color:'var(--text-secondary)' }}>Detectados ({preview.length}):</p>
            <div style={{ display:'flex', flexDirection:'column', gap:'5px', maxHeight:'220px', overflowY:'auto' }}>
              {preview.map((it,i)=>(
                <div key={i} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'9px 12px', background:'var(--surface-2)', borderRadius:'var(--radius-sm)', border:'1px solid var(--warning-dim)' }}>
                  <span>📦</span>
                  <span style={{ flex:1, fontSize:'13px' }}>{it.food_name}</span>
                  <span style={{ fontSize:'12px', color:'var(--text-secondary)' }}>{it.quantity} {it.unit}</span>
                  {it.price>0 && <span style={{ fontSize:'12px', color:'var(--warning)' }}>${it.price.toFixed(2)}</span>}
                </div>
              ))}
            </div>
            <div style={{ display:'flex', gap:'10px', justifyContent:'flex-end' }}>
              <Button variant="ghost" onClick={()=>setPreview([])}>Reintentar</Button>
              <Button loading={saving} icon={<Check size={15}/>} onClick={save}>Confirmar</Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

// ── Photo Analysis Modal ───────────────────────────────────
function PhotoAnalysisModal({ onClose, onItemsAdded }: {
  onClose: () => void
  onItemsAdded: (items: DetectedItem[]) => void
}) {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [detected, setDetected] = useState<DetectedItem[] | null>(null)
  const [saving, setSaving] = useState(false)

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) { toast('Solo se aceptan imágenes', 'error'); return }
    const url = URL.createObjectURL(file)
    setPreview(url); setDetected(null); setAnalyzing(true)
    try {
      const result = await inventoryApi.analyzePhoto(file)
      const items: DetectedItem[] = result.items.map((i: any) => ({ ...i, storage_location: 'pantry' }))
      setDetected(items)
    } catch (err: any) {
      toast(err?.response?.data?.detail ?? 'Error al analizar la foto', 'error')
      setPreview(null)
    } finally { setAnalyzing(false) }
  }

  const updateItem = (idx: number, field: keyof DetectedItem, value: string | number) =>
    setDetected(prev => prev ? prev.map((it, i) => i === idx ? { ...it, [field]: value } : it) : prev)

  const removeItem = (idx: number) =>
    setDetected(prev => prev ? prev.filter((_, i) => i !== idx) : prev)

  const handleSave = async () => {
    if (!detected || detected.length === 0) return
    setSaving(true)
    try {
      const added: DetectedItem[] = []
      for (const item of detected) {
        await inventoryApi.create({ food_name: item.food_name, quantity: item.quantity, unit: item.unit, storage_location: item.storage_location })
        added.push(item)
      }
      toast(`✅ ${added.length} alimento${added.length !== 1 ? 's' : ''} agregado${added.length !== 1 ? 's' : ''} al inventario`)
      onItemsAdded(added)
      onClose()
    } catch { toast('Error al guardar los alimentos', 'error') } finally { setSaving(false) }
  }

  return (
    <Modal isOpen onClose={onClose} title="📸 Foto de alimento — IA" size="md">
      <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
        {!preview && (
          <div>
            <p style={{ fontSize:'13px', color:'var(--text-secondary)', marginBottom:'14px' }}>
              Toma o sube una foto de tus alimentos y la IA identificará qué hay y en qué cantidad.
            </p>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
              <button onClick={()=>cameraInputRef.current?.click()} style={{ padding:'20px 12px', borderRadius:'var(--radius)', border:'1.5px dashed #FF7F7F88', background:'#FF7F7F0A', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:'8px', color:'#FF7F7F', transition:'all var(--transition)' }}
                onMouseEnter={e=>e.currentTarget.style.background='#FF7F7F18'} onMouseLeave={e=>e.currentTarget.style.background='#FF7F7F0A'}>
                <Camera size={24}/><span style={{ fontSize:'13px', fontWeight:500 }}>Tomar foto</span>
              </button>
              <button onClick={()=>fileInputRef.current?.click()} style={{ padding:'20px 12px', borderRadius:'var(--radius)', border:'1.5px dashed var(--border-subtle)', background:'var(--surface-2)', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:'8px', color:'var(--text-secondary)', transition:'all var(--transition)' }}
                onMouseEnter={e=>e.currentTarget.style.background='var(--surface-3)'} onMouseLeave={e=>e.currentTarget.style.background='var(--surface-2)'}>
                <Upload size={24}/><span style={{ fontSize:'13px', fontWeight:500 }}>Subir foto</span>
              </button>
            </div>
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" style={{ display:'none' }} onChange={e=>e.target.files?.[0]&&handleFile(e.target.files[0])}/>
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display:'none' }} onChange={e=>e.target.files?.[0]&&handleFile(e.target.files[0])}/>
          </div>
        )}
        {preview && (
          <div style={{ position:'relative' }}>
            <img src={preview} alt="Foto del alimento" style={{ width:'100%', maxHeight:'220px', objectFit:'cover', borderRadius:'var(--radius-sm)', border:'1px solid var(--border-subtle)' }}/>
            {!analyzing && (
              <button onClick={()=>{setPreview(null);setDetected(null)}} style={{ position:'absolute', top:'8px', right:'8px', width:'28px', height:'28px', borderRadius:'50%', background:'rgba(0,0,0,0.6)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff' }}>
                <XIcon size={14}/>
              </button>
            )}
          </div>
        )}
        {analyzing && (
          <div style={{ textAlign:'center', padding:'16px 0', color:'var(--text-secondary)' }}>
            <Loader size={24} style={{ animation:'spin 1s linear infinite', marginBottom:'8px' }}/>
            <p style={{ fontSize:'13px' }}>Analizando imagen con IA...</p>
          </div>
        )}
        {detected && detected.length > 0 && (
          <div>
            <p style={{ fontSize:'13px', fontWeight:600, color:'var(--text)', marginBottom:'10px' }}>
              ✨ {detected.length} alimento{detected.length !== 1 ? 's' : ''} detectado{detected.length !== 1 ? 's' : ''} — revisa y ajusta:
            </p>
            <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
              {detected.map((item, idx) => (
                <div key={idx} style={{ padding:'10px 12px', borderRadius:'var(--radius-sm)', background:'var(--surface-2)', border:'1px solid var(--border-subtle)', display:'grid', gridTemplateColumns:'1fr auto auto auto', gap:'8px', alignItems:'center' }}>
                  <input value={item.food_name} onChange={e=>updateItem(idx,'food_name',e.target.value)} style={{ background:'transparent', border:'none', color:'var(--text)', fontSize:'13px', fontWeight:500, outline:'none', minWidth:0 }}/>
                  <input type="number" min="0.1" step="0.5" value={item.quantity} onChange={e=>updateItem(idx,'quantity',parseFloat(e.target.value)||1)} style={{ width:'52px', textAlign:'center', background:'var(--surface)', border:'1px solid var(--border-subtle)', borderRadius:'6px', color:'var(--text)', fontSize:'13px', padding:'4px 6px' }}/>
                  <select value={item.unit} onChange={e=>updateItem(idx,'unit',e.target.value)} style={{ background:'var(--surface)', border:'1px solid var(--border-subtle)', borderRadius:'6px', color:'var(--text)', fontSize:'12px', padding:'4px 6px' }}>
                    {PHOTO_UNITS.map(u=><option key={u} value={u}>{u}</option>)}
                  </select>
                  <button onClick={()=>removeItem(idx)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', display:'flex' }}><XIcon size={14}/></button>
                </div>
              ))}
            </div>
            <div style={{ marginTop:'12px' }}>
              <p style={{ fontSize:'12px', color:'var(--text-secondary)', marginBottom:'6px' }}>¿Dónde los guardas?</p>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'6px' }}>
                {PHOTO_LOCATIONS.map(loc=>(
                  <button key={loc.value} onClick={()=>setDetected(prev=>prev?prev.map(i=>({...i,storage_location:loc.value})):prev)}
                    style={{ padding:'7px 10px', borderRadius:'var(--radius-sm)', textAlign:'left', background:detected[0]?.storage_location===loc.value?`${loc.color}15`:'var(--surface-2)', border:`1px solid ${detected[0]?.storage_location===loc.value?loc.color:'var(--border-subtle)'}`, cursor:'pointer', fontSize:'12px', color:detected[0]?.storage_location===loc.value?loc.color:'var(--text-secondary)', fontWeight:detected[0]?.storage_location===loc.value?600:400 }}>
                    {loc.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        <div style={{ display:'flex', gap:'10px', justifyContent:'flex-end', marginTop:'4px' }}>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          {detected && detected.length > 0 && (
            <Button loading={saving} icon={<Check size={15}/>} onClick={handleSave}>
              Agregar {detected.length} alimento{detected.length !== 1 ? 's' : ''}
            </Button>
          )}
        </div>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </Modal>
  )
}

// ── FAB Dock ───────────────────────────────────────────────
function DashboardDockItem({ action, index, onClose }: { action: { icon: React.ReactNode; label: string; tooltip: string; onClick: ()=>void; color: string }; index: number; onClose: ()=>void }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'8px', animation:`dockExpand 0.2s ease ${index*0.05}s both`, position:'relative' }}
      onMouseEnter={()=>setHovered(true)} onMouseLeave={()=>setHovered(false)}>
      {hovered && (
        <div style={{ position:'absolute', right:'54px', background:'var(--surface-2)', border:`1px solid ${action.color}40`, borderRadius:'var(--radius-sm)', padding:'6px 10px', fontSize:'11.5px', color:'var(--text-secondary)', whiteSpace:'nowrap', boxShadow:'0 4px 16px rgba(0,0,0,0.3)', pointerEvents:'none', animation:'fadeIn 0.15s ease', zIndex:10 }}>
          {action.tooltip}
        </div>
      )}
      <div style={{ background:'var(--surface)', border:'1px solid var(--border-subtle)', borderRadius:'var(--radius-sm)', padding:'5px 12px', fontSize:'13px', fontWeight:500, whiteSpace:'nowrap', boxShadow:'var(--shadow)', color:'var(--text)' }}>{action.label}</div>
      <button onClick={()=>{action.onClick();onClose()}} style={{ width:'44px', height:'44px', borderRadius:'50%', background:hovered?`${action.color}28`:`${action.color}18`, border:`1px solid ${action.color}30`, display:'flex', alignItems:'center', justifyContent:'center', color:action.color, cursor:'pointer', flexShrink:0, transition:'all var(--transition)', transform:hovered?'scale(1.08)':'scale(1)', boxShadow:hovered?`0 6px 20px ${action.color}40`:`0 4px 16px ${action.color}25` }}>{action.icon}</button>
    </div>
  )
}

function DashboardDock({ onManual, onVoice, onReceipt, onPhoto }: { onManual:()=>void; onVoice:()=>void; onReceipt:()=>void; onPhoto:()=>void }) {
  const [open, setOpen] = useState(false)
  const actions = [
    { icon:<Leaf size={17}/>,     label:'Manual',   tooltip:'Escribe el nombre, cantidad y ubicación del alimento', onClick:onManual,  color:'#3ED598' },
    { icon:<Mic size={17}/>,      label:'Por voz',  tooltip:'Dicta los alimentos y la IA los interpreta',           onClick:onVoice,   color:'#6495ED' },
    { icon:<Sparkles size={17}/>, label:'Foto IA',  tooltip:'Saca foto a tus alimentos y la IA los identifica',     onClick:onPhoto,   color:'#FF7F7F' },
    { icon:<Receipt size={17}/>,  label:'Factura',  tooltip:'Escanea un ticket de compra para importar todo',        onClick:onReceipt, color:'#F5B841' },
  ]
  return (
    <div className="desktop-fab" style={{ position:'fixed', bottom:'24px', right:'20px', zIndex:50, display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'10px' }}>
      {open && actions.map((a,i)=>(
        <DashboardDockItem key={i} action={a} index={i} onClose={()=>setOpen(false)} />
      ))}
      <button onClick={()=>setOpen(p=>!p)} style={{ width:'54px', height:'54px', borderRadius:'50%', background:open?'var(--surface)':'var(--primary)', border:open?'1px solid var(--border-subtle)':'none', display:'flex', alignItems:'center', justifyContent:'center', color:open?'var(--text-secondary)':'#0B0F0E', cursor:'pointer', transition:'all 0.3s cubic-bezier(0.34,1.56,0.64,1)', boxShadow:open?'var(--shadow)':'0 4px 24px rgba(62,213,152,0.45)', transform:open?'rotate(45deg)':'' }}>
        <Plus size={22}/>
      </button>
    </div>
  )
}

// ── Inventory color grid with consume button ───────────────
function InventoryGrid({ items, loading, onConsumed }: { items: InventoryItem[], loading: boolean, onConsumed: () => void }) {
  const navigate = useNavigate()
  const [consumeItem, setConsumeItem] = useState<InventoryItem | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const sorted = [...items].sort((a, b) => {
    const da = a.days_remaining ?? 999
    const db = b.days_remaining ?? 999
    return da - db
  })

  if (loading) return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(140px, 1fr))', gap:'8px' }}>
      {Array.from({length:8}).map((_,i)=><Skeleton key={i} height="80px"/>)}
    </div>
  )
  if (!items.length) return (
    <EmptyState icon="🥗" title="Sin alimentos" description="Agrega tu primera compra arriba." />
  )

  return (
    <>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(140px, 1fr))', gap:'8px' }}>
        {sorted.map((item, i) => {
          const days = item.days_remaining
          const color = getExpiryColor(days)
          const bg = getExpiryBg(days)
          const urgent = days !== null && days !== undefined && days <= 5
          const isHovered = hoveredId === item.id
          return (
            <div key={item.id}
              onMouseEnter={() => setHoveredId(item.id)}
              onMouseLeave={() => setHoveredId(null)}
              style={{
                background: bg && bg !== 'transparent' ? bg : 'var(--surface)',
                border: `1.5px solid ${isHovered ? 'rgba(62,213,152,0.4)' : urgent ? color + '60' : 'var(--border-subtle)'}`,
                borderRadius:'var(--radius)',
                padding:'12px',
                position:'relative',
                overflow:'hidden',
                animation:`countUp 0.3s ease ${Math.min(i, 12)*0.04}s both`,
                boxShadow: isHovered ? '0 4px 20px rgba(62,213,152,0.15)' : urgent ? `0 0 0 1px ${color}25, 0 4px 16px ${color}20` : undefined,
                transition:'all 0.2s ease',
              }}>
              {urgent && (
                <div style={{ position:'absolute', top:0, left:0, right:0, height:'3px', background:`linear-gradient(90deg, ${color}, ${color}00)` }}/>
              )}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'6px' }}>
                <span style={{ fontSize:'22px', lineHeight:1 }}>
                  {getFoodEmoji(item.food_name)}
                </span>
                {days !== null && days !== undefined && (
                  <span style={{ fontSize:'12px', fontWeight:800, color: (days<=5) ? '#0B0F0E' : color, background: (days<=5) ? color : `${color}22`, border: `1.5px solid ${color}`, padding:'2px 8px', borderRadius:'100px', fontFamily:'IBM Plex Mono' }}>
                    {getExpiryLabel(days)}
                  </span>
                )}
              </div>
              <div style={{ fontSize:'13px', fontWeight:600, color:'var(--text)', marginBottom:'2px', lineHeight:1.2 }}>
                {item.food_name}
              </div>
              <div style={{ fontSize:'11px', color:'var(--text-muted)', fontFamily:'IBM Plex Mono', marginBottom: isHovered ? '8px' : '0', transition:'margin 0.2s ease' }}>
                {getStorageIcon(item.storage_location)} {item.quantity} {item.unit}
              </div>
              {days !== null && days !== undefined && days <= 2 && !isHovered && (
                <div style={{ marginTop:'6px', fontSize:'10px', color, fontWeight:700 }}>
                  {days <= 0 ? '⚠️ Consumir ya' : '🔥 Consumir pronto'}
                </div>
              )}

              {/* Consume button — appears on hover */}
              <div style={{
                overflow:'hidden', maxHeight: isHovered ? '32px' : '0',
                transition:'max-height 0.2s ease, opacity 0.2s ease',
                opacity: isHovered ? 1 : 0,
              }}>
                <button
                  onClick={(e) => { e.stopPropagation(); setConsumeItem(item) }}
                  style={{
                    width:'100%', padding:'5px 0',
                    borderRadius:'var(--radius-sm)',
                    background:'rgba(62,213,152,0.12)',
                    border:'1px solid rgba(62,213,152,0.3)',
                    color:'var(--primary)', cursor:'pointer',
                    fontSize:'11px', fontWeight:600,
                    display:'flex', alignItems:'center', justifyContent:'center', gap:'5px',
                    transition:'all 0.15s ease',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(62,213,152,0.22)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(62,213,152,0.12)' }}>
                  <CheckCircle2 size={12}/> Ya lo consumí
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {consumeItem && (
        <ConsumeModal
          item={consumeItem}
          onClose={() => setConsumeItem(null)}
          onConsumed={() => { setConsumeItem(null); onConsumed() }}
        />
      )}
    </>
  )
}

// ── Inspiration section ────────────────────────────────────
const inspirationPhotos = {
  impact: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=700&q=80',
  fresh: 'https://images.unsplash.com/photo-1490818387583-1baba5e638af?w=700&q=80',
  cook: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=700&q=80',
}

function LandscapeCard({ photo, tag, tagColor, title, body, cta, onClick, delay }: {
  photo: string; tag: string; tagColor: string; title: string; body: string
  cta?: string; onClick?: () => void; delay: number
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative', borderRadius: 'var(--radius-lg)', overflow: 'hidden',
        height: '240px', cursor: onClick ? 'pointer' : 'default',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        boxShadow: hovered ? `0 20px 40px rgba(0,0,0,0.45), 0 0 0 1px ${tagColor}35` : '0 6px 20px rgba(0,0,0,0.3)',
        transition: 'all 0.4s cubic-bezier(0.4,0,0.2,1)',
        animation: `fadeIn 0.5s ease ${delay}s both`,
      }}
    >
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `url(${photo})`, backgroundSize: 'cover', backgroundPosition: 'center',
        transform: hovered ? 'scale(1.06)' : 'scale(1)',
        transition: 'transform 0.6s cubic-bezier(0.4,0,0.2,1)',
        filter: 'brightness(0.4)',
      }} />
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to top, rgba(11,15,14,0.95) 0%, rgba(11,15,14,0.55) 55%, transparent 100%)',
      }} />
      <div style={{ position: 'relative', zIndex: 2, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '20px' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px', width: 'fit-content',
          padding: '4px 10px', borderRadius: '100px',
          background: `${tagColor}22`, border: `1px solid ${tagColor}50`,
          color: tagColor, fontSize: '11px', fontWeight: 700, marginBottom: '10px',
        }}>
          {tag}
        </div>
        <h4 style={{ fontSize: '17px', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em', marginBottom: '6px', lineHeight: 1.25 }}>
          {title}
        </h4>
        <p style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.75)', lineHeight: 1.5 }}>
          {body}
        </p>
        {cta && (
          <span style={{ marginTop: '10px', fontSize: '12px', fontWeight: 600, color: tagColor, display: 'flex', alignItems: 'center', gap: '4px' }}>
            {cta} <ChevronRight size={13} />
          </span>
        )}
      </div>
    </div>
  )
}

function InspirationSection({ summary }: { summary: DashboardSummary | null }) {
  const navigate = useNavigate()
  const weekComparison = summary?.week_comparison
  const savedMoney = weekComparison && weekComparison.percentage < 0
  const expiringCount = summary?.expiring_soon?.length ?? 0

  return (
    <div>
      <div style={{ marginBottom: '14px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '2px' }}>
          🌿 Un vistazo a tu progreso
        </h3>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
          Pequeños hábitos, grandes cambios
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
        <LandscapeCard
          photo={inspirationPhotos.impact}
          tag="🌍 Tu impacto"
          tagColor="#3ED598"
          title={savedMoney ? `¡Ahorraste ${Math.abs(weekComparison!.percentage).toFixed(0)}% esta semana!` : 'Cada compra que registras cuenta'}
          body={savedMoney
            ? 'Gastar menos también significa desperdiciar menos. Sigue así y el planeta (y tu bolsillo) lo agradecen.'
            : 'Saber exactamente qué tienes en casa es el primer paso para dejar de desperdiciar comida. Vas por buen camino.'}
          delay={0}
        />

        <LandscapeCard
          photo={inspirationPhotos.fresh}
          tag={expiringCount > 0 ? '⏳ Atención' : '✨ Todo fresco'}
          tagColor={expiringCount > 0 ? '#F5B841' : '#3ED598'}
          title={expiringCount > 0 ? `Tienes ${expiringCount} alimento${expiringCount===1?'':'s'} por vencer` : 'Tu despensa está al día'}
          body={expiringCount > 0
            ? 'Un poco de planificación evita que termine en la basura. Revisa tu inventario y dale prioridad a esos alimentos.'
            : 'No hay nada urgente por consumir ahora mismo. Buen trabajo manteniendo tu inventario bajo control.'}
          cta="Ver inventario"
          onClick={() => navigate('/inventory')}
          delay={0.1}
        />

        <LandscapeCard
          photo={inspirationPhotos.cook}
          tag="👩‍🍳 Cocina con lo que tienes"
          tagColor="#6495ED"
          title="¿No sabes qué cocinar hoy?"
          body="Freshly puede sugerirte recetas usando lo que ya está en tu despensa, priorizando lo que se vence primero."
          cta="Ver recetas sugeridas"
          onClick={() => navigate('/recipes')}
          delay={0.2}
        />
      </div>
    </div>
  )
}

// ── Chart types ────────────────────────────────────────────
type ChartType = 'area' | 'bar'
type GroupBy = 'day' | 'month' | 'year'
type ActiveModal = 'spending' | 'purchases' | 'foods' | 'week' | null

// ── Main Dashboard ─────────────────────────────────────────
export function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [summary, setSummary] = useState<DashboardSummary|null>(null)
  const [spending, setSpending] = useState<SpendingByDate[]>([])
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [invLoading, setInvLoading] = useState(true)
  const [chartType, setChartType] = useState<ChartType>('area')
  const [groupBy, setGroupBy] = useState<GroupBy>('day')
  const [manualOpen, setManualOpen] = useState(false)
  const [voiceOpen, setVoiceOpen] = useState(false)
  const [receiptOpen, setReceiptOpen] = useState(false)
  const [photoOpen, setPhotoOpen] = useState(false)
  const [activeModal, setActiveModal] = useState<ActiveModal>(null)

  const loadData = async () => {
    setLoading(true)
    try {
      const [sum, spend] = await Promise.all([
        dashboardApi.summary(),
        dashboardApi.spending({ group_by: groupBy })
      ])
      setSummary(sum); setSpending(spend)
    } catch(e) { console.error(e) } finally { setLoading(false) }
  }

  const loadInventory = async () => {
    setInvLoading(true)
    try {
      const items = await inventoryApi.list()
      setInventory(items)
    } catch(e) { console.error(e) } finally { setInvLoading(false) }
  }

  const refreshAll = () => { loadData(); loadInventory() }

  useEffect(() => { loadData() }, [groupBy])
  useEffect(() => { loadInventory() }, [])
  useEffect(() => {
    const handler = () => setPhotoOpen(true)
    window.addEventListener('freshly:openPhotoIA', handler)
    return () => window.removeEventListener('freshly:openPhotoIA', handler)
  }, [])

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Buenos días'
    if (h < 18) return 'Buenas tardes'
    return 'Buenas noches'
  }

  const chartData = spending.map(s => ({
    date: groupBy === 'month'
      ? format(new Date(s.date + '-01'), 'MMM yy', {locale:es})
      : groupBy === 'year' ? s.date
      : format(new Date(s.date + 'T00:00:00'), 'dd MMM', {locale:es}),
    total: s.total,
  }))

  const wc = summary?.week_comparison
  const weekPct = wc?.percentage ?? 0
  const weekUp = (wc?.difference ?? 0) > 0

  const criticalItems = inventory.filter(i => i.days_remaining !== null && i.days_remaining !== undefined && i.days_remaining <= 2)
  const warningItems = inventory.filter(i => i.days_remaining !== null && i.days_remaining !== undefined && i.days_remaining > 2 && i.days_remaining <= 5)

  return (
    <>
      <FloatingLeaves />
      <div style={{ display:'flex', flexDirection:'column', gap:'20px', animation:'fadeIn 0.4s ease', position:'relative', zIndex:1 }}>

        {/* ── Header ── */}
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:'12px' }}>
          <div>
            <h2 style={{ fontSize:'clamp(18px,4vw,24px)', fontWeight:700, letterSpacing:'-0.03em', marginBottom:'3px' }}>
              {greeting()}, {user?.name?.split(' ')[0]} 👋
            </h2>
            <p style={{ fontSize:'13px', color:'var(--text-secondary)' }}>
              {format(new Date(), "EEEE d 'de' MMMM", {locale:es})}
            </p>
          </div>
          {summary && summary.expiring_soon.length > 0 && (
            <div style={{ display:'flex', alignItems:'center', gap:'8px', padding:'8px 14px', background:'var(--warning-dim)', border:'1px solid rgba(245,184,65,0.25)', borderRadius:'var(--radius-sm)', fontSize:'13px', color:'var(--warning)', animation:'slideDown 0.3s ease' }}>
              <AlertTriangle size={14}/>
              <span>{summary.expiring_soon.slice(0,2).join(', ')}{summary.expiring_soon.length>2?` y ${summary.expiring_soon.length-2} más`:''} próximos a caducar</span>
            </div>
          )}
        </div>

        {/* ── Stat cards (clickeable) ── */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(140px, 1fr))', gap:'10px' }}>
          {loading ? Array.from({length:4}).map((_,i)=><CardSkeleton key={i}/>) : (<>
            {/* Total gastado */}
            <div onClick={() => setActiveModal('spending')} style={{ cursor:'pointer' }}>
              <StatCard label="Total gastado" value={`$${(summary?.total_spent??0).toFixed(2)}`} icon={<DollarSign size={17}/>} accent="var(--primary)"
                subtitle={<span style={{ fontSize:'10px', color:'var(--primary)', display:'flex', alignItems:'center', gap:'3px' }}>Ver análisis <ChevronRight size={10}/></span>} />
            </div>
            {/* Compras */}
            <div onClick={() => setActiveModal('purchases')} style={{ cursor:'pointer' }}>
              <StatCard label="Compras" value={summary?.purchases_count??0} icon={<ShoppingBag size={17}/>} accent="var(--warning)"
                subtitle={<span style={{ fontSize:'10px', color:'var(--warning)', display:'flex', alignItems:'center', gap:'3px' }}>Ver detalle <ChevronRight size={10}/></span>} />
            </div>
            {/* Alimentos */}
            <div onClick={() => setActiveModal('foods')} style={{ cursor:'pointer' }}>
              <StatCard label="Alimentos" value={summary?.distinct_foods??0} icon={<Package size={17}/>} accent="var(--info)"
                subtitle={<span style={{ fontSize:'10px', color:'var(--info)', display:'flex', alignItems:'center', gap:'3px' }}>Info nutricional <ChevronRight size={10}/></span>} />
            </div>
            {/* Semana anterior */}
            <div onClick={() => setActiveModal('week')} style={{ cursor:'pointer' }}>
              <div style={{ background:'var(--surface)', border:'1px solid var(--border-subtle)', borderRadius:'var(--radius)', padding:'16px', position:'relative', overflow:'hidden', transition:'all var(--transition)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = weekUp ? 'rgba(255,107,107,0.4)' : 'rgba(62,213,152,0.4)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-subtle)' }}>
                <div style={{ position:'absolute', top:0, right:0, width:'60px', height:'60px', background:`radial-gradient(circle, ${weekUp?'rgba(255,107,107,0.12)':'rgba(62,213,152,0.12)'} 0%, transparent 70%)`}}/>
                <div style={{ width:'32px', height:'32px', background:weekUp?'var(--danger-dim)':'var(--primary-dim)', borderRadius:'var(--radius-sm)', display:'flex', alignItems:'center', justifyContent:'center', color:weekUp?'var(--danger)':'var(--primary)', marginBottom:'10px' }}>
                  {weekUp ? <TrendingUp size={16}/> : <TrendingDown size={16}/>}
                </div>
                <div style={{ fontSize:'22px', fontWeight:700, fontFamily:'Space Grotesk', letterSpacing:'-0.03em', color:weekUp?'var(--danger)':'var(--primary)' }}>
                  {weekUp?'+':''}{weekPct.toFixed(1)}%
                </div>
                <div style={{ fontSize:'12px', color:'var(--text-secondary)', marginTop:'2px' }}>vs semana anterior</div>
                <div style={{ fontSize:'10px', color: weekUp ? 'var(--danger)' : 'var(--primary)', marginTop:'4px', display:'flex', alignItems:'center', gap:'3px' }}>
                  Ver comparación <ChevronRight size={10}/>
                </div>
              </div>
            </div>
          </>)}
        </div>

        {/* ── Quick action buttons ── */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
          <button onClick={()=>navigate('/inventory')} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'14px 16px', background:'var(--surface)', border:'1px solid var(--border-subtle)', borderRadius:'var(--radius)', cursor:'pointer', transition:'all var(--transition)', textAlign:'left' }}
            onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--primary)';e.currentTarget.style.background='var(--primary-dim)'}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border-subtle)';e.currentTarget.style.background='var(--surface)'}}>
            <div style={{ width:'36px', height:'36px', borderRadius:'var(--radius-sm)', background:'var(--primary-dim)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--primary)', flexShrink:0 }}>
              <Package size={18}/>
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:'13px', fontWeight:600, color:'var(--text)' }}>Ver inventario</div>
              <div style={{ fontSize:'11px', color:'var(--text-muted)' }}>{inventory.length} alimentos</div>
            </div>
            <ChevronRight size={14} style={{ color:'var(--text-muted)', flexShrink:0 }}/>
          </button>

          <button onClick={()=>navigate('/recipes')} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'14px 16px', background:'var(--surface)', border:'1px solid var(--border-subtle)', borderRadius:'var(--radius)', cursor:'pointer', transition:'all var(--transition)', textAlign:'left' }}
            onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--warning)';e.currentTarget.style.background='var(--warning-dim)'}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border-subtle)';e.currentTarget.style.background='var(--surface)'}}>
            <div style={{ width:'36px', height:'36px', borderRadius:'var(--radius-sm)', background:'var(--warning-dim)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--warning)', flexShrink:0 }}>
              <Leaf size={18}/>
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:'13px', fontWeight:600, color:'var(--text)' }}>Ver recetas</div>
              <div style={{ fontSize:'11px', color:'var(--text-muted)' }}>Con lo que tienes</div>
            </div>
            <ChevronRight size={14} style={{ color:'var(--text-muted)', flexShrink:0 }}/>
          </button>
        </div>

        {/* ── Urgency summary ── */}
        {(criticalItems.length > 0 || warningItems.length > 0) && (
          <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
            {criticalItems.length > 0 && (
              <div style={{ flex:1, minWidth:'140px', padding:'12px 14px', background:'rgba(255,107,107,0.08)', border:'1px solid rgba(255,107,107,0.2)', borderRadius:'var(--radius-sm)', display:'flex', alignItems:'center', gap:'8px' }}>
                <Flame size={15} style={{ color:'var(--danger)', flexShrink:0 }}/>
                <div>
                  <div style={{ fontSize:'12px', fontWeight:600, color:'var(--danger)' }}>Consumir ya</div>
                  <div style={{ fontSize:'11px', color:'var(--text-muted)' }}>{criticalItems.map(i=>i.food_name).slice(0,2).join(', ')}{criticalItems.length>2?`...`:''}</div>
                </div>
              </div>
            )}
            {warningItems.length > 0 && (
              <div style={{ flex:1, minWidth:'140px', padding:'12px 14px', background:'rgba(245,184,65,0.08)', border:'1px solid rgba(245,184,65,0.2)', borderRadius:'var(--radius-sm)', display:'flex', alignItems:'center', gap:'8px' }}>
                <Clock size={15} style={{ color:'var(--warning)', flexShrink:0 }}/>
                <div>
                  <div style={{ fontSize:'12px', fontWeight:600, color:'var(--warning)' }}>Próximos a caducar</div>
                  <div style={{ fontSize:'11px', color:'var(--text-muted)' }}>{warningItems.map(i=>i.food_name).slice(0,2).join(', ')}{warningItems.length>2?`...`:''}</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Inventory color grid ── */}
        <Card>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'14px', flexWrap:'wrap', gap:'8px' }}>
            <div>
              <h3 style={{ fontSize:'14px', fontWeight:600, marginBottom:'2px' }}>Tu despensa</h3>
              <p style={{ fontSize:'11px', color:'var(--text-secondary)' }}>Pasa el cursor sobre un alimento para consumirlo</p>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:'10px', flexWrap:'wrap' }}>
              <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
                {[['var(--danger)','≤2d'],['var(--warning)','≤5d'],['var(--primary)','>5d']].map(([c,l])=>(
                  <div key={l} style={{ display:'flex', alignItems:'center', gap:'4px', fontSize:'10px', color:'var(--text-muted)' }}>
                    <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:c }}/>
                    {l}
                  </div>
                ))}
              </div>
              <button onClick={()=>navigate('/inventory')} style={{ fontSize:'12px', color:'var(--primary)', background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:'3px' }}>
                Ver todo <ChevronRight size={12}/>
              </button>
            </div>
          </div>
          <InventoryGrid items={inventory.slice(0, 16)} loading={invLoading} onConsumed={refreshAll} />
        </Card>

        {/* ── Chart + Top foods ── */}
        <div className="chart-grid" style={{ display:'grid', gridTemplateColumns:'minmax(0,2fr) minmax(0,1fr)', gap:'12px' }}>
          <Card>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'16px', flexWrap:'wrap', gap:'8px' }}>
              <div>
                <h3 style={{ fontSize:'14px', fontWeight:600, letterSpacing:'-0.02em', marginBottom:'2px' }}>Gasto</h3>
                <p style={{ fontSize:'11px', color:'var(--text-secondary)' }}>Historial de compras</p>
              </div>
              <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
                {(['day','month','year'] as GroupBy[]).map(g=>(
                  <button key={g} onClick={()=>setGroupBy(g)} style={{ padding:'4px 10px', borderRadius:'100px', fontSize:'11px', fontWeight:500, cursor:'pointer', background:groupBy===g?'var(--primary-dim)':'var(--surface-2)', color:groupBy===g?'var(--primary)':'var(--text-secondary)', border:`1px solid ${groupBy===g?'var(--border)':'var(--border-subtle)'}`, transition:'all var(--transition)' }}>
                    {g==='day'?'Día':g==='month'?'Mes':'Año'}
                  </button>
                ))}
                <button onClick={()=>setChartType(p=>p==='area'?'bar':'area')} style={{ padding:'4px 8px', borderRadius:'100px', fontSize:'11px', cursor:'pointer', background:'var(--surface-2)', color:'var(--text-secondary)', border:'1px solid var(--border-subtle)', display:'flex', alignItems:'center', gap:'4px' }}>
                  {chartType==='area'?<BarChart2 size={12}/>:<Activity size={12}/>}
                  {chartType==='area'?'Barras':'Línea'}
                </button>
              </div>
            </div>
            {loading ? (
              <div style={{ height:'180px', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <div style={{ width:'20px', height:'20px', border:'2px solid var(--border-subtle)', borderTopColor:'var(--primary)', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
              </div>
            ) : chartData.length===0 ? (
              <EmptyState icon={<TrendingUp size={22}/>} title="Sin datos" description="Registra tu primera compra." />
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                {chartType==='bar' ? (
                  <BarChart data={chartData} margin={{top:4,right:4,left:-20,bottom:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)"/>
                    <XAxis dataKey="date" tick={{fill:'var(--text-muted)',fontSize:10}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fill:'var(--text-muted)',fontSize:10}} axisLine={false} tickLine={false}/>
                    <Tooltip content={<CustomTooltip/>}/>
                    <Bar dataKey="total" fill="var(--primary)" radius={[4,4,0,0]} opacity={0.85}/>
                  </BarChart>
                ) : (
                  <AreaChart data={chartData} margin={{top:4,right:4,left:-20,bottom:0}}>
                    <defs>
                      <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3ED598" stopOpacity={0.3}/>
                        <stop offset="100%" stopColor="#3ED598" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" tick={{fill:'var(--text-muted)',fontSize:10}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fill:'var(--text-muted)',fontSize:10}} axisLine={false} tickLine={false}/>
                    <Tooltip content={<CustomTooltip/>}/>
                    <Area type="monotone" dataKey="total" stroke="#3ED598" strokeWidth={2} fill="url(#areaGrad)" dot={false} activeDot={{r:4,fill:'#3ED598',stroke:'var(--bg)',strokeWidth:2}}/>
                  </AreaChart>
                )}
              </ResponsiveContainer>
            )}
          </Card>

          <Card>
            <h3 style={{ fontSize:'14px', fontWeight:600, marginBottom:'4px' }}>Top alimentos</h3>
            <p style={{ fontSize:'11px', color:'var(--text-secondary)', marginBottom:'14px' }}>Más en inventario</p>
            {loading ? (
              <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                {Array.from({length:4}).map((_,i)=><Skeleton key={i} height="40px"/>)}
              </div>
            ) : !summary?.top_foods?.length ? (
              <EmptyState icon="🥗" title="Sin datos" description="Agrega alimentos primero." />
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                {summary.top_foods.map((food,i)=>{
                  const max = summary.top_foods[0]?.quantity ?? 1
                  const pct = (food.quantity/max)*100
                  return (
                    <div key={food.food_name} style={{ animation:`countUp 0.3s ease ${i*0.05}s both` }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'5px' }}>
                        <span style={{ fontSize:'12px', fontWeight:500, color:i===0?'var(--text)':'var(--text-secondary)' }}>{food.food_name}</span>
                        <span style={{ fontSize:'11px', color:'var(--text-muted)', fontFamily:'IBM Plex Mono' }}>{food.quantity} {food.unit}</span>
                      </div>
                      <div style={{ height:'3px', background:'var(--surface-2)', borderRadius:'100px', overflow:'hidden' }}>
                        <div style={{ width:`${pct}%`, height:'100%', background:i===0?'var(--primary)':i===1?'var(--warning)':'var(--border)', borderRadius:'100px', transition:'width 0.8s cubic-bezier(0.4,0,0.2,1)' }}/>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        </div>

        <InspirationSection summary={summary} />
      </div>

      <ManualModal isOpen={manualOpen} onClose={()=>setManualOpen(false)} onSaved={refreshAll}/>
      <VoiceModal isOpen={voiceOpen} onClose={()=>setVoiceOpen(false)} onSaved={refreshAll}/>
      <ReceiptModal isOpen={receiptOpen} onClose={()=>setReceiptOpen(false)} onSaved={refreshAll}/>
      {photoOpen && <PhotoAnalysisModal onClose={()=>setPhotoOpen(false)} onItemsAdded={()=>{ loadInventory(); loadData() }}/>}
      <DashboardDock onManual={()=>setManualOpen(true)} onVoice={()=>setVoiceOpen(true)} onReceipt={()=>setReceiptOpen(true)} onPhoto={()=>setPhotoOpen(true)}/>

      {/* ── Detail Modals ── */}
      <SpendingDetailModal isOpen={activeModal==='spending'} onClose={()=>setActiveModal(null)} summary={summary} spending={spending}/>
      <PurchasesDetailModal isOpen={activeModal==='purchases'} onClose={()=>setActiveModal(null)} summary={summary}/>
      <FoodsDetailModal isOpen={activeModal==='foods'} onClose={()=>setActiveModal(null)} inventory={inventory} summary={summary}/>
      <WeekComparisonModal isOpen={activeModal==='week'} onClose={()=>setActiveModal(null)} summary={summary} spending={spending}/>

      <style>{`
        @keyframes leafFall {
          0%   { transform: translateY(-40px) rotate(0deg);   opacity: 0; }
          10%  { opacity: 0.18; }
          90%  { opacity: 0.12; }
          100% { transform: translateY(110vh) rotate(360deg); opacity: 0; }
        }
        @media (max-width: 640px) {
          .chart-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  )
}
