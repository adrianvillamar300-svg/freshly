import { useState, useEffect, useRef } from 'react'
import { DollarSign, ShoppingBag, Package, TrendingUp, TrendingDown, AlertTriangle, Check, X, Plus, Mic, MicOff, Camera, Leaf, BarChart2, Activity } from 'lucide-react'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { format } from 'date-fns'
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
import type { SpendingByDate, DashboardSummary, PurchaseItemCreate } from '../types'

const UNITS = ['unidad','kg','g','L','ml','docena','caja','bolsa','lata','paquete']
const LOCATIONS = [
  { value: 'refrigerator', label: '🧊 Refrigerador', days: 'Dura más' },
  { value: 'freezer', label: '❄️ Congelador', days: 'Mucho más' },
  { value: 'pantry', label: '🏠 Aire libre / despensa', days: 'Normal' },
  { value: 'cabinet', label: '🗄️ Armario', days: 'Seco' },
]

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{value:number}>; label?: string }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background:'var(--surface)', border:'1px solid var(--border-subtle)', borderRadius:'var(--radius-sm)', padding:'8px 14px', boxShadow:'var(--shadow)' }}>
      <div style={{ fontSize:'11px', color:'var(--text-secondary)', marginBottom:'4px' }}>{label}</div>
      <div style={{ fontSize:'16px', fontWeight:700, color:'var(--primary)', fontFamily:'Space Grotesk' }}>${payload[0].value.toFixed(2)}</div>
    </div>
  )
}

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
        <Input type="number" label="Precio (opcional)" placeholder="0.00" min="0" step="0.01" value={form.price} onChange={u('price')} icon={<DollarSign size={14}/>} />
        <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
          <label style={{ fontSize:'13px', fontWeight:500, color:'var(--text-secondary)' }}>¿Dónde lo vas a guardar?</label>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'6px' }}>
            {LOCATIONS.map(loc => (
              <button
                key={loc.value}
                onClick={() => setForm(p=>({...p, storage_location:loc.value}))}
                style={{
                  padding:'10px', borderRadius:'var(--radius-sm)', textAlign:'left',
                  background: form.storage_location===loc.value ? 'var(--primary-dim)' : 'var(--surface-2)',
                  border: `1px solid ${form.storage_location===loc.value ? 'var(--primary)' : 'var(--border-subtle)'}`,
                  cursor:'pointer', transition:'all var(--transition)',
                }}
              >
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
    const SR = ((window as unknown as Record<string,unknown>).SpeechRecognition || (window as unknown as Record<string,unknown>).webkitSpeechRecognition) as SpeechRecognitionConstructor|undefined
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

function DashboardDock({ onManual, onVoice, onReceipt }: { onManual:()=>void; onVoice:()=>void; onReceipt:()=>void }) {
  const [open, setOpen] = useState(false)
  const actions = [
    { icon:<Leaf size={17}/>, label:'Agregar manualmente', onClick:onManual, color:'#3ED598' },
    { icon:<Mic size={17}/>, label:'Agregar por voz', onClick:onVoice, color:'#6495ED' },
    { icon:<Camera size={17}/>, label:'Agregar con foto', onClick:onReceipt, color:'#F5B841' },
  ]
  return (
    <div style={{ position:'fixed', bottom:'28px', right:'28px', zIndex:50, display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'10px' }}>
      {open && actions.map((a,i)=>(
        <div key={i} style={{ display:'flex', alignItems:'center', gap:'10px', animation:`dockExpand 0.2s ease ${i*0.05}s both` }}>
          <div style={{ background:'var(--surface)', border:'1px solid var(--border-subtle)', borderRadius:'var(--radius-sm)', padding:'5px 12px', fontSize:'13px', fontWeight:500, whiteSpace:'nowrap', boxShadow:'var(--shadow)' }}>{a.label}</div>
          <button onClick={()=>{a.onClick();setOpen(false)}} style={{ width:'46px', height:'46px', borderRadius:'50%', background:`${a.color}18`, border:`1px solid ${a.color}30`, display:'flex', alignItems:'center', justifyContent:'center', color:a.color, cursor:'pointer', transition:'all var(--transition)', flexShrink:0 }}
            onMouseEnter={e=>{e.currentTarget.style.transform='scale(1.1)';e.currentTarget.style.background=`${a.color}28`}}
            onMouseLeave={e=>{e.currentTarget.style.transform='';e.currentTarget.style.background=`${a.color}18`}}
          >{a.icon}</button>
        </div>
      ))}
      <button onClick={()=>setOpen(p=>!p)} style={{ width:'56px', height:'56px', borderRadius:'50%', background:open?'var(--surface)':'var(--primary)', border:open?'1px solid var(--border-subtle)':'none', display:'flex', alignItems:'center', justifyContent:'center', color:open?'var(--text-secondary)':'#0B0F0E', cursor:'pointer', transition:'all 0.3s cubic-bezier(0.34,1.56,0.64,1)', boxShadow:open?'var(--shadow)':'0 4px 24px rgba(62,213,152,0.45)', transform:open?'rotate(45deg)':'' }}
        onMouseEnter={e=>{if(!open){e.currentTarget.style.transform='scale(1.06) rotate(0)';e.currentTarget.style.boxShadow='0 6px 32px rgba(62,213,152,0.6)'}}}
        onMouseLeave={e=>{if(!open){e.currentTarget.style.transform='';e.currentTarget.style.boxShadow='0 4px 24px rgba(62,213,152,0.45)'}}}
      >
        <Plus size={22} style={{ transition:'transform 0.3s', transform:open?'rotate(45deg)':'' }}/>
      </button>
    </div>
  )
}

type ChartType = 'area' | 'bar'
type GroupBy = 'day' | 'month' | 'year'

export function DashboardPage() {
  const { user } = useAuth()
  const [summary, setSummary] = useState<DashboardSummary|null>(null)
  const [spending, setSpending] = useState<SpendingByDate[]>([])
  const [loading, setLoading] = useState(true)
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

  useEffect(() => { loadData() }, [groupBy])

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

  return (
    <>
      <div style={{ display:'flex', flexDirection:'column', gap:'20px', animation:'fadeIn 0.4s ease' }}>
        {/* Greeting */}
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:'12px' }}>
          <div>
            <h2 style={{ fontSize:'22px', fontWeight:700, letterSpacing:'-0.03em', marginBottom:'3px' }}>
              {greeting()}, {user?.name?.split(' ')[0]} 👋
            </h2>
            <p style={{ fontSize:'13px', color:'var(--text-secondary)' }}>
              {format(new Date(), "EEEE d 'de' MMMM", {locale:es})}
            </p>
          </div>
          {/* Expiring alert */}
          {summary && summary.expiring_soon.length > 0 && (
            <div style={{
              display:'flex', alignItems:'center', gap:'8px',
              padding:'8px 14px',
              background:'var(--warning-dim)', border:'1px solid rgba(245,184,65,0.25)',
              borderRadius:'var(--radius-sm)',
              fontSize:'13px', color:'var(--warning)',
              animation:'slideDown 0.3s ease',
            }}>
              <AlertTriangle size={14}/>
              <span>⚠️ {summary.expiring_soon.slice(0,2).join(', ')}{summary.expiring_soon.length>2?` y ${summary.expiring_soon.length-2} más`:''} próximos a caducar</span>
            </div>
          )}
        </div>

        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px, 1fr))', gap:'10px' }}>
          {loading ? Array.from({length:4}).map((_,i)=><CardSkeleton key={i}/>) : (<>
            <StatCard label="Total gastado" value={`$${(summary?.total_spent??0).toFixed(2)}`} icon={<DollarSign size={17}/>} accent="var(--primary)"/>
            <StatCard label="Compras" value={summary?.purchases_count??0} icon={<ShoppingBag size={17}/>} accent="var(--warning)"/>
            <StatCard label="Alimentos" value={summary?.distinct_foods??0} icon={<Package size={17}/>} accent="var(--info)"/>
            <div style={{
              background:'var(--surface)', border:'1px solid var(--border-subtle)',
              borderRadius:'var(--radius)', padding:'16px',
              position:'relative', overflow:'hidden',
              transition:'all var(--transition)',
            }}
              onMouseEnter={e=>e.currentTarget.style.borderColor='rgba(62,213,152,0.2)'}
              onMouseLeave={e=>e.currentTarget.style.borderColor='var(--border-subtle)'}
            >
              <div style={{ position:'absolute', top:0, right:0, width:'60px', height:'60px', background:`radial-gradient(circle, ${weekUp?'rgba(255,107,107,0.12)':'rgba(62,213,152,0.12)'} 0%, transparent 70%)` }}/>
              <div style={{ width:'32px', height:'32px', background:weekUp?'var(--danger-dim)':'var(--primary-dim)', borderRadius:'var(--radius-sm)', display:'flex', alignItems:'center', justifyContent:'center', color:weekUp?'var(--danger)':'var(--primary)', marginBottom:'10px' }}>
                {weekUp ? <TrendingUp size={16}/> : <TrendingDown size={16}/>}
              </div>
              <div style={{ fontSize:'22px', fontWeight:700, fontFamily:'Space Grotesk', letterSpacing:'-0.03em', color:weekUp?'var(--danger)':'var(--primary)' }}>
                {weekUp?'+':''}{weekPct.toFixed(1)}%
              </div>
              <div style={{ fontSize:'12px', color:'var(--text-secondary)', marginTop:'2px' }}>vs semana anterior</div>
              {wc && <div style={{ fontSize:'11px', color:'var(--text-muted)', marginTop:'4px', fontFamily:'IBM Plex Mono' }}>
                Esta sem: ${wc.current_week.toFixed(2)} · Ant: ${wc.previous_week.toFixed(2)}
              </div>}
            </div>
          </>)}
        </div>

        {/* Chart + Top foods */}
        <div style={{ display:'grid', gridTemplateColumns:'minmax(0,2fr) minmax(0,1fr)', gap:'12px' }}>
          <Card>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'16px', flexWrap:'wrap', gap:'8px' }}>
              <div>
                <h3 style={{ fontSize:'14px', fontWeight:600, letterSpacing:'-0.02em', marginBottom:'2px' }}>Gasto</h3>
                <p style={{ fontSize:'11px', color:'var(--text-secondary)' }}>Historial de compras</p>
              </div>
              <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
                {/* Group by */}
                {(['day','month','year'] as GroupBy[]).map(g=>(
                  <button key={g} onClick={()=>setGroupBy(g)} style={{
                    padding:'4px 10px', borderRadius:'100px', fontSize:'11px', fontWeight:500, cursor:'pointer',
                    background:groupBy===g?'var(--primary-dim)':'var(--surface-2)',
                    color:groupBy===g?'var(--primary)':'var(--text-secondary)',
                    border:`1px solid ${groupBy===g?'var(--border)':'var(--border-subtle)'}`,
                    transition:'all var(--transition)',
                  }}>
                    {g==='day'?'Día':g==='month'?'Mes':'Año'}
                  </button>
                ))}
                {/* Chart type */}
                <button onClick={()=>setChartType(p=>p==='area'?'bar':'area')} style={{ padding:'4px 8px', borderRadius:'100px', fontSize:'11px', cursor:'pointer', background:'var(--surface-2)', color:'var(--text-secondary)', border:'1px solid var(--border-subtle)', display:'flex', alignItems:'center', gap:'4px', transition:'all var(--transition)' }}
                  onMouseEnter={e=>{e.currentTarget.style.background='var(--surface-3)';e.currentTarget.style.color='var(--text)'}}
                  onMouseLeave={e=>{e.currentTarget.style.background='var(--surface-2)';e.currentTarget.style.color='var(--text-secondary)'}}>
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
                    <Bar dataKey="total" fill="var(--primary)" radius={[4,4,0,0]} opacity={0.85}
                      onMouseEnter={(_,i,e)=>{if(e?.target){(e.target as SVGElement).style.opacity='1'}}}
                      onMouseLeave={(_,i,e)=>{if(e?.target){(e.target as SVGElement).style.opacity='0.85'}}}
                    />
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

      <ManualModal isOpen={manualOpen} onClose={()=>setManualOpen(false)} onSaved={loadData}/>
      <VoiceModal isOpen={voiceOpen} onClose={()=>setVoiceOpen(false)} onSaved={loadData}/>
      <ReceiptModal isOpen={receiptOpen} onClose={()=>setReceiptOpen(false)} onSaved={loadData}/>

      <DashboardDock onManual={()=>setManualOpen(true)} onVoice={()=>setVoiceOpen(true)} onReceipt={()=>setReceiptOpen(true)}/>

      <style>{`@media(max-width:640px){.dashboard-chart-grid{grid-template-columns:1fr!important}}`}</style>
    </>
  )
}
