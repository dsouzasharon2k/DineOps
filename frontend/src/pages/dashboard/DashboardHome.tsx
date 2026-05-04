import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getActionsTodayApi, getAnalyticsSummaryApi, getConversionFunnelApi } from '../../api/analytics'
import { getAlertsSummaryApi } from '../../api/alerts'
import { getMenuInsightsApi } from '../../api/menuInsights'
import { getFinanceSummaryApi } from '../../api/finance'
import { getInventoryByTenantApi } from '../../api/inventory'
import { getActiveOrdersApi } from '../../api/menu'
import { getApiErrorMessage } from '../../api/error'
import { formatCurrency } from '../../utils/currency'
import { useAuth } from '../../context/AuthContext'
import { extractTenantId } from '../../utils/jwt'
import type { ActionRecommendation, AnalyticsSummary, ConversionFunnel } from '../../types/analytics'
import type { AlertSummaryItem } from '../../types/alerts'
import type { FinanceSummary } from '../../types/finance'
import type { Order } from '../../types/order'
import type { InventoryItem } from '../../types/inventory'

const STATUS_DOT: Record<string, string> = {
  PENDING: 'bg-yellow-400',
  CONFIRMED: 'bg-blue-400',
  PREPARING: 'bg-orange-400',
  READY: 'bg-green-400',
  DELIVERED: 'bg-gray-300',
  CANCELLED: 'bg-red-400',
}

const COMMISSION_STORAGE_KEY = 'dineops_commission_rate'
const DEFAULT_COMMISSION_RATE = 25

const LABOR_CATS = ['STAFF', 'WAGES', 'LABOR', 'STAFF_MEAL', 'STAFF_WELFARE', 'OVERTIME']

const todayIso = () => new Date().toISOString().slice(0, 10)

