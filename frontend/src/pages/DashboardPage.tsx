import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { DollarSign, ShoppingBag, Package, TrendingUp, TrendingDown, AlertTriangle, Check, Plus, Mic, MicOff, Camera, Leaf, BarChart2, Activity, ChevronRight, Flame, Clock, Refrigerator, Archive } from 'lucide-react'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
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
  if (daysRemaining <= 2) return 'rgba(255,107,107,0.10)'
  if (daysRemaining <= 5) return 'rgba(245,184,65,0.10)'
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

// ── FAB Dock ───────────────────────────────────────────────
function DashboardDock({ onManual, onVoice, onReceipt }: { onManual:()=>void; onVoice:()=>void; onReceipt:()=>void }) {
  const [open, setOpen] = useState(false)
  const actions = [
    { icon:<Leaf size={17}/>, label:'Manual', onClick:onManual, color:'#3ED598' },
    { icon:<Mic size={17}/>, label:'Por voz', onClick:onVoice, color:'#6495ED' },
    { icon:<Camera size={17}/>, label:'Con foto', onClick:onReceipt, color:'#F5B841' },
  ]
  return (
    <div style={{ position:'fixed', bottom:'24px', right:'20px', zIndex:50, display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'10px' }}>
      {open && actions.map((a,i)=>(
        <div key={i} style={{ display:'flex', alignItems:'center', gap:'8px', animation:`dockExpand 0.2s ease ${i*0.05}s both` }}>
          <div style={{ background:'var(--surface)', border:'1px solid var(--border-subtle)', borderRadius:'var(--radius-sm)', padding:'5px 12px', fontSize:'13px', fontWeight:500, whiteSpace:'nowrap', boxShadow:'var(--shadow)' }}>{a.label}</div>
          <button onClick={()=>{a.onClick();setOpen(false)}} style={{ width:'44px', height:'44px', borderRadius:'50%', background:`${a.color}18`, border:`1px solid ${a.color}30`, display:'flex', alignItems:'center', justifyContent:'center', color:a.color, cursor:'pointer', flexShrink:0 }}>{a.icon}</button>
        </div>
      ))}
      <button onClick={()=>setOpen(p=>!p)} style={{ width:'54px', height:'54px', borderRadius:'50%', background:open?'var(--surface)':'var(--primary)', border:open?'1px solid var(--border-subtle)':'none', display:'flex', alignItems:'center', justifyContent:'center', color:open?'var(--text-secondary)':'#0B0F0E', cursor:'pointer', transition:'all 0.3s cubic-bezier(0.34,1.56,0.64,1)', boxShadow:open?'var(--shadow)':'0 4px 24px rgba(62,213,152,0.45)', transform:open?'rotate(45deg)':'' }}>
        <Plus size={22}/>
      </button>
    </div>
  )
}

