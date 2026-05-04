import { useCallback, useEffect, useMemo, useState } from 'react'
import { getCategoriesApi, getItemsApi } from '../../api/menu'
import { getWastageApi, logWastageApi } from '../../api/wastage'
import { getAnalyticsSummaryApi } from '../../api/analytics'
import type { MenuCategory, MenuItem } from '../../types/menu'
import type { WastageEvent } from '../../types/wastage'
import { useAuth } from '../../context/AuthContext'
import { formatCurrency } from '../../utils/currency'
import { getApiErrorMessage } from '../../api/error'
import { extractTenantId } from '../../utils/jwt'

const REASONS = ['Expired', 'Spoiled', 'Over-prepped', 'Damaged', 'Quality reject', 'Other']

const WastagePage = () => {
  const { token } = useAuth()
  const tenantId = useMemo(() => extractTenantId(token), [token])

  const [events, setEvents] = useState<WastageEvent[]>([])
  const [items, setItems] = useState<MenuItem[]>([])
  const [monthRevenue, setMonthRevenue] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showForm, setShowForm] = useState(false)

  const [menuItemId, setMenuItemId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [reason, setReason] = useState('')

  const load = useCallback(async () => {
    if (!tenantId) return
    setLoading(true)
    setError('')
    try {
      const cats: MenuCategory[] = await getCategoriesApi(tenantId)
      const allItems = (await Promise.all(cats.map((cat) => getItemsApi(tenantId, cat.id)))).flat()
      setItems(allItems)
      const [wastageEvents, summary] = await Promise.all([
        getWastageApi(tenantId),
        getAnalyticsSummaryApi(tenantId).catch(() => null),
      ])
      setEvents(wastageEvents)
      if (summary) {
        setMonthRevenue(summary.revenueTrend.reduce((s, r) => s + r.revenue, 0))
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load wastage data.'))
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  useEffect(() => { load() }, [load])

  const submit = async () => {
    if (!tenantId || !menuItemId || quantity <= 0) return
    setSubmitting(true)
    try {
      await logWastageApi(tenantId, menuItemId, quantity, reason)
      setMenuItemId('')
      setQuantity(1)
      setReason('')
      setShowForm(false)
      setSuccess('Wastage logged successfully.')
      setTimeout(() => setSuccess(''), 3000)
      await load()
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to log wastage.'))
    } finally {
      setSubmitting(false)
    }
  }

  // ─── Derived analytics ───────────────────────────────────────────────────────
  const totalWasteValue = useMemo(
    () => events.reduce((s, e) => s + e.unitCost * e.quantity, 0),
    [events]
  )

  const last30Days = useMemo(() => {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000
    return events.filter((e) => new Date(e.createdAt).getTime() >= cutoff)
  }, [events])

  const last30Value = useMemo(
    () => last30Days.reduce((s, e) => s + e.unitCost * e.quantity, 0),
    [last30Days]
  )

  const avgDailyWaste = last30Value / 30

  const wasteVsRevenuePct = monthRevenue > 0 ? (last30Value / monthRevenue) * 100 : null

  // Top 6 most wasted items by cost
  const topWastedItems = useMemo(() => {
    const map: Record<string, { name: string; value: number; count: number }> = {}
    for (const e of last30Days) {
      const key = e.menuItemId ?? 'unknown'
      const name = e.menuItemName ?? 'Unknown'
      if (!map[key]) map[key] = { name, value: 0, count: 0 }
      map[key].value += e.unitCost * e.quantity
      map[key].count += e.quantity
    }
    return Object.values(map).sort((a, b) => b.value - a.value).slice(0, 6)
  }, [last30Days])

  // Daily trend for last 7 days
  const trendDays = useMemo(() => {
    const days: { label: string; value: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const iso = d.toISOString().slice(0, 10)
      const label = d.toLocaleDateString('en-IN', { weekday: 'short' }).slice(0, 1)
      const value = events
        .filter((e) => e.createdAt.slice(0, 10) === iso)
        .reduce((s, e) => s + e.unitCost * e.quantity, 0)
      days.push({ label, value })
    }
    return days
  }, [events])

  const maxTrend = Math.max(...trendDays.map((d) => d.value), 1)

  // Reason breakdown
  const reasonBreakdown = useMemo(() => {
    const map: Record<string, number> = {}
    for (const e of last30Days) {
      const r = e.reason ?? 'Other'
      map[r] = (map[r] ?? 0) + e.unitCost * e.quantity
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [last30Days])

  if (!tenantId) return <p className="text-sm text-gray-500">Tenant context missing.</p>

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Waste Analytics</h1>
          <p className="text-sm text-gray-400 mt-0.5">Track, analyse and reduce food cost leakage</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="shrink-0 rounded-lg bg-orange-500 text-white text-sm font-semibold px-4 py-2 hover:bg-orange-600 transition"
        >
          + Log Waste
        </button>
      </div>

      {error && <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">{error}</div>}
      {success && <div className="rounded-lg bg-emerald-50 border border-emerald-100 px-4 py-3 text-sm text-emerald-700">{success}</div>}

      {/* Log form */}
      {showForm && (
        <div className="rounded-xl bg-white shadow-sm border border-gray-100 p-4">
          <p className="text-sm font-semibold text-gray-700 mb-3">Log wastage event</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label htmlFor="waste-menu-item" className="block text-xs text-gray-500 mb-1">Menu item</label>
              <select
                id="waste-menu-item"
                aria-label="Menu item"
                value={menuItemId}
                onChange={(e) => setMenuItemId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              >
                <option value="">Select item...</option>
                {items.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Quantity wasted</label>
              <input
                type="number" min={1} value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Reason</label>
              <select
                value={reason} onChange={(e) => setReason(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              >
                <option value="">Select reason...</option>
                {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={submit}
                disabled={!menuItemId || quantity <= 0 || submitting}
                className="w-full rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50 transition"
              >
                {submitting ? 'Logging...' : 'Log Waste'}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 rounded-xl bg-white border border-gray-100" />)}
        </div>
      ) : (
        <>
          {/* ─── KPI cards ─────────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Total Waste (30d)</p>
              <p className="mt-2 text-2xl font-bold text-rose-600 tabular-nums">{formatCurrency(last30Value)}</p>
              <p className="text-xs text-gray-400 mt-1">{last30Days.length} events logged</p>
            </div>

            <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Avg Daily Waste</p>
              <p className="mt-2 text-2xl font-bold text-amber-600 tabular-nums">{formatCurrency(avgDailyWaste)}</p>
              <p className="text-xs text-gray-400 mt-1">Based on last 30 days</p>
            </div>

            <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Waste % of Revenue</p>
              {wasteVsRevenuePct !== null ? (
                <>
                  <p className={`mt-2 text-2xl font-bold tabular-nums ${wasteVsRevenuePct <= 3 ? 'text-emerald-600' : wasteVsRevenuePct <= 6 ? 'text-amber-600' : 'text-rose-600'}`}>
                    {wasteVsRevenuePct.toFixed(1)}%
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {wasteVsRevenuePct <= 3 ? '✓ Healthy (target ≤ 3%)' : wasteVsRevenuePct <= 6 ? '⚠ Above target' : '✗ Critical — immediate action'}
                  </p>
                </>
              ) : (
                <p className="mt-2 text-sm text-gray-400">No revenue data</p>
              )}
            </div>

            <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">All-time Waste</p>
              <p className="mt-2 text-2xl font-bold text-gray-700 tabular-nums">{formatCurrency(totalWasteValue)}</p>
              <p className="text-xs text-gray-400 mt-1">{events.length} total events</p>
            </div>
          </div>

          {/* ─── Charts row ─────────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            {/* 7-day trend */}
            <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100">
              <p className="text-sm font-semibold text-gray-700 mb-4">Waste trend — 7 days</p>
              <div className="flex items-end gap-1.5 h-28">
                {trendDays.map((d, i) => {
                  const isToday = i === trendDays.length - 1
                  return (
                    <div key={d.label + i} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className={`w-full rounded-t-sm transition-colors ${isToday ? 'bg-rose-500' : 'bg-rose-200 hover:bg-rose-300'}`}
                        style={{ height: `${(d.value / maxTrend) * 112}px`, minHeight: d.value > 0 ? '4px' : '0' }}
                        title={formatCurrency(d.value)}
                      />
                      <span className={`text-[10px] ${isToday ? 'font-bold text-rose-500' : 'text-gray-400'}`}>{d.label}</span>
                    </div>
                  )
                })}
              </div>
              <p className="mt-3 text-[11px] text-gray-400">Tallest bar = {formatCurrency(maxTrend)}</p>
            </div>

            {/* Top wasted items */}
            <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100">
              <p className="text-sm font-semibold text-gray-700 mb-3">Top wasted items (30d)</p>
              {topWastedItems.length === 0 ? (
                <p className="text-sm text-gray-400">No waste recorded yet — great!</p>
              ) : (
                <div className="space-y-3">
                  {topWastedItems.map((item, i) => (
                    <div key={item.name} className="grid grid-cols-[18px_1fr_60px] items-center gap-2 text-xs">
                      <span className="text-gray-300 font-bold">{i + 1}</span>
                      <div>
                        <p className="truncate font-medium text-gray-700">{item.name}</p>
                        <div className="mt-1 h-1.5 rounded-full bg-gray-100">
                          <div
                            className="h-1.5 rounded-full bg-rose-400"
                            style={{ width: `${(item.value / (topWastedItems[0]?.value || 1)) * 100}%` }}
                          />
                        </div>
                      </div>
                      <p className="text-right font-bold text-gray-700 tabular-nums">{formatCurrency(item.value)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Reason breakdown */}
            <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100">
              <p className="text-sm font-semibold text-gray-700 mb-3">Waste by reason (30d)</p>
              {reasonBreakdown.length === 0 ? (
                <p className="text-sm text-gray-400">No reason data yet.</p>
              ) : (
                <div className="space-y-2.5">
                  {reasonBreakdown.map(([reason, value]) => {
                    const pct = Math.round((value / last30Value) * 100)
                    return (
                      <div key={reason} className="text-xs">
                        <div className="flex justify-between mb-1">
                          <span className="text-gray-600">{reason}</span>
                          <span className="font-semibold text-gray-800 tabular-nums">{pct}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-gray-100">
                          <div className="h-1.5 rounded-full bg-amber-400" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
              {reasonBreakdown[0] && (
                <div className="mt-4 rounded-lg bg-amber-50 border border-amber-100 px-3 py-2">
                  <p className="text-xs text-amber-700">
                    <span className="font-semibold">Top cause: {reasonBreakdown[0][0]}</span> — review prep quantities and storage conditions.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ─── Reduction playbook ─────────────────────────────────────────────── */}
          {wasteVsRevenuePct !== null && wasteVsRevenuePct > 3 && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-4">
              <p className="text-sm font-semibold text-rose-700 mb-2">🎯 Waste Reduction Playbook</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-rose-700">
                <div className="rounded-lg bg-white border border-rose-100 p-3">
                  <p className="font-semibold mb-1">Batch prep smarter</p>
                  <p className="text-rose-500">Review your top wasted item and reduce batch size by 20% for 1 week.</p>
                </div>
                <div className="rounded-lg bg-white border border-rose-100 p-3">
                  <p className="font-semibold mb-1">FIFO enforcement</p>
                  <p className="text-rose-500">Label all incoming stock with date. Oldest items must be used first.</p>
                </div>
                <div className="rounded-lg bg-white border border-rose-100 p-3">
                  <p className="font-semibold mb-1">Daily waste huddle</p>
                  <p className="text-rose-500">5-minute end-of-shift review with kitchen team. Review what was wasted and why.</p>
                </div>
              </div>
            </div>
          )}

          {/* ─── Event log ─────────────────────────────────────────────────────── */}
          <div className="rounded-xl bg-white shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-700">Recent Waste Log</p>
              <span className="text-xs text-gray-400">{events.length} total events</span>
            </div>
            {events.length === 0 ? (
              <p className="p-4 text-sm text-gray-500">No wastage events logged yet.</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {events.slice(0, 20).map((event) => (
                  <div key={event.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {event.menuItemName ?? 'Unknown item'}
                        <span className="ml-2 text-gray-400 font-normal">× {event.quantity}</span>
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {event.reason ?? 'No reason'} · {new Date(event.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <p className="font-semibold text-rose-600 tabular-nums">{formatCurrency(event.unitCost * event.quantity)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default WastagePage