const DashboardHome = () => {
  const { token } = useAuth()
  const tenantId = useMemo(() => extractTenantId(token), [token])
  const [menuRecommendations, setMenuRecommendations] = useState<string[]>([])
  const [actionsToday, setActionsToday] = useState<ActionRecommendation[]>([])
  const [alerts, setAlerts] = useState<AlertSummaryItem[]>([])
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null)
  const [finance, setFinance] = useState<FinanceSummary | null>(null)
  const [activeOrders, setActiveOrders] = useState<Order[]>([])
  const [lowStockItems, setLowStockItems] = useState<InventoryItem[]>([])
  const [funnel, setFunnel] = useState<ConversionFunnel | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Commission rate — persisted in localStorage
  const [commissionRate, setCommissionRate] = useState<number>(() => {
    const stored = localStorage.getItem(COMMISSION_STORAGE_KEY)
    return stored ? Number(stored) : DEFAULT_COMMISSION_RATE
  })
  const [editingRate, setEditingRate] = useState(false)
  const [rateInput, setRateInput] = useState(String(commissionRate))

  const saveCommissionRate = () => {
    const v = parseFloat(rateInput)
    if (Number.isFinite(v) && v > 0 && v <= 100) {
      setCommissionRate(v)
      localStorage.setItem(COMMISSION_STORAGE_KEY, String(v))
    }
    setEditingRate(false)
  }

  const today = todayIso()

  const load = useCallback(async () => {
    if (!tenantId) {
      setLoading(false)
      return
    }
    try {
      setError('')
      const [data, insights, actions, alertSummary, financeData, orders, inventoryData, funnelData] = await Promise.all([
        getAnalyticsSummaryApi(tenantId),
        getMenuInsightsApi(tenantId),
        getActionsTodayApi(tenantId),
        getAlertsSummaryApi(tenantId),
        getFinanceSummaryApi(tenantId, today, today).catch(() => null),
        getActiveOrdersApi(tenantId, token ?? '').catch(() => [] as Order[]),
        getInventoryByTenantApi(tenantId).catch(() => [] as InventoryItem[]),
        getConversionFunnelApi(tenantId, 7).catch(() => null),
      ])
      setSummary(data)
      setMenuRecommendations(insights.recommendations.slice(0, 3))
      setActionsToday(actions)
      setAlerts(alertSummary)
      setFinance(financeData)
      setActiveOrders(orders)
      setLowStockItems(inventoryData.filter((i) => i.lowStock))
      setFunnel(funnelData)
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load analytics summary.'))
    } finally {
      setLoading(false)
    }
  }, [tenantId, today])

  useEffect(() => {
    load()
  }, [load])

  if (!tenantId) {
    return <p className="text-sm text-gray-500">Tenant context missing for analytics.</p>
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-20 rounded-xl bg-white border border-gray-100" />
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
  const wastageToday = summary.wastageTrend.at(-1)?.revenue ?? summary.todaysWastage
  const wastageYesterday = summary.wastageTrend.at(-2)?.revenue ?? 0
  const wastageDelta =
    wastageYesterday > 0
      ? Math.round(((wastageToday - wastageYesterday) / wastageYesterday) * 100)
      : null

  const maxRevenue = Math.max(...trend.map((r) => r.revenue), 1)
  const maxWastage = Math.max(...summary.wastageTrend.map((w) => w.revenue), 1)
  const maxTopItem = Math.max(...summary.topMenuItems.map((i) => i.count), 1)
  const unreadAlerts = alerts.filter((alert) => !alert.read)
  const unreadCriticalCount = unreadAlerts.filter((alert) => alert.severity === 'CRITICAL').length
  const unreadWarningCount = unreadAlerts.filter((alert) => alert.severity === 'WARNING').length
  const unreadInfoCount = unreadAlerts.filter((alert) => alert.severity === 'INFO').length

  // Commission savings — vs what Swiggy/Zomato would have charged
  const monthRevenue = trend.reduce((s, r) => s + r.revenue, 0)
  const commissionSavedMonth = Math.round(monthRevenue * (commissionRate / 100))
  const commissionSavedToday = Math.round(summary.todaysRevenue * (commissionRate / 100))

  // Prime cost: Labor (from finance today) + Food cost estimate (revenue - profit - wastage) as % of revenue
  const laborCostToday = (finance?.byCategory ?? [])
    .filter((c) => LABOR_CATS.includes(c.category.toUpperCase()))
    .reduce((s, c) => s + c.amount, 0)
  const estimatedFoodCost = Math.max(summary.todaysRevenue - summary.todaysProfit - summary.todaysWastage, 0)
  const primeCostToday = laborCostToday + estimatedFoodCost
  const primeCostPct = summary.todaysRevenue > 0
    ? Math.round((primeCostToday / summary.todaysRevenue) * 100)
    : null
  const laborPctToday = summary.todaysRevenue > 0
    ? Math.round((laborCostToday / summary.todaysRevenue) * 100)
    : 0
  const foodCostPctToday = summary.todaysRevenue > 0
    ? Math.round((estimatedFoodCost / summary.todaysRevenue) * 100)
    : 0

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <Link
          to="/dashboard/closing-report"
          className="shrink-0 rounded-lg bg-gray-900 text-white text-xs font-semibold px-3 py-2 hover:bg-gray-800 transition flex items-center gap-1.5"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
          </svg>
          Daily Closing Report
        </Link>
      </div>

      {/* ─── Commission Savings Banner ─── */}
      <div className="rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-100">Commission Saved This Month</p>
            <p className="mt-1 text-4xl font-bold tabular-nums">{formatCurrency(commissionSavedMonth)}</p>
            <p className="text-emerald-100 text-xs mt-1">
              vs paying Zomato/Swiggy {commissionRate}% on {formatCurrency(monthRevenue)} revenue — Today: {formatCurrency(commissionSavedToday)}
            </p>
          </div>
          <div className="shrink-0">
            {editingRate ? (
              <div className="flex items-center gap-2 bg-white/20 rounded-lg px-3 py-2">
                <span className="text-xs text-white">Rate:</span>
                <input
                  type="number"
                  value={rateInput}
                  onChange={(e) => setRateInput(e.target.value)}
                  className="w-16 rounded bg-white/20 border border-white/30 text-white text-sm px-2 py-1 tabular-nums"
                  min="1" max="100"
                />
                <span className="text-xs text-white">%</span>
                <button onClick={saveCommissionRate} className="text-xs bg-white text-emerald-700 px-2 py-1 rounded font-semibold hover:bg-emerald-50">Save</button>
              </div>
            ) : (
              <button
                onClick={() => { setRateInput(String(commissionRate)); setEditingRate(true) }}
                className="text-xs text-emerald-100 hover:text-white underline underline-offset-2"
              >
                Using {commissionRate}% rate — change
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ─── Stat cards ─── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Today's orders</p>
          <p className="mt-2 text-3xl font-bold text-gray-900 tabular-nums">{summary.todaysOrderCount}</p>
        </div>

        <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100">
          <div className="flex items-start justify-between">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Today's revenue</p>
            {revenueDelta !== null && (
              <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-md ${revenueDelta >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                {revenueDelta >= 0 ? '+' : ''}{revenueDelta}%
              </span>
            )}
          </div>
          <p className="mt-2 text-3xl font-bold text-gray-900 tabular-nums">{formatCurrency(summary.todaysRevenue)}</p>
          {revenueDelta !== null && <p className="text-[11px] text-gray-400 mt-1">vs yesterday</p>}
        </div>

        <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Avg order value</p>
          <p className="mt-2 text-3xl font-bold text-gray-900 tabular-nums">{formatCurrency(summary.averageOrderValue)}</p>
        </div>

        <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Today's profit</p>
          <p className={`mt-2 text-3xl font-bold tabular-nums ${summary.todaysProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {formatCurrency(summary.todaysProfit)}
          </p>
        </div>

        <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100">
          <div className="flex items-start justify-between">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Today's wastage</p>
            {wastageDelta !== null && (
              <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-md ${wastageDelta <= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                {wastageDelta >= 0 ? '+' : ''}{wastageDelta}%
              </span>
            )}
          </div>
          <p className="mt-2 text-3xl font-bold text-gray-900 tabular-nums">{formatCurrency(summary.todaysWastage)}</p>
          {wastageDelta !== null && <p className="text-[11px] text-gray-400 mt-1">vs yesterday</p>}
        </div>
      </div>

      {funnel && (
        <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-800">Conversion Funnel (Last {funnel.windowDays}d)</h2>
            <span className="text-xs text-gray-400">Menu → Checkout → Order → Paid</span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="rounded-lg bg-gray-50 px-3 py-2">
              <p className="text-[11px] text-gray-400 uppercase tracking-wide">Menu Views</p>
              <p className="text-lg font-bold tabular-nums">{funnel.menuViews}</p>
            </div>
            <div className="rounded-lg bg-blue-50 px-3 py-2">
              <p className="text-[11px] text-blue-500 uppercase tracking-wide">Checkout Starts</p>
              <p className="text-lg font-bold tabular-nums text-blue-700">{funnel.checkoutStarts}</p>
              <p className="text-[11px] text-blue-500">{funnel.menuToCheckoutRatePct.toFixed(1)}%</p>
            </div>
            <div className="rounded-lg bg-amber-50 px-3 py-2">
              <p className="text-[11px] text-amber-500 uppercase tracking-wide">Orders Placed</p>
              <p className="text-lg font-bold tabular-nums text-amber-700">{funnel.ordersPlaced}</p>
              <p className="text-[11px] text-amber-500">{funnel.checkoutToOrderRatePct.toFixed(1)}%</p>
            </div>
            <div className="rounded-lg bg-purple-50 px-3 py-2">
              <p className="text-[11px] text-purple-500 uppercase tracking-wide">Payment Starts</p>
              <p className="text-lg font-bold tabular-nums text-purple-700">{funnel.paymentsInitiated}</p>
            </div>
            <div className="rounded-lg bg-emerald-50 px-3 py-2">
              <p className="text-[11px] text-emerald-500 uppercase tracking-wide">Payments Succeeded</p>
              <p className="text-lg font-bold tabular-nums text-emerald-700">{funnel.paymentsSucceeded}</p>
              <p className="text-[11px] text-emerald-500">{funnel.orderToPaymentSuccessRatePct.toFixed(1)}%</p>
            </div>
          </div>
        </div>
      )}

      {/* ─── Prime Cost Meter ─── */}
      <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-semibold text-gray-700">Prime Cost Meter</p>
            <p className="text-xs text-gray-400">Food Cost + Labor Cost as % of revenue (target: 55–65%)</p>
          </div>
          {primeCostPct !== null && (
            <span className={`text-sm font-bold px-3 py-1 rounded-full ${primeCostPct <= 65 ? 'bg-emerald-50 text-emerald-700' : primeCostPct <= 75 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>
              {primeCostPct}%
            </span>
          )}
        </div>
        <div className="space-y-2">
          {/* Food cost bar */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-500">Est. food cost (COGS)</span>
              <span className="font-medium text-gray-700 tabular-nums">{formatCurrency(estimatedFoodCost)} — {foodCostPctToday}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-2 bg-orange-400 rounded-full transition-all" style={{ width: `${Math.min(foodCostPctToday, 100)}%` }} />
            </div>
          </div>
          {/* Labor cost bar */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-500">Labor cost (logged today)</span>
              <span className="font-medium text-gray-700 tabular-nums">{formatCurrency(laborCostToday)} — {laborPctToday}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-2 bg-blue-400 rounded-full transition-all" style={{ width: `${Math.min(laborPctToday, 100)}%` }} />
            </div>
          </div>
          {/* Combined prime cost */}
          {primeCostPct !== null && (
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-gray-700">Prime Cost</span>
                <span className="font-bold text-gray-900 tabular-nums">{primeCostPct}% of revenue</span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden relative">
                <div
                  className={`h-3 rounded-full transition-all ${primeCostPct <= 65 ? 'bg-emerald-500' : primeCostPct <= 75 ? 'bg-amber-500' : 'bg-red-500'}`}
                  style={{ width: `${Math.min(primeCostPct, 100)}%` }}
                />
                {/* Target zone marker at 55-65% */}
                <div className="absolute top-0 bottom-0 bg-emerald-200/60 rounded-sm" style={{ left: '55%', width: '10%' }} title="Target 55–65%" />
              </div>
              <p className="text-[10px] text-gray-400 mt-1">
                {primeCostPct <= 65 ? '✓ Within healthy range' : primeCostPct <= 75 ? '⚠ Slightly above target — review labor schedule' : '✗ High prime cost — action required'}
              </p>
            </div>
          )}
        </div>
        <p className="mt-3 text-[11px] text-gray-400">
          Labor cost is from today's logged expenses.{' '}
          <Link to="/dashboard/staff" className="text-orange-500 hover:underline">Log staff expenses →</Link>
        </p>
      </div>

      {/* ─── Alerts ─── */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-gray-700">Active Alerts</p>
            <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700">
              {alerts.filter((alert) => !alert.read && alert.severity !== 'INFO').length}
            </span>
          </div>
          {alerts.length > 0 && <p className="mt-2 text-sm text-gray-600">Top signal: {alerts[0].title}</p>}
        </div>

        <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-gray-700">Unread Alerts</p>
            <span className="rounded bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700">{unreadAlerts.length}</span>
          </div>
          {unreadAlerts.length === 0 ? (
            <p className="mt-2 text-sm text-gray-500">Operations are stable right now.</p>
          ) : (
            <div className="mt-2 space-y-1">
              {unreadAlerts.slice(0, 2).map((alert, index) => (
                <p key={`${alert.id ?? alert.title}-${index}`} className="text-sm text-gray-700">• {alert.title}</p>
              ))}
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <Link to="/dashboard/alerts?visibility=UNREAD" className="inline-flex rounded border border-gray-300 px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50">Alert Center</Link>
            <Link to="/dashboard/alerts?visibility=UNREAD&severity=CRITICAL" className="inline-flex rounded border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100">Critical ({unreadCriticalCount})</Link>
            <Link to="/dashboard/alerts?visibility=UNREAD&severity=WARNING" className="inline-flex rounded border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100">Warning ({unreadWarningCount})</Link>
            <Link to="/dashboard/alerts?visibility=UNREAD&severity=INFO" className="inline-flex rounded border border-sky-200 bg-sky-50 px-2.5 py-1.5 text-xs font-semibold text-sky-700 hover:bg-sky-100">Info ({unreadInfoCount})</Link>
          </div>
        </div>
      </div>

      {/* ─── Blueprint Wireframe: Live Order Stream + Quick Insights ─── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

        {/* Left 65%: Live Order Stream */}
        <div className="lg:col-span-2 rounded-xl bg-white shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-sm font-semibold text-gray-800">Live Order Stream</p>
            </div>
            <Link to="/dashboard/kitchen" className="text-xs text-orange-500 font-medium hover:text-orange-700">
              Kitchen view →
            </Link>
          </div>

          {activeOrders.filter((o) => !['DELIVERED', 'CANCELLED'].includes(o.status)).length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-2xl mb-1">🍽️</p>
              <p className="text-sm text-gray-400">No active orders right now.</p>
              <p className="text-xs text-gray-300 mt-1">New orders will appear here instantly.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {activeOrders
                .filter((o) => !['DELIVERED', 'CANCELLED'].includes(o.status))
                .slice(0, 8)
                .map((order) => {
                  const elapsedMin = Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000)
                  const isLate = elapsedMin > 30
                  const statusStyle = STATUS_DOT[order.status] ?? 'bg-gray-300'
                  const itemSummary = order.items.slice(0, 3).map((i) => `${i.quantity}× ${i.name}`).join(', ')
                  const more = order.items.length > 3 ? ` +${order.items.length - 3} more` : ''
                  return (
                    <div key={order.id} className={`flex items-center gap-3 px-4 py-3 ${isLate ? 'bg-red-50' : ''}`}>
                      <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${statusStyle}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-xs font-bold text-gray-800">
                            #{order.id.slice(-4).toUpperCase()}
                            {order.tableNumber && <span className="ml-1 text-gray-400">· Table {order.tableNumber}</span>}
                          </p>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' : order.status === 'CONFIRMED' ? 'bg-blue-100 text-blue-700' : order.status === 'PREPARING' ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'}`}>
                            {order.status}
                          </span>
                          {isLate && <span className="text-[10px] font-bold text-red-600">⚠ {elapsedMin}m</span>}
                        </div>
                        <p className="text-xs text-gray-500 truncate mt-0.5">{itemSummary}{more}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-xs font-semibold text-gray-700">{formatCurrency(order.totalAmount)}</p>
                        <p className={`text-[10px] mt-0.5 tabular-nums ${isLate ? 'text-red-600 font-bold' : 'text-gray-400'}`}>{elapsedMin}m ago</p>
                      </div>
                    </div>
                  )
                })}
            </div>
          )}
        </div>

        {/* Right 35%: Quick Insights */}
        <div className="flex flex-col gap-3">
          {/* Avg prep time */}
          <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-1">Avg Prep Time</p>
            <p className="text-3xl font-bold text-gray-900 tabular-nums">
              {summary.averagePreparationMinutes.toFixed(1)}
              <span className="text-base font-medium text-gray-400 ml-1">min</span>
            </p>
            <p className="text-[10px] text-gray-400 mt-1">
              {summary.averagePreparationMinutes <= 20 ? '✓ Kitchen efficient' : summary.averagePreparationMinutes <= 35 ? '⚠ Moderate load' : '✗ Kitchen overloaded'}
            </p>
          </div>

          {/* Top seller */}
          {summary.topMenuItems[0] && (
            <div className="rounded-xl bg-orange-50 border border-orange-100 p-4">
              <p className="text-[11px] font-semibold text-orange-400 uppercase tracking-widest">⭐ Top Seller</p>
              <p className="mt-1 text-sm font-bold text-orange-700 truncate">{summary.topMenuItems[0].name}</p>
              <p className="text-xs text-orange-500">{summary.topMenuItems[0].count} sold this week</p>
            </div>
          )}

          {/* Low stock alert */}
          <div className={`rounded-xl p-4 border ${lowStockItems.length > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-100'}`}>
            <p className={`text-[11px] font-semibold uppercase tracking-widest ${lowStockItems.length > 0 ? 'text-red-400' : 'text-gray-400'}`}>
              {lowStockItems.length > 0 ? '🔴 Low Stock' : '✅ Stock OK'}
            </p>
            {lowStockItems.length === 0 ? (
              <p className="mt-1 text-xs text-gray-500">All items are well-stocked.</p>
            ) : (
              <>
                <p className="mt-1 text-sm font-bold text-red-700 truncate">{lowStockItems[0].menuItemName}</p>
                {lowStockItems.length > 1 && <p className="text-xs text-red-500">+{lowStockItems.length - 1} more items</p>}
                <Link to="/dashboard/inventory" className="mt-2 inline-block text-[11px] font-semibold text-red-600 underline underline-offset-2">
                  View Inventory →
                </Link>
              </>
            )}
          </div>

          {/* Orders by status mini */}
          <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Status Breakdown</p>
            <div className="space-y-1.5">
              {summary.ordersByStatus.filter((s) => s.count > 0).map((item) => (
                <div key={item.status} className="flex items-center gap-2 text-xs">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[item.status] ?? 'bg-gray-300'}`} />
                  <span className="flex-1 text-gray-500 capitalize">{item.status.toLowerCase()}</span>
                  <span className="font-bold text-gray-800">{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Charts ─── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
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

        <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100">
          <p className="text-sm font-semibold text-gray-700 mb-4">Wastage trend — 7 days</p>
          <div className="flex items-end gap-1.5 h-28">
            {summary.wastageTrend.map((point, i) => {
              const isToday = i === summary.wastageTrend.length - 1
              return (
                <div key={point.date} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className={`w-full rounded-t-sm transition-colors ${isToday ? 'bg-rose-500' : 'bg-rose-200 hover:bg-rose-300'}`}
                    style={{ height: `${(point.revenue / maxWastage) * 112}px`, minHeight: '2px' }}
                    title={`${point.date}: ${formatCurrency(point.revenue)}`}
                  />
                  <span className={`text-[10px] ${isToday ? 'font-bold text-rose-500' : 'text-gray-400'}`}>
                    {new Date(point.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short' }).slice(0, 1)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

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
                      <div className="h-1.5 rounded-full bg-emerald-400" style={{ width: `${(item.count / maxTopItem) * 100}%` }} />
                    </div>
                  </div>
                  <p className="text-right font-bold text-gray-700 tabular-nums">{item.count}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── Actions Today ─── */}
      <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100">
        <p className="text-sm font-semibold text-gray-700 mb-3">Actions Today</p>
        {actionsToday.length > 0 ? (
          <ul className="space-y-2">
            {actionsToday.map((action) => (
              <li key={action.title} className="rounded-md bg-gray-50 px-3 py-3 text-sm text-gray-700">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-gray-800">{action.title}</p>
                  <span className="rounded bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                    Impact: {formatCurrency(action.estimatedImpactPaise)} / {action.impactWindow}
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-600">{action.rationale}</p>
              </li>
            ))}
          </ul>
        ) : menuRecommendations.length === 0 ? (
          <p className="text-sm text-gray-500">No recommendation signals yet for the current data range.</p>
        ) : (
          <ul className="space-y-2">
            {menuRecommendations.map((recommendation) => (
              <li key={recommendation} className="rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-700">{recommendation}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

export default DashboardHome
