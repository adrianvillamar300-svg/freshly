import { useState, useEffect } from 'react'
import { ChefHat, Sparkles, BookOpen, Trash2, ChevronDown, ChevronUp, Clock, ShoppingCart } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { ListItemSkeleton, CardSkeleton } from '../components/ui/Skeleton'
import { Badge } from '../components/ui/Badge'
import { useToast } from '../components/ui/Toast'
import { recipesApi } from '../lib/api'
import type { RecipeSuggestion, Recipe } from '../types'

// ── Recipe suggestion card ─────────────────────────────────
function SuggestionCard({ recipe, onSave, saving }: {
  recipe: RecipeSuggestion
  onSave: (r: RecipeSuggestion) => void
  saving: boolean
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <Card style={{ overflow: 'hidden' }}>
      {/* Header */}
      <div
        onClick={() => setExpanded(p => !p)}
        style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer' }}
      >
        <div style={{
          width: '44px', height: '44px', flexShrink: 0,
          background: 'var(--primary-dim)',
          borderRadius: 'var(--radius-sm)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '22px',
        }}>
          🍽️
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ fontSize: '15px', fontWeight: 600, letterSpacing: '-0.02em', marginBottom: '6px' }}>
            {recipe.title}
          </h3>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <Badge variant="success">{recipe.ingredients.length} ingredientes</Badge>
            <Badge variant="info">{recipe.steps.length} pasos</Badge>
            {recipe.missing_ingredients.length > 0 && (
              <Badge variant="warning">{recipe.missing_ingredients.length} faltan</Badge>
            )}
          </div>
        </div>
        <div style={{ color: 'var(--text-muted)', flexShrink: 0, paddingTop: '2px' }}>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div style={{ marginTop: '20px', animation: 'fadeIn 0.2s ease' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            {/* Ingredients */}
            <div>
              <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
                Ingredientes
              </p>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: '6px', listStyle: 'none' }}>
                {recipe.ingredients.map((ing, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                    <span style={{
                      width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0,
                      background: recipe.missing_ingredients.includes(ing) ? 'var(--warning)' : 'var(--primary)',
                    }} />
                    <span style={{ color: recipe.missing_ingredients.includes(ing) ? 'var(--text-secondary)' : 'var(--text)' }}>
                      {ing}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Steps */}
            <div>
              <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
                Preparación
              </p>
              <ol style={{ display: 'flex', flexDirection: 'column', gap: '8px', listStyle: 'none' }}>
                {recipe.steps.slice(0, 3).map((step, i) => (
                  <li key={i} style={{ display: 'flex', gap: '10px', fontSize: '13px', lineHeight: 1.5 }}>
                    <span style={{
                      width: '20px', height: '20px', borderRadius: '50%', flexShrink: 0,
                      background: 'var(--surface-2)', border: '1px solid var(--border-subtle)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '10px', fontWeight: 600, color: 'var(--primary)',
                    }}>
                      {i + 1}
                    </span>
                    <span style={{ color: 'var(--text-secondary)' }}>{step}</span>
                  </li>
                ))}
                {recipe.steps.length > 3 && (
                  <li style={{ fontSize: '12px', color: 'var(--text-muted)', paddingLeft: '30px' }}>
                    +{recipe.steps.length - 3} pasos más...
                  </li>
                )}
              </ol>
            </div>
          </div>

          {recipe.missing_ingredients.length > 0 && (
            <div style={{
              padding: '10px 14px',
              background: 'var(--warning-dim)',
              border: '1px solid rgba(245,184,65,0.2)',
              borderRadius: 'var(--radius-sm)',
              display: 'flex', alignItems: 'center', gap: '8px',
              fontSize: '13px', color: 'var(--warning)', marginBottom: '16px',
            }}>
              <ShoppingCart size={14} />
              Te faltan: {recipe.missing_ingredients.join(', ')}
            </div>
          )}

          <Button
            size="sm"
            loading={saving}
            icon={<BookOpen size={14} />}
            onClick={() => onSave(recipe)}
          >
            Guardar receta
          </Button>
        </div>
      )}
    </Card>
  )
}

