import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getOrderApi } from '../../api/menu';

interface OrderStatus {
  id: string;
  status: string;
  totalAmount: number;
  notes: string;
  createdAt: string;
  items: {
    id: string;
    name: string;
    price: number;
    quantity: number;
  }[];
}

// Maps status to display label and progress step
const STATUS_STEPS = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERED'];

const STATUS_LABELS: Record<string, { label: string; icon: string; message: string }> = {
  PENDING:   { label: 'Order Placed',    icon: '📋', message: 'Waiting for restaurant to confirm...' },
  CONFIRMED: { label: 'Confirmed',       icon: '✅', message: 'Restaurant has confirmed your order!' },
  PREPARING: { label: 'Being Prepared',  icon: '👨‍🍳', message: 'Kitchen is preparing your food...' },
  READY:     { label: 'Ready!',          icon: '🛎️', message: 'Your order is ready!' },
  DELIVERED: { label: 'Delivered',       icon: '🎉', message: 'Enjoy your meal!' },
  CANCELLED: { label: 'Cancelled',       icon: '❌', message: 'This order was cancelled.' },
};

export default function OrderStatusPage() {
  const { tenantId, orderId } = useParams<{ tenantId: string; orderId: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrder();
    // Poll every 10 seconds for status updates
    const interval = setInterval(fetchOrder, 10000);
    return () => clearInterval(interval);
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      const data = await getOrderApi(orderId!);
      setOrder(data);
    } catch (err) {
      console.error('Failed to fetch order', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Loading order...</p>
    </div>
  );

  if (!order) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-red-500">Order not found.</p>
    </div>
  );

  const statusInfo = STATUS_LABELS[order.status] ?? STATUS_LABELS['PENDING'];
  const currentStep = STATUS_STEPS.indexOf(order.status);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-orange-500 text-white px-4 py-6 text-center">
        <div className="text-5xl mb-2">{statusInfo.icon}</div>
        <h1 className="text-2xl font-bold">{statusInfo.label}</h1>
        <p className="text-orange-100 mt-1">{statusInfo.message}</p>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Progress bar (only for non-cancelled orders) */}
        {order.status !== 'CANCELLED' && (
          <div className="bg-white rounded-xl shadow-sm px-4 py-5 mb-4">
            <div className="relative flex items-center justify-between">
              {STATUS_STEPS.slice(0, 4).map((step, idx) => (
                <div key={step} className="flex flex-col items-center flex-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    idx <= currentStep
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-200 text-gray-400'
                  }`}>
                    {idx < currentStep ? '✓' : idx + 1}
                  </div>
                  <p className="text-xs text-gray-500 mt-1 text-center leading-tight">
                    {STATUS_LABELS[step].label}
                  </p>
                  {idx < 3 && (
                    <div className={`absolute top-4 left-0 right-0 h-0.5 ${
                      idx < currentStep ? 'bg-orange-500' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Order details */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-4">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="font-semibold text-gray-700">Order Details</p>
            <p className="text-xs text-gray-400 mt-0.5">#{order.id.slice(0, 8).toUpperCase()}</p>
          </div>
          {order.items.map((item, idx) => (
            <div
              key={item.id}
              className={`flex items-center justify-between px-4 py-3 ${
                idx < order.items.length - 1 ? 'border-b border-gray-100' : ''
              }`}
            >
              <div>
                <p className="font-medium text-gray-800">{item.name}</p>
                <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
              </div>
              <p className="font-semibold text-gray-800">₹{(item.price * item.quantity) / 100}</p>
            </div>
          ))}
          <div className="px-4 py-3 bg-gray-50 flex justify-between font-bold text-gray-800">
            <span>Total</span>
            <span>₹{order.totalAmount / 100}</span>
          </div>
        </div>

        {/* Order again button */}
        <button
          onClick={() => navigate(`/menu/${tenantId}`)}
          className="w-full py-3 border-2 border-orange-500 text-orange-500 rounded-xl font-semibold hover:bg-orange-50"
        >
          Order Again
        </button>
      </div>
    </div>
  );
}

