import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { getCategoriesApi, getItemsApi } from '../../api/menu'
import { getRestaurantByIdApi } from '../../api/restaurants'
import { useCart } from '../../hooks/useCart'
import type { MenuCategory, MenuItem } from '../../types/menu'
import type { Restaurant } from '../../types/restaurant'
import type { DietType } from '../../components/FoodItemCard'
import type { FoodItemCardData } from '../../components/FoodItemCard'
import { FoodItemCard } from '../../components/FoodItemCard'
import { getApiErrorMessage } from '../../api/error'
import { formatCurrency } from '../../utils/currency'
import LoadingState from '../../components/LoadingState'
import EmptyState from '../../components/EmptyState'

const NON_VEGAN_WORDS = ['paneer', 'cheese', 'butter', 'ghee', 'cream', 'milk', 'curd', 'yogurt', 'dahi', 'mayo']

const toFoodItemCardData = (item: MenuItem): FoodItemCardData => {
  let dietType: DietType = item.isVegetarian ? 'veg' : 'non-veg'
  if (item.dietType === 'VEGAN') dietType = 'vegan'
  else if (item.dietType === 'NON_VEG') dietType = 'non-veg'
  else if (item.isVegetarian) {
    const text = `${item.name} ${item.description ?? ''}`.toLowerCase()
    if (!NON_VEGAN_WORDS.some((w) => text.includes(w))) dietType = 'vegan'
  }
  return {
    id: item.id,
    name: item.name,
    dietType,
    price: item.price,
    description: item.description ?? '',
    servingSize: item.servingSize ?? (item.prepTimeMinutes ? `~${item.prepTimeMinutes} min prep` : ''),
    imageUrl: item.imageUrl ?? undefined,
    flavourProfile: item.flavourProfile ?? [],
    allergens: item.allergens ?? [],
    ingredients: item.ingredients ?? '',
    nutrition: item.nutrition ?? [],
  }
}

const StarRow = ({ rating }: { rating: number }) => {
  const full = Math.floor(rating)
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <svg
          key={i}
          width="13"
          height="13"
          viewBox="0 0 24 24"
          className={i < full ? 'fill-amber-400' : 'fill-white/30'}
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
      <span className="text-white/80 text-xs ml-1">{rating.toFixed(1)}</span>
    </span>
  )
}

const getInitials = (name: string) =>
  name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')

type DietFilter = 'ALL' | 'VEG' | 'NON_VEG' | 'VEGAN'
type SortFilter = 'DEFAULT' | 'PRICE_LOW_HIGH' | 'PRICE_HIGH_LOW' | 'MOST_LOVED'

const NON_VEG_WORDS = ['chicken', 'mutton', 'fish', 'prawn', 'egg', 'beef', 'lamb', 'seafood']
const NON_VEGAN_WORDS = ['paneer', 'cheese', 'butter', 'ghee', 'cream', 'milk', 'curd', 'yogurt', 'dahi', 'mayo']
const MOST_LOVED_HINTS = ['special', 'signature', 'chef', 'best', 'popular', 'favorite', 'classic']

const isVeganItem = (item: MenuItem): boolean => {
  if (!item.isVegetarian) return false
  const text = `${item.name} ${item.description ?? ''}`.toLowerCase()
  return !NON_VEGAN_WORDS.some((word) => text.includes(word))
}

const getMostLovedScore = (item: MenuItem): number => {
  const text = `${item.name} ${item.description ?? ''}`.toLowerCase()
  const hasHint = MOST_LOVED_HINTS.some((word) => text.includes(word)) ? 1 : 0
  const quickPrepBoost = item.prepTimeMinutes && item.prepTimeMinutes <= 20 ? 1 : 0
  return hasHint + quickPrepBoost
}

