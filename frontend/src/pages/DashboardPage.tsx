import { useState, useEffect, useRef } from 'react'
import { DollarSign, ShoppingBag, Package, TrendingUp, Check, X, Plus, Mic, MicOff, Camera, Leaf } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { StatCard, Card } from '../components/ui/Card'
import { CardSkeleton, ListItemSkeleton } from '../components/ui/Skeleton'
import { EmptyState } from '../components/ui/EmptyState'
import { Modal } from '../components/ui/Modal'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../components/ui/Toast'
import { dashboardApi, inventoryApi, purchasesApi } from '../lib/api'
import type { SpendingByDate, DashboardSummary, PurchaseItemCreate } from '../types'

const UNITS = ['unidad', 'kg', 'g', 'L', 'ml', 'docena', 'caja', 'bolsa', 'lata', 'paquete']

// ── Chart tooltip ──────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '8px 12px', boxShadow: 'var(--shadow)' }}>
      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--primary)', fontFamily: 'Space Grotesk' }}>${payload[0].value.toFixed(2)}</div>
    </div>
  )
}

// ── Manual add modal ───────────────────────────────────────
function ManualModal({ isOpen, onClose, onSaved }: { isOpen: boolean; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast()
  const [foodName, setFoodName] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [unit, setUnit] = useState('unidad')
  const [loading, setLoading] = useState(false)

  const save = async () => {
    if (!foodName.trim()) { toast('Escribe el nombre del alimento', 'error'); return }
    setLoading(true)
    try {
      await inventoryApi.create({ food_name: foodName, quantity: parseFloat(quantity) || 1, unit })
      toast('✅ Alimento agregado al inventario')
      setFoodName(''); setQuantity('1'); setUnit('unidad')
      onSaved(); onClose()
    } catch { toast('Error al agregar', 'error') }
    finally { setLoading(false) }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Agregar alimento" size="sm">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <Input label="Nombre del alimento" placeholder="Ej: Manzanas, Arroz, Leche..." value={foodName} onChange={e => setFoodName(e.target.value)} autoFocus icon={<Leaf size={15} />} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <Input type="number" label="Cantidad" placeholder="1" min="0" step="0.1" value={quantity} onChange={e => setQuantity(e.target.value)} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>Unidad</label>
            <select value={unit} onChange={e => setUnit(e.target.value)} style={{ height: '42px', padding: '0 14px', background: 'var(--surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', fontSize: '14px' }}>
              {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '4px' }}>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button loading={loading} icon={<Check size={15} />} onClick={save}>Guardar</Button>
        </div>
      </div>
    </Modal>
  )
}

