import { useCallback, useEffect, useMemo, useState } from 'react'
import { getAnalyticsSummaryApi } from '../../api/analytics'
import { getReviewsByTenantApi } from '../../api/reviews'
import { getApiErrorMessage } from '../../api/error'
import { useAuth } from '../../context/AuthContext'
import type { AnalyticsSummary } from '../../types/analytics'
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

const DashboardHome = () => {
  const { token } = useAuth()
  const tenantId = useMemo(() => extractTenantId(token), [token])
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!tenantId) {
      setLoading(false)
      return
    }
    try {
      setError('')
      const data = await getAnalyticsSummaryApi(tenantId)
      setSummary(data)
      const reviewData = await getReviewsByTenantApi(tenantId)
      setReviews(reviewData.slice(0, 5))
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load analytics summary.'))
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  useEffect(() => {
    load()
  }, [load])

  if (!tenantId) {
    return <p className="text-sm text-gray-500">Tenant context missing for analytics.</p>
  }

  if (loading) {
    return <p className="text-sm text-gray-500">Loading analytics...</p>
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>
  }

  if (!summary) {
    return <p className="text-sm text-gray-500">No analytics data available.</p>
  }

  const maxRevenue = Math.max(...summary.revenueTrend.map((r) => r.revenue), 1)
  const maxTopItem = Math.max(...summary.topMenuItems.map((i) => i.count), 1)

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800">Analytics Dashboard</h1>
      <p className="text-gray-500 mt-2">Key metrics for today and recent performance.</p>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-500">Today's Orders</p>
          <p className="mt-1 text-2xl font-bold text-gray-800">{summary.todaysOrderCount}</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-500">Today's Revenue</p>
          <p className="mt-1 text-2xl font-bold text-gray-800">INR {(summary.todaysRevenue / 100).toFixed(2)}</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-500">Avg Order Value</p>
          <p className="mt-1 text-2xl font-bold text-gray-800">INR {(summary.averageOrderValue / 100).toFixed(2)}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="mb-3 text-sm font-semibold text-gray-700">Orders By Status</p>
          <div className="space-y-2">
            {summary.ordersByStatus.map((item) => (
              <div key={item.status} className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{item.status}</span>
                <span className="font-semibold text-gray-800">{item.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="mb-3 text-sm font-semibold text-gray-700">Avg Preparation Time</p>
          <p className="text-3xl font-bold text-gray-800">{summary.averagePreparationMinutes.toFixed(1)} min</p>
          <p className="mt-1 text-xs text-gray-500">From CONFIRMED to READY status transitions.</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="mb-3 text-sm font-semibold text-gray-700">Revenue Trend (Last 7 Days)</p>
          <div className="space-y-2">
            {summary.revenueTrend.map((point) => (
              <div key={point.date} className="grid grid-cols-[90px_1fr_80px] items-center gap-2 text-xs">
                <span className="text-gray-500">{point.date.slice(5)}</span>
                <div className="h-2 rounded bg-gray-100">
                  <div
                    className="h-2 rounded bg-orange-500"
                    style={{ width: `${(point.revenue / maxRevenue) * 100}%` }}
                  />
                </div>
                <span className="text-right font-medium text-gray-700">INR {(point.revenue / 100).toFixed(0)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="mb-3 text-sm font-semibold text-gray-700">Top 5 Menu Items</p>
          {summary.topMenuItems.length === 0 ? (
            <p className="text-sm text-gray-500">No item data yet.</p>
          ) : (
            <div className="space-y-2">
              {summary.topMenuItems.map((item) => (
                <div key={item.name} className="grid grid-cols-[1fr_90px] items-center gap-2 text-xs">
                  <div>
                    <p className="truncate text-gray-700">{item.name}</p>
                    <div className="mt-1 h-2 rounded bg-gray-100">
                      <div
                        className="h-2 rounded bg-emerald-500"
                        style={{ width: `${(item.count / maxTopItem) * 100}%` }}
                      />
                    </div>
                  </div>
                  <p className="text-right font-semibold text-gray-800">{item.count}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 rounded-xl bg-white p-4 shadow-sm">
        <p className="mb-3 text-sm font-semibold text-gray-700">Recent Customer Reviews</p>
        {reviews.length === 0 ? (
          <p className="text-sm text-gray-500">No reviews yet.</p>
        ) : (
          <div className="space-y-3">
            {reviews.map((review) => (
              <div key={review.id} className="rounded-md border border-gray-100 p-3">
                <p className="text-sm font-medium text-gray-800">Order #{review.orderId.slice(0, 8).toUpperCase()}</p>
                <p className="text-xs text-orange-600">Rating: {review.rating} / 5</p>
                {review.comment && <p className="mt-1 text-sm text-gray-600">{review.comment}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default DashboardHome