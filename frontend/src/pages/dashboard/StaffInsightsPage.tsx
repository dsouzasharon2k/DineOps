import { useCallback, useEffect, useMemo, useState } from 'react'
import { getAnalyticsSummaryApi } from '../../api/analytics'
import { getFinanceSummaryApi, listExpenseEntriesApi, createExpenseEntryApi } from '../../api/finance'
import { getApiErrorMessage } from '../../api/error'
import { formatCurrency } from '../../utils/currency'
import { useAuth } from '../../context/AuthContext'
import { extractTenantId } from '../../utils/jwt'
import type { AnalyticsSummary } from '../../types/analytics'
import type { FinanceSummary, ExpenseEntry } from '../../types/finance'
import ToastMessage from '../../components/ToastMessage'

const LABOR_CATEGORIES = ['STAFF', 'WAGES', 'LABOR', 'STAFF_MEAL', 'STAFF_WELFARE', 'OVERTIME']

const todayIso = () => new Date().toISOString().slice(0, 10)

const dayLabel = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short' })

const SHIFT_BLOCKS = [
  { label: 'Morning Prep', time: '7:00 – 10:00 AM', icon: '🌅' },
  { label: 'Lunch Rush', time: '11:30 AM – 2:30 PM', icon: '🍽️' },
  { label: 'Afternoon Slow', time: '2:30 – 5:00 PM', icon: '☕' },
  { label: 'Dinner Service', time: '6:00 – 10:00 PM', icon: '🌆' },
  { label: 'Closing', time: '10:00 PM – 12:00 AM', icon: '🔒' },
]

const EXPENSE_CATEGORIES = ['STAFF', 'WAGES', 'LABOR', 'STAFF_MEAL', 'STAFF_WELFARE', 'OVERTIME', 'OPERATIONS', 'RENT', 'UTILITIES', 'MARKETING', 'SUPPLIES', 'MAINTENANCE', 'OTHER']

