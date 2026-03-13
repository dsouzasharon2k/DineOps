import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getCategoriesApi, getItemsApi } from '../../api/menu';
import { useCart } from '../../hooks/useCart';

interface MenuCategory {
  id: string;
  name: string;
}

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  vegetarian: boolean;
  available: boolean;
}

export default function PublicMenuPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [itemsByCategory, setItemsByCategory] = useState<Record<string, MenuItem[]>>({});
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [restaurantName, setRestaurantName] = useState('Our Menu');

  const { addItem, removeItem, getQuantity, total, itemCount, cart } = useCart(tenantId!);

  useEffect(() => {
    if (tenantId) loadMenu();
  }, [tenantId]);

  const loadMenu = async () => {
    try {
      const cats = await getCategoriesApi(tenantId!);
      if (cats.length === 0) { setLoading(false); return; }

      setCategories(cats);
      setActiveCategory(cats[0].id);
      if (cats[0]?.tenant?.name) setRestaurantName(cats[0].tenant.name);

      // Load items for all categories in parallel
      const itemPromises = cats.map((cat: MenuCategory) =>
        getItemsApi(tenantId!, cat.id).then(items => ({ catId: cat.id, items }))
      );
      const results = await Promise.all(itemPromises);
      const map: Record<string, MenuItem[]> = {};
      results.forEach(({ catId, items }) => { map[catId] = items; });
      setItemsByCategory(map);
    } catch (err) {
      console.error('Failed to load menu', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Loading menu...</p>
    </div>
  );

  if (categories.length === 0) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3">
      <span className="text-5xl">🍽️</span>
      <p className="text-gray-500">Menu not available yet.</p>
    </div>
  );

  const activeItems = itemsByCategory[activeCategory] ?? [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-orange-500 text-white py-8 px-4 text-center">
        <h1 className="text-3xl font-bold">{restaurantName}</h1>
        <p className="mt-1 text-orange-100">Fresh. Delicious. Made for you.</p>
      </div>

      {/* Category tabs */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="flex overflow-x-auto px-4 py-3 gap-2">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeCategory === cat.id
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Items */}
      <div className="max-w-2xl mx-auto px-4 py-6 pb-32">
        <h2 className="text-xl font-bold text-gray-800 mb-4">
          {categories.find(c => c.id === activeCategory)?.name}
        </h2>
        <div className="flex flex-col gap-3">
          {activeItems.map(item => {
            const qty = getQuantity(item.id);
            return (
              <div key={item.id} className="bg-white rounded-xl shadow-sm p-4 flex items-center justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <span className="mt-1 flex-shrink-0 text-lg">
                    {item.vegetarian ? '🟢' : '🔴'}
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-800 truncate">{item.name}</p>
                    {item.description && (
                      <p className="text-sm text-gray-500 truncate">{item.description}</p>
                    )}
                    <p className="text-orange-500 font-bold mt-1">₹{item.price / 100}</p>
                  </div>
                </div>

                {/* Add / quantity controls */}
                {qty === 0 ? (
                  <button
                    onClick={() => addItem({
                      menuItemId: item.id,
                      name: item.name,
                      price: item.price,
                      isVegetarian: item.vegetarian
                    })}
                    className="flex-shrink-0 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600"
                  >
                    ADD
                  </button>
                ) : (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => removeItem(item.id)}
                      className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 font-bold text-lg flex items-center justify-center hover:bg-orange-200"
                    >−</button>
                    <span className="w-4 text-center font-semibold">{qty}</span>
                    <button
                      onClick={() => addItem({
                        menuItemId: item.id,
                        name: item.name,
                        price: item.price,
                        isVegetarian: item.vegetarian
                      })}
                      className="w-8 h-8 rounded-full bg-orange-500 text-white font-bold text-lg flex items-center justify-center hover:bg-orange-600"
                    >+</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Floating cart bar */}
      {itemCount > 0 && (
        <div className="fixed bottom-4 left-4 right-4 max-w-2xl mx-auto">
          <button
            onClick={() => {/* will wire to place order in DOPS-24 */}}
            className="w-full bg-orange-500 text-white rounded-xl py-4 px-6 flex items-center justify-between shadow-lg hover:bg-orange-600"
          >
            <span className="bg-orange-600 rounded-lg px-2 py-1 text-sm font-bold">
              {itemCount} item{itemCount > 1 ? 's' : ''}
            </span>
            <span className="font-semibold">View Order</span>
            <span className="font-bold">₹{total / 100}</span>
          </button>
        </div>
      )}
    </div>
  );
}