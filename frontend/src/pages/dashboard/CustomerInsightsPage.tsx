import { useCallback, useEffect, useMemo, useState } from 'react'
import { getCustomerProfilesApi, type CustomerProfile } from '../../api/analytics'
import { getApiErrorMessage } from '../../api/error'
import { formatCurrency } from '../../utils/currency'
import { useAuth } from '../../context/AuthContext'
import { extractTenantId } from '../../utils/jwt'
import ToastMessage from '../../components/ToastMessage'
import LoadingState from '../../components/LoadingState'
import EmptyState from '../../components/EmptyState'

const COMMISSION_KEY = 'dineops_commission_rate'

type Segment = 'ALL' | 'NEW' | 'REGULAR' | 'SLIPPING'

const SEG_CONFIG: Record<Segment, { label: string; color: string; desc: string }> = {
  ALL:      { label: 'All',           color: 'bg-gray-800 text-white',       desc: '' },
  NEW:      { label: 'New',           color: 'bg-blue-600 text-white',        desc: '1-2 orders' },
  REGULAR:  { label: 'Regulars',      color: 'bg-emerald-600 text-white',     desc: '3+ orders, active' },
  SLIPPING: { label: 'Slipping Away', color: 'bg-red-500 text-white',         desc: 'No order in 30+ days' },
}

const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function getInitials(name: string | null, phone: string): string {
  if (name) {
    return name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('')
  }
  return phone.slice(-2)
}

function lastOrderLabel(lastOrderAt: string | null, days: number): string {
  if (!lastOrderAt) return 'Never'
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  return `${Math.floor(days / 30)}mo ago`
}

