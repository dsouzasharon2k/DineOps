import { useEffect, useState } from 'react'
import { getRestaurantsApi } from '../../api/restaurants'

// Shape of a restaurant object returned from the backend
interface Restaurant {
  id: string
  name: string
  slug: string
  address: string
  phone: string
  cuisineType: string
  status: string
}

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
        setError('Failed to load restaurants.')
      } finally {
        setLoading(false)
      }
    }
    fetchRestaurants()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400">
        Loading...
      </div>
    )
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
        <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-400">
          <p className="text-4xl mb-3">🍽️</p>
          <p className="text-lg font-medium">No restaurants yet</p>
          <p className="text-sm mt-1">Click "Add Restaurant" to get started.</p>
        </div>
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
                    restaurant.status === 'active'
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
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default RestaurantsPage