const StaffInsightsPage = () => {
  const { token } = useAuth()
  const tenantId = useMemo(() => extractTenantId(token), [token])

  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null)
  const [financeSummary, setFinanceSummary] = useState<FinanceSummary | null>(null)
  const [staffExpenses, setStaffExpenses] = useState<ExpenseEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [fromDate, setFromDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 29)
    return d.toISOString().slice(0, 10)
  })
  const [toDate, setToDate] = useState(todayIso)

  // Quick log form
  const [logDate, setLogDate] = useState(todayIso)
  const [logCategory, setLogCategory] = useState('WAGES')
  const [logAmount, setLogAmount] = useState('')
  const [logNotes, setLogNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    if (!tenantId) return
    setLoading(true)
    setError('')
    try {
      const [analyticsRes, financeRes, expensesRes] = await Promise.all([
        getAnalyticsSummaryApi(tenantId, fromDate, toDate),
        getFinanceSummaryApi(tenantId, fromDate, toDate),
        listExpenseEntriesApi(tenantId, fromDate, toDate, 0, 100),
      ])
      setAnalytics(analyticsRes)
      setFinanceSummary(financeRes)
      setStaffExpenses(expensesRes.content.filter((e) => LABOR_CATEGORIES.includes(e.category.toUpperCase())))
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load staff insights.'))
    } finally {
      setLoading(false)
    }
  }, [tenantId, fromDate, toDate])

  useEffect(() => { void load() }, [load])

  const handleLogExpense = async () => {
    if (!tenantId || !logAmount) return
    const parsed = parseFloat(logAmount)
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError('Enter a valid amount.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      await createExpenseEntryApi({
        tenantId,
        expenseDate: logDate,
        category: logCategory,
        amount: Math.round(parsed * 100),
        notes: logNotes || undefined,
      })
      setLogAmount('')
      setLogNotes('')
      setSuccess('Labor expense logged.')
      void load()
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to log expense.'))
    } finally {
      setSubmitting(false)
    }
  }

  // Derived metrics
  const totalLaborCost = useMemo(
    () => staffExpenses.reduce((sum, e) => sum + e.amount, 0),
    [staffExpenses]
  )

  const totalRevenue = useMemo(() => {
    if (!analytics) return 0
    return analytics.revenueTrend.reduce((sum, r) => sum + r.revenue, 0)
  }, [analytics])

  const laborPct = totalRevenue > 0 ? ((totalLaborCost / totalRevenue) * 100).toFixed(1) : null

  // Peak day analysis from revenue trend
  const peakAnalysis = useMemo(() => {
    if (!analytics || analytics.revenueTrend.length === 0) return null
    const sorted = [...analytics.revenueTrend].sort((a, b) => b.revenue - a.revenue)
    const maxRev = sorted[0]?.revenue ?? 1
    return analytics.revenueTrend.map((point) => ({
      ...point,
      pct: Math.round((point.revenue / maxRev) * 100),
      label: dayLabel(point.date),
      isToday: point.date === todayIso(),
      isPeak: point.revenue === sorted[0]?.revenue,
    }))
  }, [analytics])

  // Labor by category
  const laborByCategory = useMemo(() => {
    const map: Record<string, number> = {}
    for (const e of staffExpenses) {
      map[e.category] = (map[e.category] ?? 0) + e.amount
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [staffExpenses])

  const totalExpenses = financeSummary?.totalExpense ?? 0
  const staffSharePct = totalExpenses > 0 ? ((totalLaborCost / totalExpenses) * 100).toFixed(0) : null

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Staff Insights</h1>
        <p className="text-sm text-gray-400 mt-0.5">Labor cost analysis, peak-day staffing signals, and shift management.</p>
      </div>

      {error && <ToastMessage message={error} variant="error" onClose={() => setError('')} />}
      {success && <ToastMessage message={success} variant="success" onClose={() => setSuccess('')} />}

      {/* Date range */}
      <div className="flex flex-wrap items-end gap-3 rounded-xl bg-white border border-gray-100 shadow-sm px-4 py-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">From</label>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="rounded border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">To</label>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="rounded border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <button onClick={() => void load()} className="rounded bg-gray-800 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-900">
          Apply
        </button>
      </div>

      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[0, 1, 2].map((i) => <div key={i} className="h-24 rounded-xl bg-white border border-gray-100" />)}
        </div>
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl bg-white border border-gray-100 shadow-sm p-4">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">Total Labor Cost</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 tabular-nums">{formatCurrency(totalLaborCost)}</p>
              {staffSharePct && <p className="text-xs text-gray-400 mt-1">{staffSharePct}% of total expenses</p>}
            </div>

            <div className="rounded-xl bg-white border border-gray-100 shadow-sm p-4">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">Labor Cost %</p>
              {laborPct !== null ? (
                <>
                  <p className={`mt-2 text-3xl font-bold tabular-nums ${parseFloat(laborPct) <= 30 ? 'text-emerald-600' : parseFloat(laborPct) <= 40 ? 'text-amber-600' : 'text-red-600'}`}>
                    {laborPct}%
                  </p>
                  <p className="text-xs text-gray-400 mt-1">of revenue (target: &le;30%)</p>
                </>
              ) : (
                <p className="mt-2 text-sm text-gray-400">Log labor expenses to see this metric</p>
              )}
            </div>

            <div className="rounded-xl bg-white border border-gray-100 shadow-sm p-4">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">Revenue (Range)</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 tabular-nums">{formatCurrency(totalRevenue)}</p>
              <p className="text-xs text-gray-400 mt-1">{analytics?.revenueTrend.length ?? 0} days</p>
            </div>

            <div className="rounded-xl bg-white border border-gray-100 shadow-sm p-4">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">Avg Prep Time</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 tabular-nums">
                {analytics?.averagePreparationMinutes.toFixed(1) ?? '—'}
                <span className="text-lg font-medium text-gray-400 ml-1">min</span>
              </p>
              <p className="text-xs text-gray-400 mt-1">kitchen efficiency signal</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Peak day analysis */}
            <div className="rounded-xl bg-white border border-gray-100 shadow-sm p-4">
              <p className="text-sm font-semibold text-gray-700 mb-4">Peak Day Analysis — Revenue Trend</p>
              {peakAnalysis && peakAnalysis.length > 0 ? (
                <div className="space-y-2">
                  {peakAnalysis.map((point) => (
                    <div key={point.date} className="flex items-center gap-3">
                      <span className={`w-8 text-xs font-medium shrink-0 ${point.isPeak ? 'text-orange-600' : 'text-gray-500'}`}>
                        {point.label}
                      </span>
                      <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${point.isPeak ? 'bg-orange-500' : point.isToday ? 'bg-blue-400' : 'bg-orange-200'}`}
                          style={{ width: `${Math.max(point.pct, 2)}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 tabular-nums w-20 text-right shrink-0">
                        {formatCurrency(point.revenue)}
                      </span>
                    </div>
                  ))}
                  {peakAnalysis.length > 0 && (
                    <div className="mt-3 rounded-lg bg-orange-50 border border-orange-100 px-3 py-2 text-xs text-orange-800">
                      <strong>Staffing tip:</strong> Schedule extra staff on{' '}
                      {peakAnalysis.filter((p) => p.pct >= 70).map((p) => p.label).join(', ') || peakAnalysis[0]?.label}.
                      Consider leaner shifts on slower days to reduce labor cost %.
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-400">No revenue data in this range.</p>
              )}
            </div>

            {/* Labor by category */}
            <div className="rounded-xl bg-white border border-gray-100 shadow-sm p-4">
              <p className="text-sm font-semibold text-gray-700 mb-4">Labor Cost Breakdown</p>
              {laborByCategory.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500">No labor expenses logged in this range.</p>
                  <p className="text-xs text-gray-400 mt-1">Use the form below to log wages, staff meals, and overtime.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {laborByCategory.map(([cat, amt]) => {
                    const pct = totalLaborCost > 0 ? Math.round((amt / totalLaborCost) * 100) : 0
                    return (
                      <div key={cat}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-medium text-gray-700">{cat}</span>
                          <span className="text-gray-500 tabular-nums">{formatCurrency(amt)} ({pct}%)</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full">
                          <div className="h-2 bg-blue-400 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Shift schedule guide */}
          <div className="rounded-xl bg-white border border-gray-100 shadow-sm p-4">
            <p className="text-sm font-semibold text-gray-700 mb-1">Shift Schedule Guide</p>
            <p className="text-xs text-gray-400 mb-4">Standard shift blocks for a full-service restaurant. Use peak-day data above to decide staffing levels.</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
              {SHIFT_BLOCKS.map((shift) => (
                <div key={shift.label} className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-3 text-center">
                  <p className="text-lg mb-1">{shift.icon}</p>
                  <p className="text-xs font-semibold text-gray-700">{shift.label}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">{shift.time}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Log labor expense */}
          <div className="rounded-xl bg-white border border-gray-100 shadow-sm p-4">
            <h2 className="text-sm font-semibold text-gray-800 mb-3">Log Labor Expense</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Date</label>
                <input type="date" value={logDate} onChange={(e) => setLogDate(e.target.value)} className="w-full rounded border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Category</label>
                <select value={logCategory} onChange={(e) => setLogCategory(e.target.value)} className="w-full rounded border border-gray-300 px-3 py-2 text-sm bg-white">
                  {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Amount (₹)</label>
                <input type="number" value={logAmount} onChange={(e) => setLogAmount(e.target.value)} placeholder="e.g. 3500" min="0" step="1" className="w-full rounded border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Notes</label>
                <input value={logNotes} onChange={(e) => setLogNotes(e.target.value)} placeholder="e.g. Chef daily wages" className="w-full rounded border border-gray-300 px-3 py-2 text-sm" />
              </div>
            </div>
            <button
              onClick={() => void handleLogExpense()}
              disabled={submitting || !logAmount}
              className="mt-3 rounded bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
            >
              {submitting ? 'Saving…' : 'Log Expense'}
            </button>
          </div>

          {/* ─── Performance Scorecards (SRS §7.3) ──────────────────────────── */}
          {analytics && (
            <div className="rounded-xl bg-white border border-gray-100 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-sm font-semibold text-gray-800">Performance Scorecards</h2>
                <span className="text-xs bg-orange-100 text-orange-700 rounded-full px-2 py-0.5 font-medium">
                  {fromDate} → {toDate}
                </span>
              </div>

              {(() => {
                const totalRevenue = analytics.revenueTrend.reduce((s, r) => s + r.revenue, 0)
                const laborCost = (financeSummary?.byCategory ?? [])
                  .filter((c) => LABOR_CATEGORIES.includes(c.category.toUpperCase()))
                  .reduce((s, c) => s + c.amount, 0)
                const laborRatio = totalRevenue > 0 ? (laborCost / totalRevenue) * 100 : null
                const prepTime = analytics.averagePreparationMinutes
                const wastage = analytics.revenueTrend.length > 0
                  ? analytics.wastageTrend.reduce((s, r) => s + r.revenue, 0) : 0
                const wasteRatio = totalRevenue > 0 ? (wastage / totalRevenue) * 100 : null

                const scorecards = [
                  {
                    label: 'Order Volume',
                    value: `${analytics.todaysOrderCount} today`,
                    sub: `${analytics.revenueTrend.length}-day trend active`,
                    score: analytics.todaysOrderCount >= 20 ? 'A' : analytics.todaysOrderCount >= 10 ? 'B' : 'C',
                    color: analytics.todaysOrderCount >= 20 ? 'emerald' : analytics.todaysOrderCount >= 10 ? 'amber' : 'red',
                    note: analytics.todaysOrderCount >= 20 ? 'Excellent throughput' : analytics.todaysOrderCount >= 10 ? 'Average — push promotions' : 'Low — check for operational issues',
                  },
                  {
                    label: 'Kitchen Speed',
                    value: `${prepTime.toFixed(1)} min avg prep`,
                    sub: 'CONFIRMED → READY',
                    score: prepTime <= 20 ? 'A' : prepTime <= 30 ? 'B' : 'C',
                    color: prepTime <= 20 ? 'emerald' : prepTime <= 30 ? 'amber' : 'red',
                    note: prepTime <= 20 ? 'Fast — target met' : prepTime <= 30 ? 'Moderate — review station allocation' : 'Slow — bottleneck in kitchen flow',
                  },
                  {
                    label: 'Labor Cost Ratio',
                    value: laborRatio !== null ? `${laborRatio.toFixed(1)}%` : 'Log expenses',
                    sub: 'Labor ÷ Revenue (target ≤ 30%)',
                    score: laborRatio === null ? '—' : laborRatio <= 25 ? 'A' : laborRatio <= 35 ? 'B' : 'C',
                    color: laborRatio === null ? 'gray' : laborRatio <= 25 ? 'emerald' : laborRatio <= 35 ? 'amber' : 'red',
                    note: laborRatio === null ? 'Log staff expenses to calculate' : laborRatio <= 25 ? 'Well controlled' : laborRatio <= 35 ? 'Slightly high — review rosters' : 'Overstaffed or under-revenue',
                  },
                  {
                    label: 'Waste Control',
                    value: wasteRatio !== null ? `${wasteRatio.toFixed(1)}% of revenue` : 'No data',
                    sub: 'Wastage ÷ Revenue (target ≤ 3%)',
                    score: wasteRatio === null ? '—' : wasteRatio <= 3 ? 'A' : wasteRatio <= 6 ? 'B' : 'C',
                    color: wasteRatio === null ? 'gray' : wasteRatio <= 3 ? 'emerald' : wasteRatio <= 6 ? 'amber' : 'red',
                    note: wasteRatio === null ? 'Log wastage to calculate' : wasteRatio <= 3 ? 'Excellent waste management' : wasteRatio <= 6 ? 'Slightly above — review prep quantities' : 'High waste — immediate kitchen review needed',
                  },
                  {
                    label: 'Revenue Trend',
                    value: (() => {
                      const last = analytics.revenueTrend.at(-1)?.revenue ?? 0
                      const prev = analytics.revenueTrend.at(-2)?.revenue ?? 0
                      if (!prev) return 'No comparison'
                      const delta = Math.round(((last - prev) / prev) * 100)
                      return `${delta >= 0 ? '+' : ''}${delta}% vs yesterday`
                    })(),
                    sub: '7-day period',
                    score: (() => {
                      const last = analytics.revenueTrend.at(-1)?.revenue ?? 0
                      const prev = analytics.revenueTrend.at(-2)?.revenue ?? 0
                      if (!prev) return '—'
                      const delta = ((last - prev) / prev) * 100
                      return delta >= 5 ? 'A' : delta >= 0 ? 'B' : 'C'
                    })(),
                    color: (() => {
                      const last = analytics.revenueTrend.at(-1)?.revenue ?? 0
                      const prev = analytics.revenueTrend.at(-2)?.revenue ?? 0
                      if (!prev) return 'gray'
                      return ((last - prev) / prev) * 100 >= 5 ? 'emerald' : ((last - prev) / prev) * 100 >= 0 ? 'amber' : 'red'
                    })(),
                    note: (() => {
                      const last = analytics.revenueTrend.at(-1)?.revenue ?? 0
                      const prev = analytics.revenueTrend.at(-2)?.revenue ?? 0
                      if (!prev) return 'Insufficient data'
                      const delta = ((last - prev) / prev) * 100
                      return delta >= 5 ? 'Growth day' : delta >= 0 ? 'Stable' : 'Declining — review menu + promotions'
                    })(),
                  },
                ]

                const gradeColors: Record<string, string> = {
                  A: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                  B: 'bg-amber-50 text-amber-700 border-amber-200',
                  C: 'bg-red-50 text-red-700 border-red-200',
                  '—': 'bg-gray-50 text-gray-500 border-gray-200',
                }
                const barColors: Record<string, string> = {
                  emerald: 'bg-emerald-400',
                  amber: 'bg-amber-400',
                  red: 'bg-red-400',
                  gray: 'bg-gray-200',
                }

                const overallScore = scorecards.filter(s => s.score !== '—').map(s => s.score)
                const aCount = overallScore.filter(s => s === 'A').length
                const cCount = overallScore.filter(s => s === 'C').length
                const overallGrade = aCount >= 3 ? 'A' : cCount >= 2 ? 'C' : 'B'

                return (
                  <div className="space-y-4">
                    {/* Overall grade */}
                    <div className={`flex items-center gap-4 rounded-xl border px-4 py-3 ${gradeColors[overallGrade]}`}>
                      <span className="text-4xl font-black">{overallGrade}</span>
                      <div>
                        <p className="font-semibold text-sm">Overall Performance Grade</p>
                        <p className="text-xs opacity-70">
                          {overallGrade === 'A' ? 'Excellent — the restaurant is running smoothly' :
                           overallGrade === 'B' ? 'Good — minor improvements can boost profitability' :
                           'Needs attention — review highlighted areas below'}
                        </p>
                      </div>
                    </div>

                    {/* Individual scorecards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
                      {scorecards.map((card) => (
                        <div key={card.label} className={`rounded-xl border p-3 ${gradeColors[card.score]}`}>
                          <div className="flex items-start justify-between mb-2">
                            <p className="text-[11px] font-semibold uppercase tracking-widest opacity-70">{card.label}</p>
                            <span className={`text-xs font-black px-2 py-0.5 rounded-full border ${gradeColors[card.score]}`}>
                              {card.score}
                            </span>
                          </div>
                          <p className="text-sm font-bold">{card.value}</p>
                          <p className="text-[10px] opacity-60 mt-0.5">{card.sub}</p>
                          {/* Score bar */}
                          <div className="mt-2 h-1 rounded-full bg-white/50">
                            <div
                              className={`h-1 rounded-full ${barColors[card.color]}`}
                              style={{ width: card.score === 'A' ? '100%' : card.score === 'B' ? '65%' : card.score === 'C' ? '30%' : '0%' }}
                            />
                          </div>
                          <p className="text-[10px] mt-1.5 opacity-80">{card.note}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })()}
            </div>
          )}

          {/* Recent labor expenses */}
          {staffExpenses.length > 0 && (
            <div className="rounded-xl bg-white border border-gray-100 shadow-sm p-4">
              <h2 className="text-sm font-semibold text-gray-800 mb-3">Recent Labor Expenses</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100 text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-500">
                      <th className="py-2 pr-4">Date</th>
                      <th className="py-2 pr-4">Category</th>
                      <th className="py-2 pr-4 text-right">Amount</th>
                      <th className="py-2">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {staffExpenses.slice(0, 10).map((e) => (
                      <tr key={e.id}>
                        <td className="py-2 pr-4 text-gray-600">{e.expenseDate}</td>
                        <td className="py-2 pr-4">
                          <span className="rounded bg-blue-50 border border-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">{e.category}</span>
                        </td>
                        <td className="py-2 pr-4 text-right font-medium tabular-nums text-gray-800">{formatCurrency(e.amount)}</td>
                        <td className="py-2 text-gray-500 text-xs">{e.notes ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default StaffInsightsPage