// ── Saved recipe card ──────────────────────────────────────
function SavedRecipeCard({ recipe, onDelete }: { recipe: Recipe; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  return (
    <Card style={{ overflow: 'hidden' }}>
      <div
        onClick={() => setExpanded(p => !p)}
        style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
      >
        <div style={{
          width: '44px', height: '44px', flexShrink: 0,
          background: 'var(--surface-2)',
          borderRadius: 'var(--radius-sm)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '22px',
        }}>
          📖
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {recipe.title}
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
            <Clock size={11} />
            {format(new Date(recipe.created_at), "d MMM yyyy", { locale: es })}
            <span>·</span>
            <span>{recipe.ingredients.length} ingredientes</span>
          </div>
        </div>
        <div style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop: '20px', animation: 'fadeIn 0.2s ease' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
                Ingredientes
              </p>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: '5px', listStyle: 'none' }}>
                {recipe.ingredients.map((ing, i) => (
                  <li key={i} style={{ display: 'flex', gap: '8px', fontSize: '13px', alignItems: 'center' }}>
                    <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--primary)', flexShrink: 0 }} />
                    {ing}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
                Pasos
              </p>
              <ol style={{ display: 'flex', flexDirection: 'column', gap: '8px', listStyle: 'none' }}>
                {recipe.steps.map((step, i) => (
                  <li key={i} style={{ display: 'flex', gap: '10px', fontSize: '13px', lineHeight: 1.5 }}>
                    <span style={{
                      width: '20px', height: '20px', borderRadius: '50%', flexShrink: 0,
                      background: 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)',
                    }}>
                      {i + 1}
                    </span>
                    <span style={{ color: 'var(--text-secondary)' }}>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                fontSize: '12px', color: 'var(--danger)',
                padding: '6px 10px', borderRadius: 'var(--radius-sm)',
                background: 'var(--danger-dim)', border: 'none', cursor: 'pointer',
              }}
            >
              <Trash2 size={13} /> Eliminar receta
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>¿Confirmar eliminación?</span>
              <Button size="sm" variant="danger" onClick={onDelete} icon={<Trash2 size={13} />}>Eliminar</Button>
              <Button size="sm" variant="ghost" onClick={() => setShowDeleteConfirm(false)}>Cancelar</Button>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

// ── Main page ──────────────────────────────────────────────
export function RecipesPage() {
  const { toast } = useToast()
  const [tab, setTab] = useState<'suggestions' | 'history'>('suggestions')
  const [suggestions, setSuggestions] = useState<RecipeSuggestion[]>([])
  const [history, setHistory] = useState<Recipe[]>([])
  const [loadingSugg, setLoadingSugg] = useState(false)
  const [loadingHist, setLoadingHist] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)

  const loadHistory = () =>
    recipesApi.history().then(setHistory).catch(console.error).finally(() => setLoadingHist(false))

  useEffect(() => { loadHistory() }, [])

  const getSuggestions = async () => {
    setLoadingSugg(true)
    setSuggestions([])
    try {
      const res = await recipesApi.suggestions()
      setSuggestions(res.recipes)
      if (res.recipes.length === 0) toast('No hay sugerencias con tu inventario actual', 'info')
    } catch {
      toast('Error al obtener sugerencias', 'error')
    } finally {
      setLoadingSugg(false)
    }
  }

  const saveRecipe = async (recipe: RecipeSuggestion) => {
    const key = recipe.title
    setSavingId(key)
    try {
      await recipesApi.save(recipe)
      toast('Receta guardada')
      loadHistory()
    } catch {
      toast('Error al guardar receta', 'error')
    } finally {
      setSavingId(null)
    }
  }

  const deleteRecipe = async (id: string) => {
    try {
      await recipesApi.delete(id)
      setHistory(prev => prev.filter(r => r.id !== id))
      toast('Receta eliminada')
    } catch {
      toast('Error al eliminar', 'error')
    }
  }

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeIn 0.4s ease' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '2px' }}>
              Recetas
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Sugerencias personalizadas con lo que tienes
            </p>
          </div>
          <Button
            icon={<Sparkles size={15} />}
            onClick={getSuggestions}
            loading={loadingSugg}
          >
            Generar sugerencias
          </Button>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          background: 'var(--surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-sm)',
          padding: '4px',
          width: 'fit-content',
          gap: '2px',
        }}>
          {(['suggestions', 'history'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '7px 16px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                background: tab === t ? 'var(--surface-3)' : 'transparent',
                color: tab === t ? 'var(--text)' : 'var(--text-secondary)',
                border: tab === t ? '1px solid var(--border-subtle)' : '1px solid transparent',
                transition: 'all var(--transition)',
                display: 'flex', alignItems: 'center', gap: '6px',
              }}
            >
              {t === 'suggestions' ? <><Sparkles size={13} /> Sugerencias</> : <><BookOpen size={13} /> Guardadas ({history.length})</>}
            </button>
          ))}
        </div>

        {/* Content */}
        {tab === 'suggestions' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {loadingSugg ? (
              Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)
            ) : suggestions.length === 0 ? (
              <div style={{
                background: 'var(--surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-lg)',
                padding: '40px',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🧑‍🍳</div>
                <h3 style={{ fontSize: '17px', fontWeight: 600, marginBottom: '8px' }}>
                  Descubre qué cocinar hoy
                </h3>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '24px', maxWidth: '340px', margin: '0 auto 24px' }}>
                  La IA analiza tu inventario actual y sugiere recetas con lo que ya tienes en casa.
                </p>
                <Button icon={<Sparkles size={15} />} onClick={getSuggestions}>
                  Generar sugerencias
                </Button>
              </div>
            ) : (
              suggestions.map((r, i) => (
                <SuggestionCard
                  key={i}
                  recipe={r}
                  onSave={saveRecipe}
                  saving={savingId === r.title}
                />
              ))
            )}
          </div>
        )}

        {tab === 'history' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {loadingHist ? (
              Array.from({ length: 3 }).map((_, i) => <ListItemSkeleton key={i} />)
            ) : history.length === 0 ? (
              <EmptyState
                icon={<BookOpen size={28} />}
                title="Sin recetas guardadas"
                description="Genera sugerencias y guarda las que más te gusten para acceder a ellas rápidamente."
                action={{ label: 'Ver sugerencias', onClick: () => setTab('suggestions') }}
              />
            ) : (
              history.map(r => (
                <SavedRecipeCard key={r.id} recipe={r} onDelete={() => deleteRecipe(r.id)} />
              ))
            )}
          </div>
        )}
      </div>


    </>
  )
}
