import { useEffect, useMemo, useState, useCallback } from 'react'
import { getActiveOrdersApi, updateOrderStatusApi } from '../../api/menu'
import type { Order, OrderStatus } from '../../types/order'
import { useAuth } from '../../context/AuthContext'
import { getApiErrorMessage } from '../../api/error'
import { formatCurrency } from '../../utils/currency'
import { extractTenantId } from '../../utils/jwt'
import LoadingState from '../../components/LoadingState'
import EmptyState from '../../components/EmptyState'
import ToastMessage from '../../components/ToastMessage'
import { subscribeTenantOrders } from '../../realtime/ordersSocket'

// The status flow for an order in the kitchen
const STATUS_FLOW: Record<OrderStatus, OrderStatus | undefined> = {
  PENDING: 'CONFIRMED',
  CONFIRMED: 'PREPARING',
  PREPARING: 'READY',
  READY: 'DELIVERED',
  DELIVERED: undefined,
  CANCELLED: undefined,
}

const STATUS_STYLES: Record<OrderStatus, { bg: string; text: string; badge: string }> = {
  PENDING: {
    bg: 'border-yellow-400',
    text: 'text-yellow-700',
    badge: 'bg-yellow-100 text-yellow-700',
  },
  CONFIRMED: {
    bg: 'border-blue-400',
    text: 'text-blue-700',
    badge: 'bg-blue-100 text-blue-700',
  },
  PREPARING: {
    bg: 'border-orange-400',
    text: 'text-orange-700',
    badge: 'bg-orange-100 text-orange-700',
  },
  READY: {
    bg: 'border-green-400',
    text: 'text-green-700',
    badge: 'bg-green-100 text-green-700',
  },
  DELIVERED: {
    bg: 'border-gray-300',
    text: 'text-gray-700',
    badge: 'bg-gray-100 text-gray-700',
  },
  CANCELLED: {
    bg: 'border-red-400',
    text: 'text-red-700',
    badge: 'bg-red-100 text-red-700',
  },
}

const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: 'New Order',
  CONFIRMED: 'Confirmed',
  PREPARING: 'Preparing',
  READY: 'Ready',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
}

const NEXT_ACTION_LABELS: Record<OrderStatus, string> = {
  PENDING: 'Confirm',
  CONFIRMED: 'Start prep',
  PREPARING: 'Mark ready',
  READY: 'Delivered',
  DELIVERED: 'Completed',
  CANCELLED: 'Cancelled',
}

// Format time elapsed since order was placed
const timeAgo = (createdAt: string): string => {
  const diff = Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  return `${Math.floor(diff / 3600)}h ago`
}

const QUEUE_LIMIT_KEY = 'platterops_queue_limit'
const DEFAULT_QUEUE_LIMIT = 10

