import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Package, Edit2, Trash2, Check, X, Minus, Plus, Camera, Upload, Loader } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { EmptyState } from '../components/ui/EmptyState'
import { ListItemSkeleton } from '../components/ui/Skeleton'
import { Badge } from '../components/ui/Badge'
import { FreshlyDock } from '../components/layout/FloatingDock'
import { useToast } from '../components/ui/Toast'
import { inventoryApi } from '../lib/api'
import { getFoodEmoji } from '../lib/foodEmoji'
import type { InventoryItem, InventoryItemCreate, NutritionInfo } from '../types'

const UNITS = ['unidad','kg','g','L','ml','docena','caja','bolsa','lata','paquete']
const LOCATIONS = [
  { value:'refrigerator', label:'🧊 Refrigerador', color:'#6495ED' },
  { value:'freezer', label:'❄️ Congelador', color:'#89CFF0' },
  { value:'pantry', label:'🏠 Despensa', color:'#3ED598' },
  { value:'cabinet', label:'🗄️ Armario', color:'#F5B841' },
]

function locationLabel(loc?: string|null) {
  return LOCATIONS.find(l=>l.value===loc)?.label ?? '🏠 Despensa'
}
function locationColor(loc?: string|null) {
  return LOCATIONS.find(l=>l.value===loc)?.color ?? 'var(--primary)'
}

function ExpiryBadge({ item }: { item: InventoryItem }) {
  const { days_remaining, expiry_status } = item
  if (days_remaining == null) return null

  const config = {
    expired:  { color:'#FFFFFF', bg:'var(--danger)',  border:'var(--danger)',  text: 'Caducado', icon:'⚠️' },
    critical: { color:'#FFFFFF', bg:'var(--danger)',  border:'var(--danger)',  text: `${days_remaining} día${days_remaining===1?'':'s'}`, icon:'⚠️' },
    warning:  { color:'#1A1400', bg:'var(--warning)', border:'var(--warning)', text: `${days_remaining} días`, icon:'⏳' },
    ok:       { color:'var(--primary)', bg:'var(--primary-dim)', border:'var(--primary)', text: `${days_remaining} días`, icon:'✓' },
  }[expiry_status ?? 'ok'] ?? { color:'var(--text)', bg:'var(--surface-2)', border:'var(--border-subtle)', text:`${days_remaining} días`, icon:'' }

  return (
    <div style={{
      display:'flex', alignItems:'center', gap:'5px',
      padding:'5px 11px',
      background: config.bg,
      border: `1.5px solid ${config.border}`,
      borderRadius:'100px',
      fontSize:'13px', fontWeight:700,
      color: config.color,
      whiteSpace:'nowrap',
      boxShadow: (expiry_status==='critical'||expiry_status==='expired') ? '0 0 12px rgba(255,107,107,0.35)' : undefined,
    }}>
      <span style={{ fontSize:'12px' }}>{config.icon}</span>
      {config.text}
    </div>
  )
}

function ItemForm({ initial, onSave, onCancel, loading }: {
  initial?: { food_name:string; quantity:string; unit:string; storage_location:string; expiry_days:string }
  onSave:(d:{ food_name:string; quantity:string; unit:string; storage_location:string; expiry_days:string })=>void
  onCancel:()=>void; loading:boolean
}) {
  const [form, setForm] = useState(initial ?? { food_name:'', quantity:'1', unit:'unidad', storage_location:'pantry', expiry_days:'' })
  const u = (k:string) => (e:React.ChangeEvent<HTMLInputElement|HTMLSelectElement>) => setForm(p=>({...p,[k]:e.target.value}))

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
      <Input label="Alimento" placeholder="Ej: Manzanas" value={form.food_name} onChange={u('food_name')} autoFocus />
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
        <Input type="number" label="Cantidad" placeholder="0" min="0" step="0.1" value={form.quantity} onChange={u('quantity')} />
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
          {LOCATIONS.map(loc=>(
            <button key={loc.value} onClick={()=>setForm(p=>({...p,storage_location:loc.value}))} style={{
              padding:'9px 12px', borderRadius:'var(--radius-sm)', textAlign:'left',
              background:form.storage_location===loc.value?`${loc.color}15`:'var(--surface-2)',
              border:`1px solid ${form.storage_location===loc.value?loc.color:'var(--border-subtle)'}`,
              cursor:'pointer', transition:'all var(--transition)', fontSize:'13px',
              color:form.storage_location===loc.value?loc.color:'var(--text-secondary)',
              fontWeight:form.storage_location===loc.value?600:400,
            }}>
              {loc.label}
            </button>
          ))}
        </div>
      </div>

      <Input type="number" label="Días de duración (opcional)" placeholder="Se calcula automáticamente" min="1" value={form.expiry_days} onChange={u('expiry_days')} hint="Déjalo vacío para que Freshly lo calcule según el alimento" />

      <div style={{ display:'flex', gap:'10px', justifyContent:'flex-end', marginTop:'4px' }}>
        <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
        <Button loading={loading} icon={<Check size={15}/>} onClick={()=>onSave(form)}>Guardar</Button>
      </div>
    </div>
  )
}

