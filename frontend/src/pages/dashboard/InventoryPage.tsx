import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getInventoryByTenantApi, updateInventoryApi, upsertInventoryApi } from '../../api/inventory'
import { getVendorsApi, type Vendor } from '../../api/vendors'
import { getCategoriesApi, getItemsApi } from '../../api/menu'
import { getApiErrorMessage } from '../../api/error'
import type { InventoryItem } from '../../types/inventory'
import type { MenuCategory, MenuItem } from '../../types/menu'
import { useAuth } from '../../context/AuthContext'
import { extractTenantId } from '../../utils/jwt'
import ToastMessage from '../../components/ToastMessage'
import axiosInstance from '../../api/axiosInstance'

const UNITS = ['pcs', 'kg', 'ltr', 'gm', 'ml', 'dozen', 'box']

type TrafficLight = 'RED' | 'YELLOW' | 'GREEN'

function getTrafficLight(qty: number, threshold: number): TrafficLight {
  if (qty <= threshold) return 'RED'
  if (qty <= threshold * 2) return 'YELLOW'
  return 'GREEN'
}

/**
 * Predictive Reorder Engine:
 * Estimates daily consumption as threshold/7 (threshold ≈ 1-week safety stock).
 * Returns null when threshold is 0 (no prediction possible).
 */
function daysUntilStockout(qty: number, threshold: number): number | null {
  if (threshold <= 0) return null
  const dailyRate = threshold / 7
  return Math.floor(qty / dailyRate)
}

