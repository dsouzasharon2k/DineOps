import { useCallback, useEffect, useMemo, useState } from 'react'
import { getItemsApi } from '../../api/menu'
import { getCategoriesApi } from '../../api/menu'
import { getWastageApi, logWastageApi } from '../../api/wastage'
import type { MenuCategory, MenuItem } from '../../types/menu'
import type { WastageEvent } from '../../types/wastage'
import { useAuth } from '../../context/AuthContext'
import { formatCurrency } from '../../utils/currency'
import { getApiErrorMessage } from '../../api/error'

const extractTenantId = (token: string | null): string | null => {
  if (!token) return null
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.tenantId ?? null
  } catch {
    return null
  }
}

const WastagePage = () => {
  const { token } = useAuth()
  const tenantId = useMemo(() => extractTenantId(token), [token])
  const [events, setEvents] = useState<WastageEvent[]>([])
  const [items, setItems] = useState<MenuItem[]>([])
  const [menuItemId, setMenuItemId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!tenantId) return
    setLoading(true)
    setError('')
    try {
      const cats: MenuCategory[] = await getCategoriesApi(tenantId)
      const allItems = (await Promise.all(cats.map((cat) => getItemsApi(tenantId, cat.id)))).flat()
      setItems(allItems)
      setEvents(await getWastageApi(tenantId))
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load wastage data.'))
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  useEffect(() => {
    load()
  }, [load])

  const submit = async () => {
    if (!tenantId || !menuItemId || quantity <= 0) return
    try {
      await logWastageApi(tenantId, menuItemId, quantity, reason)
      setQuantity(1)
      setReason('')
      await load()
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to log wastage.'))
    }
  }

  if (!tenantId) {
    return <p className="text-sm text-gray-500">Tenant context missing for wastage tracking.</p>
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Food Wastage</h1>
      <p className="text-sm text-gray-500 mb-4">Track wastage to reduce food cost.</p>
      {error && <p className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      <div className="rounded-xl bg-white p-4 shadow-sm mb-4">
        <p className="text-sm font-semibold text-gray-700 mb-3">Log wastage event</p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <select value={menuItemId} onChange={(e) => setMenuItemId(e.target.value)} className="rounded border border-gray-300 px-3 py-2 text-sm">
            <option value="">Select menu item</option>
            {items.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
          <input type="number" min={1} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className="rounded border border-gray-300 px-3 py-2 text-sm" />
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason" className="rounded border border-gray-300 px-3 py-2 text-sm" />
          <button onClick={submit} className="rounded bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600">Log</button>
        </div>
      </div>
      <div className="rounded-xl bg-white shadow-sm">
        {loading ? (
          <p className="p-4 text-sm text-gray-500">Loading wastage events...</p>
        ) : events.length === 0 ? (
          <p className="p-4 text-sm text-gray-500">No wastage events logged yet.</p>
        ) : (
          events.map((event) => (
            <div key={event.id} className="flex items-center justify-between border-b border-gray-100 p-4 last:border-b-0">
              <div>
                <p className="font-medium text-gray-800">{event.menuItemName ?? 'Unknown item'} × {event.quantity}</p>
                <p className="text-xs text-gray-500">{event.reason ?? 'No reason provided'} • {new Date(event.createdAt).toLocaleString()}</p>
              </div>
              <p className="font-semibold text-gray-700">{formatCurrency(event.unitCost * event.quantity)}</p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default WastagePage
