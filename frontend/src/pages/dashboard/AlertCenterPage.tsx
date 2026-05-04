import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getAlertsSummaryApi, getDailyDigestApi, markAlertReadApi, markAllAlertsReadApi } from '../../api/alerts'
import { getApiErrorMessage } from '../../api/error'
import { useAuth } from '../../context/AuthContext'
import { extractTenantId } from '../../utils/jwt'
import ToastMessage from '../../components/ToastMessage'
import type { AlertSummaryItem } from '../../types/alerts'
import type { DailyDigest } from '../../types/digest'
import { formatCurrency } from '../../utils/currency'

const severityClass: Record<AlertSummaryItem['severity'], string> = {
  INFO: 'border-sky-200 bg-sky-50 text-sky-700',
  WARNING: 'border-amber-200 bg-amber-50 text-amber-700',
  CRITICAL: 'border-rose-200 bg-rose-50 text-rose-700',
}

const VISIBILITY_STORAGE_KEY = 'alertCenter.visibilityFilter'
const SEVERITY_STORAGE_KEY = 'alertCenter.severityFilter'

const AlertCenterPage = () => {
  const { token } = useAuth()
  const tenantId = useMemo(() => extractTenantId(token), [token])
  const [searchParams, setSearchParams] = useSearchParams()

  const [alerts, setAlerts] = useState<AlertSummaryItem[]>([])
  const [visibilityFilter, setVisibilityFilter] = useState<'ALL' | 'UNREAD'>(() => {
    const value = searchParams.get('visibility')
    if (value === 'UNREAD') {
      return 'UNREAD'
    }
    if (typeof window !== 'undefined') {
      const stored = window.sessionStorage.getItem(VISIBILITY_STORAGE_KEY)
      return stored === 'UNREAD' ? 'UNREAD' : 'ALL'
    }
    return 'ALL'
  })
  const [severityFilter, setSeverityFilter] = useState<'ALL' | AlertSummaryItem['severity']>(() => {
    const value = searchParams.get('severity')
    if (value === 'CRITICAL' || value === 'WARNING' || value === 'INFO') {
      return value
    }
    if (typeof window !== 'undefined') {
      const stored = window.sessionStorage.getItem(SEVERITY_STORAGE_KEY)
      return stored === 'CRITICAL' || stored === 'WARNING' || stored === 'INFO' ? stored : 'ALL'
    }
    return 'ALL'
  })
  const [digest, setDigest] = useState<DailyDigest | null>(null)
  const [loading, setLoading] = useState(true)
  const [markingAlertId, setMarkingAlertId] = useState<string | null>(null)
  const [markingAll, setMarkingAll] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!tenantId) {
      setError('Tenant context missing for alert center.')
      return
    }
    setLoading(true)
    setSuccess('')
    setError('')
    try {
      const [response, digestResponse] = await Promise.all([
        getAlertsSummaryApi(tenantId),
        getDailyDigestApi(tenantId),
      ])
      setAlerts(response)
      setDigest(digestResponse)
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load alerts.'))
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const nextVisibility = searchParams.get('visibility') === 'UNREAD' ? 'UNREAD' : 'ALL'
    const severityFromQuery = searchParams.get('severity')
    const nextSeverity =
      severityFromQuery === 'CRITICAL' || severityFromQuery === 'WARNING' || severityFromQuery === 'INFO'
        ? severityFromQuery
        : 'ALL'

    if (nextVisibility !== visibilityFilter) {
      setVisibilityFilter(nextVisibility)
    }
    if (nextSeverity !== severityFilter) {
      setSeverityFilter(nextSeverity)
    }
  }, [searchParams, visibilityFilter, severityFilter])

  useEffect(() => {
    const params: Record<string, string> = {}
    if (visibilityFilter !== 'ALL') {
      params.visibility = visibilityFilter
    }
    if (severityFilter !== 'ALL') {
      params.severity = severityFilter
    }
    setSearchParams(params, { replace: true })
  }, [visibilityFilter, severityFilter, setSearchParams])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }
    window.sessionStorage.setItem(VISIBILITY_STORAGE_KEY, visibilityFilter)
    window.sessionStorage.setItem(SEVERITY_STORAGE_KEY, severityFilter)
  }, [visibilityFilter, severityFilter])

  const visibleAlerts = alerts.filter((alert) =>
    (severityFilter === 'ALL' ? true : alert.severity === severityFilter)
    && (visibilityFilter === 'ALL' ? true : !alert.read)
  )
  const hasActiveFilters = visibilityFilter !== 'ALL' || severityFilter !== 'ALL'

  const markAsRead = async (alertId: string) => {
    if (!tenantId) return
    setMarkingAlertId(alertId)
    try {
      const updated = await markAlertReadApi(tenantId, alertId)
      setAlerts((prev) => prev.map((alert) => (alert.id === updated.id ? updated : alert)))
      setSuccess('Alert marked as read.')
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to mark alert as read.'))
    } finally {
      setMarkingAlertId(null)
    }
  }

  const markAllAsRead = async () => {
    if (!tenantId) return
    setMarkingAll(true)
    try {
      const result = await markAllAlertsReadApi(tenantId)
      setAlerts((prev) => prev.map((alert) => ({ ...alert, read: true })))
      setSuccess(result.unreadCount > 0 ? `${result.unreadCount} alerts marked as read.` : 'No unread alerts to update.')
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to mark all alerts as read.'))
    } finally {
      setMarkingAll(false)
    }
  }

  const clearSavedPreferences = () => {
    setVisibilityFilter('ALL')
    setSeverityFilter('ALL')
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem(VISIBILITY_STORAGE_KEY)
      window.sessionStorage.removeItem(SEVERITY_STORAGE_KEY)
    }
    setSearchParams({}, { replace: true })
    setSuccess('Saved filter preferences cleared.')
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800">Alert Center</h1>
      <p className="mt-1 text-sm text-gray-500">Proactive operational alerts for wastage spikes, order backlog, and prep delays.</p>

      <div className="mt-4">
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => void load()} className="rounded bg-gray-800 px-3 py-2 text-xs font-semibold text-white hover:bg-gray-900">Refresh Alerts</button>
          <button
            onClick={() => void markAllAsRead()}
            disabled={markingAll || alerts.every((alert) => alert.read)}
            className="rounded border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {markingAll ? 'Marking all...' : 'Mark all as read'}
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {(['ALL', 'UNREAD'] as const).map((item) => (
          <button
            key={item}
            onClick={() => {
              setVisibilityFilter(item)
            }}
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${
              visibilityFilter === item
                ? 'border-orange-600 bg-orange-50 text-orange-700'
                : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {item}
            <span className="ml-1">
              ({item === 'ALL' ? alerts.length : alerts.filter((alert) => !alert.read).length})
            </span>
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {(['ALL', 'CRITICAL', 'WARNING', 'INFO'] as const).map((item) => (
          <button
            key={item}
            onClick={() => {
              setSeverityFilter(item)
            }}
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${
              severityFilter === item
                ? 'border-gray-800 bg-gray-800 text-white'
                : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {item}
            {item !== 'ALL' && (
              <span className="ml-1">({alerts.filter((alert) => alert.severity === item).length})</span>
            )}
          </button>
        ))}
        <button
          onClick={() => {
            setVisibilityFilter('ALL')
            setSeverityFilter('ALL')
          }}
          className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-50"
        >
          Reset filters
        </button>
        <button
          onClick={clearSavedPreferences}
          className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-50"
        >
          Clear saved preferences
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-gray-500">Active filters:</span>
        {hasActiveFilters ? (
          <>
            {visibilityFilter !== 'ALL' && (
              <span className="rounded-full bg-orange-50 px-2 py-0.5 text-xs font-semibold text-orange-700">
                {visibilityFilter}
              </span>
            )}
            {severityFilter !== 'ALL' && (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700">
                {severityFilter}
              </span>
            )}
          </>
        ) : (
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">NONE</span>
        )}
        <span className="ml-1 text-xs text-gray-500">Showing {visibleAlerts.length} of {alerts.length}</span>
      </div>

      {digest && (
        <div className="mt-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-800">Daily Digest ({digest.date})</p>
            <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700">{digest.activeAlerts} alerts</span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
            <div><p className="text-[11px] text-gray-500 uppercase">Revenue</p><p className="text-sm font-bold text-gray-800">{formatCurrency(digest.todaysRevenue)}</p></div>
            <div><p className="text-[11px] text-gray-500 uppercase">Profit</p><p className="text-sm font-bold text-gray-800">{formatCurrency(digest.todaysProfit)}</p></div>
            <div><p className="text-[11px] text-gray-500 uppercase">Expenses</p><p className="text-sm font-bold text-gray-800">{formatCurrency(digest.todaysExpenses)}</p></div>
            <div><p className="text-[11px] text-gray-500 uppercase">Open Tickets</p><p className="text-sm font-bold text-gray-800">{digest.openTickets}</p></div>
          </div>
          <div className="mt-3">
            <p className="text-xs font-semibold text-gray-600">Top Actions</p>
            <ul className="mt-1 space-y-1">
              {digest.topActions.map((action) => (
                <li key={action} className="rounded bg-gray-50 px-2 py-1 text-xs text-gray-700">{action}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="mt-4 space-y-3">
        {loading ? (
          <p className="text-sm text-gray-500">Loading alerts...</p>
        ) : visibleAlerts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-4 text-sm text-gray-500">
            No alerts match the current filter.
          </div>
        ) : (
          visibleAlerts.map((alert, index) => (
            <div key={`${alert.id ?? alert.title}-${index}`} className={`rounded-xl border p-4 ${severityClass[alert.severity]} ${alert.read ? 'opacity-60' : ''}`}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-bold">{alert.title}</p>
                <div className="flex items-center gap-2">
                  {alert.read && <span className="rounded bg-white/70 px-2 py-0.5 text-[11px] font-semibold">READ</span>}
                  <span className="rounded border border-current px-2 py-0.5 text-[11px] font-semibold">{alert.severity}</span>
                </div>
              </div>
              <p className="mt-2 text-sm">{alert.description}</p>
              <p className="mt-2 text-xs font-medium">Action: {alert.action}</p>
              <div className="mt-3 flex items-center justify-between gap-2">
                <p className="text-[11px] text-gray-500">{new Date(alert.createdAt).toLocaleString()}</p>
                {alert.id && !alert.read && (
                  <button
                    onClick={() => void markAsRead(alert.id!)}
                    disabled={markingAlertId === alert.id}
                    className="rounded border border-current px-2 py-1 text-[11px] font-semibold hover:bg-white/50 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {markingAlertId === alert.id ? 'Marking...' : 'Mark as read'}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {error && <ToastMessage message={error} variant="error" onClose={() => setError('')} />}
      {success && <ToastMessage message={success} variant="success" autoHideMs={2200} onClose={() => setSuccess('')} />}
    </div>
  )
}

export default AlertCenterPage
