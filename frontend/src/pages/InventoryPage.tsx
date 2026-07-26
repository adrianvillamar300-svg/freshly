import { useState, useEffect, useMemo } from 'react'
import { Search, Package, Edit2, Trash2, Check, X } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { EmptyState } from '../components/ui/EmptyState'
import { ListItemSkeleton } from '../components/ui/Skeleton'
import { FreshlyDock } from '../components/layout/FloatingDock'
import { useToast } from '../components/ui/Toast'
import { inventoryApi } from '../lib/api'
import type { InventoryItem, InventoryItemCreate } from '../types'

const UNITS = ['kg', 'g', 'L', 'ml', 'unidad', 'docena', 'caja', 'bolsa', 'lata', 'paquete']

interface ItemFormData {
  food_name: string
  quantity: string
  unit: string
}

function ItemForm({ initial, onSave, onCancel, loading }: {
  initial?: ItemFormData
  onSave: (d: ItemFormData) => void
  onCancel: () => void
  loading: boolean
}) {
  const [form, setForm] = useState<ItemFormData>(initial ?? { food_name: '', quantity: '', unit: 'unidad' })

  const update = (k: keyof ItemFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <Input
        label="Alimento"
        placeholder="Ej: Manzanas"
        value={form.food_name}
        onChange={update('food_name')}
        autoFocus
      />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <Input
          type="number"
          label="Cantidad"
          placeholder="0"
          min="0"
          step="0.1"
          value={form.quantity}
          onChange={update('quantity')}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>Unidad</label>
          <select
            value={form.unit}
            onChange={update('unit')}
            style={{
              height: '42px',
              padding: '0 14px',
              background: 'var(--surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text)',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
        <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
        <Button loading={loading} onClick={() => onSave(form)} icon={<Check size={15} />}>
          Guardar
        </Button>
      </div>
    </div>
  )
}

function InlineEdit({ item, onDone }: { item: InventoryItem; onDone: () => void }) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  const save = async (data: ItemFormData) => {
    setLoading(true)
    try {
      await inventoryApi.update(item.id, {
        food_name: data.food_name,
        quantity: parseFloat(data.quantity),
        unit: data.unit,
      })
      toast('Alimento actualizado')
      onDone()
    } catch { toast('Error al actualizar', 'error') }
    finally { setLoading(false) }
  }

  return (
    <div style={{ padding: '12px', background: 'var(--surface-2)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
      <ItemForm
        initial={{ food_name: item.food_name, quantity: String(item.quantity), unit: item.unit }}
        onSave={save}
        onCancel={onDone}
        loading={loading}
      />
    </div>
  )
}

export function InventoryPage() {
  const { toast } = useToast()
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [addModal, setAddModal] = useState(false)
  const [addLoading, setAddLoading] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const load = () => inventoryApi.list().then(setItems).catch(console.error).finally(() => setLoading(false))

  useEffect(() => { load() }, [])

  const filtered = useMemo(() =>
    items.filter(i => i.food_name.toLowerCase().includes(search.toLowerCase())),
    [items, search]
  )

  const handleAdd = async (data: ItemFormData) => {
    if (!data.food_name || !data.quantity) { toast('Completa todos los campos', 'error'); return }
    setAddLoading(true)
    try {
      const item = await inventoryApi.create({
        food_name: data.food_name,
        quantity: parseFloat(data.quantity),
        unit: data.unit,
      } as InventoryItemCreate)
      setItems(prev => [item, ...prev])
      setAddModal(false)
      toast('Alimento agregado al inventario')
    } catch { toast('Error al agregar', 'error') }
    finally { setAddLoading(false) }
  }

  const handleDelete = async (id: string) => {
    try {
      await inventoryApi.delete(id)
      setItems(prev => prev.filter(i => i.id !== id))
      toast('Alimento eliminado')
    } catch { toast('Error al eliminar', 'error') }
    setDeleteId(null)
  }

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeIn 0.4s ease' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '2px' }}>
              Inventario
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              {items.length} {items.length === 1 ? 'alimento' : 'alimentos'} en tu despensa
            </p>
          </div>
          <Button onClick={() => setAddModal(true)} icon={<Package size={15} />} size="sm">
            Agregar
          </Button>
        </div>

        {/* Search */}
        <Input
          placeholder="Buscar alimento..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          icon={<Search size={16} />}
          iconRight={search ? <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><X size={14} /></button> : undefined}
        />

        {/* Items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => <ListItemSkeleton key={i} />)
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<Package size={28} />}
              title={search ? 'Sin resultados' : 'Inventario vacío'}
              description={search ? `No hay alimentos que coincidan con "${search}".` : 'Agrega alimentos a tu despensa usando el botón o el dock flotante.'}
              action={!search ? { label: 'Agregar primer alimento', onClick: () => setAddModal(true) } : undefined}
            />
          ) : (
            filtered.map(item => (
              <div key={item.id}>
                {editId === item.id ? (
                  <InlineEdit item={item} onDone={() => { setEditId(null); load() }} />
                ) : (
                  <Card style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {/* Icon */}
                    <div style={{
                      width: '40px', height: '40px',
                      background: 'var(--primary-dim)',
                      borderRadius: 'var(--radius-sm)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '18px', flexShrink: 0,
                    }}>
                      🌿
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.food_name}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        Actualizado {formatDistanceToNow(new Date(item.updated_at), { addSuffix: true, locale: es })}
                      </div>
                    </div>

                    {/* Quantity */}
                    <div style={{
                      padding: '4px 12px',
                      background: 'var(--surface-2)',
                      borderRadius: '100px',
                      fontSize: '13px',
                      fontWeight: 500,
                      color: 'var(--text)',
                      fontFamily: 'IBM Plex Mono',
                      flexShrink: 0,
                    }}>
                      {item.quantity} {item.unit}
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                      <button
                        onClick={() => setEditId(item.id)}
                        style={{
                          width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          borderRadius: '8px', color: 'var(--text-secondary)', cursor: 'pointer',
                          background: 'none', border: 'none', transition: 'all var(--transition)',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.color = 'var(--text)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'var(--text-secondary)' }}
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => setDeleteId(item.id)}
                        style={{
                          width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          borderRadius: '8px', color: 'var(--text-secondary)', cursor: 'pointer',
                          background: 'none', border: 'none', transition: 'all var(--transition)',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--danger-dim)'; e.currentTarget.style.color = 'var(--danger)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'var(--text-secondary)' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </Card>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add modal */}
      <Modal isOpen={addModal} onClose={() => setAddModal(false)} title="Agregar alimento">
        <ItemForm onSave={handleAdd} onCancel={() => setAddModal(false)} loading={addLoading} />
      </Modal>

      {/* Delete confirm modal */}
      <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Eliminar alimento" size="sm">
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
          ¿Estás seguro de que quieres eliminar este alimento del inventario?
        </p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <Button variant="ghost" onClick={() => setDeleteId(null)}>Cancelar</Button>
          <Button variant="danger" icon={<Trash2 size={14} />} onClick={() => deleteId && handleDelete(deleteId)}>
            Eliminar
          </Button>
        </div>
      </Modal>

      {/* Floating dock */}
      <FreshlyDock
        onManual={() => setAddModal(true)}
        onVoice={() => {/* handled in purchases */}}
        onReceipt={() => {/* handled in purchases */}}
      />
    </>
  )
}
