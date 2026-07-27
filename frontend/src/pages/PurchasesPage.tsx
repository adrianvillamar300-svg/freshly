import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { ShoppingBag, Trash2, ChevronDown, ChevronUp, Plus, Mic, MicOff, Camera, X, Check } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { EmptyState } from '../components/ui/EmptyState'
import { ListItemSkeleton } from '../components/ui/Skeleton'
import { SourceBadge } from '../components/ui/Badge'
import { FreshlyDock } from '../components/layout/FloatingDock'
import { useToast } from '../components/ui/Toast'
import { purchasesApi } from '../lib/api'
import { getFoodEmoji } from '../lib/foodEmoji'
import type { Purchase, PurchaseItemCreate } from '../types'

const UNITS = ['unidad', 'kg', 'g', 'L', 'ml', 'docena', 'caja', 'bolsa', 'lata', 'paquete']

// ── Manual add modal ──────────────────────────────────────
function ManualModal({ isOpen, onClose, onSaved }: { isOpen: boolean; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast()
  const [items, setItems] = useState<PurchaseItemCreate[]>([{ food_name: '', quantity: 1, unit: 'unidad', price: 0 }])
  const [loading, setLoading] = useState(false)

  const addRow = () => setItems(prev => [...prev, { food_name: '', quantity: 1, unit: 'unidad', price: 0 }])
  const removeRow = (i: number) => setItems(prev => prev.filter((_, idx) => idx !== i))
  const update = (i: number, key: keyof PurchaseItemCreate, value: string | number) =>
    setItems(prev => prev.map((it, idx) => idx === i ? { ...it, [key]: value } : it))

  const save = async () => {
    const valid = items.filter(it => it.food_name.trim())
    if (!valid.length) { toast('Agrega al menos un alimento', 'error'); return }
    setLoading(true)
    try {
      await purchasesApi.create({ source: 'manual', items: valid })
      toast('Compra registrada correctamente')
      onSaved()
      onClose()
      setItems([{ food_name: '', quantity: 1, unit: 'unidad', price: 0 }])
    } catch { toast('Error al guardar la compra', 'error') }
    finally { setLoading(false) }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Registrar compra manual" size="lg">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {items.map((item, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: '8px', alignItems: 'end' }}>
              <Input
                label={i === 0 ? 'Alimento' : undefined}
                placeholder="Nombre"
                value={item.food_name}
                onChange={e => update(i, 'food_name', e.target.value)}
              />
              <Input
                label={i === 0 ? 'Cantidad' : undefined}
                type="number"
                placeholder="1"
                min="0"
                step="0.1"
                value={item.quantity}
                onChange={e => update(i, 'quantity', parseFloat(e.target.value) || 0)}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {i === 0 && <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>Unidad</label>}
                <select
                  value={item.unit}
                  onChange={e => update(i, 'unit', e.target.value)}
                  style={{ height: '42px', padding: '0 8px', background: 'var(--surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', fontSize: '14px' }}
                >
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <Input
                label={i === 0 ? 'Precio' : undefined}
                type="number"
                placeholder="0.00"
                min="0"
                step="0.01"
                value={item.price}
                onChange={e => update(i, 'price', parseFloat(e.target.value) || 0)}
              />
              <button
                onClick={() => removeRow(i)}
                disabled={items.length === 1}
                style={{
                  width: '36px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)', cursor: 'pointer',
                  background: 'none', border: 'none', opacity: items.length === 1 ? 0.3 : 1,
                  marginTop: i === 0 ? '24px' : undefined,
                }}
                onMouseEnter={e => { if (items.length > 1) { e.currentTarget.style.color = 'var(--danger)'; e.currentTarget.style.background = 'var(--danger-dim)' } }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = '' }}
              >
                <X size={15} />
              </button>
            </div>
          ))}
        </div>

        <Button variant="ghost" size="sm" icon={<Plus size={14} />} onClick={addRow} style={{ alignSelf: 'flex-start' }}>
          Agregar fila
        </Button>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)' }}>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button loading={loading} icon={<Check size={15} />} onClick={save}>Guardar compra</Button>
        </div>
      </div>
    </Modal>
  )
}

