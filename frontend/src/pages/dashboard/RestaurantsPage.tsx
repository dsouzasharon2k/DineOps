import { useEffect, useState } from 'react'
import { getRestaurantsApi } from '../../api/restaurants'
import type { Restaurant } from '../../types/restaurant'
import { getApiErrorMessage } from '../../api/error'
import LoadingState from '../../components/LoadingState'
import EmptyState from '../../components/EmptyState'

const RestaurantsPage = () => {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Fetch restaurants when the component mounts
  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        const data = await getRestaurantsApi()
        setRestaurants(data)
      } catch (err) {
        setError(getApiErrorMessage(err, 'Failed to load restaurants.'))
      } finally {
        setLoading(false)
      }
    }
    fetchRestaurants()
  }, [])

  if (loading) {
    return <LoadingState message="Loading restaurants..." />
  }

  if (error) {
    return (
      <div className="text-red-500 text-sm">{error}</div>
    )
  }

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Restaurants</h1>
        <button className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition">
          + Add Restaurant
        </button>
      </div>

      {/* Empty state */}
      {restaurants.length === 0 ? (
        <EmptyState
          icon="🍽️"
          title="No restaurants yet"
          description='Click "Add Restaurant" to get started.'
        />
      ) : (
        // Responsive grid - 1 column on mobile, 2 on tablet, 3 on desktop
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {restaurants.map((restaurant) => (
            <div
              key={restaurant.id}
              className="bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition"
            >
              {/* Restaurant name and status badge */}
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-semibold text-gray-800">
                  {restaurant.name}
                </h2>
                <span
                  className={`text-xs font-medium px-2 py-1 rounded-full ${
                    restaurant.status === 'ACTIVE'
                      ? 'bg-green-100 text-green-600'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {restaurant.status}
                </span>
              </div>

              {/* Details */}
              <p className="text-sm text-gray-500 mb-1">
                🍴 {restaurant.cuisineType || 'N/A'}
              </p>
              <p className="text-sm text-gray-500 mb-1">
                📍 {restaurant.address || 'N/A'}
              </p>
              <p className="text-sm text-gray-500">
                📞 {restaurant.phone || 'N/A'}
              </p>
              <p className="text-sm text-gray-500">
                📄 FSSAI: {restaurant.fssaiLicense || 'N/A'}
              </p>
              <p className="text-sm text-gray-500">
                🧾 GST: {restaurant.gstNumber || 'N/A'}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default RestaurantsPage