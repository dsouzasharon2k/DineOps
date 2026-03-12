import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getCategoriesApi, getItemsApi } from '../../api/menu'

interface Category {
  id: string
  name: string
  description: string
}

interface MenuItem {
  id: string
  name: string
  description: string
  price: number
  vegetarian: boolean
  available: boolean
}

const PublicMenuPage = () => {
  const { tenantId } = useParams<{ tenantId: string }>()
  const [categories, setCategories] = useState<Category[]>([])
  const [itemsByCategory, setItemsByCategory] = useState<Record<string, MenuItem[]>>({})
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

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
            cats.map(async (cat: Category) => {
              const items = await getItemsApi(tenantId!, cat.id)
              itemsMap[cat.id] = items
            })
          )
          setItemsByCategory(itemsMap)
        }
      } catch (err) {
        console.error('Failed to load menu')
      } finally {
        setLoading(false)
      }
    }

    loadMenu()
  }, [tenantId])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        Loading menu...
      </div>
    )
  }

  if (categories.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        <div className="text-center">
          <p className="text-4xl mb-3">🍽️</p>
          <p>Menu not available yet.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <div className="bg-orange-500 text-white px-4 py-6 text-center">
        <h1 className="text-2xl font-bold">Our Menu</h1>
        <p className="text-orange-100 text-sm mt-1">Fresh. Delicious. Made for you.</p>
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
      <div className="max-w-2xl mx-auto px-4 py-6">
        {categories
          .filter((cat) => cat.id === activeCategory)
          .map((cat) => (
            <div key={cat.id}>
              <h2 className="text-lg font-bold text-gray-800 mb-4">{cat.name}</h2>

              {(itemsByCategory[cat.id] || []).length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">
                  No items in this category yet.
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  {(itemsByCategory[cat.id] || []).map((item) => (
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
                              item.vegetarian
                                ? 'border-green-500'
                                : 'border-red-500'
                            }`}
                          >
                            <span
                              className={`w-2 h-2 rounded-full ${
                                item.vegetarian ? 'bg-green-500' : 'bg-red-500'
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

                      {/* Price - convert paise to rupees */}
                      <div className="text-right shrink-0">
                        <span className="font-bold text-gray-800">
                          ₹{(item.price / 100).toFixed(0)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
      </div>
    </div>
  )
}

export default PublicMenuPage