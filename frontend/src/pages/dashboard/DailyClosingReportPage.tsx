import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getAnalyticsSummaryApi } from '../../api/analytics'
import { getFinanceSummaryApi, listExpenseEntriesApi } from '../../api/finance'
import { getAlertsSummaryApi } from '../../api/alerts'
import { getApiErrorMessage } from '../../api/error'
import { formatCurrency } from '../../utils/currency'
import { useAuth } from '../../context/AuthContext'
import { extractTenantId } from '../../utils/jwt'
import type { AnalyticsSummary } from '../../types/analytics'
import type { FinanceSummary, ExpenseEntry } from '../../types/finance'
import type { AlertSummaryItem } from '../../types/alerts'

const COMMISSION_STORAGE_KEY = 'dineops_commission_rate'
const DEFAULT_COMMISSION_RATE = 25
const LABOR_CATS = ['STAFF', 'WAGES', 'LABOR', 'STAFF_MEAL', 'STAFF_WELFARE', 'OVERTIME']

const todayIso = () => new Date().toISOString().slice(0, 10)

const DailyClosingReportPage = () => {
  const { token } = useAuth()
  const tenantId = useMemo(() => extractTenantId(token), [token])
  const printRef = useRef<HTMLDivElement>(null)

  const [reportDate, setReportDate] = useState(todayIso)
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null)
  const [finance, setFinance] = useState<FinanceSummary | null>(null)
  const [expenses, setExpenses] = useState<ExpenseEntry[]>([])
  const [alerts, setAlerts] = useState<AlertSummaryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notes, setNotes] = useState('')

  const commissionRate = Number(localStorage.getItem(COMMISSION_STORAGE_KEY) ?? DEFAULT_COMMISSION_RATE)

  const load = useCallback(async () => {
    if (!tenantId) return
    setLoading(true)
    setError('')
    try {
      const [analyticsRes, financeRes, expensesRes, alertsRes] = await Promise.all([
        getAnalyticsSummaryApi(tenantId, reportDate, reportDate),
        getFinanceSummaryApi(tenantId, reportDate, reportDate),
        listExpenseEntriesApi(tenantId, reportDate, reportDate, 0, 100),
        getAlertsSummaryApi(tenantId),
      ])
      setAnalytics(analyticsRes)
      setFinance(financeRes)
      setExpenses(expensesRes.content)
      setAlerts(alertsRes)
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load closing report data.'))
    } finally {
      setLoading(false)
    }
  }, [tenantId, reportDate])

  useEffect(() => { void load() }, [load])

  const handlePrint = () => {
    window.print()
  }

  // Derived numbers
  const revenue = analytics?.todaysRevenue ?? 0
  const profit = analytics?.todaysProfit ?? 0
  const wastage = analytics?.todaysWastage ?? 0
  const orderCount = analytics?.todaysOrderCount ?? 0
  const aov = analytics?.averageOrderValue ?? 0
  const totalExpenses = finance?.totalExpense ?? 0
  const commissionSaved = Math.round(revenue * (commissionRate / 100))
  const netCash = revenue - totalExpenses
  const laborCost = expenses
    .filter((e) => LABOR_CATS.includes(e.category.toUpperCase()))
    .reduce((s, e) => s + e.amount, 0)
  const estimatedFoodCost = Math.max(revenue - profit - wastage, 0)
  const primeCost = laborCost + estimatedFoodCost
  const primeCostPct = revenue > 0 ? Math.round((primeCost / revenue) * 100) : null
  const ordersByStatus = analytics?.ordersByStatus ?? []
  const cancellations = ordersByStatus.find((s) => s.status === 'CANCELLED')?.count ?? 0
  const deliveries = ordersByStatus.find((s) => s.status === 'DELIVERED')?.count ?? 0
  const cancellationRate = (deliveries + cancellations) > 0
    ? Math.round((cancellations / (deliveries + cancellations)) * 100)
    : 0
  const criticalAlerts = alerts.filter((a) => a.severity === 'CRITICAL' && !a.read)

  const reportDateFormatted = new Date(reportDate + 'T00:00:00').toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <div>
      {/* Controls - hidden on print */}
      <div className="print:hidden mb-6 flex flex-wrap items-end gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Daily Closing Report</h1>
          <p className="text-sm text-gray-400 mt-0.5">End-of-day summary — replace your paper ledger with this.</p>
        </div>
        <div className="flex items-end gap-3 ml-auto">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Report date</label>
            <input
              type="date"
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
              className="rounded border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <button
            onClick={() => void load()}
            className="rounded bg-gray-800 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-900"
          >
            Load
          </button>
          <button
            onClick={handlePrint}
            className="rounded bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 flex items-center gap-2"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" />
            </svg>
            Print / Save PDF
          </button>
        </div>
      </div>

      {error && (
        <div className="print:hidden mb-4 rounded-lg bg-red-50 border border-red-100 px-4 py-2 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="print:hidden space-y-3 animate-pulse">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-20 rounded-xl bg-white border border-gray-100" />)}
        </div>
      ) : (
        /* ─── Printable Report ─── */
        <div ref={printRef} className="space-y-4 print:space-y-3">

          {/* Header */}
          <div className="rounded-xl bg-gray-900 text-white p-5 print:rounded-none print:bg-gray-900">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Daily Closing Report</p>
                <h2 className="mt-1 text-2xl font-bold">{reportDateFormatted}</h2>
                <p className="text-gray-400 text-sm mt-0.5">Generated {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400 uppercase tracking-wide">Net Cash Position</p>
                <p className={`text-3xl font-bold tabular-nums mt-1 ${netCash >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {netCash >= 0 ? '+' : ''}{formatCurrency(netCash)}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">Revenue − Expenses</p>
              </div>
            </div>
          </div>

          {/* Commission Savings highlight */}
          <div className="rounded-xl border-2 border-emerald-300 bg-emerald-50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600">Commission Saved Today</p>
                <p className="text-3xl font-bold text-emerald-700 tabular-nums mt-1">{formatCurrency(commissionSaved)}</p>
                <p className="text-xs text-emerald-600 mt-1">
                  That's what Zomato/Swiggy would have charged ({commissionRate}%) on {formatCurrency(revenue)} revenue.
                  You kept it.
                </p>
              </div>
              <div className="text-5xl opacity-30">💸</div>
            </div>
          </div>

          {/* Revenue & orders */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Total Revenue', value: formatCurrency(revenue), color: 'text-gray-900' },
              { label: 'Total Orders', value: String(orderCount), color: 'text-gray-900' },
              { label: 'Avg Order Value', value: formatCurrency(aov), color: 'text-gray-900' },
              { label: "Today's Profit", value: formatCurrency(profit), color: profit >= 0 ? 'text-emerald-600' : 'text-red-600' },
            ].map((card) => (
              <div key={card.label} className="rounded-xl bg-white border border-gray-100 shadow-sm p-4">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">{card.label}</p>
                <p className={`mt-1.5 text-2xl font-bold tabular-nums ${card.color}`}>{card.value}</p>
              </div>
            ))}
          </div>

          {/* Prime cost + wastage */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-white border border-gray-100 shadow-sm p-4">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">Prime Cost</p>
              <p className={`mt-1.5 text-2xl font-bold tabular-nums ${
                primeCostPct === null ? 'text-gray-400' : primeCostPct <= 65 ? 'text-emerald-600' : primeCostPct <= 75 ? 'text-amber-600' : 'text-red-600'
              }`}>
                {primeCostPct !== null ? `${primeCostPct}%` : '—'}
              </p>
              <p className="text-xs text-gray-400 mt-1">Food + Labor ÷ Revenue (target ≤65%)</p>
            </div>
            <div className="rounded-xl bg-white border border-gray-100 shadow-sm p-4">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">Wastage</p>
              <p className="mt-1.5 text-2xl font-bold tabular-nums text-rose-600">{formatCurrency(wastage)}</p>
              <p className="text-xs text-gray-400 mt-1">Material lost today</p>
            </div>
            <div className="rounded-xl bg-white border border-gray-100 shadow-sm p-4">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">Cancellation Rate</p>
              <p className={`mt-1.5 text-2xl font-bold tabular-nums ${cancellationRate <= 5 ? 'text-emerald-600' : cancellationRate <= 15 ? 'text-amber-600' : 'text-red-600'}`}>
                {cancellationRate}%
              </p>
              <p className="text-xs text-gray-400 mt-1">{cancellations} cancelled / {deliveries + cancellations} total</p>
            </div>
          </div>

          {/* Expenses breakdown */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-xl bg-white border border-gray-100 shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-gray-700">Expenses Today</p>
                <span className="text-sm font-bold text-rose-600 tabular-nums">{formatCurrency(totalExpenses)}</span>
              </div>
              {expenses.length === 0 ? (
                <p className="text-sm text-gray-400">No expenses logged for this date.</p>
              ) : (
                <div className="space-y-2">
                  {expenses.map((e) => (
                    <div key={e.id} className="flex items-center justify-between text-sm">
                      <div>
                        <span className="font-medium text-gray-700">{e.category.replace(/_/g, ' ')}</span>
                        {e.notes && <span className="text-gray-400 ml-2 text-xs">— {e.notes}</span>}
                      </div>
                      <span className="tabular-nums text-gray-800 font-medium">{formatCurrency(e.amount)}</span>
                    </div>
                  ))}
                  <div className="border-t border-gray-100 pt-2 flex justify-between font-semibold text-sm">
                    <span className="text-gray-700">Total</span>
                    <span className="text-rose-600 tabular-nums">{formatCurrency(totalExpenses)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Orders by status */}
            <div className="rounded-xl bg-white border border-gray-100 shadow-sm p-4">
              <p className="text-sm font-semibold text-gray-700 mb-3">Order Status Breakdown</p>
              {ordersByStatus.length === 0 ? (
                <p className="text-sm text-gray-400">No order data for this date.</p>
              ) : (
                <div className="space-y-2">
                  {ordersByStatus.map((s) => (
                    <div key={s.status} className="flex items-center justify-between text-sm">
                      <span className="capitalize text-gray-600">{s.status.toLowerCase()}</span>
                      <span className="font-semibold text-gray-800 tabular-nums">{s.count}</span>
                    </div>
                  ))}
                  <div className="border-t border-gray-100 pt-2 flex justify-between font-semibold text-sm text-gray-700">
                    <span>Total orders</span>
                    <span className="tabular-nums">{orderCount}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* P&L summary table */}
          <div className="rounded-xl bg-white border border-gray-100 shadow-sm p-4">
            <p className="text-sm font-semibold text-gray-700 mb-3">P&L Summary</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-700">
                <span>Revenue</span>
                <span className="tabular-nums font-medium text-gray-900">{formatCurrency(revenue)}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Est. food cost (COGS)</span>
                <span className="tabular-nums">— {formatCurrency(estimatedFoodCost)}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Labor cost</span>
                <span className="tabular-nums">— {formatCurrency(laborCost)}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Other expenses</span>
                <span className="tabular-nums">— {formatCurrency(Math.max(totalExpenses - laborCost, 0))}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Wastage loss</span>
                <span className="tabular-nums">— {formatCurrency(wastage)}</span>
              </div>
              <div className="border-t border-gray-200 pt-2 flex justify-between font-bold text-base">
                <span className="text-gray-900">Net Closing Position</span>
                <span className={`tabular-nums ${netCash >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {netCash >= 0 ? '+' : ''}{formatCurrency(netCash)}
                </span>
              </div>
              <div className="flex justify-between text-emerald-600 text-sm font-semibold">
                <span>Commission saved (vs aggregators)</span>
                <span className="tabular-nums">+ {formatCurrency(commissionSaved)}</span>
              </div>
            </div>
          </div>

          {/* Top items today */}
          {analytics && analytics.topMenuItems.length > 0 && (
            <div className="rounded-xl bg-white border border-gray-100 shadow-sm p-4">
              <p className="text-sm font-semibold text-gray-700 mb-3">Top Items Today</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {analytics.topMenuItems.slice(0, 5).map((item, i) => (
                  <div key={item.name} className="text-center rounded-lg bg-gray-50 px-2 py-3">
                    <p className="text-lg font-bold text-gray-900 tabular-nums">{item.count}</p>
                    <p className="text-xs text-gray-600 truncate mt-0.5">{item.name}</p>
                    <p className="text-[10px] text-gray-400">#{i + 1}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Alerts to note */}
          {criticalAlerts.length > 0 && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
              <p className="text-sm font-semibold text-rose-700 mb-2">Critical Alerts — Action Required</p>
              <ul className="space-y-1">
                {criticalAlerts.map((a, i) => (
                  <li key={`${a.id ?? a.title}-${i}`} className="text-sm text-rose-700">• {a.title}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Manager notes */}
          <div className="rounded-xl bg-white border border-gray-100 shadow-sm p-4 print:break-inside-avoid">
            <p className="text-sm font-semibold text-gray-700 mb-2">Manager Notes</p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Note any special events, staff issues, equipment problems, or follow-ups for tomorrow..."
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-orange-400 print:border-gray-300 print:min-h-[80px]"
              rows={4}
            />
          </div>

          {/* Footer */}
          <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3 flex items-center justify-between text-xs text-gray-400">
            <span>DineOps — Automated Daily Closing Report</span>
            <span>{reportDateFormatted}</span>
          </div>
        </div>
      )}

      {/* Print styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print\\:hidden { display: none !important; }
          [ref] { visibility: visible; }
          .space-y-4 > * { page-break-inside: avoid; }
        }
      `}</style>
    </div>
  )
}

export default DailyClosingReportPage