export default function KitchenPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState(new Date())
  const [error, setError] = useState('')
  const [wsConnected, setWsConnected] = useState(false)

  // Smart Queue Throttling
  const [queueLimit, setQueueLimit] = useState<number>(() => {
    const stored = localStorage.getItem(QUEUE_LIMIT_KEY)
    return stored ? Number(stored) : DEFAULT_QUEUE_LIMIT
  })
  const [editingLimit, setEditingLimit] = useState(false)
  const [limitInput, setLimitInput] = useState(String(queueLimit))
  const saveQueueLimit = () => {
    const v = parseInt(limitInput)
    if (Number.isFinite(v) && v >= 1 && v <= 100) {
      setQueueLimit(v)
      localStorage.setItem(QUEUE_LIMIT_KEY, String(v))
    }
    setEditingLimit(false)
  }

  const { token, initializing } = useAuth()
  const tenantId = useMemo(() => extractTenantId(token), [token])

  const fetchOrders = useCallback(async (opts?: { silent?: boolean }) => {
    if (!token || !tenantId) return
    if (!opts?.silent) {
      setLoading(true)
    }
    try {
      const data = await getActiveOrdersApi(tenantId, token)
      setOrders(data)
      setLastRefresh(new Date())
      setError('')
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to fetch kitchen orders.'))
    } finally {
      setLoading(false)
    }
  }, [tenantId, token])

  useEffect(() => {
    if (initializing) {
      setLoading(true)
      return
    }
    if (!token) {
      setLoading(true)
      return
    }
    if (!tenantId) {
      setError('Tenant context missing. Please sign in again.')
      setLoading(false)
      return
    }
    fetchOrders()
    const unsubscribe = subscribeTenantOrders(
      tenantId,
      (updatedOrder) => {
        setWsConnected(true)
        setOrders((prev) => {
          const exists = prev.some((o) => o.id === updatedOrder.id)
          if (updatedOrder.status === 'DELIVERED' || updatedOrder.status === 'CANCELLED') {
            return prev.filter((o) => o.id !== updatedOrder.id)
          }
          if (exists) {
            return prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o))
          }
          return [updatedOrder, ...prev]
        })
        setLastRefresh(new Date())
      },
      () => setWsConnected(false)
    )
    const interval = setInterval(() => {
      if (!wsConnected) {
        fetchOrders({ silent: true })
      }
    }, 5000)
    return () => {
      unsubscribe()
      clearInterval(interval)
    }
  }, [fetchOrders, initializing, tenantId, token, wsConnected])

  const handleStatusUpdate = async (orderId: string, nextStatus: OrderStatus) => {
    setUpdating(orderId)
    try {
      const updated = await updateOrderStatusApi(orderId, nextStatus, token ?? '')
      if (nextStatus === 'DELIVERED') {
        setOrders((prev) => prev.filter((o) => o.id !== orderId))
      } else {
        setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)))
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to update order status.'))
    } finally {
      setUpdating(null)
    }
  }

  const columns: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY']
  const ordersByStatus = columns.reduce(
    (acc, status) => {
      acc[status] = orders.filter((o) => o.status === status)
      return acc
    },
    {} as Record<OrderStatus, Order[]>
  )

  // Queue pressure: active (non-delivered) orders vs limit
  const activeCount = orders.filter((o) => !['DELIVERED', 'CANCELLED'].includes(o.status)).length
  const queuePct = Math.round((activeCount / queueLimit) * 100)
  const queueFull = activeCount >= queueLimit
  const queuePressure = queuePct >= 100 ? 'critical' : queuePct >= 75 ? 'high' : queuePct >= 50 ? 'medium' : 'low'

  if (loading)
    return <LoadingState message="Loading kitchen orders..." />

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Kitchen View</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {wsConnected ? 'Live via WebSocket' : 'Polling every 5s'} · Last updated{' '}
            {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
        <button
          onClick={() => {
            void fetchOrders()
          }}
          className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 flex items-center gap-2"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* ─── Smart Queue Throttle Bar ─── */}
      <div className={`mb-4 rounded-xl border p-3 ${queueFull ? 'bg-red-50 border-red-300' : queuePressure === 'high' ? 'bg-amber-50 border-amber-300' : 'bg-white border-gray-100'}`}>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs font-semibold ${queueFull ? 'text-red-700' : queuePressure === 'high' ? 'text-amber-700' : 'text-gray-600'}`}>
                  Queue Pressure
                </span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${queueFull ? 'bg-red-100 text-red-700' : queuePressure === 'high' ? 'bg-amber-100 text-amber-700' : queuePressure === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-emerald-100 text-emerald-700'}`}>
                  {queueFull ? '🔴 PAUSING NEW ORDERS' : queuePressure === 'high' ? '⚠ HIGH' : queuePressure === 'medium' ? '○ MODERATE' : '✓ LOW'}
                </span>
              </div>
              <div className="w-48 h-2 rounded-full bg-gray-200 overflow-hidden">
                <div
                  className={`h-2 rounded-full transition-all ${queueFull ? 'bg-red-500' : queuePressure === 'high' ? 'bg-amber-500' : queuePressure === 'medium' ? 'bg-yellow-400' : 'bg-emerald-400'}`}
                  style={{ width: `${Math.min(queuePct, 100)}%` }}
                />
              </div>
            </div>
            <span className={`text-sm font-bold tabular-nums ${queueFull ? 'text-red-700' : 'text-gray-700'}`}>
              {activeCount} / {queueLimit}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {editingLimit ? (
              <>
                <input
                  type="number" min={1} max={100} value={limitInput}
                  onChange={(e) => setLimitInput(e.target.value)}
                  className="w-16 rounded-lg border border-gray-300 px-2 py-1 text-sm text-center"
                />
                <button onClick={saveQueueLimit} className="rounded-lg bg-gray-800 text-white text-xs px-3 py-1.5 font-semibold hover:bg-gray-700">Save</button>
              </>
            ) : (
              <button
                onClick={() => { setLimitInput(String(queueLimit)); setEditingLimit(true) }}
                className="text-xs text-gray-400 hover:text-gray-700 underline underline-offset-2"
              >
                Max queue: {queueLimit} — change
              </button>
            )}
          </div>
        </div>
        {queueFull && (
          <div className="mt-2 rounded-lg bg-red-100 border border-red-200 px-3 py-2 text-xs text-red-700 font-medium">
            ⚠ Kitchen at full capacity. Consider pausing online ordering or increasing staff. Clear at least {Math.ceil(queueLimit * 0.25)} orders before accepting more.
          </div>
        )}
      </div>

      {error && (
        <ToastMessage
          message={error}
          variant="error"
          actionLabel="Retry"
          onAction={() => {
            void fetchOrders()
          }}
          onClose={() => setError('')}
        />
      )}

      {orders.length === 0 ? (
        <EmptyState icon="🍽️" title="No active orders" description="New orders will appear here automatically." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {columns.map((status) => {
            const style = STATUS_STYLES[status]
            const colOrders = ordersByStatus[status]
            return (
              <div key={status} className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h2
                    className={`font-bold text-sm uppercase tracking-wide ${style.text}`}
                  >
                    {STATUS_LABELS[status]}
                  </h2>
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-full ${style.badge}`}
                  >
                    {colOrders.length}
                  </span>
                </div>

                {colOrders.length === 0 ? (
                  <div className="border-2 border-dashed border-gray-200 rounded-xl h-24 flex items-center justify-center text-gray-300 text-sm">
                    No orders
                  </div>
                ) : (
                  colOrders.map((order) => (
                    <div
                      key={order.id}
                      className={`bg-white rounded-xl border-l-4 ${style.bg} shadow-sm p-4`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <span className="font-bold text-gray-800 text-sm">
                            #{order.id.slice(0, 8).toUpperCase()}
                          </span>
                          {order.tableNumber && (
                            <span className="ml-2 text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-medium">
                              T{order.tableNumber}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-gray-400">
                          {timeAgo(order.createdAt)}
                        </span>
                      </div>

                      <div className="flex flex-col gap-1 mb-3">
                        {order.items.map((item) => (
                          <div
                            key={item.id}
                            className="flex justify-between text-sm"
                          >
                            <span className="text-gray-700">{item.name}</span>
                            <span className="font-semibold text-gray-800">
                              ×{item.quantity}
                            </span>
                          </div>
                        ))}
                      </div>

                      {order.notes && (
                        <p className="text-xs text-gray-400 italic mb-3 border-t border-gray-100 pt-2">
                          &quot;{order.notes}&quot;
                        </p>
                      )}

                      <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                        <span className="text-sm font-bold text-gray-800">
                          {formatCurrency(order.totalAmount)}
                        </span>
                        {STATUS_FLOW[status] && (
                          <button
                            onClick={() => {
                              const nextStatus = STATUS_FLOW[status]
                              if (nextStatus) {
                                handleStatusUpdate(order.id, nextStatus)
                              }
                            }}
                            disabled={updating === order.id}
                            className="text-xs px-3 py-1.5 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 disabled:opacity-50"
                          >
                            {updating === order.id
                              ? '...'
                              : NEXT_ACTION_LABELS[status]}
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