const LIGHT_CONFIG: Record<TrafficLight, { dot: string; badge: string; label: string }> = {
  RED: { dot: 'bg-red-500', badge: 'bg-red-100 text-red-700', label: 'Critical – reorder now' },
  YELLOW: { dot: 'bg-amber-400', badge: 'bg-amber-100 text-amber-700', label: 'Low – add to next trip' },
  GREEN: { dot: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-700', label: 'Healthy' },
}

interface WasteModalState {
  item: InventoryItem
  qty: number
  reason: string
}

const InventoryPage = () => {
  const { token } = useAuth()
  const tenantId = useMemo(() => extractTenantId(token), [token])
  const navigate = useNavigate()

  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [allItems, setAllItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Add-tracking form
  const [selectedMenuItemId, setSelectedMenuItemId] = useState('')
  const [newQuantity, setNewQuantity] = useState('0')
  const [newThreshold, setNewThreshold] = useState('5')
  const [newUnit, setNewUnit] = useState('pcs')
  const [newVendorPhone, setNewVendorPhone] = useState('')

  // Inline edit per row (qty, threshold, vendorPhone, unit)
  const [editState, setEditState] = useState<Record<string, { qty: number; threshold: number; vendor: string; unit: string }>>({})

  // Waste modal
  const [wasteModal, setWasteModal] = useState<WasteModalState | null>(null)
  const [wasteLogging, setWasteLogging] = useState(false)

  const load = useCallback(async () => {
    if (!tenantId) { setLoading(false); return }
    setError('')
    try {
      const [inv, vendorList, cats] = await Promise.all([
        getInventoryByTenantApi(tenantId),
        getVendorsApi(tenantId).catch(() => [] as Vendor[]),
        getCategoriesApi(tenantId),
      ])
      setInventory(inv)
      setVendors(vendorList)
      setEditState(
        Object.fromEntries(
          inv.map((i) => [
            i.id,
            { qty: i.quantity, threshold: i.lowStockThreshold, vendor: i.vendorPhone ?? '', unit: i.unit ?? 'pcs' },
          ])
        )
      )
      setCategories(cats)
      const nested = await Promise.all(cats.map((c) => getItemsApi(tenantId, c.id)))
      setAllItems(nested.flat())
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load inventory.'))
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  useEffect(() => {
    if (!token) { setLoading(true); return }
    if (tenantId) load()
    else setLoading(false)
  }, [tenantId, token, load])

  const trackedItemIds = useMemo(() => new Set(inventory.map((i) => i.menuItemId)), [inventory])
  const untrackedItems = allItems.filter((item) => !trackedItemIds.has(item.id))

  const patchEdit = (id: string, patch: Partial<{ qty: number; threshold: number; vendor: string; unit: string }>) => {
    setEditState((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }))
  }

  const handleAdd = async () => {
    if (!selectedMenuItemId) return
    try {
      setError('')
      await upsertInventoryApi(selectedMenuItemId, Number(newQuantity), Number(newThreshold), newUnit, newVendorPhone || undefined)
      setSelectedMenuItemId(''); setNewQuantity('0'); setNewThreshold('5'); setNewUnit('pcs'); setNewVendorPhone('')
      setSuccess('Item tracking added.')
      await load()
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to add tracking.'))
    }
  }

  const handleSaveRow = async (item: InventoryItem) => {
    const s = editState[item.id]
    if (!s) return
    try {
      setSavingId(item.id)
      setError('')
      await updateInventoryApi(item.id, s.qty, s.threshold, s.unit, s.vendor || undefined)
      setSuccess('Stock updated.')
      await load()
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to update.'))
    } finally {
      setSavingId(null)
    }
  }

  const nudge = async (item: InventoryItem, delta: number) => {
    const s = editState[item.id]
    const newQty = Math.max(0, (s?.qty ?? item.quantity) + delta)
    patchEdit(item.id, { qty: newQty })
    try {
      setSavingId(item.id)
      await updateInventoryApi(item.id, newQty, s?.threshold ?? item.lowStockThreshold, s?.unit ?? item.unit, s?.vendor ?? item.vendorPhone ?? undefined)
      await load()
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to update stock.'))
    } finally {
      setSavingId(null)
    }
  }

  const openWasteModal = (item: InventoryItem) => {
    setWasteModal({ item, qty: 1, reason: 'Spoilage' })
  }

  const submitWaste = async () => {
    if (!wasteModal || !tenantId) return
    setWasteLogging(true)
    try {
      await axiosInstance.post('/api/v1/wastage', {
        tenantId,
        menuItemId: wasteModal.item.menuItemId,
        quantity: wasteModal.qty,
        reason: wasteModal.reason,
      })
      setSuccess(`Waste logged: ${wasteModal.qty} ${wasteModal.item.unit} of ${wasteModal.item.menuItemName}`)
      setWasteModal(null)
      await load()
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to log waste.'))
    } finally {
      setWasteLogging(false)
    }
  }

  // Find the preferred vendor for a given inventory item (if any)
  const preferredVendorFor = (item: InventoryItem): Vendor | null => {
    for (const vendor of vendors) {
      const link = vendor.linkedItems.find((li) => li.inventoryId === item.id && li.preferredVendor)
      if (link) return vendor
    }
    return null
  }

  const buildWhatsApp = (item: InventoryItem) => {
    const phone = editState[item.id]?.vendor ?? item.vendorPhone ?? ''
    if (!phone) return null
    const msg = encodeURIComponent(
      `Hi, I need to reorder ${item.menuItemName}. Current stock: ${item.quantity} ${item.unit}. Please send availability and pricing. Thank you.`
    )
    const clean = phone.replace(/\D/g, '')
    return `https://wa.me/${clean}?text=${msg}`
  }

  // Summary stats
  const redCount = inventory.filter((i) => getTrafficLight(i.quantity, i.lowStockThreshold) === 'RED').length
  const yellowCount = inventory.filter((i) => getTrafficLight(i.quantity, i.lowStockThreshold) === 'YELLOW').length

  if (loading) return <p className="text-sm text-gray-500 p-4">Loading inventory…</p>
  if (!tenantId) return <p className="text-sm text-amber-600 p-4">Tenant context missing. Please sign out and back in.</p>

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Inventory Ledger</h1>
          <p className="mt-1 text-sm text-gray-500">Track stock levels, log spoilage, and contact vendors instantly.</p>
        </div>
        {/* Summary pills */}
        <div className="flex gap-2 flex-wrap">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${redCount > 0 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}>
            <span className="h-2 w-2 rounded-full bg-red-500 inline-block" />
            {redCount} Critical
          </span>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${yellowCount > 0 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
            <span className="h-2 w-2 rounded-full bg-amber-400 inline-block" />
            {yellowCount} Low
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold bg-emerald-100 text-emerald-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />
            {inventory.length - redCount - yellowCount} Healthy
          </span>
        </div>
      </div>

      {error && <ToastMessage message={error} variant="error" onClose={() => setError('')} />}
      {success && <ToastMessage message={success} variant="success" onClose={() => setSuccess('')} />}

      {/* Add tracking form */}
      <div className="mb-4 rounded-xl bg-white p-4 shadow-sm">
        <p className="mb-3 text-sm font-semibold text-gray-700">Track a new menu item</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-6">
          <select
            value={selectedMenuItemId}
            onChange={(e) => setSelectedMenuItemId(e.target.value)}
            className="lg:col-span-2 rounded-lg border border-gray-200 px-3 py-2 text-sm"
          >
            <option value="">Select menu item…</option>
            {untrackedItems.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
          <div className="flex gap-1.5">
            <input
              type="number" min={0} value={newQuantity}
              onChange={(e) => setNewQuantity(e.target.value)}
              placeholder="Qty" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
            <select value={newUnit} onChange={(e) => setNewUnit(e.target.value)}
              className="rounded-lg border border-gray-200 px-2 py-2 text-sm">
              {UNITS.map((u) => <option key={u}>{u}</option>)}
            </select>
          </div>
          <input
            type="number" min={0} value={newThreshold}
            onChange={(e) => setNewThreshold(e.target.value)}
            placeholder="Low-stock threshold" className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
          <input
            type="tel" value={newVendorPhone}
            onChange={(e) => setNewVendorPhone(e.target.value)}
            placeholder="Vendor phone (optional)" className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
          <button onClick={handleAdd}
            className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600">
            Add Tracking
          </button>
        </div>
      </div>

      {/* Stock list */}
      <div className="rounded-xl bg-white shadow-sm overflow-hidden">
        {inventory.length === 0 ? (
          <p className="p-5 text-sm text-gray-500">No inventory records yet. Add a menu item above to start tracking.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {inventory.map((item) => {
              const s = editState[item.id] ?? { qty: item.quantity, threshold: item.lowStockThreshold, vendor: item.vendorPhone ?? '', unit: item.unit ?? 'pcs' }
              const light = getTrafficLight(s.qty, s.threshold)
              const lc = LIGHT_CONFIG[light]
              const waUrl = buildWhatsApp(item)
              const isSaving = savingId === item.id

              return (
                <div key={item.id} className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    {/* Left: status dot + name */}
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={`mt-1 h-3 w-3 rounded-full shrink-0 ${lc.dot}`} title={lc.label} />
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-800 truncate">{item.menuItemName}</p>
                        <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${lc.badge}`}>
                            {lc.label}
                          </span>
                          {/* Predictive Reorder Engine: days until stockout */}
                          {(() => {
                            const days = daysUntilStockout(s.qty, s.threshold)
                            if (days === null) return null
                            const color = days <= 1 ? 'bg-red-100 text-red-700' : days <= 3 ? 'bg-amber-100 text-amber-700' : days <= 7 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'
                            const icon = days <= 1 ? '🚨' : days <= 3 ? '⚠️' : '📅'
                            return (
                              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${color}`} title="Estimated days until stockout based on threshold">
                                {icon} {days}d left
                              </span>
                            )
                          })()}
                          {!item.menuItemAvailable && (
                            <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-500">
                              Hidden from menu
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: action buttons */}
                    <div className="flex flex-wrap gap-2 shrink-0">
                      {/* Auto-PO: shown only when item is RED and has a preferred vendor */}
                      {(() => {
                        const pv = light === 'RED' ? preferredVendorFor(item) : null
                        if (!pv) return null
                        return (
                          <button
                            onClick={() => navigate(`/dashboard/vendors?tab=orders&vendor=${pv.id}`)}
                            className="inline-flex items-center gap-1 rounded-lg border border-orange-300 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700 hover:bg-orange-100 animate-pulse-slow"
                            title={`Create purchase order from ${pv.vendorName}`}
                          >
                            🛒 Reorder from {pv.vendorName}
                          </button>
                        )
                      })()}
                      {waUrl && (
                        <a href={waUrl} target="_blank" rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100">
                          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-emerald-600"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>
                          WhatsApp Vendor
                        </a>
                      )}
                      <button onClick={() => openWasteModal(item)}
                        className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100">
                        Log Waste
                      </button>
                    </div>
                  </div>

                  {/* Editable row */}
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
                    {/* Qty with +/- nudge */}
                    <div className="flex items-center gap-1">
                      <button onClick={() => nudge(item, -1)} disabled={isSaving || s.qty <= 0}
                        className="h-8 w-8 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-40 text-base font-bold leading-none">
                        −
                      </button>
                      <input type="number" min={0} value={s.qty}
                        onChange={(e) => patchEdit(item.id, { qty: Math.max(0, Number(e.target.value)) })}
                        className="w-16 rounded-lg border border-gray-200 px-2 py-1.5 text-center text-sm" />
                      <button onClick={() => nudge(item, 1)} disabled={isSaving}
                        className="h-8 w-8 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-40 text-base font-bold leading-none">
                        +
                      </button>
                    </div>

                    {/* Unit */}
                    <select value={s.unit}
                      onChange={(e) => patchEdit(item.id, { unit: e.target.value })}
                      className="rounded-lg border border-gray-200 px-2 py-1.5 text-sm">
                      {UNITS.map((u) => <option key={u}>{u}</option>)}
                    </select>

                    {/* Threshold */}
                    <input type="number" min={0} value={s.threshold}
                      onChange={(e) => patchEdit(item.id, { threshold: Number(e.target.value) })}
                      placeholder="Reorder level"
                      className="rounded-lg border border-gray-200 px-2 py-1.5 text-sm" />

                    {/* Vendor phone */}
                    <input type="tel" value={s.vendor}
                      onChange={(e) => patchEdit(item.id, { vendor: e.target.value })}
                      placeholder="Vendor phone"
                      className="rounded-lg border border-gray-200 px-2 py-1.5 text-sm" />

                    {/* Save */}
                    <button onClick={() => handleSaveRow(item)} disabled={isSaving}
                      className="rounded-lg bg-gray-800 px-4 py-1.5 text-sm font-semibold text-white hover:bg-black disabled:opacity-60">
                      {isSaving ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {categories.length === 0 && (
        <p className="mt-4 text-xs text-gray-400">Create categories and menu items first to manage inventory.</p>
      )}

      {/* Waste modal */}
      {wasteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setWasteModal(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-1 text-base font-bold text-gray-800">Log Spoilage / Waste</h2>
            <p className="mb-4 text-xs text-gray-500">{wasteModal.item.menuItemName}</p>

            <label className="mb-1 block text-xs font-medium text-gray-600">Quantity wasted ({wasteModal.item.unit})</label>
            <input type="number" min={1} value={wasteModal.qty}
              onChange={(e) => setWasteModal((w) => w ? { ...w, qty: Number(e.target.value) } : null)}
              className="mb-3 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />

            <label className="mb-1 block text-xs font-medium text-gray-600">Reason</label>
            <select value={wasteModal.reason}
              onChange={(e) => setWasteModal((w) => w ? { ...w, reason: e.target.value } : null)}
              className="mb-4 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm">
              <option>Spoilage</option>
              <option>Expired</option>
              <option>Damaged</option>
              <option>Over-prep</option>
              <option>Other</option>
            </select>

            <div className="flex gap-2">
              <button onClick={() => setWasteModal(null)}
                className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={submitWaste} disabled={wasteLogging}
                className="flex-1 rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-60">
                {wasteLogging ? 'Logging…' : 'Log Waste'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default InventoryPage
