import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  createExpenseEntryApi,
  deleteExpenseEntryApi,
  getFinanceSummaryApi,
  listExpenseEntriesApi,
  updateExpenseEntryApi,
} from '../../api/finance'
import { getAnalyticsSummaryApi } from '../../api/analytics'
import { getApiErrorMessage } from '../../api/error'
import type { ExpenseEntry, FinanceSummary } from '../../types/finance'
import type { AnalyticsSummary } from '../../types/analytics'
import { useAuth } from '../../context/AuthContext'
import { extractTenantId } from '../../utils/jwt'
import { formatCurrency } from '../../utils/currency'
import ToastMessage from '../../components/ToastMessage'

const todayIso = () => new Date().toISOString().slice(0, 10)

const EXPENSE_CATEGORIES = [
  'OPERATIONS',
  'RENT',
  'STAFF',
  'WAGES',
  'LABOR',
  'UTILITIES',
  'MARKETING',
  'SUPPLIES',
  'RAW_MATERIAL',
  'STAFF_MEAL',
  'MAINTENANCE',
  'EQUIPMENT',
  'INSURANCE',
  'TAXES',
  'MISCELLANEOUS',
]

const FinancePage = () => {
  const { token } = useAuth()
  const tenantId = useMemo(() => extractTenantId(token), [token])

  const [entries, setEntries] = useState<ExpenseEntry[]>([])
  const [summary, setSummary] = useState<FinanceSummary | null>(null)
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [fromDate, setFromDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 29)
    return d.toISOString().slice(0, 10)
  })
  const [toDate, setToDate] = useState(todayIso)

  const [expenseDate, setExpenseDate] = useState(todayIso)
  const [category, setCategory] = useState('OPERATIONS')
  const [amountRupees, setAmountRupees] = useState('')
  const [notes, setNotes] = useState('')

  const resetForm = () => {
    setEditingId(null)
    setExpenseDate(todayIso())
    setCategory('OPERATIONS')
    setAmountRupees('')
    setNotes('')
  }

  const load = useCallback(async () => {
    if (!tenantId) {
      setError('Tenant context is missing.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const [entriesRes, summaryRes, analyticsRes] = await Promise.all([
        listExpenseEntriesApi(tenantId, fromDate, toDate, 0, 50),
        getFinanceSummaryApi(tenantId, fromDate, toDate),
        getAnalyticsSummaryApi(tenantId, fromDate, toDate).catch(() => null),
      ])
      setEntries(entriesRes.content)
      setSummary(summaryRes)
      setAnalytics(analyticsRes)
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load finance data.'))
    } finally {
      setLoading(false)
    }
  }, [tenantId, fromDate, toDate])

  useEffect(() => { void load() }, [load])

  const onSubmit = async () => {
    if (!tenantId) {
      setError('Tenant context is missing.')
      return
    }
    const parsedRupees = parseFloat(amountRupees)
    if (!Number.isFinite(parsedRupees) || parsedRupees < 0) {
      setError('Enter a valid amount in rupees.')
      return
    }
    const amountPaise = Math.round(parsedRupees * 100)

    setSubmitting(true)
    setError('')
    try {
      if (editingId) {
        await updateExpenseEntryApi(editingId, tenantId, { expenseDate, category, amount: amountPaise, notes })
        setSuccess('Expense updated.')
      } else {
        await createExpenseEntryApi({ tenantId, expenseDate, category, amount: amountPaise, notes })
        setSuccess('Expense added.')
      }
      resetForm()
      await load()
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to save expense entry.'))
    } finally {
      setSubmitting(false)
    }
  }

  const onDelete = async (entryId: string) => {
    if (!tenantId) return
    try {
      await deleteExpenseEntryApi(entryId, tenantId)
      setSuccess('Expense deleted.')
      await load()
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to delete expense entry.'))
    }
  }

  const startEdit = (entry: ExpenseEntry) => {
    setEditingId(entry.id)
    setExpenseDate(entry.expenseDate)
    setCategory(entry.category)
    setAmountRupees((entry.amount / 100).toFixed(2))
    setNotes(entry.notes ?? '')
  }

  // Compute P&L
  const totalRevenue = useMemo(() => {
    if (!analytics) return null
    return analytics.revenueTrend.reduce((s, r) => s + r.revenue, 0)
  }, [analytics])

  const totalExpense = summary?.totalExpense ?? 0
  const netPnL = totalRevenue !== null ? totalRevenue - totalExpense : null

  // Bar chart data for daily expenses
  const maxDailyExpense = useMemo(() => {
    const vals = summary?.byDay.map((d) => d.amount) ?? []
    return Math.max(...vals, 1)
  }, [summary])

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Finance</h1>
        <p className="text-sm text-gray-400 mt-0.5">Track operating expenses, review P&L, and understand where your money goes.</p>
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
          Apply Range
        </button>
      </div>

      {/* P&L Summary cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-white border border-gray-100 shadow-sm p-4">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">Revenue (Range)</p>
          <p className="mt-2 text-3xl font-bold text-gray-900 tabular-nums">
            {totalRevenue !== null ? formatCurrency(totalRevenue) : loading ? '—' : 'N/A'}
          </p>
          <p className="text-xs text-gray-400 mt-1">from orders in period</p>
        </div>

        <div className="rounded-xl bg-white border border-gray-100 shadow-sm p-4">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">Total Expenses</p>
          <p className="mt-2 text-3xl font-bold text-rose-600 tabular-nums">{formatCurrency(totalExpense)}</p>
          <p className="text-xs text-gray-400 mt-1">operating costs logged</p>
        </div>

        <div className={`rounded-xl border shadow-sm p-4 ${netPnL !== null && netPnL >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">Net P&L</p>
          {netPnL !== null ? (
            <>
              <p className={`mt-2 text-3xl font-bold tabular-nums ${netPnL >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                {netPnL >= 0 ? '+' : ''}{formatCurrency(netPnL)}
              </p>
              <p className="text-xs text-gray-500 mt-1">Revenue minus logged expenses</p>
            </>
          ) : (
            <p className="mt-2 text-sm text-gray-400">Log expenses + revenue data needed</p>
          )}
        </div>
      </div>

      {/* Daily expense trend */}
      {summary && summary.byDay.length > 0 && (
        <div className="rounded-xl bg-white border border-gray-100 shadow-sm p-4">
          <p className="text-sm font-semibold text-gray-700 mb-4">Daily Expense Trend</p>
          <div className="flex items-end gap-1 h-20">
            {summary.byDay.map((d) => (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-t-sm bg-rose-300 hover:bg-rose-400 transition-colors"
                  style={{ height: `${Math.max((d.amount / maxDailyExpense) * 72, 2)}px`, minHeight: '2px' }}
                  title={`${d.date}: ${formatCurrency(d.amount)}`}
                />
                <span className="text-[9px] text-gray-400 hidden sm:block">
                  {new Date(d.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add / Edit form */}
      <div className="rounded-xl bg-white border border-gray-100 shadow-sm p-4">
        <h2 className="text-sm font-semibold text-gray-800 mb-3">{editingId ? 'Edit Expense Entry' : 'Add Expense Entry'}</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Date</label>
            <input type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} className="w-full rounded border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded border border-gray-300 px-3 py-2 text-sm bg-white">
              {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Amount (₹)</label>
            <input
              type="number"
              value={amountRupees}
              onChange={(e) => setAmountRupees(e.target.value)}
              placeholder="e.g. 2500"
              min="0"
              step="0.01"
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Notes</label>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional note" className="w-full rounded border border-gray-300 px-3 py-2 text-sm" />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={() => void onSubmit()}
            disabled={submitting || !amountRupees}
            className="rounded bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
          >
            {submitting ? 'Saving…' : editingId ? 'Update' : 'Add Expense'}
          </button>
          {editingId && (
            <button onClick={resetForm} className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Expense list */}
        <div className="rounded-xl bg-white border border-gray-100 shadow-sm p-4 lg:col-span-2">
          <h2 className="text-sm font-semibold text-gray-800 mb-3">Expense Entries</h2>
          {loading ? (
            <div className="space-y-2 animate-pulse">
              {[0, 1, 2].map((i) => <div key={i} className="h-8 rounded bg-gray-100" />)}
            </div>
          ) : entries.length === 0 ? (
            <p className="text-sm text-gray-500">No expense entries in selected range. Add your first one above.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500">
                    <th className="py-2 pr-3">Date</th>
                    <th className="py-2 pr-3">Category</th>
                    <th className="py-2 pr-3 text-right">Amount</th>
                    <th className="py-2 pr-3">Notes</th>
                    <th className="py-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {entries.map((entry) => (
                    <tr key={entry.id}>
                      <td className="py-2 pr-3 text-gray-600">{entry.expenseDate}</td>
                      <td className="py-2 pr-3">
                        <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                          {entry.category.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-2 pr-3 text-right font-medium tabular-nums text-gray-800">{formatCurrency(entry.amount)}</td>
                      <td className="py-2 pr-3 text-gray-500 text-xs truncate max-w-[120px]">{entry.notes ?? '—'}</td>
                      <td className="py-2">
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => startEdit(entry)} className="rounded border border-gray-200 px-2 py-1 text-xs hover:bg-gray-50">Edit</button>
                          <button onClick={() => void onDelete(entry.id)} className="rounded border border-rose-200 px-2 py-1 text-xs text-rose-600 hover:bg-rose-50">Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* By category */}
        <div className="rounded-xl bg-white border border-gray-100 shadow-sm p-4">
          <h2 className="text-sm font-semibold text-gray-800 mb-3">By Category</h2>
          {(summary?.byCategory ?? []).length === 0 ? (
            <p className="text-sm text-gray-500">No data yet.</p>
          ) : (
            <div className="space-y-3">
              {summary?.byCategory.map((item) => {
                const pct = totalExpense > 0 ? Math.round((item.amount / totalExpense) * 100) : 0
                return (
                  <div key={item.category}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-gray-700">{item.category.replace(/_/g, ' ')}</span>
                      <span className="text-gray-500 tabular-nums">{formatCurrency(item.amount)}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full">
                      <div className="h-1.5 bg-rose-400 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
              <div className="pt-2 border-t border-gray-100 flex justify-between text-sm font-semibold text-gray-800">
                <span>Total</span>
                <span className="tabular-nums">{formatCurrency(totalExpense)}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default FinancePage