// ── Voice modal ────────────────────────────────────────────
function VoiceModal({ isOpen, onClose, onSaved }: { isOpen: boolean; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast()
  const [recording, setRecording] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [preview, setPreview] = useState<PurchaseItemCreate[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  const startRec = () => {
    const SpeechRecognitionAPI = (
      (window as unknown as Record<string, unknown>).SpeechRecognition ||
      (window as unknown as Record<string, unknown>).webkitSpeechRecognition
    ) as SpeechRecognitionConstructor | undefined

    if (!SpeechRecognitionAPI) {
      toast('Usa Chrome para reconocimiento de voz', 'error'); return
    }
    navigator.mediaDevices?.getUserMedia({ audio: true })
      .then(() => {
        const r = new SpeechRecognitionAPI()
        r.lang = 'es-ES'; r.continuous = true; r.interimResults = true
        r.onresult = (e: SpeechRecognitionEvent) => {
          setTranscript(Array.from(e.results).map(r => r[0].transcript).join(' '))
        }
        r.onerror = () => { setRecording(false); toast('Error en el micrófono', 'error') }
        r.onend = () => setRecording(false)
        r.start()
        recognitionRef.current = r
        setRecording(true)
      })
      .catch(() => toast('Permiso de micrófono denegado. Habilítalo en Chrome.', 'error'))
  }

  const stopRec = () => { recognitionRef.current?.stop(); setRecording(false) }

  const parse = async () => {
    if (!transcript.trim()) { toast('Di o escribe algo primero', 'error'); return }
    setLoading(true)
    try {
      const res = await purchasesApi.parseVoice(transcript)
      setPreview(res.items)
    } catch { toast('Error al procesar con IA', 'error') }
    finally { setLoading(false) }
  }

  const save = async () => {
    setSaving(true)
    try {
      await purchasesApi.create({ source: 'voice', items: preview })
      toast('✅ Compra registrada por voz')
      setTranscript(''); setPreview([])
      onSaved(); onClose()
    } catch { toast('Error al guardar', 'error') }
    finally { setSaving(false) }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Agregar por voz">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '16px 0' }}>
          <button
            onClick={recording ? stopRec : startRec}
            style={{
              width: '80px', height: '80px', borderRadius: '50%',
              background: recording ? 'var(--danger-dim)' : 'var(--primary-dim)',
              border: `2px solid ${recording ? 'var(--danger)' : 'var(--primary)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: recording ? 'var(--danger)' : 'var(--primary)',
              cursor: 'pointer', transition: 'all var(--transition)',
              animation: recording ? 'pulse 1.5s ease infinite' : 'none',
            }}
          >
            {recording ? <MicOff size={28} /> : <Mic size={28} />}
          </button>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'center' }}>
            {recording ? '🔴 Grabando... toca para detener' : 'Toca para grabar'}
          </p>
        </div>

        <Input
          label="O escribe directamente"
          placeholder="Ej: compré 2 kilos de arroz y una docena de huevos..."
          value={transcript}
          onChange={e => setTranscript(e.target.value)}
        />

        {transcript && !preview.length && (
          <Button loading={loading} onClick={parse} fullWidth>Analizar con IA</Button>
        )}

        {preview.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>Alimentos detectados:</p>
            {preview.map((it, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--primary-dim)' }}>
                <span style={{ fontSize: '16px' }}>🌿</span>
                <span style={{ flex: 1, fontSize: '14px' }}>{it.food_name}</span>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontFamily: 'IBM Plex Mono' }}>{it.quantity} {it.unit}</span>
              </div>
            ))}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <Button variant="ghost" onClick={() => { setPreview([]); setTranscript('') }}>Reintentar</Button>
              <Button loading={saving} icon={<Check size={15} />} onClick={save}>Confirmar y guardar</Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

// ── Receipt modal ──────────────────────────────────────────
function ReceiptModal({ isOpen, onClose, onSaved }: { isOpen: boolean; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<PurchaseItemCreate[]>([])
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const processFile = async (file: File) => {
    setLoading(true)
    try {
      const res = await purchasesApi.parseReceipt(file)
      setPreview(res.items)
      setReceiptUrl(res.receipt_image_url ?? null)
    } catch { toast('Error al procesar la imagen', 'error') }
    finally { setLoading(false) }
  }

  const save = async () => {
    setSaving(true)
    try {
      await purchasesApi.create({ source: 'receipt', items: preview, receipt_image_url: receiptUrl })
      toast('✅ Compra registrada desde factura')
      setPreview([]); setReceiptUrl(null)
      onSaved(); onClose()
    } catch { toast('Error al guardar', 'error') }
    finally { setSaving(false) }
  }

  const handleClick = () => {
    fileRef.current?.click()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Agregar con foto de factura">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {!preview.length && (
          <>
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) processFile(f) }}
              style={{
                border: `2px dashed ${dragOver ? 'var(--primary)' : 'var(--border-subtle)'}`,
                borderRadius: 'var(--radius-lg)',
                padding: '40px 20px',
                textAlign: 'center',
                background: dragOver ? 'var(--primary-dim)' : 'transparent',
                transition: 'all var(--transition)',
              }}
            >
              {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '32px', height: '32px', border: '2px solid var(--border-subtle)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Analizando con IA...</p>
                </div>
              ) : (
                <>
                  <Camera size={32} style={{ color: 'var(--text-muted)', margin: '0 auto 12px' }} />
                  <p style={{ fontSize: '14px', fontWeight: 500, marginBottom: '6px' }}>Arrastra tu factura aquí</p>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>JPG, PNG o PDF</p>
                </>
              )}
            </div>
            {!loading && (
              <Button variant="outline" icon={<Camera size={15} />} onClick={handleClick} fullWidth>
                Seleccionar imagen
              </Button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*,.pdf"
              style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f) }}
            />
          </>
        )}

        {preview.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>
              Alimentos detectados ({preview.length}):
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '240px', overflowY: 'auto' }}>
              {preview.map((it, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--warning-dim)' }}>
                  <span style={{ fontSize: '16px' }}>📦</span>
                  <span style={{ flex: 1, fontSize: '14px' }}>{it.food_name}</span>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontFamily: 'IBM Plex Mono' }}>{it.quantity} {it.unit}</span>
                  {it.price > 0 && <span style={{ fontSize: '13px', color: 'var(--warning)' }}>${it.price.toFixed(2)}</span>}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)' }}>
              <Button variant="ghost" onClick={() => setPreview([])}>Reintentar</Button>
              <Button loading={saving} icon={<Check size={15} />} onClick={save}>Confirmar y guardar</Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

// ── Mini floating dock for dashboard ──────────────────────
function DashboardDock({ onManual, onVoice, onReceipt }: { onManual: () => void; onVoice: () => void; onReceipt: () => void }) {
  const [open, setOpen] = useState(false)

  const actions = [
    { icon: <Leaf size={17} />, label: 'Agregar manualmente', onClick: onManual, color: '#3ED598' },
    { icon: <Mic size={17} />, label: 'Agregar por voz', onClick: onVoice, color: '#6495ED' },
    { icon: <Camera size={17} />, label: 'Agregar con foto', onClick: onReceipt, color: '#F5B841' },
  ]

  return (
    <div style={{ position: 'fixed', bottom: '28px', right: '28px', zIndex: 50, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px' }}>
      {open && actions.map((a, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', animation: `dockExpand 0.2s ease ${i * 0.05}s both` }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '5px 12px', fontSize: '13px', fontWeight: 500, whiteSpace: 'nowrap', boxShadow: 'var(--shadow)' }}>
            {a.label}
          </div>
          <button
            onClick={() => { a.onClick(); setOpen(false) }}
            style={{ width: '46px', height: '46px', borderRadius: '50%', background: `${a.color}18`, border: `1px solid ${a.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: a.color, cursor: 'pointer', transition: 'all var(--transition)', boxShadow: `0 4px 16px ${a.color}25`, flexShrink: 0 }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.background = `${a.color}28` }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.background = `${a.color}18` }}
          >
            {a.icon}
          </button>
        </div>
      ))}
      <button
        onClick={() => setOpen(p => !p)}
        style={{ width: '56px', height: '56px', borderRadius: '50%', background: open ? 'var(--surface)' : 'var(--primary)', border: open ? '1px solid var(--border-subtle)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: open ? 'var(--text-secondary)' : '#0B0F0E', cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.34,1.56,0.64,1)', boxShadow: open ? 'var(--shadow)' : '0 4px 24px rgba(62,213,152,0.4)', transform: open ? 'rotate(45deg)' : 'rotate(0)' }}
        onMouseEnter={e => { if (!open) { e.currentTarget.style.background = 'var(--primary-hover)'; e.currentTarget.style.transform = 'scale(1.05)' } }}
        onMouseLeave={e => { if (!open) { e.currentTarget.style.background = 'var(--primary)'; e.currentTarget.style.transform = '' } }}
      >
        {open ? <X size={22} /> : <Plus size={22} />}
      </button>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────
export function DashboardPage() {
  const { user } = useAuth()
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [spending, setSpending] = useState<SpendingByDate[]>([])
  const [loading, setLoading] = useState(true)
  const [manualOpen, setManualOpen] = useState(false)
  const [voiceOpen, setVoiceOpen] = useState(false)
  const [receiptOpen, setReceiptOpen] = useState(false)

  const loadData = () =>
    Promise.all([dashboardApi.summary(), dashboardApi.spending()])
      .then(([sum, spend]) => { setSummary(sum); setSpending(spend) })
      .catch(console.error)
      .finally(() => setLoading(false))

  useEffect(() => { loadData() }, [])

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Buenos días'
    if (h < 18) return 'Buenas tardes'
    return 'Buenas noches'
  }

  const chartData = spending.map(s => ({
    date: format(new Date(s.date + 'T00:00:00'), 'dd MMM', { locale: es }),
    total: s.total,
  }))

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.4s ease' }}>
        {/* Greeting */}
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '4px' }}>
            {greeting()}, {user?.name?.split(' ')[0]} 👋
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            {format(new Date(), "EEEE d 'de' MMMM", { locale: es })}
          </p>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
          {loading ? Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />) : (
            <>
              <StatCard label="Total gastado" value={`$${(summary?.total_spent ?? 0).toFixed(2)}`} icon={<DollarSign size={18} />} accent="var(--primary)" />
              <StatCard label="Compras realizadas" value={summary?.purchases_count ?? 0} icon={<ShoppingBag size={18} />} accent="var(--warning)" />
              <StatCard label="Alimentos distintos" value={summary?.distinct_foods ?? 0} icon={<Package size={18} />} accent="#6495ED" />
              <StatCard label="Promedio por compra" value={summary && summary.purchases_count > 0 ? `$${(summary.total_spent / summary.purchases_count).toFixed(2)}` : '$0.00'} icon={<TrendingUp size={18} />} accent="var(--danger)" />
            </>
          )}
        </div>

        {/* Chart + Top foods */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: '16px' }}>
          <Card>
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 600, letterSpacing: '-0.02em', marginBottom: '2px' }}>Gasto por día</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Historial de compras</p>
            </div>
            {loading ? (
              <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: '24px', height: '24px', border: '2px solid var(--border-subtle)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              </div>
            ) : chartData.length === 0 ? (
              <EmptyState icon={<TrendingUp size={24} />} title="Sin datos aún" description="Registra tu primera compra para ver el gráfico." />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3ED598" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#3ED598" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="total" stroke="#3ED598" strokeWidth={2} fill="url(#areaGrad)" dot={false} activeDot={{ r: 4, fill: '#3ED598', stroke: 'var(--bg)', strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </Card>

          <Card>
            <h3 style={{ fontSize: '15px', fontWeight: 600, letterSpacing: '-0.02em', marginBottom: '4px' }}>Top alimentos</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>Más comprados</p>
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {Array.from({ length: 4 }).map((_, i) => <ListItemSkeleton key={i} />)}
              </div>
            ) : !summary?.top_foods?.length ? (
              <EmptyState icon="🥗" title="Sin datos" description="Registra compras para ver tus alimentos más frecuentes." />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {summary.top_foods.slice(0, 6).map((food, i) => {
                  const maxQty = summary.top_foods[0]?.quantity ?? 1
                  const pct = (food.quantity / maxQty) * 100
                  return (
                    <div key={food.food_name}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 500, color: i === 0 ? 'var(--text)' : 'var(--text-secondary)' }}>{food.food_name}</span>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'IBM Plex Mono' }}>{food.quantity} {food.unit}</span>
                      </div>
                      <div style={{ height: '4px', background: 'var(--surface-2)', borderRadius: '100px', overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: i === 0 ? 'var(--primary)' : 'var(--border)', borderRadius: '100px', transition: 'width 0.6s ease' }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Modals */}
      <ManualModal isOpen={manualOpen} onClose={() => setManualOpen(false)} onSaved={loadData} />
      <VoiceModal isOpen={voiceOpen} onClose={() => setVoiceOpen(false)} onSaved={loadData} />
      <ReceiptModal isOpen={receiptOpen} onClose={() => setReceiptOpen(false)} onSaved={loadData} />

      {/* Floating dock */}
      <DashboardDock
        onManual={() => setManualOpen(true)}
        onVoice={() => setVoiceOpen(true)}
        onReceipt={() => setReceiptOpen(true)}
      />
    </>
  )
}