// ── Voice modal ───────────────────────────────────────────
function VoiceModal({ isOpen, onClose, onSaved }: { isOpen: boolean; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast()
  const [recording, setRecording] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [preview, setPreview] = useState<PurchaseItemCreate[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const isRecordingRef = useRef(false)

  const SpeechRecognitionAPI = (
    (window as unknown as Record<string, unknown>).SpeechRecognition ||
    (window as unknown as Record<string, unknown>).webkitSpeechRecognition
  ) as SpeechRecognitionConstructor | undefined

  const createAndStart = () => {
    if (!SpeechRecognitionAPI) return

    const r = new SpeechRecognitionAPI()
    r.lang = navigator.language?.startsWith('es') ? navigator.language : 'es-ES'
    r.continuous = true
    r.interimResults = true

    r.onresult = (e: SpeechRecognitionEvent) => {
      const t = Array.from(e.results).map(r => r[0].transcript).join(' ')
      setTranscript(t)
    }

    r.onerror = (e: Event) => {
      const err = (e as unknown as { error: string }).error
      // aborted y no-speech no son errores reales — onend se encargará de reiniciar
      if (err === 'aborted' || err === 'no-speech') return
      if (err === 'not-allowed' || err === 'service-not-allowed') {
        toast('Permiso de micrófono denegado. Habilítalo en la configuración del navegador.', 'error')
      } else if (err === 'network') {
        toast('Error de red. Verifica tu conexión a internet.', 'error')
      } else if (err === 'audio-capture') {
        toast('No se detectó micrófono. Verifica que esté conectado y habilitado.', 'error')
      } else {
        toast(`Error de reconocimiento: ${err || 'desconocido'}`, 'error')
      }
      isRecordingRef.current = false
      setRecording(false)
    }

    r.onend = () => {
      // La API para sola tras silencio en móvil — crear instancia nueva y reiniciar
      if (isRecordingRef.current) {
        setTimeout(() => { if (isRecordingRef.current) createAndStart() }, 150)
      }
    }

    r.start()
    recognitionRef.current = r
  }

  const startRec = () => {
    if (!SpeechRecognitionAPI) {
      toast('Tu navegador no soporta reconocimiento de voz. Usa Chrome.', 'error')
      return
    }
    try {
      isRecordingRef.current = true
      setRecording(true)
      createAndStart()
    } catch {
      toast('No se pudo iniciar el micrófono. Intenta recargar la página.', 'error')
    }
  }

  const stopRec = () => {
    isRecordingRef.current = false
    recognitionRef.current?.stop()
    setRecording(false)
  }

  const parse = async () => {
    if (!transcript.trim()) { toast('Di algo primero', 'error'); return }
    setLoading(true)
    try {
      const res = await purchasesApi.parseVoice(transcript)
      setPreview(res.items)
    } catch { toast('Error al procesar el texto', 'error') }
    finally { setLoading(false) }
  }

  const save = async () => {
    setSaving(true)
    try {
      await purchasesApi.create({ source: 'voice', items: preview })
      toast('Compra registrada por voz')
      onSaved(); onClose()
      setTranscript(''); setPreview([])
    } catch { toast('Error al guardar', 'error') }
    finally { setSaving(false) }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Agregar por voz" size="md">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Mic button */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '20px 0' }}>
          <button
            onClick={recording ? stopRec : startRec}
            style={{
              width: '80px', height: '80px', borderRadius: '50%',
              background: recording ? 'var(--danger-dim)' : 'var(--primary-dim)',
              border: `2px solid ${recording ? 'var(--danger)' : 'var(--primary)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: recording ? 'var(--danger)' : 'var(--primary)',
              cursor: 'pointer', transition: 'all var(--transition)',
              boxShadow: recording ? '0 0 20px rgba(255,107,107,0.3)' : '0 0 20px rgba(62,213,152,0.2)',
              animation: recording ? 'pulse 1.5s ease infinite' : 'none',
            }}
          >
            {recording ? <MicOff size={28} /> : <Mic size={28} />}
          </button>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'center' }}>
            {recording ? '🔴 Grabando... toca para detener' : 'Toca para grabar'}
          </p>
        </div>

        {/* Transcript */}
        {transcript && (
          <div style={{
            padding: '14px',
            background: 'var(--surface-2)',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--border-subtle)',
            fontSize: '14px',
            color: 'var(--text)',
            lineHeight: 1.6,
          }}>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Texto reconocido
            </p>
            "{transcript}"
          </div>
        )}

        {/* Or type */}
        <Input
          label="O escribe directamente"
          placeholder="Ej: compré 2 kilos de arroz, una docena de huevos..."
          value={transcript}
          onChange={e => setTranscript(e.target.value)}
        />

        {transcript && !preview.length && (
          <Button loading={loading} onClick={parse} fullWidth>
            Analizar con IA
          </Button>
        )}

        {/* Preview */}
        {preview.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>
              Alimentos detectados:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {preview.map((it, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '10px 14px',
                  background: 'var(--surface-2)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--primary-dim)',
                }}>
                  <span style={{ fontSize: '16px' }}>{getFoodEmoji(it.food_name)}</span>
                  <span style={{ flex: 1, fontSize: '14px' }}>{it.food_name}</span>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontFamily: 'IBM Plex Mono' }}>
                    {it.quantity} {it.unit}
                  </span>
                  {it.price > 0 && <span style={{ fontSize: '13px', color: 'var(--primary)' }}>${it.price}</span>}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <Button variant="ghost" onClick={() => setPreview([])}>Reintentar</Button>
              <Button loading={saving} icon={<Check size={15} />} onClick={save}>Confirmar y guardar</Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

// ── Receipt modal ─────────────────────────────────────────
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
      toast('Compra registrada desde factura')
      onSaved(); onClose()
      setPreview([]); setReceiptUrl(null)
    } catch { toast('Error al guardar', 'error') }
    finally { setSaving(false) }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Agregar con foto" size="md">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {!preview.length && (
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) processFile(f) }}
            onClick={() => fileRef.current?.click()}
            style={{
              border: `2px dashed ${dragOver ? 'var(--primary)' : 'var(--border-subtle)'}`,
              borderRadius: 'var(--radius-lg)',
              padding: '40px',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all var(--transition)',
              background: dragOver ? 'var(--primary-dim)' : 'transparent',
            }}
          >
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '32px', height: '32px', border: '2px solid var(--border-subtle)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Analizando imagen con IA...</p>
              </div>
            ) : (
              <>
                <Camera size={32} style={{ color: 'var(--text-muted)', margin: '0 auto 12px' }} />
                <p style={{ fontSize: '15px', fontWeight: 500, marginBottom: '6px' }}>Sube tu factura</p>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Arrastra una imagen o PDF, o toca para seleccionar
                </p>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
                  JPG, PNG, WEBP o PDF · Máx. 10MB
                </p>
              </>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*,.pdf"
              style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f) }}
            />
          </div>
        )}

        {preview.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>Alimentos detectados:</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {preview.map((it, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '10px 14px',
                  background: 'var(--surface-2)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--warning-dim)',
                }}>
                  <span style={{ fontSize: '16px' }}>{getFoodEmoji(it.food_name)}</span>
                  <span style={{ flex: 1, fontSize: '14px' }}>{it.food_name}</span>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontFamily: 'IBM Plex Mono' }}>
                    {it.quantity} {it.unit}
                  </span>
                  {it.price > 0 && <span style={{ fontSize: '13px', color: 'var(--warning)' }}>${it.price.toFixed(2)}</span>}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <Button variant="ghost" onClick={() => setPreview([])}>Reintentar</Button>
              <Button loading={saving} icon={<Check size={15} />} onClick={save}>Confirmar y guardar</Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

// ── Purchase card ─────────────────────────────────────────
function PurchaseCard({ purchase, onDelete }: { purchase: Purchase; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <Card style={{ overflow: 'hidden' }}>
      <div
        onClick={() => setExpanded(prev => !prev)}
        style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
      >
        <div style={{
          width: '40px', height: '40px',
          background: 'var(--surface-2)',
          borderRadius: 'var(--radius-sm)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <ShoppingBag size={18} style={{ color: 'var(--text-secondary)' }} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '14px', fontWeight: 500 }}>
              {format(new Date(purchase.purchase_date), "d 'de' MMMM yyyy", { locale: es })}
            </span>
            <SourceBadge source={purchase.source} />
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            {purchase.items.length} {purchase.items.length === 1 ? 'producto' : 'productos'}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--primary)', fontFamily: 'Space Grotesk' }}>
            ${purchase.total_amount.toFixed(2)}
          </span>
          {expanded ? <ChevronUp size={16} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} />}
        </div>
      </div>

      {/* Expanded items */}
      {expanded && (
        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)', animation: 'fadeIn 0.2s ease' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
            {purchase.items.map(item => (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', padding: '6px 0' }}>
                <span style={{ color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>{getFoodEmoji(item.food_name)}</span> {item.food_name}
                </span>
                <div style={{ display: 'flex', gap: '16px', color: 'var(--text-secondary)' }}>
                  <span style={{ fontFamily: 'IBM Plex Mono' }}>{item.quantity} {item.unit}</span>
                  {item.price > 0 && <span style={{ color: 'var(--text)' }}>${item.price.toFixed(2)}</span>}
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={onDelete}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              fontSize: '12px', color: 'var(--danger)',
              padding: '6px 10px', borderRadius: 'var(--radius-sm)',
              background: 'var(--danger-dim)', border: 'none', cursor: 'pointer',
              transition: 'all var(--transition)',
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            <Trash2 size={13} /> Eliminar compra
          </button>
        </div>
      )}
    </Card>
  )
}

// ── Main page ─────────────────────────────────────────────
export function PurchasesPage() {
  const { toast } = useToast()
  const location = useLocation()
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(true)
  const [manualOpen, setManualOpen] = useState(false)
  const [voiceOpen, setVoiceOpen] = useState(false)
  const [receiptOpen, setReceiptOpen] = useState(false)

  const load = () =>
    purchasesApi.list().then(setPurchases).catch(console.error).finally(() => setLoading(false))

  useEffect(() => { load() }, [])

  // Auto-open modal when navigating from another page with ?action=
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const action = params.get('action')
    if (action === 'voice') setVoiceOpen(true)
    if (action === 'receipt') setReceiptOpen(true)
    if (action === 'manual') setManualOpen(true)
  }, [location.search])

  const handleDelete = async (id: string) => {
    try {
      await purchasesApi.delete(id)
      setPurchases(prev => prev.filter(p => p.id !== id))
      toast('Compra eliminada')
    } catch { toast('Error al eliminar', 'error') }
  }

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeIn 0.4s ease' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '2px' }}>
              Historial de compras
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              {purchases.length} compras registradas
            </p>
          </div>
          <Button onClick={() => setManualOpen(true)} icon={<Plus size={15} />} size="sm">
            Nueva compra
          </Button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <ListItemSkeleton key={i} />)
          ) : purchases.length === 0 ? (
            <EmptyState
              icon={<ShoppingBag size={28} />}
              title="Sin compras"
              description="Registra tu primera compra manualmente, por voz o subiendo la foto de tu factura."
              action={{ label: 'Registrar primera compra', onClick: () => setManualOpen(true) }}
            />
          ) : (
            purchases.map(p => (
              <PurchaseCard key={p.id} purchase={p} onDelete={() => handleDelete(p.id)} />
            ))
          )}
        </div>
      </div>

      <ManualModal isOpen={manualOpen} onClose={() => setManualOpen(false)} onSaved={load} />
      <VoiceModal isOpen={voiceOpen} onClose={() => setVoiceOpen(false)} onSaved={load} />
      <ReceiptModal isOpen={receiptOpen} onClose={() => setReceiptOpen(false)} onSaved={load} />

      <FreshlyDock
        onManual={() => setManualOpen(true)}
        onVoice={() => setVoiceOpen(true)}
        onReceipt={() => setReceiptOpen(true)}
      />
    </>
  )
}
