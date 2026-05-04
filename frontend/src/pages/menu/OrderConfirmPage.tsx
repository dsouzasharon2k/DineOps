import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCart } from '../../hooks/useCart';
import { initiatePaymentApi, placeOrderApi } from '../../api/menu';
import { getRestaurantByIdApi } from '../../api/restaurants';
import { getApiErrorMessage } from '../../api/error';
import { formatCurrency } from '../../utils/currency';
import type { PaymentMethod } from '../../types/order';
import type { Restaurant } from '../../types/restaurant';
import { getOrCreateProductSessionId, trackProductEventApi } from '../../api/analytics';

const orderConfirmSchema = z.object({
  customerName: z.string().trim().optional(),
  customerPhone: z
    .string()
    .trim()
    .min(7, 'Phone number is required.')
    .regex(/^[0-9+\-\s]{7,15}$/, 'Enter a valid phone number.'),
  customerEmail: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), 'Enter a valid email address.'),
  notes: z.string().max(500, 'Notes cannot exceed 500 characters.').optional(),
  paymentMethod: z.enum(['CASH', 'UPI', 'CARD', 'ONLINE']),
});

type OrderConfirmForm = z.infer<typeof orderConfirmSchema>;

export default function OrderConfirmPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tableNumber = searchParams.get('table');
  const { cart, total, itemCount, clearCart } = useCart(tenantId!);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<OrderConfirmForm>({
    resolver: zodResolver(orderConfirmSchema),
    defaultValues: {
      customerName: '',
      customerPhone: '',
      customerEmail: '',
      notes: '',
      paymentMethod: 'CASH',
    },
  });

  const paymentMethod = watch('paymentMethod') as PaymentMethod;
  const customerPhone = watch('customerPhone') ?? '';
  const allergenList = Array.from(
    new Set(
      (cart?.items ?? []).flatMap((item) => item.allergens ?? []).map((a) => a.trim()).filter((a) => a.length > 0)
    )
  );

  useEffect(() => {
    if (tenantId) {
      getRestaurantByIdApi(tenantId).then(setRestaurant).catch(() => setRestaurant(null));
    }
  }, [tenantId]);

  useEffect(() => {
    if (!tenantId) return;
    trackProductEventApi({
      tenantId,
      eventType: 'CHECKOUT_START',
      sessionId: getOrCreateProductSessionId(),
      source: 'web',
      metadata: JSON.stringify({ tableNumber: tableNumber ?? null }),
    }).catch(() => {
      // Telemetry must not block checkout.
    });
  }, [tenantId, tableNumber]);

  if (!cart || cart.items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <span className="text-5xl">🛒</span>
        <p className="text-gray-500">Your cart is empty.</p>
        <button
          onClick={() => navigate(`/menu/${tenantId}`)}
          className="mt-2 px-6 py-2 bg-orange-500 text-white rounded-lg"
        >
          Back to Menu
        </button>
      </div>
    );
  }

  const handlePlaceOrder = async (values: OrderConfirmForm) => {
    setPlacing(true);
    setError('');
    try {
      const orderItems = cart.items.map(i => ({
        menuItemId: i.menuItemId,
        quantity: i.quantity
      }));
      const order = await placeOrderApi(
        tenantId!,
        tableNumber,
        values.customerName ?? '',
        values.customerPhone,
        values.customerEmail ?? '',
        values.notes ?? '',
        orderItems
      );
      trackProductEventApi({
        tenantId: tenantId!,
        eventType: 'ORDER_PLACED',
        sessionId: getOrCreateProductSessionId(),
        orderId: order.id,
        source: 'web',
      }).catch(() => {});
      if (paymentMethod !== 'CASH') {
        trackProductEventApi({
          tenantId: tenantId!,
          eventType: 'PAYMENT_INITIATED',
          sessionId: getOrCreateProductSessionId(),
          orderId: order.id,
          source: 'web',
          metadata: JSON.stringify({ paymentMethod }),
        }).catch(() => {});
        await initiatePaymentApi(order.id, paymentMethod);
      }
      clearCart();
      navigate(`/menu/${tenantId}/order/${order.id}`);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to place order. Please try again.'));
    } finally {
      setPlacing(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50" aria-labelledby="confirm-order-title">
      <form onSubmit={handleSubmit(handlePlaceOrder)}>
      {/* Header */}
      <div className="bg-white shadow-sm px-4 py-4 flex items-center gap-3">
        <button
          onClick={() => navigate(`/menu/${tenantId}`)}
          aria-label="Back to menu"
          className="text-gray-500 hover:text-gray-700 text-xl"
        >
          ←
        </button>
        <h1 id="confirm-order-title" className="text-lg font-bold text-gray-800">Your Order</h1>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 pb-32">
        {/* Order items */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-4">
          {cart.items.map((item, idx) => (
            <div
              key={item.menuItemId}
              className={`flex items-center justify-between px-4 py-3 ${
                idx < cart.items.length - 1 ? 'border-b border-gray-100' : ''
              }`}
            >
              <div className="flex items-center gap-2">
                <span>{item.isVegetarian ? '🟢' : '🔴'}</span>
                <div>
                  <p className="font-medium text-gray-800">{item.name}</p>
                  <p className="text-sm text-gray-500">{formatCurrency(item.price)} × {item.quantity}</p>
                </div>
              </div>
              <p className="font-semibold text-gray-800">{formatCurrency(item.price * item.quantity)}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-sm px-4 py-4 mb-4">
          <h3 className="font-semibold text-gray-700 mb-2">Contact Details</h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label htmlFor="customerName" className="sr-only">Customer name</label>
            <input
              id="customerName"
              {...register('customerName')}
              placeholder="Your name (optional)"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-orange-400"
            />
            <label htmlFor="customerPhone" className="sr-only">Customer phone</label>
            <input
              id="customerPhone"
              {...register('customerPhone')}
              placeholder="Phone for order lookup (required)"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-orange-400"
            />
            <label htmlFor="customerEmail" className="sr-only">Customer email</label>
            <input
              id="customerEmail"
              {...register('customerEmail')}
              placeholder="Email for order notifications"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-orange-400 sm:col-span-2"
            />
          </div>
          {errors.customerPhone && (
            <p className="mt-2 text-xs text-red-600">{errors.customerPhone.message}</p>
          )}
          {errors.customerEmail && (
            <p className="mt-1 text-xs text-red-600">{errors.customerEmail.message}</p>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm px-4 py-4 mb-4">
          <h3 className="font-semibold text-gray-700 mb-2">Payment Method</h3>
          <div className="grid grid-cols-2 gap-2">
            {(['CASH', 'UPI', 'CARD', 'ONLINE'] as PaymentMethod[]).map((method) => (
              <button
                key={method}
                type="button"
                onClick={() => setValue('paymentMethod', method, { shouldValidate: true })}
                className={`rounded-lg border px-3 py-2 text-sm ${
                  paymentMethod === method
                    ? 'border-orange-500 bg-orange-50 text-orange-600'
                    : 'border-gray-200 text-gray-600'
                }`}
              >
                {method}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-gray-500">
            {paymentMethod === 'CASH'
              ? 'Pay at restaurant.'
              : 'Online payment will be initiated after placing your order.'}
          </p>
        </div>

        {/* Bill summary */}
        <div className="bg-white rounded-xl shadow-sm px-4 py-4 mb-4">
          <h3 className="font-semibold text-gray-700 mb-3">Bill Summary</h3>
          {tableNumber && (
            <div className="flex justify-between text-gray-600 mb-2">
              <span>Table</span>
              <span>{tableNumber}</span>
            </div>
          )}
          <div className="flex justify-between text-gray-600 mb-2">
            <span>Item total ({itemCount} items)</span>
            <span>{formatCurrency(total)}</span>
          </div>
          <div className="border-t border-gray-100 pt-2 mt-2 flex justify-between font-bold text-gray-800">
            <span>Total</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>

        {allergenList.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-4 mb-4">
            <h3 className="font-semibold text-amber-800 mb-2">Allergen Warning</h3>
            <p className="text-sm text-amber-700 mb-2">
              Your selected items may contain the following allergens. Please review before placing order.
            </p>
            <div className="flex flex-wrap gap-2">
              {allergenList.map((allergen) => (
                <span key={allergen} className="rounded-full border border-amber-300 bg-white px-3 py-1 text-xs font-semibold text-amber-800">
                  {allergen}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Special instructions */}
        <div className="bg-white rounded-xl shadow-sm px-4 py-4 mb-4">
          <h3 className="font-semibold text-gray-700 mb-2">Special Instructions</h3>
          <textarea
            {...register('notes')}
            placeholder="Any special requests? (optional)"
            rows={3}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 resize-none focus:outline-none focus:border-orange-400"
          />
          {errors.notes && <p className="mt-1 text-xs text-red-600">{errors.notes.message}</p>}
        </div>

        {restaurant?.isOpenNow === false && (
          <p role="alert" className="text-amber-700 bg-amber-50 rounded-lg px-4 py-3 text-sm text-center mb-4">
            Restaurant is currently closed. Orders cannot be placed outside operating hours.
          </p>
        )}
        {error && (
          <p role="alert" aria-live="polite" className="text-red-700 text-sm text-center mb-4">{error}</p>
        )}
      </div>

      {/* Place order button */}
      <div className="fixed bottom-4 left-4 right-4 max-w-2xl mx-auto">
        <button
          type="submit"
          disabled={placing || restaurant?.isOpenNow === false || !customerPhone.trim()}
          className="w-full bg-orange-500 text-white rounded-xl py-4 px-6 flex items-center justify-between shadow-lg hover:bg-orange-600 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <span className="font-semibold">
            {placing ? 'Placing order...' : restaurant?.isOpenNow === false ? 'Restaurant closed' : paymentMethod === 'CASH' ? 'Place Order' : 'Place Order & Pay'}
          </span>
          <span className="font-bold">{formatCurrency(total)}</span>
        </button>
      </div>
      </form>
    </main>
  );
}