function ConsumeModal({ item, onClose, onDone }: { item:InventoryItem; onClose:()=>void; onDone:(updated:InventoryItem|null)=>void }) {
  const { toast } = useToast()
  const [amount, setAmount] = useState(1)
  const [loading, setLoading] = useState(false)

  const consume = async () => {
    setLoading(true)
    try {
      const updated = await inventoryApi.consume(item.id, amount)
      toast(`✅ Consumiste ${amount} ${item.unit} de ${item.food_name}`)
      onDone(updated.quantity === 0 ? null : updated)
      onClose()
    } catch { toast('Error al consumir','error') } finally { setLoading(false) }
  }

  return (
    <Modal isOpen onClose={onClose} title={`Consumir — ${item.food_name}`} size="sm">
      <div style={{ display:'flex', flexDirection:'column', gap:'20px' }}>
        <div style={{ textAlign:'center', padding:'16px 0' }}>
          <p style={{ fontSize:'13px', color:'var(--text-secondary)', marginBottom:'16px' }}>
            Tienes <strong style={{ color:'var(--text)' }}>{item.quantity} {item.unit}</strong> disponibles
          </p>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'16px' }}>
            <button onClick={()=>setAmount(a=>Math.max(0.5,+(a-0.5).toFixed(1)))} style={{ width:'40px', height:'40px', borderRadius:'50%', background:'var(--surface-2)', border:'1px solid var(--border-subtle)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'var(--text)', transition:'all var(--transition)' }}
              onMouseEnter={e=>e.currentTarget.style.background='var(--surface-3)'}
              onMouseLeave={e=>e.currentTarget.style.background='var(--surface-2)'}
            ><Minus size={16}/></button>
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:'32px', fontWeight:700, fontFamily:'Space Grotesk', color:'var(--primary)', letterSpacing:'-0.03em' }}>{amount}</div>
              <div style={{ fontSize:'12px', color:'var(--text-secondary)' }}>{item.unit}</div>
            </div>
            <button onClick={()=>setAmount(a=>Math.min(item.quantity, +(a+0.5).toFixed(1)))} style={{ width:'40px', height:'40px', borderRadius:'50%', background:'var(--surface-2)', border:'1px solid var(--border-subtle)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'var(--text)', transition:'all var(--transition)' }}
              onMouseEnter={e=>e.currentTarget.style.background='var(--surface-3)'}
              onMouseLeave={e=>e.currentTarget.style.background='var(--surface-2)'}
            ><Plus size={16}/></button>
          </div>
          {amount >= item.quantity && (
            <p style={{ fontSize:'12px', color:'var(--warning)', marginTop:'10px' }}>⚠️ Esto eliminará el alimento del inventario</p>
          )}
        </div>
        <div style={{ display:'flex', gap:'10px', justifyContent:'flex-end' }}>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button loading={loading} onClick={consume}>Registrar consumo</Button>
        </div>
      </div>
    </Modal>
  )
}

// ── Photo Analysis Modal ─────────────────────────────────────────────────────

