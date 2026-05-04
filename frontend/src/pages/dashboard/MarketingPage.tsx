import { useCallback, useEffect, useMemo, useState } from 'react'
import { getCustomerProfilesApi, type CustomerProfile } from '../../api/analytics'
import { getApiErrorMessage } from '../../api/error'
import { formatCurrency } from '../../utils/currency'
import { useAuth } from '../../context/AuthContext'
import { extractTenantId } from '../../utils/jwt'

type Segment = 'ALL' | 'NEW' | 'REGULAR' | 'SLIPPING'

const SEGMENT_LABELS: Record<Segment, { label: string; desc: string; color: string; emoji: string }> = {
  ALL:      { label: 'Everyone',      desc: 'All customers',                           color: 'bg-gray-100 text-gray-700 border-gray-200',     emoji: '👥' },
  NEW:      { label: 'New Customers', desc: '1 order only',                            color: 'bg-sky-100 text-sky-700 border-sky-200',        emoji: '🌱' },
  REGULAR:  { label: 'Regulars',      desc: '2+ orders, seen in last 30 days',         color: 'bg-emerald-100 text-emerald-700 border-emerald-200', emoji: '⭐' },
  SLIPPING: { label: 'Slipping Away', desc: 'Haven\'t ordered in 30+ days',            color: 'bg-amber-100 text-amber-700 border-amber-200',  emoji: '⏳' },
}

const TEMPLATES = [
  {
    id: 'win_back',
    label: '🔁 Win-Back Offer',
    segment: 'SLIPPING' as Segment,
    body: `Hi {name}! We miss you at our restaurant 🙏 It's been a while since your last visit.\n\nAs a special thank-you, enjoy *15% off* your next order when you order directly from us.\n\nOrder here: {order_link}\n\nValid this week only! 🎉`,
  },
  {
    id: 'loyalty_reward',
    label: '⭐ Loyalty Reward',
    segment: 'REGULAR' as Segment,
    body: `Hi {name}! You're one of our most valued customers 🌟\n\nAs a thank-you for your loyalty, your next order gets a *complimentary dessert* — just mention this message when ordering.\n\nThank you for supporting us directly! 🙏`,
  },
  {
    id: 'welcome_back',
    label: '👋 Welcome First-Timer',
    segment: 'NEW' as Segment,
    body: `Hi {name}! Thank you for your first order with us 😊\n\nWe hope you loved the food! Order directly with us next time and get *10% off* — no app needed, no commissions.\n\nSee our menu: {order_link}`,
  },
  {
    id: 'weekend_special',
    label: '🎉 Weekend Special',
    segment: 'ALL' as Segment,
    body: `Hi {name}! This weekend we have something special for you 🍽️\n\nCheck out our Weekend Thali — freshly prepared, great value, delivered fast.\n\nOrder directly: {order_link}\n\nLimited quantities — order early!`,
  },
  {
    id: 'custom',
    label: '✍️ Custom Message',
    segment: 'ALL' as Segment,
    body: '',
  },
]

const ORDER_LINK = 'https://platterops.app/menu'

