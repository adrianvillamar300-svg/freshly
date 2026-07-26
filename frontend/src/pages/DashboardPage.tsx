import { useState, useEffect } from 'react'
import { DollarSign, ShoppingBag, Package, TrendingUp } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { StatCard, Card } from '../components/ui/Card'
import { CardSkeleton, ListItemSkeleton } from '../components/ui/Skeleton'
import { EmptyState } from '../components/ui/EmptyState'
import { useAuth } from '../contexts/AuthContext'
import { dashboardApi } from '../lib/api'
import type { SpendingByDate, DashboardSummary } from '../types'

// Custom tooltip for chart
const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-sm)',
      padding: '8px 12px',
      boxShadow: 'var(--shadow)',
    }}>
      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--primary)', fontFamily: 'Space Grotesk' }}>
        ${payload[0].value.toFixed(2)}
      </div>
    </div>
  )
}

export function DashboardPage() {
  const { user } = useAuth()
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [spending, setSpending] = useState<SpendingByDate[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([dashboardApi.summary(), dashboardApi.spending()])
      .then(([sum, spend]) => {
        setSummary(sum)
        setSpending(spend)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Buenos días'
    if (h < 18) return 'Buenas tardes'
    return 'Buenas noches'
  }

  // Format spending for chart
  const chartData = spending.map(s => ({
    date: format(new Date(s.date + 'T00:00:00'), 'dd MMM', { locale: es }),
    total: s.total,
  }))

  return (
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

      {/* Stats grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '12px',
      }}>
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
        ) : (
          <>
            <StatCard
              label="Total gastado"
              value={`$${(summary?.total_spent ?? 0).toFixed(2)}`}
              icon={<DollarSign size={18} />}
              accent="var(--primary)"
            />
            <StatCard
              label="Compras realizadas"
              value={summary?.purchases_count ?? 0}
              icon={<ShoppingBag size={18} />}
              accent="var(--warning)"
            />
            <StatCard
              label="Alimentos distintos"
              value={summary?.distinct_foods ?? 0}
              icon={<Package size={18} />}
              accent="#6495ED"
            />
            <StatCard
              label="Promedio por compra"
              value={summary && summary.purchases_count > 0
                ? `$${(summary.total_spent / summary.purchases_count).toFixed(2)}`
                : '$0.00'}
              icon={<TrendingUp size={18} />}
              accent="var(--danger)"
            />
          </>
        )}
      </div>

      {/* Chart + Top foods */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)',
        gap: '16px',
      }}>
        {/* Spending chart */}
        <Card>
          <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 600, letterSpacing: '-0.02em', marginBottom: '2px' }}>
                Gasto por día
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Historial de compras</p>
            </div>
          </div>

          {loading ? (
            <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: '24px', height: '24px', border: '2px solid var(--border-subtle)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            </div>
          ) : chartData.length === 0 ? (
            <EmptyState
              icon={<TrendingUp size={24} />}
              title="Sin datos aún"
              description="Registra tu primera compra para ver el gráfico."
            />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3ED598" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#3ED598" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#3ED598"
                  strokeWidth={2}
                  fill="url(#areaGrad)"
                  dot={false}
                  activeDot={{ r: 4, fill: '#3ED598', stroke: 'var(--bg)', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Top foods */}
        <Card>
          <h3 style={{ fontSize: '15px', fontWeight: 600, letterSpacing: '-0.02em', marginBottom: '4px' }}>
            Top alimentos
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>Más comprados</p>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {Array.from({ length: 4 }).map((_, i) => <ListItemSkeleton key={i} />)}
            </div>
          ) : !summary?.top_foods?.length ? (
            <EmptyState
              icon="🥗"
              title="Sin datos"
              description="Registra compras para ver tus alimentos más frecuentes."
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {summary.top_foods.slice(0, 6).map((food, i) => {
                const maxQty = summary.top_foods[0]?.quantity ?? 1
                const pct = (food.quantity / maxQty) * 100
                return (
                  <div key={food.food_name}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 500, color: i === 0 ? 'var(--text)' : 'var(--text-secondary)' }}>
                        {food.food_name}
                      </span>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'IBM Plex Mono' }}>
                        {food.quantity} {food.unit}
                      </span>
                    </div>
                    <div style={{ height: '4px', background: 'var(--surface-2)', borderRadius: '100px', overflow: 'hidden' }}>
                      <div style={{
                        width: `${pct}%`,
                        height: '100%',
                        background: i === 0 ? 'var(--primary)' : 'var(--border)',
                        borderRadius: '100px',
                        transition: 'width 0.6s ease',
                      }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Responsive adjustments via media query in a style tag */}
      <style>{`
        @media (max-width: 640px) {
          .dashboard-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
