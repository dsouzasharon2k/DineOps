import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getOrderApi } from '../../api/menu'

const STATUS_LABELS: Record<
  string,
  { label: string; icon: string; color: string }
> = {
  PENDING: {
    label: 'Pending',
    icon: '📋',
    color: 'text-yellow-600 bg-yellow-50',
  },
  CONFIRMED: {
    label: 'Confirmed',
    icon: '✅',
    color: 'text-blue-600 bg-blue-50',
  },
  PREPARING: {
    label: 'Preparing',
    icon: '👨‍🍳',
    color: 'text-orange-600 bg-orange-50',
  },
  READY: {
    label: 'Ready',
    icon: '🛎️',
    color: 'text-green-600 bg-green-50',
  },
  DELIVERED: {
    label: 'Delivered',
    icon: '🎉',
    color: 'text-gray-600 bg-gray-50',
  },
  CANCELLED: {
    label: 'Cancelled',
    icon: '❌',
    color: 'text-red-600 bg-red-50',
  },
}

interface OrderItem {
  id: string
  name: string
  quantity: number
  price: number
}

interface Order {
  id: string
  status: string
  totalAmount: number
  notes: string
  createdAt: string
  items: OrderItem[]
}

export default function OrderHistoryPage() {
  const { tenantId } = useParams<{ tenantId: string }>()
  const navigate = useNavigate()
  const [orderId, setOrderId] = useState('')
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLookup = async () => {
    const trimmed = orderId.trim()
    if (!trimmed) return
    setLoading(true)
    setError('')
    setOrder(null)
    try {
      const data = await getOrderApi(trimmed)
      setOrder(data)
    } catch {
      setError('Order not found. Please check the ID and try again.')
    } finally {
      setLoading(false)
    }
  }

  const statusInfo = order
    ? (STATUS_LABELS[order.status] ?? STATUS_LABELS['PENDING'])
    : null

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm px-4 py-4 flex items-center gap-3">
        <button
          onClick={() => navigate(`/menu/${tenantId}`)}
          className="text-gray-500 hover:text-gray-700 text-xl"
        >
          ←
        </button>
        <h1 className="text-lg font-bold text-gray-800">Track Your Order</h1>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Lookup form */}
        <div className="bg-white rounded-xl shadow-sm p-5 mb-6">
          <p className="text-sm text-gray-500 mb-3">
            Enter your Order ID to check the status of your order.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
              placeholder="e.g. 6d62181c-f8a6-4b99-..."
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
            />
            <button
              onClick={handleLookup}
              disabled={loading || !orderId.trim()}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-50"
            >
              {loading ? '...' : 'Track'}
            </button>
          </div>
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </div>

        {/* Order result */}
        {order && statusInfo && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            {/* Status banner */}
            <div
              className={`px-5 py-4 flex items-center gap-3 ${statusInfo.color}`}
            >
              <span className="text-2xl">{statusInfo.icon}</span>
              <div>
                <p className="font-bold">{statusInfo.label}</p>
                <p className="text-xs opacity-75">
                  Order #{order.id.slice(0, 8).toUpperCase()}
                </p>
              </div>
              {!['DELIVERED', 'CANCELLED'].includes(order.status) && (
                <button
                  onClick={() =>
                    navigate(`/menu/${tenantId}/order/${order.id}`)
                  }
                  className="ml-auto text-xs px-3 py-1 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600"
                >
                  Live Track →
                </button>
              )}
            </div>

            {/* Items */}
            <div className="divide-y divide-gray-100">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between px-5 py-3"
                >
                  <div>
                    <p className="font-medium text-gray-800 text-sm">
                      {item.name}
                    </p>
                    <p className="text-xs text-gray-400">Qty: {item.quantity}</p>
                  </div>
                  <p className="font-semibold text-gray-800 text-sm">
                    ₹{(item.price * item.quantity) / 100}
                  </p>
                </div>
              ))}
            </div>

            {/* Notes */}
            {order.notes && (
              <div className="px-5 py-3 border-t border-gray-100">
                <p className="text-xs text-gray-400 italic">
                  &quot;{order.notes}&quot;
                </p>
              </div>
            )}

            {/* Total */}
            <div className="px-5 py-4 border-t border-gray-100 flex justify-between font-bold text-gray-800">
              <span>Total</span>
              <span>₹{order.totalAmount / 100}</span>
            </div>

            {/* Order again */}
            <div className="px-5 pb-5">
              <button
                onClick={() => navigate(`/menu/${tenantId}`)}
                className="w-full py-3 border-2 border-orange-500 text-orange-500 rounded-xl font-semibold text-sm hover:bg-orange-50"
              >
                Order Again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