const CustomerInsightsPage = () => {
  const { token } = useAuth()
  const tenantId = useMemo(() => extractTenantId(token), [token])

  const [profiles, setProfiles] = useState<CustomerProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [segment, setSegment] = useState<Segment>('ALL')
  const [search, setSearch] = useState('')
  const [commissionRate, setCommissionRate] = useState<number>(() => {
    const stored = localStorage.getItem(COMMISSION_KEY)
    return stored ? Number(stored) : 25
  })

  const saveCommission = (v: number) => {
    setCommissionRate(v)
    localStorage.setItem(COMMISSION_KEY, String(v))
  }

  const load = useCallback(async () => {
    if (!tenantId) return
    setLoading(true)
    setError('')
    try {
      const data = await getCustomerProfilesApi(tenantId)
      setProfiles(data)
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load customer data.'))
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  useEffect(() => {
    if (tenantId) load()
    else setLoading(false)
  }, [tenantId, load])

  // Retention heatmap: count orders starting (customer last-order) by day-of-week
  const dowCounts = useMemo(() => {
    const counts = Array(7).fill(0)
    profiles.forEach((p) => {
      if (!p.lastOrderAt) return
      const dow = new Date(p.lastOrderAt).getDay()
      counts[dow]++
    })
    return counts
  }, [profiles])

  const dowMax = Math.max(...dowCounts, 1)

  const filtered = useMemo(() => {
    let list = profiles
    if (segment !== 'ALL') list = list.filter((p) => p.segment === segment)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((p) => (p.customerName ?? '').toLowerCase().includes(q) || p.customerPhone.includes(q))
    }
    return list
  }, [profiles, segment, search])

  // Summary stats
  const totalCustomers = profiles.length
  const regulars = profiles.filter((p) => p.segment === 'REGULAR').length
  const slipping = profiles.filter((p) => p.segment === 'SLIPPING').length
  const totalRevenuePaise = profiles.reduce((s, p) => s + p.totalSpendPaise, 0)
  const totalCommissionSaved = Math.round(totalRevenuePaise * (commissionRate / 100))

  const buildWhatsApp = (p: CustomerProfile, message: string) => {
    const clean = p.customerPhone.replace(/\D/g, '')
    return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`
  }

  if (loading) return <LoadingState fullPage message="Loading customers…" />

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Customer Analytics</h1>
        <p className="mt-1 text-sm text-gray-500">Turn anonymous eaters into known regulars.</p>
      </div>

      {error && <ToastMessage message={error} variant="error" onClose={() => setError('')} />}

      {/* KPI row */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-500">Total Customers</p>
          <p className="text-2xl font-bold text-gray-800">{totalCustomers}</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-500">Regulars</p>
          <p className="text-2xl font-bold text-emerald-600">{regulars}</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-500">Slipping Away</p>
          <p className="text-2xl font-bold text-red-500">{slipping}</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-500">Total Revenue</p>
          <p className="text-lg font-bold text-gray-800">{formatCurrency(totalRevenuePaise)}</p>
        </div>
      </div>

      {/* Commission savings banner */}
      <div className="mb-4 rounded-xl bg-emerald-600 p-4 text-white">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs text-emerald-100">Total Commission Saved (Direct Orders)</p>
            <p className="text-2xl font-bold">{formatCurrency(totalCommissionSaved)}</p>
            <p className="text-xs text-emerald-200 mt-0.5">vs. third-party aggregator at {commissionRate}% fee</p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-emerald-100">Rate %</label>
            <input
              type="number" min={1} max={40} value={commissionRate}
              onChange={(e) => saveCommission(Number(e.target.value))}
              className="w-16 rounded-lg bg-white/20 border border-white/30 px-2 py-1 text-sm text-white text-center"
            />
          </div>
        </div>
      </div>

      {/* Two-column layout: heatmap + list */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

        {/* Retention heatmap */}
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="mb-1 text-sm font-semibold text-gray-700">Retention Heatmap</p>
          <p className="mb-4 text-xs text-gray-400">Which day of the week do customers tend to return?</p>
          <div className="flex flex-col gap-2">
            {DOW_LABELS.map((day, i) => {
              const count = dowCounts[i]
              const pct = Math.round((count / dowMax) * 100)
              return (
                <div key={day} className="flex items-center gap-2">
                  <span className="w-8 shrink-0 text-xs text-gray-500">{day}</span>
                  <div className="flex-1 h-5 rounded bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded bg-emerald-500 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-6 text-right text-xs text-gray-500">{count}</span>
                </div>
              )
            })}
          </div>
          <p className="mt-4 text-xs text-gray-400">Tip: Schedule offers and WhatsApp blasts on your peak day for best response.</p>
        </div>

        {/* Customer list */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Segment tabs + search */}
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <div className="flex flex-wrap gap-2 mb-3">
              {(Object.keys(SEG_CONFIG) as Segment[]).map((seg) => {
                const cfg = SEG_CONFIG[seg]
                const count = seg === 'ALL' ? profiles.length : profiles.filter((p) => p.segment === seg).length
                return (
                  <button
                    key={seg}
                    onClick={() => setSegment(seg)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition ${segment === seg ? cfg.color : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  >
                    {cfg.label} ({count})
                  </button>
                )
              })}
            </div>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or phone…"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </div>

          {filtered.length === 0 ? (
            <EmptyState compact icon="👥" title="No customers found" description="Orders with a customer phone number will appear here." />
          ) : (
            <div className="space-y-3">
              {filtered.map((p) => {
                const commSaved = Math.round(p.totalSpendPaise * (commissionRate / 100))
                const segCfg = SEG_CONFIG[p.segment]
                const aov = formatCurrency(p.avgOrderValuePaise)
                const totalSpend = formatCurrency(p.totalSpendPaise)

                return (
                  <div key={p.customerPhone} className="rounded-xl bg-white p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div className="h-10 w-10 shrink-0 rounded-full bg-orange-100 flex items-center justify-center text-sm font-bold text-orange-600">
                        {getInitials(p.customerName, p.customerPhone)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-gray-800 truncate">
                            {p.customerName || p.customerPhone}
                          </p>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${segCfg.color}`}>
                            {segCfg.label}
                          </span>
                        </div>
                        {p.customerName && (
                          <p className="text-xs text-gray-400">{p.customerPhone}</p>
                        )}

                        {/* Stats row */}
                        <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-600">
                          <span><strong className="text-gray-800">{p.totalOrders}</strong> orders</span>
                          <span><strong className="text-gray-800">{totalSpend}</strong> lifetime spend</span>
                          <span>AOV <strong className="text-gray-800">{aov}</strong></span>
                          <span>Last order: <strong className="text-gray-800">{lastOrderLabel(p.lastOrderAt, p.daysSinceLastOrder)}</strong></span>
                        </div>

                        {/* Commission savings */}
                        <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs text-emerald-700 font-medium">
                          <svg viewBox="0 0 24 24" className="h-3 w-3 fill-emerald-600"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z" /></svg>
                          Saved {formatCurrency(commSaved)} in aggregator fees
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <a
                        href={buildWhatsApp(p, `Hi ${p.customerName ?? 'there'}, we miss you! Come visit us again for a special treat 🍽️`)}
                        target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                      >
                        <svg viewBox="0 0 24 24" className="h-3 w-3 fill-emerald-600"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>
                        {p.segment === 'SLIPPING' ? 'Re-engage' : 'Send Message'}
                      </a>
                      <a href={`tel:${p.customerPhone}`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50">
                        📞 Call for feedback
                      </a>
                      {p.segment === 'REGULAR' && (
                        <a
                          href={buildWhatsApp(p, `Hi ${p.customerName ?? 'there'}! As one of our best customers, here's a special 10% discount on your next order. Just mention this message when ordering 🎉`)}
                          target="_blank" rel="noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-medium text-orange-600 hover:bg-orange-100">
                          🎁 Send VIP Offer
                        </a>
                      )}
                      {p.segment === 'SLIPPING' && (
                        <a
                          href={buildWhatsApp(p, `Hi ${p.customerName ?? 'there'}! We haven't seen you in a while 😊 Here's a 15% comeback discount — just show this message! We'd love to have you back.`)}
                          target="_blank" rel="noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100">
                          🔁 Win-back Offer
                        </a>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Segment playbook */}
      <div className="mt-4 rounded-xl bg-white p-4 shadow-sm">
        <p className="mb-3 text-sm font-semibold text-gray-700">Retention Playbook</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-lg bg-blue-50 p-3">
            <p className="text-xs font-bold text-blue-700 mb-1">🆕 New Customers ({profiles.filter((p) => p.segment === 'NEW').length})</p>
            <p className="text-xs text-blue-600">Send a thank-you WhatsApp after their 2nd order. Offer a loyalty stamp card. A small gesture converts them to regulars 5× more often.</p>
          </div>
          <div className="rounded-lg bg-emerald-50 p-3">
            <p className="text-xs font-bold text-emerald-700 mb-1">⭐ Regulars ({regulars})</p>
            <p className="text-xs text-emerald-600">These are your VIPs. Give them early access to new dishes, a free item on their 10th visit, or a birthday discount. They drive 70% of your revenue.</p>
          </div>
          <div className="rounded-lg bg-red-50 p-3">
            <p className="text-xs font-bold text-red-700 mb-1">⏳ Slipping Away ({slipping})</p>
            <p className="text-xs text-red-600">A customer who hasn't ordered in 30+ days costs you nothing to re-engage vs. 5–7× more to acquire a new one. Send a win-back discount today.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CustomerInsightsPage