const PublicMenuPage = () => {
  const { tenantId } = useParams<{ tenantId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const tableNumber = searchParams.get('table')
  const { addItem, removeItem, getQuantity, total, itemCount } = useCart(tenantId!)
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [itemsByCategory, setItemsByCategory] = useState<Record<string, MenuItem[]>>({})
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [dietFilter, setDietFilter] = useState<DietFilter>('ALL')
  const [sortFilter, setSortFilter] = useState<SortFilter>('DEFAULT')
  const tabsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const loadMenu = async () => {
      if (!tenantId) {
        setError('Invalid restaurant link.')
        setLoading(false)
        return
      }
      try {
        const [cats, restaurantData] = await Promise.all([
          getCategoriesApi(tenantId),
          getRestaurantByIdApi(tenantId),
        ])
        setCategories(cats)
        setRestaurant(restaurantData)

        if (cats.length > 0) {
          setActiveCategory(cats[0].id)
          const itemsMap: Record<string, MenuItem[]> = {}
          await Promise.all(
            cats.map(async (cat) => {
              const items = await getItemsApi(tenantId, cat.id)
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

  const scrollTabIntoView = (catId: string) => {
    const tab = tabsRef.current?.querySelector(`[data-cat="${catId}"]`) as HTMLElement | null
    tab?.scrollIntoView({ inline: 'center', behavior: 'smooth', block: 'nearest' })
  }

  const handleCategoryClick = (catId: string) => {
    setActiveCategory(catId)
    scrollTabIntoView(catId)
  }

  if (loading) return <LoadingState fullPage message="Loading menu…" />

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-xl border border-red-100 bg-white p-5 text-center">
          <p className="text-sm font-semibold text-red-600">Unable to load menu</p>
          <p className="mt-1 text-xs text-gray-500">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 rounded-lg bg-orange-500 px-4 py-2 text-xs font-medium text-white hover:bg-orange-600"
          >
            Retry
          </button>
        </div>
      </div>
    )
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
  const visibleItems = useMemo(() => {
    const filtered = activeItems.filter((item) => {
      if (dietFilter === 'ALL') return true
      if (dietFilter === 'VEG') return item.isVegetarian
      if (dietFilter === 'NON_VEG') {
        const text = `${item.name} ${item.description ?? ''}`.toLowerCase()
        return !item.isVegetarian || NON_VEG_WORDS.some((word) => text.includes(word))
      }
      return isVeganItem(item)
    })

    const sorted = [...filtered]
    if (sortFilter === 'PRICE_LOW_HIGH') sorted.sort((a, b) => a.price - b.price)
    if (sortFilter === 'PRICE_HIGH_LOW') sorted.sort((a, b) => b.price - a.price)
    if (sortFilter === 'MOST_LOVED') {
      sorted.sort((a, b) => {
        const scoreDiff = getMostLovedScore(b) - getMostLovedScore(a)
        if (scoreDiff !== 0) return scoreDiff
        return a.price - b.price
      })
    }
    return sorted
  }, [activeItems, dietFilter, sortFilter])
  const isClosed = restaurant?.isOpenNow === false
  const operatingHoursText = useMemo(() => {
    if (!restaurant?.operatingHours) return null
    try {
      const parsed = JSON.parse(restaurant.operatingHours) as Record<string, { open?: string; close?: string }>
      const todayKey = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
      const today = parsed[todayKey]
      if (today?.open && today?.close) return `Today ${today.open} - ${today.close}`
      return 'Operating hours available'
    } catch {
      return restaurant.operatingHours
    }
  }, [restaurant?.operatingHours])

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* ─── Header ─── */}
      <div className="bg-orange-500 text-white px-4 pt-6 pb-5 relative">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            {restaurant?.logoUrl ? (
              <img
                src={restaurant.logoUrl}
                alt={`${restaurant?.name} logo`}
                className="w-14 h-14 rounded-xl object-cover bg-white/20 shrink-0"
              />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center text-white font-bold text-xl shrink-0">
                {restaurant ? getInitials(restaurant.name) : '?'}
              </div>
            )}

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold leading-tight">{restaurant?.name ?? 'Our Menu'}</h1>
                {isClosed ? (
                  <span className="text-[11px] font-semibold bg-red-500/80 px-2 py-0.5 rounded-full">
                    Closed
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold bg-emerald-500/80 px-2 py-0.5 rounded-full">
                    Open now
                  </span>
                )}
              </div>
              {restaurant?.address && (
                <p className="text-white/75 text-sm mt-0.5 truncate">{restaurant.address}</p>
              )}
              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                {restaurant && <StarRow rating={restaurant.averageRating} />}
                {operatingHoursText && (
                  <span className="text-white/70 text-xs flex items-center gap-1">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                    </svg>
                    {operatingHoursText}
                  </span>
                )}
                {tableNumber && (
                  <span className="text-white/80 text-xs bg-white/15 px-2 py-0.5 rounded-full font-medium">
                    Table {tableNumber}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Track order link */}
        <button
          onClick={() => navigate(`/menu/${tenantId}/track`)}
          className="absolute right-4 top-4 text-xs text-white/70 hover:text-white underline underline-offset-2"
        >
          Track order
        </button>
      </div>

      {/* ─── Category tabs ─── */}
      <div className="sticky top-0 bg-white shadow-sm z-10">
        <div ref={tabsRef} className="flex overflow-x-auto px-4 py-2.5 gap-2 max-w-2xl mx-auto no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat.id}
              data-cat={cat.id}
              onClick={() => handleCategoryClick(cat.id)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition shrink-0 ${
                activeCategory === cat.id
                  ? 'bg-orange-500 text-white shadow-sm shadow-orange-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-orange-50 hover:text-orange-600'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Items ─── */}
      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-5 pb-32">
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {activeCategory && (
          <div className="mb-3">
            <h2 className="text-base font-bold text-gray-800">
              {categories.find((c) => c.id === activeCategory)?.name}
            </h2>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                onClick={() => setDietFilter('ALL')}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${dietFilter === 'ALL' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'}`}
              >
                All
              </button>
              <button
                onClick={() => setDietFilter('VEG')}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${dietFilter === 'VEG' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600'}`}
              >
                Veg
              </button>
              <button
                onClick={() => setDietFilter('NON_VEG')}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${dietFilter === 'NON_VEG' ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-600'}`}
              >
                Non-Veg
              </button>
              <button
                onClick={() => setDietFilter('VEGAN')}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${dietFilter === 'VEGAN' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600'}`}
              >
                Vegan
              </button>
            </div>
            <div className="mt-2">
              <select
                value={sortFilter}
                onChange={(e) => setSortFilter(e.target.value as SortFilter)}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700"
              >
                <option value="DEFAULT">Sort: Recommended</option>
                <option value="PRICE_LOW_HIGH">Price: Low to High</option>
                <option value="PRICE_HIGH_LOW">Price: High to Low</option>
                <option value="MOST_LOVED">Most Loved</option>
              </select>
            </div>
            <div className="mt-2 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-[11px] text-amber-700">
              Allergy note: Please inform us about nut, dairy, gluten, or shellfish allergies before ordering.
            </div>
          </div>
        )}

        {visibleItems.length === 0 ? (
          <EmptyState compact icon="🧾" title="No items yet" description="Try another category or check back soon." />
        ) : (
          <div className="flex flex-col gap-3">
            {visibleItems.map((item) => (
              <FoodItemCard
                key={item.id}
                item={toFoodItemCardData(item)}
                quantity={getQuantity(item.id)}
                disabled={isClosed}
                onAdd={() =>
                  addItem({
                    menuItemId: item.id,
                    name: item.name,
                    price: item.price,
                    isVegetarian: item.isVegetarian,
                  })
                }
                onRemove={() => removeItem(item.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ─── Cart bar ─── */}
      {itemCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-20 px-4 pb-4 pt-2">
          <div className="max-w-2xl mx-auto">
            <button
              onClick={() =>
                !isClosed &&
                navigate(
                  `/menu/${tenantId}/confirm${tableNumber ? `?table=${encodeURIComponent(tableNumber)}` : ''}`
                )
              }
              disabled={isClosed}
              className="w-full bg-gray-900 text-white rounded-2xl py-4 px-5 flex items-center justify-between shadow-2xl hover:bg-gray-800 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <span className="bg-orange-500 text-white text-xs font-bold px-2.5 py-1 rounded-lg">
                {itemCount} item{itemCount !== 1 ? 's' : ''}
              </span>
              <span className="font-semibold text-sm">
                {isClosed ? 'Restaurant is closed' : 'View order'}
              </span>
              <span className="font-bold tabular-nums">{formatCurrency(total)}</span>
            </button>
          </div>
        </div>
      )}

      <footer className="px-4 py-6 text-center text-xs text-gray-400 max-w-2xl mx-auto w-full">
        <Link to="/privacy" className="text-orange-500 hover:underline">Privacy Policy</Link>
        <span className="mx-2 text-gray-300">·</span>
        <Link to="/terms" className="text-orange-500 hover:underline">Terms of Service</Link>
      </footer>

    </div>
  )
}

export default PublicMenuPage
