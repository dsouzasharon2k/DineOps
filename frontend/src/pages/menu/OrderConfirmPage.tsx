import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCart } from '../../hooks/useCart';
import { placeOrderApi } from '../../api/menu';

export default function OrderConfirmPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const navigate = useNavigate();
  const { cart, total, itemCount, clearCart } = useCart(tenantId!);
  const [notes, setNotes] = useState('');
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');

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

  const handlePlaceOrder = async () => {
    setPlacing(true);
    setError('');
    try {
      const orderItems = cart.items.map(i => ({
        menuItemId: i.menuItemId,
        quantity: i.quantity
      }));
      const order = await placeOrderApi(tenantId!, notes, orderItems);
      clearCart();
      navigate(`/menu/${tenantId}/order/${order.id}`);
    } catch (err) {
      setError('Failed to place order. Please try again.');
    } finally {
      setPlacing(false);
    }
  };

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
        <h1 className="text-lg font-bold text-gray-800">Your Order</h1>
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
                  <p className="text-sm text-gray-500">₹{item.price / 100} × {item.quantity}</p>
                </div>
              </div>
              <p className="font-semibold text-gray-800">₹{(item.price * item.quantity) / 100}</p>
            </div>
          ))}
        </div>

        {/* Bill summary */}
        <div className="bg-white rounded-xl shadow-sm px-4 py-4 mb-4">
          <h3 className="font-semibold text-gray-700 mb-3">Bill Summary</h3>
          <div className="flex justify-between text-gray-600 mb-2">
            <span>Item total ({itemCount} items)</span>
            <span>₹{total / 100}</span>
          </div>
          <div className="border-t border-gray-100 pt-2 mt-2 flex justify-between font-bold text-gray-800">
            <span>Total</span>
            <span>₹{total / 100}</span>
          </div>
        </div>

        {/* Special instructions */}
        <div className="bg-white rounded-xl shadow-sm px-4 py-4 mb-4">
          <h3 className="font-semibold text-gray-700 mb-2">Special Instructions</h3>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Any special requests? (optional)"
            rows={3}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 resize-none focus:outline-none focus:border-orange-400"
          />
        </div>

        {error && (
          <p className="text-red-500 text-sm text-center mb-4">{error}</p>
        )}
      </div>

      {/* Place order button */}
      <div className="fixed bottom-4 left-4 right-4 max-w-2xl mx-auto">
        <button
          onClick={handlePlaceOrder}
          disabled={placing}
          className="w-full bg-orange-500 text-white rounded-xl py-4 px-6 flex items-center justify-between shadow-lg hover:bg-orange-600 disabled:opacity-60"
        >
          <span className="font-semibold">{placing ? 'Placing order...' : 'Place Order'}</span>
          <span className="font-bold">₹{total / 100}</span>
        </button>
      </div>
    </div>
  );
}

