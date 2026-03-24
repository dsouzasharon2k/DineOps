import { useCallback, useEffect, useMemo, useState } from 'react'
import { getAnalyticsSummaryApi } from '../../api/analytics'
import { getApiErrorMessage } from '../../api/error'
import { formatCurrency } from '../../utils/currency'
import { useAuth } from '../../context/AuthContext'
import type { AnalyticsSummary } from '../../types/analytics'

const extractTenantId = (token: string | null): string | null => {
  if (!token) return null
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.tenantId ?? null
  } catch {
    return null
  }
}

const STATUS_DOT: Record<string, string> = {
  PENDING: 'bg-yellow-400',
  CONFIRMED: 'bg-blue-400',
  PREPARING: 'bg-orange-400',
  READY: 'bg-green-400',
  DELIVERED: 'bg-gray-300',
  CANCELLED: 'bg-red-400',
}

const DashboardHome = () => {
  const { token } = useAuth()
  const tenantId = useMemo(() => extractTenantId(token), [token])
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!tenantId) {
      setLoading(false)
      return
    }
    try {
      setError('')
      const data = await getAnalyticsSummaryApi(tenantId)
      setSummary(data)
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load analytics summary.'))
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  useEffect(() => {
    load()
  }, [load])

  if (!tenantId) {
    return <p className="text-sm text-gray-500">Tenant context missing for analytics.</p>
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-xl bg-white p-4 h-20 border border-gray-100" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {[0, 1].map((i) => <div key={i} className="rounded-xl bg-white h-40" />)}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
        {error}
      </div>
    )
  }

  if (!summary) {
    return <p className="text-sm text-gray-500">No analytics data available.</p>
  }

  const trend = summary.revenueTrend
  const revenueToday = trend.at(-1)?.revenue ?? summary.todaysRevenue
  const revenueYesterday = trend.at(-2)?.revenue ?? 0
  const revenueDelta =
    revenueYesterday > 0
      ? Math.round(((revenueToday - revenueYesterday) / revenueYesterday) * 100)
      : null

  const maxRevenue = Math.max(...trend.map((r) => r.revenue), 1)
  const maxTopItem = Math.max(...summary.topMenuItems.map((i) => i.count), 1)

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Analytics</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {/* Today's orders */}
        <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Today's orders</p>
          <p className="mt-2 text-3xl font-bold text-gray-900 tabular-nums">{summary.todaysOrderCount}</p>
        </div>

        {/* Today's revenue with delta */}
        <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100">
          <div className="flex items-start justify-between">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Today's revenue</p>
            {revenueDelta !== null && (
              <span
                className={`text-[11px] font-bold px-1.5 py-0.5 rounded-md ${
                  revenueDelta >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'
                }`}
              >
                {revenueDelta >= 0 ? '+' : ''}{revenueDelta}%
              </span>
            )}
          </div>
          <p className="mt-2 text-3xl font-bold text-gray-900 tabular-nums">{formatCurrency(summary.todaysRevenue)}</p>
          {revenueDelta !== null && (
            <p className="text-[11px] text-gray-400 mt-1">vs yesterday</p>
          )}
        </div>

        {/* Avg order value */}
        <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Avg order value</p>
          <p className="mt-2 text-3xl font-bold text-gray-900 tabular-nums">{formatCurrency(summary.averageOrderValue)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Orders by status */}
        <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100">
          <p className="text-sm font-semibold text-gray-700 mb-3">Orders by status</p>
          <div className="space-y-2.5">
            {summary.ordersByStatus.map((item) => (
              <div key={item.status} className="flex items-center gap-2.5 text-sm">
                <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[item.status] ?? 'bg-gray-300'}`} />
                <span className="flex-1 text-gray-500 capitalize">{item.status.toLowerCase()}</span>
                <span className="font-semibold text-gray-800 tabular-nums">{item.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Prep time */}
        <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100">
          <p className="text-sm font-semibold text-gray-700 mb-2">Avg prep time</p>
          <p className="text-4xl font-bold text-gray-900 tabular-nums">
            {summary.averagePreparationMinutes.toFixed(1)}
            <span className="text-xl font-medium text-gray-400 ml-1">min</span>
          </p>
          <p className="text-xs text-gray-400 mt-2">From CONFIRMED → READY</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Revenue trend bar chart */}
        <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100">
          <p className="text-sm font-semibold text-gray-700 mb-4">Revenue trend — 7 days</p>
          <div className="flex items-end gap-1.5 h-28">
            {trend.map((point, i) => {
              const isToday = i === trend.length - 1
              return (
                <div key={point.date} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className={`w-full rounded-t-sm transition-colors ${isToday ? 'bg-orange-500' : 'bg-orange-200 hover:bg-orange-300'}`}
                    style={{ height: `${(point.revenue / maxRevenue) * 112}px`, minHeight: '2px' }}
                    title={`${point.date}: ${formatCurrency(point.revenue)}`}
                  />
                  <span className={`text-[10px] ${isToday ? 'font-bold text-orange-500' : 'text-gray-400'}`}>
                    {new Date(point.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short' }).slice(0, 1)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Top items */}
        <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100">
          <p className="text-sm font-semibold text-gray-700 mb-3">Top 5 menu items</p>
          {summary.topMenuItems.length === 0 ? (
            <p className="text-sm text-gray-400">No item data yet.</p>
          ) : (
            <div className="space-y-3">
              {summary.topMenuItems.map((item, i) => (
                <div key={item.name} className="grid grid-cols-[20px_1fr_40px] items-center gap-2 text-xs">
                  <span className="text-gray-300 font-bold tabular-nums">{i + 1}</span>
                  <div>
                    <p className="truncate text-gray-700 font-medium">{item.name}</p>
                    <div className="mt-1 h-1.5 rounded-full bg-gray-100">
                      <div
                        className="h-1.5 rounded-full bg-emerald-400"
                        style={{ width: `${(item.count / maxTopItem) * 100}%` }}
                      />
                    </div>
                  </div>
                  <p className="text-right font-bold text-gray-700 tabular-nums">{item.count}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  )
}

export default DashboardHome
