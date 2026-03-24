import { useEffect, useMemo, useState } from 'react'
import { getInventoryByTenantApi, updateInventoryApi, upsertInventoryApi } from '../../api/inventory'
import { getCategoriesApi, getItemsApi } from '../../api/menu'
import { getApiErrorMessage } from '../../api/error'
import type { InventoryItem } from '../../types/inventory'
import type { MenuCategory, MenuItem } from '../../types/menu'
import { useAuth } from '../../context/AuthContext'

const extractTenantId = (token: string | null): string | null => {
  if (!token) return null
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.tenantId ?? null
  } catch {
    return null
  }
}

const FALLBACK_TENANT_ID = 'a085284e-ca00-4f64-a2c7-42fc0572bb97'

const InventoryPage = () => {
  const { token } = useAuth()
  const tenantId = useMemo(() => extractTenantId(token) ?? FALLBACK_TENANT_ID, [token])
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [allItems, setAllItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const [selectedMenuItemId, setSelectedMenuItemId] = useState('')
  const [newQuantity, setNewQuantity] = useState('0')
  const [newThreshold, setNewThreshold] = useState('5')

  const load = async () => {
    try {
      setError('')
      const inv = await getInventoryByTenantApi(tenantId)
      setInventory(inv)

      const cats = await getCategoriesApi(tenantId)
      setCategories(cats)
      const itemsNested = await Promise.all(cats.map((cat) => getItemsApi(tenantId, cat.id)))
      setAllItems(itemsNested.flat())
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load inventory.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!token) {
      setLoading(true)
      return
    }
    if (tenantId) load()
    else setLoading(false)
  }, [tenantId, token])

  const trackedItemIds = useMemo(() => new Set(inventory.map((i) => i.menuItemId)), [inventory])
  const untrackedItems = allItems.filter((item) => !trackedItemIds.has(item.id))

  const handleCreateInventory = async () => {
    if (!selectedMenuItemId) return
    try {
      setError('')
      await upsertInventoryApi(selectedMenuItemId, Number(newQuantity), Number(newThreshold))
      setSelectedMenuItemId('')
      setNewQuantity('0')
      setNewThreshold('5')
      await load()
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to create inventory record.'))
    }
  }

  const handleQuickUpdate = async (item: InventoryItem, quantity: number, threshold: number) => {
    try {
      setSavingId(item.id)
      setError('')
      await updateInventoryApi(item.id, quantity, threshold)
      await load()
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to update inventory.'))
    } finally {
      setSavingId(null)
    }
  }

  if (loading) {
    return <p className="text-sm text-gray-500">Loading inventory...</p>
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800">Inventory Management</h1>
      <p className="mt-2 text-sm text-gray-500">
        Current mode tracks sellable menu-item stock. For production-grade restaurants, use raw-material ingredients + recipe/BOM deductions.
      </p>

      {error && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <div className="mt-6 rounded-xl bg-white p-4 shadow-sm">
        <p className="mb-3 text-sm font-semibold text-gray-700">Add inventory tracking for menu item (quick mode)</p>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
          <select
            value={selectedMenuItemId}
            onChange={(e) => setSelectedMenuItemId(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          >
            <option value="">Select menu item</option>
            {untrackedItems.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <input
            type="number"
            min={0}
            value={newQuantity}
            onChange={(e) => setNewQuantity(e.target.value)}
            placeholder="Quantity"
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
          <input
            type="number"
            min={0}
            value={newThreshold}
            onChange={(e) => setNewThreshold(e.target.value)}
            placeholder="Low stock threshold"
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
          <button
            onClick={handleCreateInventory}
            className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
          >
            Add Tracking
          </button>
        </div>
      </div>

      <div className="mt-4 rounded-xl bg-white p-4 shadow-sm">
        <p className="mb-3 text-sm font-semibold text-gray-700">Current stock levels</p>
        {inventory.length === 0 ? (
          <p className="text-sm text-gray-500">No inventory records yet.</p>
        ) : (
          <div className="space-y-3">
            {inventory.map((item) => (
              <div key={item.id} className="rounded-lg border border-gray-100 p-3">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-gray-800">{item.menuItemName}</p>
                  {item.lowStock && (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                      Low stock alert
                    </span>
                  )}
                </div>
                <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-4">
                  <input
                    type="number"
                    min={0}
                    defaultValue={item.quantity}
                    id={`qty-${item.id}`}
                    className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                  <input
                    type="number"
                    min={0}
                    defaultValue={item.lowStockThreshold}
                    id={`th-${item.id}`}
                    className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                  <p className="self-center text-xs text-gray-500">
                    Menu status: {item.menuItemAvailable ? 'Available' : 'Out of stock'}
                  </p>
                  <button
                    onClick={() => {
                      const qty = Number((document.getElementById(`qty-${item.id}`) as HTMLInputElement).value)
                      const threshold = Number((document.getElementById(`th-${item.id}`) as HTMLInputElement).value)
                      handleQuickUpdate(item, qty, threshold)
                    }}
                    disabled={savingId === item.id}
                    className="rounded-lg bg-gray-800 px-4 py-2 text-sm font-semibold text-white hover:bg-black disabled:opacity-60"
                  >
                    {savingId === item.id ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {categories.length === 0 && (
        <p className="mt-4 text-xs text-gray-500">Create categories and menu items first to manage inventory.</p>
      )}
    </div>
  )
}

export default InventoryPage
