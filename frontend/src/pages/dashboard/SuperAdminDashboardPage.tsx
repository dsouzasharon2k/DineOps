import { useEffect, useMemo, useState } from 'react'
import { getRestaurantsApi } from '../../api/restaurants'
import { getAnalyticsSummaryApi } from '../../api/analytics'
import { getCurrentSubscriptionApi } from '../../api/subscriptions'
import { getApiErrorMessage } from '../../api/error'
import { formatCurrency } from '../../utils/currency'
import type { Restaurant } from '../../types/restaurant'
import type { Subscription } from '../../types/subscription'
import type { AnalyticsSummary } from '../../types/analytics'

type Row = {
  restaurant: Restaurant
  analytics: AnalyticsSummary | null
  subscription: Subscription | null
}

const SuperAdminDashboardPage = () => {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        setError('')
        const restaurants = await getRestaurantsApi()

        const data = await Promise.all(
          restaurants.map(async (restaurant) => {
            const [analytics, subscription] = await Promise.all([
              getAnalyticsSummaryApi(restaurant.id).catch(() => null),
              getCurrentSubscriptionApi(restaurant.id).catch(() => null),
            ])
            return { restaurant, analytics, subscription }
          })
        )
        setRows(data)
      } catch (err) {
        setError(getApiErrorMessage(err, 'Failed to load platform metrics.'))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const totals = useMemo(() => {
    const restaurants = rows.length
    const todaysRevenue = rows.reduce((sum, row) => sum + (row.analytics?.todaysRevenue ?? 0), 0)
    const todaysOrders = rows.reduce((sum, row) => sum + (row.analytics?.todaysOrderCount ?? 0), 0)
    const activeSubscribers = rows.filter((r) => r.subscription?.status === 'ACTIVE').length
    return {
      restaurants,
      todaysRevenue,
      todaysOrders,
      activeSubscribers,
      nonSubscribers: Math.max(restaurants - activeSubscribers, 0),
    }
  }, [rows])

  if (loading) return <p className="text-sm text-gray-500">Loading platform analytics...</p>
  if (error) return <p className="text-sm text-red-600">{error}</p>

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800">Platform Dashboard</h1>
      <p className="mt-2 text-sm text-gray-500">Super admin overview across all restaurants.</p>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Metric label="Total restaurants" value={totals.restaurants.toString()} />
        <Metric label="Today's platform revenue" value={formatCurrency(totals.todaysRevenue)} />
        <Metric label="Today's platform orders" value={totals.todaysOrders.toString()} />
        <Metric label="Active subscribers" value={totals.activeSubscribers.toString()} />
        <Metric label="Non-subscribers" value={totals.nonSubscribers.toString()} />
      </div>

      <div className="mt-5 rounded-xl bg-white border border-gray-100 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Restaurant</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Today's orders</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Today's revenue</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Subscription</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => (
              <tr key={row.restaurant.id}>
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-800">{row.restaurant.name}</p>
                  <p className="text-xs text-gray-400">{row.restaurant.slug}</p>
                </td>
                <td className="px-4 py-3 text-gray-600">{row.restaurant.status}</td>
                <td className="px-4 py-3 text-right text-gray-700 tabular-nums">{row.analytics?.todaysOrderCount ?? 0}</td>
                <td className="px-4 py-3 text-right text-gray-700 tabular-nums">{formatCurrency(row.analytics?.todaysRevenue ?? 0)}</td>
                <td className="px-4 py-3 text-gray-600">{row.subscription?.status ?? 'NONE'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 rounded-lg border border-dashed border-gray-200 bg-white px-4 py-3">
        <p className="text-xs text-gray-500">
          Next scope for super admin: customer reviews moderation, bug/ticket queue, SLA tracking, and support workflows.
        </p>
      </div>
    </div>
  )
}

const Metric = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
    <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</p>
    <p className="mt-2 text-2xl font-bold text-gray-900 tabular-nums">{value}</p>
  </div>
)

export default SuperAdminDashboardPage