const MarketingPage = () => {
  const { token } = useAuth()
  const tenantId = useMemo(() => extractTenantId(token), [token])

  const [customers, setCustomers] = useState<CustomerProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [selectedSegment, setSelectedSegment] = useState<Segment>('SLIPPING')
  const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATES[0].id)
  const [messageBody, setMessageBody] = useState(TEMPLATES[0].body)
  const [campaignName, setCampaignName] = useState('')
  const [sentCount, setSentCount] = useState(0)
  const [preview, setPreview] = useState<CustomerProfile | null>(null)

  const load = useCallback(async () => {
    if (!tenantId) return
    setLoading(true)
    setError('')
    try {
      setCustomers(await getCustomerProfilesApi(tenantId))
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load customer data.'))
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  useEffect(() => { load() }, [load])

  const filteredCustomers = useMemo(() => {
    if (selectedSegment === 'ALL') return customers
    return customers.filter((c) => c.segment === selectedSegment)
  }, [customers, selectedSegment])

  const pickTemplate = (id: string) => {
    setSelectedTemplate(id)
    const t = TEMPLATES.find((t) => t.id === id)
    if (t) {
      if (t.id !== 'custom') setMessageBody(t.body)
      setSelectedSegment(t.segment)
    }
  }

  const buildMessage = (customer: CustomerProfile) => {
    const name = customer.customerName || 'there'
    return messageBody
      .replace(/{name}/g, name)
      .replace(/{phone}/g, customer.customerPhone)
      .replace(/{order_link}/g, ORDER_LINK)
      .replace(/{total_orders}/g, String(customer.totalOrders))
  }

  const openWhatsApp = (customer: CustomerProfile) => {
    const msg = encodeURIComponent(buildMessage(customer))
    const phone = customer.customerPhone.replace(/\D/g, '').replace(/^0/, '91')
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank')
    setSentCount((n) => n + 1)
  }

  const openBulkWhatsApp = () => {
    if (filteredCustomers.length === 0) return
    // WhatsApp doesn't support true bulk — open the first unsent customer
    openWhatsApp(filteredCustomers[0])
  }

  if (!tenantId) return <p className="text-sm text-gray-500">Tenant context missing.</p>

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Direct Marketing Engine</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Send targeted WhatsApp campaigns to your customer segments — no aggregator, no commission.
        </p>
      </div>

      {error && <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">{error}</div>}

      {/* ─── Stats row ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(['ALL', 'NEW', 'REGULAR', 'SLIPPING'] as Segment[]).map((seg) => {
          const count = seg === 'ALL' ? customers.length : customers.filter((c) => c.segment === seg).length
          const cfg = SEGMENT_LABELS[seg]
          return (
            <button
              key={seg}
              onClick={() => setSelectedSegment(seg)}
              className={`rounded-xl border-2 p-3 text-left transition ${selectedSegment === seg ? cfg.color + ' border-current' : 'bg-white border-gray-100 hover:border-gray-200'}`}
            >
              <p className="text-lg font-bold tabular-nums">{count}</p>
              <p className="text-xs font-semibold mt-0.5">{cfg.emoji} {cfg.label}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{cfg.desc}</p>
            </button>
          )
        })}
      </div>

      {/* ─── Campaign builder ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* Left: Builder form */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl bg-white shadow-sm border border-gray-100 p-4">
            <p className="text-sm font-semibold text-gray-700 mb-3">Campaign Builder</p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Campaign name (optional)</label>
                <input
                  value={campaignName} onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="e.g. Weekend Win-Back — April"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Message template</label>
                <div className="grid grid-cols-1 gap-1.5">
                  {TEMPLATES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => pickTemplate(t.id)}
                      className={`text-left rounded-lg border px-3 py-2 text-xs font-medium transition ${selectedTemplate === t.id ? 'border-orange-400 bg-orange-50 text-orange-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="marketing-message-body" className="block text-xs text-gray-500 mb-1">
                  Message body
                  <span className="ml-1 text-gray-300">— use {'{name}'}, {'{order_link}'}</span>
                </label>
                <textarea
                  id="marketing-message-body"
                  aria-label="Message body"
                  value={messageBody}
                  onChange={(e) => setMessageBody(e.target.value)}
                  rows={8}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 font-mono"
                />
              </div>

              <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
                <p className="font-semibold mb-0.5">How it works</p>
                <p>Click "Send" on each customer card to open WhatsApp with the message pre-filled. Use the Bulk button to start with the first customer in your selected segment.</p>
              </div>
            </div>
          </div>

          {sentCount > 0 && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-center">
              <p className="text-2xl font-bold text-emerald-700">{sentCount}</p>
              <p className="text-xs text-emerald-600 mt-1">Messages sent this session 🎉</p>
            </div>
          )}
        </div>

        {/* Right: Customer list */}
        <div className="lg:col-span-3 rounded-xl bg-white shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div>
              <p className="text-sm font-semibold text-gray-700">
                {SEGMENT_LABELS[selectedSegment].emoji} {SEGMENT_LABELS[selectedSegment].label}
                <span className="ml-2 text-gray-400 font-normal">({filteredCustomers.length} customers)</span>
              </p>
            </div>
            {filteredCustomers.length > 0 && (
              <button
                onClick={openBulkWhatsApp}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold px-3 py-1.5 hover:bg-emerald-700 transition"
              >
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-white">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                </svg>
                Start Campaign
              </button>
            )}
          </div>

          {loading ? (
            <div className="p-8 text-center text-sm text-gray-400 animate-pulse">Loading customers...</div>
          ) : filteredCustomers.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-2xl mb-2">🔍</p>
              <p className="text-sm text-gray-500">No customers in this segment yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50 max-h-[32rem] overflow-y-auto">
              {filteredCustomers.map((c) => {
                const isPreview = preview?.customerPhone === c.customerPhone
                const segCfg = SEGMENT_LABELS[c.segment]
                return (
                  <div key={c.customerPhone} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-gray-800">
                            {c.customerName || 'Unknown'}
                          </p>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold border ${segCfg.color}`}>
                            {segCfg.emoji} {segCfg.label}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {c.customerPhone} · {c.totalOrders} orders · AOV {formatCurrency(c.avgOrderValuePaise)}
                        </p>
                        {c.daysSinceLastOrder > 0 && (
                          <p className="text-[10px] text-gray-300 mt-0.5">Last ordered {c.daysSinceLastOrder}d ago</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => setPreview(isPreview ? null : c)}
                          className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                        >
                          {isPreview ? 'Hide' : 'Preview'}
                        </button>
                        <button
                          onClick={() => openWhatsApp(c)}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-500 text-white px-2.5 py-1.5 text-xs font-semibold hover:bg-emerald-600 transition"
                        >
                          <svg viewBox="0 0 24 24" className="h-3 w-3 fill-white">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                          </svg>
                          Send
                        </button>
                      </div>
                    </div>
                    {isPreview && (
                      <div className="mt-2 rounded-lg bg-gray-50 border border-gray-200 px-3 py-2 text-xs text-gray-700 whitespace-pre-wrap font-mono">
                        {buildMessage(c)}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ─── Tips ─── */}
      <div className="rounded-xl bg-orange-50 border border-orange-100 p-4">
        <p className="text-sm font-semibold text-orange-700 mb-2">📋 Campaign Best Practices</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-orange-700">
          <div className="rounded-lg bg-white border border-orange-100 p-3">
            <p className="font-semibold mb-1">Best time to send</p>
            <p className="text-orange-500">11 AM – 12:30 PM or 6 PM – 8 PM when hunger is at peak. Avoid sending after 9 PM.</p>
          </div>
          <div className="rounded-lg bg-white border border-orange-100 p-3">
            <p className="font-semibold mb-1">Frequency limit</p>
            <p className="text-orange-500">No more than 2 campaigns per customer per week. Over-messaging leads to blocks.</p>
          </div>
          <div className="rounded-lg bg-white border border-orange-100 p-3">
            <p className="font-semibold mb-1">Personalise always</p>
            <p className="text-orange-500">Use the customer's name. A message with a name gets 3× higher engagement than a generic blast.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MarketingPage
