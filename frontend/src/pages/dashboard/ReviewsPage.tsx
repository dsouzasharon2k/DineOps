import { useEffect, useMemo, useState } from 'react'
import { getReviewsByTenantApi } from '../../api/reviews'
import { getApiErrorMessage } from '../../api/error'
import { useAuth } from '../../context/AuthContext'
import type { Review } from '../../types/review'

const extractTenantId = (token: string | null): string | null => {
  if (!token) return null
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.tenantId ?? null
  } catch {
    return null
  }
}

const Star = ({ active }: { active: boolean }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" className={active ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 text-gray-200'}>
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
)

const ReviewsPage = () => {
  const { token } = useAuth()
  const tenantId = useMemo(() => extractTenantId(token), [token])
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      if (!tenantId) {
        setLoading(false)
        return
      }
      try {
        setError('')
        const data = await getReviewsByTenantApi(tenantId)
        setReviews(data)
      } catch (err) {
        setError(getApiErrorMessage(err, 'Failed to load reviews.'))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [tenantId])

  if (!tenantId) return <p className="text-sm text-gray-500">Tenant context missing for reviews.</p>
  if (loading) return <p className="text-sm text-gray-500">Loading reviews...</p>
  if (error) return <p className="text-sm text-red-600">{error}</p>

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800">Reviews</h1>
      <p className="mt-1 text-sm text-gray-500">Customer feedback for your restaurant.</p>

      {reviews.length === 0 ? (
        <div className="mt-5 rounded-xl border border-gray-100 bg-white p-5 text-sm text-gray-500">
          No reviews yet.
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {reviews.map((review) => (
            <div key={review.id} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400">Order #{review.orderId.slice(0, 8).toUpperCase()}</p>
                <p className="text-xs text-gray-400">{new Date(review.createdAt).toLocaleString()}</p>
              </div>
              <div className="mt-2 flex items-center gap-1">
                {Array.from({ length: 5 }, (_, i) => (
                  <Star key={i} active={i < review.rating} />
                ))}
                <span className="ml-1 text-xs text-gray-500">{review.rating.toFixed(1)}</span>
              </div>
              <p className="mt-2 text-sm text-gray-700">{review.comment || 'No comment provided.'}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default ReviewsPage