// ── Inventory color grid ───────────────────────────────────
function InventoryGrid({ items, loading }: { items: InventoryItem[], loading: boolean }) {
  const navigate = useNavigate()
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
    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(140px, 1fr))', gap:'8px' }}>
      {sorted.map((item, i) => {
        const days = item.days_remaining
        const color = getExpiryColor(days)
        const bg = getExpiryBg(days)
        const urgent = days !== null && days !== undefined && days <= 5
        return (
          <div key={item.id} style={{
            background: `var(--surface)`,
            border: `1px solid ${urgent ? color + '40' : 'var(--border-subtle)'}`,
            borderRadius:'var(--radius)',
            padding:'12px',
            position:'relative',
            overflow:'hidden',
            animation:`countUp 0.3s ease ${Math.min(i, 12)*0.04}s both`,
            backgroundColor: bg || 'var(--surface)',
          }}>
            {urgent && (
              <div style={{ position:'absolute', top:0, left:0, right:0, height:'2px', background:`linear-gradient(90deg, ${color}, transparent)` }}/>
            )}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'6px' }}>
              <span style={{ fontSize:'16px' }}>{getStorageIcon(item.storage_location)}</span>
              {days !== null && days !== undefined && (
                <span style={{ fontSize:'11px', fontWeight:700, color, background:`${color}18`, padding:'2px 6px', borderRadius:'100px', fontFamily:'IBM Plex Mono' }}>
                  {getExpiryLabel(days)}
                </span>
              )}
            </div>
            <div style={{ fontSize:'13px', fontWeight:600, color:'var(--text)', marginBottom:'2px', lineHeight:1.2 }}>
              {item.food_name}
            </div>
            <div style={{ fontSize:'11px', color:'var(--text-muted)', fontFamily:'IBM Plex Mono' }}>
              {item.quantity} {item.unit}
            </div>
            {days !== null && days !== undefined && days <= 2 && (
              <div style={{ marginTop:'6px', fontSize:'10px', color, fontWeight:600 }}>
                {days <= 0 ? '⚠️ Consumir ya' : '🔥 Consumir pronto'}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Chart types ────────────────────────────────────────────
type ChartType = 'area' | 'bar'
type GroupBy = 'day' | 'month' | 'year'

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

  // Urgency counts
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

        {/* ── Stat cards ── */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(140px, 1fr))', gap:'10px' }}>
          {loading ? Array.from({length:4}).map((_,i)=><CardSkeleton key={i}/>) : (<>
            <StatCard label="Total gastado" value={`$${(summary?.total_spent??0).toFixed(2)}`} icon={<DollarSign size={17}/>} accent="var(--primary)"/>
            <StatCard label="Compras" value={summary?.purchases_count??0} icon={<ShoppingBag size={17}/>} accent="var(--warning)"/>
            <StatCard label="Alimentos" value={summary?.distinct_foods??0} icon={<Package size={17}/>} accent="var(--info)"/>
            <div style={{ background:'var(--surface)', border:'1px solid var(--border-subtle)', borderRadius:'var(--radius)', padding:'16px', position:'relative', overflow:'hidden' }}>
              <div style={{ position:'absolute', top:0, right:0, width:'60px', height:'60px', background:`radial-gradient(circle, ${weekUp?'rgba(255,107,107,0.12)':'rgba(62,213,152,0.12)'} 0%, transparent 70%)` }}/>
              <div style={{ width:'32px', height:'32px', background:weekUp?'var(--danger-dim)':'var(--primary-dim)', borderRadius:'var(--radius-sm)', display:'flex', alignItems:'center', justifyContent:'center', color:weekUp?'var(--danger)':'var(--primary)', marginBottom:'10px' }}>
                {weekUp ? <TrendingUp size={16}/> : <TrendingDown size={16}/>}
              </div>
              <div style={{ fontSize:'22px', fontWeight:700, fontFamily:'Space Grotesk', letterSpacing:'-0.03em', color:weekUp?'var(--danger)':'var(--primary)' }}>
                {weekUp?'+':''}{weekPct.toFixed(1)}%
              </div>
              <div style={{ fontSize:'12px', color:'var(--text-secondary)', marginTop:'2px' }}>vs semana anterior</div>
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
              <p style={{ fontSize:'11px', color:'var(--text-secondary)' }}>Ordenado por caducidad · código de colores</p>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:'10px', flexWrap:'wrap' }}>
              {/* Legend */}
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
          <InventoryGrid items={inventory.slice(0, 16)} loading={invLoading} />
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
      </div>

      <ManualModal isOpen={manualOpen} onClose={()=>setManualOpen(false)} onSaved={refreshAll}/>
      <VoiceModal isOpen={voiceOpen} onClose={()=>setVoiceOpen(false)} onSaved={refreshAll}/>
      <ReceiptModal isOpen={receiptOpen} onClose={()=>setReceiptOpen(false)} onSaved={refreshAll}/>
      <DashboardDock onManual={()=>setManualOpen(true)} onVoice={()=>setVoiceOpen(true)} onReceipt={()=>setReceiptOpen(true)}/>

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
