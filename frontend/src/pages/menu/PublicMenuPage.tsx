import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getCategoriesApi, getItemsApi } from '../../api/menu'
import { useCart } from '../../hooks/useCart'
import type { MenuCategory, MenuItem } from '../../types/menu'
import { getApiErrorMessage } from '../../api/error'
import LoadingState from '../../components/LoadingState'
import EmptyState from '../../components/EmptyState'

const PublicMenuPage = () => {
  const { tenantId } = useParams<{ tenantId: string }>()
  const navigate = useNavigate()
  const { addItem, removeItem, getQuantity, total, itemCount } = useCart(tenantId!)
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [itemsByCategory, setItemsByCategory] = useState<Record<string, MenuItem[]>>({})
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadMenu = async () => {
      try {
        // Fetch all categories for this restaurant
        const cats = await getCategoriesApi(tenantId!)
        setCategories(cats)

        if (cats.length > 0) {
          setActiveCategory(cats[0].id)

          // Fetch items for each category in parallel
          const itemsMap: Record<string, MenuItem[]> = {}
          await Promise.all(
            cats.map(async (cat) => {
              const items = await getItemsApi(tenantId!, cat.id)
              itemsMap[cat.id] = items
            })
          )
          setItemsByCategory(itemsMap)
        }
      } catch (err) {
        setError(getApiErrorMessage(err, 'Failed to load menu.'))
      } finally {
        setLoading(false)
      }
    }

    loadMenu()
  }, [tenantId])

  if (loading) {
    return <LoadingState fullPage message="Loading menu..." />
  }

  if (categories.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md">
          <EmptyState icon="🍽️" title="Menu not available" description="This restaurant has no published categories yet." />
        </div>
      </div>
    )
  }

  const activeItems = itemsByCategory[activeCategory ?? ''] ?? []

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <div className="bg-orange-500 text-white px-4 py-6 text-center relative">
        <h1 className="text-2xl font-bold">Our Menu</h1>
        <p className="text-orange-100 text-sm mt-1">Fresh. Delicious. Made for you.</p>
        <button
          onClick={() => navigate(`/menu/${tenantId}/track`)}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-orange-100 hover:text-white underline"
        >
          Track Order
        </button>
      </div>

      {/* Sticky category tabs - scrollable horizontally on mobile */}
      <div className="sticky top-0 bg-white shadow-sm z-10 overflow-x-auto">
        <div className="flex px-4 py-2 gap-2 min-w-max">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition ${
                activeCategory === cat.id
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-orange-100'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Menu items for active category */}
      <div className="max-w-2xl mx-auto px-4 py-6 pb-32">
        {error && (
          <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}
        {activeCategory && (
          <h2 className="text-lg font-bold text-gray-800 mb-4">
            {categories.find((cat) => cat.id === activeCategory)?.name}
          </h2>
        )}
        {activeItems.length === 0 ? (
          <EmptyState compact icon="🧾" title="No items yet" description="Try another category or check back soon." />
        ) : (
          <div className="flex flex-col gap-3">
            {activeItems.map((item) => {
              const qty = getQuantity(item.id)
              return (
                <div
                  key={item.id}
                  className="bg-white rounded-xl shadow-sm p-4 flex items-center justify-between gap-4"
                >
                  <div className="flex-1">
                    {/* Item name with veg indicator */}
                    <div className="flex items-center gap-2 mb-1">
                      {/* Green square = veg, Red square = non-veg (Indian standard) */}
                      <span
                        className={`w-4 h-4 rounded-sm border-2 flex items-center justify-center ${
                          item.isVegetarian ? 'border-green-500' : 'border-red-500'
                        }`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            item.isVegetarian ? 'bg-green-500' : 'bg-red-500'
                          }`}
                        />
                      </span>
                      <span className="font-medium text-gray-800 text-sm">
                        {item.name}
                      </span>
                    </div>
                    {item.description && (
                      <p className="text-xs text-gray-400">{item.description}</p>
                    )}
                  </div>

                  {/* Price and cart controls */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <span className="font-bold text-gray-800">
                        ₹{(item.price / 100).toFixed(0)}
                      </span>
                    </div>
                    {qty === 0 ? (
                      <button
                        onClick={() =>
                          addItem({
                            menuItemId: item.id,
                            name: item.name,
                            price: item.price,
                            isVegetarian: item.isVegetarian,
                          })
                        }
                        className="px-4 py-1.5 rounded-full text-sm font-medium bg-orange-500 text-white hover:bg-orange-600"
                      >
                        ADD
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => removeItem(item.id)}
                          className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-lg font-bold hover:bg-orange-200"
                        >
                          −
                        </button>
                        <span className="w-4 text-center text-sm font-semibold">{qty}</span>
                        <button
                          onClick={() =>
                            addItem({
                              menuItemId: item.id,
                              name: item.name,
                              price: item.price,
                              isVegetarian: item.isVegetarian,
                            })
                          }
                          className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center text-lg font-bold hover:bg-orange-600"
                        >
                          +
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Floating cart bar */}
      {itemCount > 0 && (
        <div className="fixed bottom-4 left-4 right-4 max-w-2xl mx-auto">
          <button
            onClick={() => navigate(`/menu/${tenantId}/confirm`)}
            className="w-full bg-orange-500 text-white rounded-xl py-4 px-6 flex items-center justify-between shadow-lg hover:bg-orange-600"
          >
            <span className="bg-orange-600 rounded-lg px-2 py-1 text-sm font-bold">
              {itemCount} item{itemCount > 1 ? 's' : ''}
            </span>
            <span className="font-semibold">View Order</span>
            <span className="font-bold">₹{(total / 100).toFixed(0)}</span>
          </button>
        </div>
      )}
    </div>
  )
}

export default PublicMenuPage