type DetectedItem = { food_name: string; quantity: number; unit: string; storage_location: string }

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
    setPreview(url)
    setDetected(null)
    setAnalyzing(true)
    try {
      const result = await inventoryApi.analyzePhoto(file)
      const items: DetectedItem[] = result.items.map(i => ({ ...i, storage_location: 'pantry' }))
      setDetected(items)
    } catch (err: any) {
      const msg = err?.response?.data?.detail ?? 'Error al analizar la foto'
      toast(msg, 'error')
      setPreview(null)
    } finally {
      setAnalyzing(false)
    }
  }

  const updateItem = (idx: number, field: keyof DetectedItem, value: string | number) => {
    setDetected(prev => prev ? prev.map((it, i) => i === idx ? { ...it, [field]: value } : it) : prev)
  }

  const removeItem = (idx: number) => {
    setDetected(prev => prev ? prev.filter((_, i) => i !== idx) : prev)
  }

  const handleSave = async () => {
    if (!detected || detected.length === 0) return
    setSaving(true)
    try {
      const added: DetectedItem[] = []
      for (const item of detected) {
        await inventoryApi.create({
          food_name: item.food_name,
          quantity: item.quantity,
          unit: item.unit,
          storage_location: item.storage_location,
        })
        added.push(item)
      }
      toast(`✅ ${added.length} alimento${added.length !== 1 ? 's' : ''} agregado${added.length !== 1 ? 's' : ''} al inventario`)
      onItemsAdded(added)
      onClose()
    } catch { toast('Error al guardar los alimentos', 'error') } finally { setSaving(false) }
  }

  return (
    <Modal isOpen onClose={onClose} title="📸 Foto de alimento — IA" size="md">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* Upload area */}
        {!preview && (
          <div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
              Toma o sube una foto de tus alimentos y la IA identificará qué hay y en qué cantidad.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button
                onClick={() => cameraInputRef.current?.click()}
                style={{
                  padding: '20px 12px', borderRadius: 'var(--radius)', border: '1.5px dashed #FF7F7F88',
                  background: '#FF7F7F0A', cursor: 'pointer', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', gap: '8px', color: '#FF7F7F', transition: 'all var(--transition)',
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#FF7F7F18'}
                onMouseLeave={e => e.currentTarget.style.background = '#FF7F7F0A'}
              >
                <Camera size={24} />
                <span style={{ fontSize: '13px', fontWeight: 500 }}>Tomar foto</span>
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{
                  padding: '20px 12px', borderRadius: 'var(--radius)', border: '1.5px dashed var(--border-subtle)',
                  background: 'var(--surface-2)', cursor: 'pointer', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', transition: 'all var(--transition)',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-3)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--surface-2)'}
              >
                <Upload size={24} />
                <span style={{ fontSize: '13px', fontWeight: 500 }}>Subir foto</span>
              </button>
            </div>
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment"
              style={{ display: 'none' }} onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
            <input ref={fileInputRef} type="file" accept="image/*"
              style={{ display: 'none' }} onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
          </div>
        )}

        {/* Preview */}
        {preview && (
          <div style={{ position: 'relative' }}>
            <img src={preview} alt="Foto del alimento" style={{
              width: '100%', maxHeight: '220px', objectFit: 'cover',
              borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)',
            }} />
            {!analyzing && (
              <button onClick={() => { setPreview(null); setDetected(null) }} style={{
                position: 'absolute', top: '8px', right: '8px', width: '28px', height: '28px',
                borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
              }}><X size={14} /></button>
            )}
          </div>
        )}

        {/* Analyzing state */}
        {analyzing && (
          <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--text-secondary)' }}>
            <Loader size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: '8px' }} />
            <p style={{ fontSize: '13px' }}>Analizando imagen con IA...</p>
          </div>
        )}

        {/* Detected items */}
        {detected && detected.length > 0 && (
          <div>
            <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '10px' }}>
              ✨ {detected.length} alimento{detected.length !== 1 ? 's' : ''} detectado{detected.length !== 1 ? 's' : ''} — revisa y ajusta:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {detected.map((item, idx) => (
                <div key={idx} style={{
                  padding: '10px 12px', borderRadius: 'var(--radius-sm)',
                  background: 'var(--surface-2)', border: '1px solid var(--border-subtle)',
                  display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: '8px', alignItems: 'center',
                }}>
                  <input
                    value={item.food_name}
                    onChange={e => updateItem(idx, 'food_name', e.target.value)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--text)', fontSize: '13px', fontWeight: 500, outline: 'none', minWidth: 0 }}
                  />
                  <input
                    type="number" min="0.1" step="0.5"
                    value={item.quantity}
                    onChange={e => updateItem(idx, 'quantity', parseFloat(e.target.value) || 1)}
                    style={{ width: '52px', textAlign: 'center', background: 'var(--surface)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'var(--text)', fontSize: '13px', padding: '4px 6px' }}
                  />
                  <select value={item.unit} onChange={e => updateItem(idx, 'unit', e.target.value)}
                    style={{ background: 'var(--surface)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'var(--text)', fontSize: '12px', padding: '4px 6px' }}>
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                  <button onClick={() => removeItem(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><X size={14} /></button>
                </div>
              ))}
            </div>

            {/* Storage location (global for all) */}
            <div style={{ marginTop: '12px' }}>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>¿Dónde los guardas?</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                {LOCATIONS.map(loc => (
                  <button key={loc.value} onClick={() => setDetected(prev => prev ? prev.map(i => ({ ...i, storage_location: loc.value })) : prev)}
                    style={{
                      padding: '7px 10px', borderRadius: 'var(--radius-sm)', textAlign: 'left',
                      background: detected[0]?.storage_location === loc.value ? `${loc.color}15` : 'var(--surface-2)',
                      border: `1px solid ${detected[0]?.storage_location === loc.value ? loc.color : 'var(--border-subtle)'}`,
                      cursor: 'pointer', fontSize: '12px',
                      color: detected[0]?.storage_location === loc.value ? loc.color : 'var(--text-secondary)',
                      fontWeight: detected[0]?.storage_location === loc.value ? 600 : 400,
                    }}>{loc.label}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          {detected && detected.length > 0 && (
            <Button loading={saving} icon={<Check size={15} />} onClick={handleSave}>
              Agregar {detected.length} alimento{detected.length !== 1 ? 's' : ''}
            </Button>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </Modal>
  )
}

// ── Nutrition Modal ───────────────────────────────────────────────────────────
function NutritionModal({ foodName, onClose }: { foodName: string; onClose: () => void }) {
  const [info, setInfo] = useState<NutritionInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    inventoryApi.nutrition(foodName)
      .then(setInfo)
      .catch(() => setError('No se pudo obtener la información nutricional. Intenta de nuevo.'))
      .finally(() => setLoading(false))
  }, [foodName])

  const macroStyle = {
    display: 'flex', flexDirection: 'column' as const, alignItems: 'center',
    background: 'var(--surface-2)', borderRadius: '10px', padding: '10px 14px', flex: 1, minWidth: '70px',
  }

  return (
    <Modal isOpen onClose={onClose} title={`🥗 ${foodName}`} size="md">
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '32px 0' }}>
          <Loader size={28} style={{ animation: 'spin 1s linear infinite', color: 'var(--primary)' }} />
          <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Analizando con IA…</span>
        </div>
      )}
      {error && !loading && (
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>{error}</p>
          <Button variant="ghost" onClick={onClose}>Volver a la lista</Button>
        </div>
      )}
      {info && !loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Macros */}
          <div>
            <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>Valores por 100g</p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {[
                { label: '🔥 Calorías', val: info.calories },
                { label: '🥩 Proteínas', val: info.protein },
                { label: '🍞 Carbos', val: info.carbs },
                { label: '🫒 Grasas', val: info.fat },
                { label: '🌾 Fibra', val: info.fiber },
              ].filter(m => m.val).map(m => (
                <div key={m.label} style={macroStyle}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>{m.label}</span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', textAlign: 'center' }}>{m.val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Vitamins & Minerals */}
          {((info.vitamins?.length ?? 0) > 0 || (info.minerals?.length ?? 0) > 0) && (
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {(info.vitamins?.length ?? 0) > 0 && (
                <div style={{ flex: 1, minWidth: '140px' }}>
                  <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>💊 Vitaminas</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {info.vitamins!.map(v => (
                      <span key={v} style={{ background: 'var(--surface-2)', borderRadius: '20px', padding: '3px 10px', fontSize: '12px', color: 'var(--text-secondary)' }}>{v}</span>
                    ))}
                  </div>
                </div>
              )}
              {(info.minerals?.length ?? 0) > 0 && (
                <div style={{ flex: 1, minWidth: '140px' }}>
                  <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>⚡ Minerales</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {info.minerals!.map(m => (
                      <span key={m} style={{ background: 'var(--surface-2)', borderRadius: '20px', padding: '3px 10px', fontSize: '12px', color: 'var(--text-secondary)' }}>{m}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Benefits */}
          {(info.benefits?.length ?? 0) > 0 && (
            <div>
              <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>✨ Beneficios</p>
              <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {info.benefits!.map(b => (
                  <li key={b} style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{b}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Tips */}
          {info.tips && (
            <div style={{ background: 'var(--surface-2)', borderRadius: '10px', padding: '12px 14px' }}>
              <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>💡 Consejo</p>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>{info.tips}</p>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={onClose}>Cerrar</Button>
          </div>
        </div>
      )}
      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </Modal>
  )
}

export function InventoryPage() {
  const { toast } = useToast()
  const navigate = useNavigate()
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all'|'expiring'|'ok'>('all')
  const [editId, setEditId] = useState<string|null>(null)
  const [consumeItem, setConsumeItem] = useState<InventoryItem|null>(null)
  const [addModal, setAddModal] = useState(false)
  const [addLoading, setAddLoading] = useState(false)
  const [deleteId, setDeleteId] = useState<string|null>(null)
  const [photoModal, setPhotoModal] = useState(false)
  const [nutritionItem, setNutritionItem] = useState<string|null>(null)

  const load = () =>
    inventoryApi.list().then(setItems).catch(console.error).finally(()=>setLoading(false))

  useEffect(()=>{ load() },[])

  const filtered = useMemo(()=>{
    let list = items.filter(i=>i.food_name.toLowerCase().includes(search.toLowerCase()))
    if (filter==='expiring') list = list.filter(i=>i.expiry_status==='warning'||i.expiry_status==='critical'||i.expiry_status==='expired')
    if (filter==='ok') list = list.filter(i=>!i.expiry_status||i.expiry_status==='ok')
    return list
  },[items,search,filter])

  const expiringCount = items.filter(i=>i.expiry_status==='warning'||i.expiry_status==='critical'||i.expiry_status==='expired').length

  const handleAdd = async (data:{ food_name:string; quantity:string; unit:string; storage_location:string; expiry_days:string }) => {
    if (!data.food_name) { toast('Escribe el nombre','error'); return }
    setAddLoading(true)
    try {
      const payload: InventoryItemCreate = {
        food_name: data.food_name,
        quantity: parseFloat(data.quantity)||1,
        unit: data.unit,
        storage_location: data.storage_location,
      }
      if (data.expiry_days) payload.expiry_days = parseInt(data.expiry_days)
      const item = await inventoryApi.create(payload)
      setItems(prev=>[item,...prev])
      setAddModal(false)
      toast('✅ Alimento agregado al inventario')
    } catch { toast('Error al agregar','error') } finally { setAddLoading(false) }
  }

  const handleEdit = async (id:string, data:{ food_name:string; quantity:string; unit:string; storage_location:string; expiry_days:string }) => {
    try {
      const updated = await inventoryApi.update(id, {
        food_name: data.food_name,
        quantity: parseFloat(data.quantity),
        unit: data.unit,
        storage_location: data.storage_location,
        ...(data.expiry_days ? { expiry_days: parseInt(data.expiry_days) } : {}),
      })
      setItems(prev=>prev.map(i=>i.id===id?updated:i))
      setEditId(null)
      toast('✅ Actualizado')
    } catch { toast('Error al actualizar','error') }
  }

  const handleDelete = async (id:string) => {
    try {
      await inventoryApi.delete(id)
      setItems(prev=>prev.filter(i=>i.id!==id))
      toast('Eliminado del inventario')
    } catch { toast('Error al eliminar','error') }
    setDeleteId(null)
  }

  const handleConsumed = (id:string, updated:InventoryItem|null) => {
    if (!updated) setItems(prev=>prev.filter(i=>i.id!==id))
    else setItems(prev=>prev.map(i=>i.id===id?updated:i))
  }

  return (
    <>
      <div style={{ display:'flex', flexDirection:'column', gap:'16px', animation:'fadeIn 0.4s ease' }}>
        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'10px' }}>
          <div>
            <h2 style={{ fontSize:'20px', fontWeight:700, letterSpacing:'-0.03em', marginBottom:'2px' }}>Inventario</h2>
            <p style={{ fontSize:'13px', color:'var(--text-secondary)' }}>{items.length} alimentos · {expiringCount>0?<span style={{ color:'var(--warning)' }}>{expiringCount} por caducar</span>:'Todo fresco ✓'}</p>
          </div>
          <Button onClick={()=>setAddModal(true)} icon={<Package size={14}/>} size="sm">Agregar</Button>
        </div>

        {/* Search + filter */}
        <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
          <div style={{ flex:1, minWidth:'200px' }}>
            <Input placeholder="Buscar alimento..." value={search} onChange={e=>setSearch(e.target.value)} icon={<Search size={15}/>}
              iconRight={search?<button onClick={()=>setSearch('')} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', display:'flex' }}><X size={13}/></button>:undefined}
            />
          </div>
          <div style={{ display:'flex', gap:'4px' }}>
            {([['all','Todos'],['expiring','⚠️ Por caducar'],['ok','✓ Frescos']] as [string,string][]).map(([val,lbl])=>(
              <button key={val} onClick={()=>setFilter(val as 'all'|'expiring'|'ok')} style={{
                padding:'0 12px', height:'42px', borderRadius:'var(--radius-sm)', fontSize:'12px', fontWeight:500,
                background:filter===val?'var(--surface-3)':'var(--surface)',
                color:filter===val?'var(--text)':'var(--text-secondary)',
                border:`1px solid ${filter===val?'var(--border)':'var(--border-subtle)'}`,
                cursor:'pointer', transition:'all var(--transition)', whiteSpace:'nowrap',
              }}>{lbl}</button>
            ))}
          </div>
        </div>

        {/* Items */}
        <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
          {loading ? Array.from({length:5}).map((_,i)=><ListItemSkeleton key={i}/>) :
          filtered.length===0 ? (
            <EmptyState icon={<Package size={26}/>} title={search?'Sin resultados':'Inventario vacío'} description={search?`No hay alimentos que coincidan con "${search}".`:'Agrega alimentos usando el botón o el dock flotante.'} action={!search?{label:'Agregar alimento',onClick:()=>setAddModal(true)}:undefined}/>
          ) : filtered.map(item=>(
            <div key={item.id}>
              {editId===item.id ? (
                <Card style={{ border:'1px solid var(--border)' }}>
                  <ItemForm
                    initial={{ food_name:item.food_name, quantity:String(item.quantity), unit:item.unit, storage_location:item.storage_location??'pantry', expiry_days:'' }}
                    onSave={data=>handleEdit(item.id,data)}
                    onCancel={()=>setEditId(null)}
                    loading={false}
                  />
                </Card>
              ) : (
                <Card style={{
                  borderLeft:`4px solid ${item.expiry_status==='expired'?'var(--danger)':item.expiry_status==='critical'?'var(--danger)':item.expiry_status==='warning'?'var(--warning)':'var(--border-subtle)'}`,
                  background: item.expiry_status==='expired'||item.expiry_status==='critical' ? 'rgba(255,107,107,0.06)' : item.expiry_status==='warning' ? 'rgba(245,184,65,0.05)' : 'var(--surface)',
                  transition:'all var(--transition)',
                  padding: '10px 12px',
                }}
                  onMouseEnter={(e:React.MouseEvent<HTMLDivElement>)=>e.currentTarget.style.transform='translateY(-1px)'}
                  onMouseLeave={(e:React.MouseEvent<HTMLDivElement>)=>e.currentTarget.style.transform=''}
                >
                  {/* Fila 1: emoji + nombre + actions */}
                  <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                    {/* Emoji */}
                    <div style={{ width:'38px', height:'38px', borderRadius:'var(--radius-sm)', background:`${locationColor(item.storage_location)}18`, border:`1px solid ${locationColor(item.storage_location)}30`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px', flexShrink:0 }}>
                      {getFoodEmoji(item.food_name)}
                    </div>

                    {/* Nombre */}
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:'14px', fontWeight:600, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {item.food_name}
                      </div>
                      <div style={{ fontSize:'11px', color:'var(--text-muted)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {locationLabel(item.storage_location)}
                        {item.expires_at && ` · caduca ${format(new Date(item.expires_at),"d MMM",{locale:es})}`}
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display:'flex', gap:'2px', flexShrink:0 }}>
                      <button onClick={()=>setNutritionItem(item.food_name)} title="Info nutricional" style={{ width:'30px', height:'30px', display:'flex', alignItems:'center', justifyContent:'center', borderRadius:'7px', color:'var(--text-secondary)', cursor:'pointer', transition:'all var(--transition)', background:'none', border:'none', fontSize:'14px' }}
                        onMouseEnter={e=>{e.currentTarget.style.background='var(--surface-2)';e.currentTarget.style.color='var(--text)'}}
                        onMouseLeave={e=>{e.currentTarget.style.background='';e.currentTarget.style.color='var(--text-secondary)'}}
                      >🥗</button>
                      <button onClick={()=>setConsumeItem(item)} title="Registrar consumo" style={{ width:'30px', height:'30px', display:'flex', alignItems:'center', justifyContent:'center', borderRadius:'7px', color:'var(--text-secondary)', cursor:'pointer', transition:'all var(--transition)', background:'none', border:'none' }}
                        onMouseEnter={e=>{e.currentTarget.style.background='var(--primary-dim)';e.currentTarget.style.color='var(--primary)'}}
                        onMouseLeave={e=>{e.currentTarget.style.background='';e.currentTarget.style.color='var(--text-secondary)'}}
                      ><Minus size={13}/></button>
                      <button onClick={()=>setEditId(item.id)} title="Editar" style={{ width:'30px', height:'30px', display:'flex', alignItems:'center', justifyContent:'center', borderRadius:'7px', color:'var(--text-secondary)', cursor:'pointer', transition:'all var(--transition)', background:'none', border:'none' }}
                        onMouseEnter={e=>{e.currentTarget.style.background='var(--surface-2)';e.currentTarget.style.color='var(--text)'}}
                        onMouseLeave={e=>{e.currentTarget.style.background='';e.currentTarget.style.color='var(--text-secondary)'}}
                      ><Edit2 size={13}/></button>
                      <button onClick={()=>setDeleteId(item.id)} title="Eliminar" style={{ width:'30px', height:'30px', display:'flex', alignItems:'center', justifyContent:'center', borderRadius:'7px', color:'var(--text-secondary)', cursor:'pointer', transition:'all var(--transition)', background:'none', border:'none' }}
                        onMouseEnter={e=>{e.currentTarget.style.background='var(--danger-dim)';e.currentTarget.style.color='var(--danger)'}}
                        onMouseLeave={e=>{e.currentTarget.style.background='';e.currentTarget.style.color='var(--text-secondary)'}}
                      ><Trash2 size={13}/></button>
                    </div>
                  </div>

                  {/* Fila 2: cantidad + badge caducidad */}
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:'8px', paddingLeft:'48px' }}>
                    <div style={{ padding:'3px 10px', background:'var(--surface-2)', borderRadius:'100px', fontSize:'12px', fontWeight:600, color:'var(--text)', fontFamily:'IBM Plex Mono', whiteSpace:'nowrap' }}>
                      {item.quantity} {item.unit}
                    </div>
                    <ExpiryBadge item={item}/>
                  </div>
                </Card>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Modals */}
      <Modal isOpen={addModal} onClose={()=>setAddModal(false)} title="Agregar alimento">
        <ItemForm onSave={handleAdd} onCancel={()=>setAddModal(false)} loading={addLoading}/>
      </Modal>

      {consumeItem && (
        <ConsumeModal item={consumeItem} onClose={()=>setConsumeItem(null)} onDone={updated=>{ handleConsumed(consumeItem.id,updated); setConsumeItem(null) }}/>
      )}

      <Modal isOpen={!!deleteId} onClose={()=>setDeleteId(null)} title="Eliminar alimento" size="sm">
        <p style={{ fontSize:'14px', color:'var(--text-secondary)', marginBottom:'20px' }}>¿Eliminar este alimento del inventario? Esta acción no se puede deshacer.</p>
        <div style={{ display:'flex', gap:'10px', justifyContent:'flex-end' }}>
          <Button variant="ghost" onClick={()=>setDeleteId(null)}>Cancelar</Button>
          <Button variant="danger" icon={<Trash2 size={13}/>} onClick={()=>deleteId&&handleDelete(deleteId)}>Eliminar</Button>
        </div>
      </Modal>

      {photoModal && (
        <PhotoAnalysisModal
          onClose={() => setPhotoModal(false)}
          onItemsAdded={() => load()}
        />
      )}

      {nutritionItem && (
        <NutritionModal foodName={nutritionItem} onClose={() => setNutritionItem(null)} />
      )}

      <FreshlyDock
        onManual={()=>setAddModal(true)}
        onVoice={()=>navigate('/purchases?action=voice')}
        onReceipt={()=>navigate('/purchases?action=receipt')}
        onPhoto={()=>setPhotoModal(true)}
      />
    </>
  )
}
