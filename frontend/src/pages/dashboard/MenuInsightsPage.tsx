import { useCallback, useEffect, useMemo, useState } from 'react'
import { getApiErrorMessage } from '../../api/error'
import { getMenuInsightsApi } from '../../api/menuInsights'
import { useAuth } from '../../context/AuthContext'
import { extractTenantId } from '../../utils/jwt'
import type { MenuInsightItem, MenuInsightsResponse } from '../../types/menuInsights'
import { formatCurrency } from '../../utils/currency'

const todayIso = () => new Date().toISOString().slice(0, 10)

const quadrantClass: Record<MenuInsightItem['quadrant'], string> = {
  STAR: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  CASH_COW: 'bg-sky-50 text-sky-700 border-sky-200',
  TRAP: 'bg-amber-50 text-amber-700 border-amber-200',
  DOG: 'bg-rose-50 text-rose-700 border-rose-200',
}

const MenuInsightsPage = () => {
  const { token } = useAuth()
  const tenantId = useMemo(() => extractTenantId(token), [token])

  const [data, setData] = useState<MenuInsightsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 29)
    return d.toISOString().slice(0, 10)
  })
  const [toDate, setToDate] = useState(todayIso)

  const load = useCallback(async () => {
    if (!tenantId) {
      setError('Tenant context missing for menu insights.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const response = await getMenuInsightsApi(tenantId, fromDate, toDate)
      setData(response)
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load menu insights.'))
    } finally {
      setLoading(false)
    }
  }, [tenantId, fromDate, toDate])

  useEffect(() => {
    void load()
  }, [load])

  const counts = useMemo(() => {
    const items = data?.items ?? []
    return {
      star: items.filter((item) => item.quadrant === 'STAR').length,
      cashCow: items.filter((item) => item.quadrant === 'CASH_COW').length,
      trap: items.filter((item) => item.quadrant === 'TRAP').length,
      dog: items.filter((item) => item.quadrant === 'DOG').length,
    }
  }, [data])

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800">Menu Insights</h1>
      <p className="mt-1 text-sm text-gray-500">Classify items into Stars, Cash Cows, Traps, and Dogs using demand and margin signals.</p>

      <div className="mt-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs text-gray-500">From date</label>
            <input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} className="w-full rounded border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">To date</label>
            <input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} className="w-full rounded border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div className="sm:col-span-2 flex items-end">
            <button onClick={() => void load()} className="rounded bg-gray-800 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-900">Apply Range</button>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3"><p className="text-xs text-emerald-700">Stars</p><p className="text-xl font-bold text-emerald-800">{counts.star}</p></div>
        <div className="rounded-xl border border-sky-100 bg-sky-50 p-3"><p className="text-xs text-sky-700">Cash Cows</p><p className="text-xl font-bold text-sky-800">{counts.cashCow}</p></div>
        <div className="rounded-xl border border-amber-100 bg-amber-50 p-3"><p className="text-xs text-amber-700">Traps</p><p className="text-xl font-bold text-amber-800">{counts.trap}</p></div>
        <div className="rounded-xl border border-rose-100 bg-rose-50 p-3"><p className="text-xs text-rose-700">Dogs</p><p className="text-xl font-bold text-rose-800">{counts.dog}</p></div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm lg:col-span-2">
          <h2 className="text-sm font-semibold text-gray-800">Items</h2>
          {loading ? (
            <p className="mt-3 text-sm text-gray-500">Loading menu insights...</p>
          ) : (data?.items.length ?? 0) === 0 ? (
            <p className="mt-3 text-sm text-gray-500">No menu insight data found for selected range.</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500">
                    <th className="py-2 pr-3">Item</th>
                    <th className="py-2 pr-3">Quadrant</th>
                    <th className="py-2 pr-3">Units</th>
                    <th className="py-2 pr-3">Revenue</th>
                    <th className="py-2 pr-3">Profit</th>
                    <th className="py-2">Margin %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data?.items.map((item) => (
                    <tr key={item.itemName}>
                      <td className="py-2 pr-3 font-medium text-gray-800">{item.itemName}</td>
                      <td className="py-2 pr-3">
                        <span className={`inline-flex rounded border px-2 py-0.5 text-xs font-semibold ${quadrantClass[item.quadrant]}`}>
                          {item.quadrant}
                        </span>
                      </td>
                      <td className="py-2 pr-3">{item.unitsSold}</td>
                      <td className="py-2 pr-3">{formatCurrency(item.revenue)}</td>
                      <td className="py-2 pr-3">{formatCurrency(item.profit)}</td>
                      <td className="py-2">{item.marginPct.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-800">Actions Today</h2>
          <ul className="mt-3 space-y-2 text-sm text-gray-700">
            {(data?.recommendations ?? []).map((recommendation) => (
              <li key={recommendation} className="rounded bg-gray-50 px-3 py-2">{recommendation}</li>
            ))}
          </ul>
        </div>
      </div>

      {error && <div className="mt-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
    </div>
  )
}

export default MenuInsightsPage
