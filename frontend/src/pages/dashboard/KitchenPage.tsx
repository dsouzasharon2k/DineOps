import { useEffect, useState, useCallback } from 'react'
import { getActiveOrdersApi, updateOrderStatusApi } from '../../api/menu'
import type { Order, OrderStatus } from '../../types/order'
import { useAuth } from '../../context/AuthContext'
import { getApiErrorMessage } from '../../api/error'
import LoadingState from '../../components/LoadingState'
import EmptyState from '../../components/EmptyState'

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
  PENDING: '✅ Confirm',
  CONFIRMED: '👨‍🍳 Start Preparing',
  PREPARING: '🛎️ Mark Ready',
  READY: '✓ Delivered',
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

export default function KitchenPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState(new Date())
  const [error, setError] = useState('')

  const { token } = useAuth()
  const tenantId = 'a085284e-ca00-4f64-a2c7-42fc0572bb97'

  const fetchOrders = useCallback(async () => {
    try {
      const data = await getActiveOrdersApi(tenantId, token ?? '')
      setOrders(data)
      setLastRefresh(new Date())
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to fetch kitchen orders.'))
    } finally {
      setLoading(false)
    }
  }, [tenantId, token])

  useEffect(() => {
    fetchOrders()
    const interval = setInterval(fetchOrders, 15000)
    return () => clearInterval(interval)
  }, [fetchOrders])

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

  if (loading)
    return <LoadingState message="Loading kitchen orders..." />

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Kitchen View</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Auto-refreshes every 15s · Last updated{' '}
            {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
        <button
          onClick={fetchOrders}
          className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600"
        >
          🔄 Refresh
        </button>
      </div>
      {error && (
        <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
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
                        <span className="font-bold text-gray-800 text-sm">
                          #{order.id.slice(0, 8).toUpperCase()}
                        </span>
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
                          ₹{order.totalAmount / 100}
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
