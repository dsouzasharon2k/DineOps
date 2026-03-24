import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  getCategoriesApi,
  createCategoryApi,
  deleteCategoryApi,
  getAllItemsApi,
  createItemApi,
  deleteItemApi,
  toggleItemAvailabilityApi,
} from '../../api/menu'
import type { MenuCategory, MenuItem } from '../../types/menu'
import { getApiErrorMessage } from '../../api/error'
import { formatCurrency } from '../../utils/currency'
import LoadingState from '../../components/LoadingState'
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

const VegDot = ({ isVegetarian }: { isVegetarian: boolean }) => (
  <span
    className={`inline-flex w-4 h-4 shrink-0 rounded-sm border-2 items-center justify-center ${
      isVegetarian ? 'border-green-500' : 'border-red-500'
    }`}
    title={isVegetarian ? 'Vegetarian' : 'Non-vegetarian'}
  >
    <span className={`w-2 h-2 rounded-full ${isVegetarian ? 'bg-green-500' : 'bg-red-500'}`} />
  </span>
)

const Toggle = ({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean
  onChange: () => void
  disabled?: boolean
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={onChange}
    disabled={disabled}
    className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
      checked ? 'bg-emerald-500' : 'bg-gray-200'
    } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
  >
    <span
      className={`pointer-events-none inline-block h-4 w-4 translate-y-0.5 rounded-full bg-white shadow transition-transform ${
        checked ? 'translate-x-4' : 'translate-x-0.5'
      }`}
    />
  </button>
)

const MenuPage = () => {
  const { token } = useAuth()
  const tenantId = useMemo(() => extractTenantId(token) ?? FALLBACK_TENANT_ID, [token])
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [selectedCategory, setSelectedCategory] = useState<MenuCategory | null>(null)
  const [items, setItems] = useState<MenuItem[]>([])
  const [itemCountByCategory, setItemCountByCategory] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [itemsLoading, setItemsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [togglingItem, setTogglingItem] = useState<string | null>(null)

  const setOpError = (key: string, err: unknown, fallback: string) =>
    setErrors((prev) => ({ ...prev, [key]: getApiErrorMessage(err, fallback) }))
  const clearOpError = (key: string) =>
    setErrors((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })

  // Add category form
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryDesc, setNewCategoryDesc] = useState('')
  const categoryNameRef = useRef<HTMLInputElement>(null)

  // Add item form
  const [showItemForm, setShowItemForm] = useState(false)
  const [newItemName, setNewItemName] = useState('')
  const [newItemDesc, setNewItemDesc] = useState('')
  const [newItemPrice, setNewItemPrice] = useState('')
  const [newItemPrepTime, setNewItemPrepTime] = useState('')
  const [newItemVeg, setNewItemVeg] = useState(true)

  useEffect(() => {
    if (!token) {
      setLoading(true)
      return
    }
    if (tenantId) fetchCategories()
    else setLoading(false)
  }, [tenantId, token])

  useEffect(() => {
    if (showCategoryForm) categoryNameRef.current?.focus()
  }, [showCategoryForm])

  const fetchCategories = useCallback(async () => {
    clearOpError('fetchCategories')
    try {
      const data = await getCategoriesApi(tenantId)
      setCategories(data)
      if (data.length > 0 && !selectedCategory) setSelectedCategory(data[0])
    } catch (err) {
      setOpError('fetchCategories', err, 'Failed to load categories.')
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  const fetchItems = useCallback(
    async (categoryId: string) => {
      clearOpError('fetchItems')
      setItemsLoading(true)
      try {
        const data = await getAllItemsApi(tenantId, categoryId)
        setItems(data)
        setItemCountByCategory((prev) => ({ ...prev, [categoryId]: data.length }))
      } catch (err) {
        setOpError('fetchItems', err, 'Failed to load items.')
      } finally {
        setItemsLoading(false)
      }
    },
    [tenantId]
  )

  useEffect(() => {
    if (selectedCategory) fetchItems(selectedCategory.id)
  }, [selectedCategory, fetchItems])

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return
    clearOpError('addCategory')
    try {
      const created = await createCategoryApi(tenantId, newCategoryName, newCategoryDesc)
      setNewCategoryName('')
      setNewCategoryDesc('')
      setShowCategoryForm(false)
      await fetchCategories()
      setSelectedCategory(created)
    } catch (err) {
      setOpError('addCategory', err, 'Failed to create category.')
    }
  }

  const handleDeleteCategory = async (categoryId: string) => {
    if (!window.confirm('Delete this category and all its items?')) return
    clearOpError(`deleteCategory_${categoryId}`)
    try {
      await deleteCategoryApi(tenantId, categoryId)
      if (selectedCategory?.id === categoryId) setSelectedCategory(null)
      fetchCategories()
    } catch (err) {
      setOpError(`deleteCategory_${categoryId}`, err, 'Failed to delete category.')
    }
  }

  const handleAddItem = async () => {
    if (!newItemName.trim() || !newItemPrice || !selectedCategory) return
    clearOpError('addItem')
    try {
      await createItemApi(tenantId, selectedCategory.id, {
        name: newItemName,
        description: newItemDesc,
        price: Math.round(parseFloat(newItemPrice) * 100),
        isVegetarian: newItemVeg,
        imageUrl: null,
        prepTimeMinutes: newItemPrepTime ? parseInt(newItemPrepTime, 10) : null,
      })
      setNewItemName('')
      setNewItemDesc('')
      setNewItemPrice('')
      setNewItemPrepTime('')
      setNewItemVeg(true)
      setShowItemForm(false)
      fetchItems(selectedCategory.id)
    } catch (err) {
      setOpError('addItem', err, 'Failed to create item.')
    }
  }

  const handleDeleteItem = async (itemId: string) => {
    if (!selectedCategory) return
    clearOpError(`deleteItem_${itemId}`)
    try {
      await deleteItemApi(tenantId, selectedCategory.id, itemId)
      fetchItems(selectedCategory.id)
    } catch (err) {
      setOpError(`deleteItem_${itemId}`, err, 'Failed to delete item.')
    }
  }

  const handleToggleAvailability = async (item: MenuItem) => {
    if (!selectedCategory || togglingItem === item.id) return
    setTogglingItem(item.id)
    clearOpError(`toggle_${item.id}`)
    try {
      const updated = await toggleItemAvailabilityApi(tenantId, selectedCategory.id, item.id)
      setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)))
    } catch (err) {
      setOpError(`toggle_${item.id}`, err, 'Failed to update availability.')
    } finally {
      setTogglingItem(null)
    }
  }

  if (loading) return <LoadingState message="Loading menu..." />

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-gray-900">Menu management</h1>
      </div>

      {errors.fetchCategories && (
        <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{errors.fetchCategories}</p>
      )}

      <div className="flex gap-5 flex-1 min-h-0">
        {/* ─── Left sidebar ─── */}
        <div className="w-56 shrink-0 flex flex-col gap-3">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex-1">
            <div className="px-4 pt-4 pb-2 flex items-center justify-between">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Categories</p>
              <button
                onClick={() => setShowCategoryForm(!showCategoryForm)}
                className="text-orange-500 hover:text-orange-600 transition"
                title="Add category"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
            </div>

            {/* Add category inline form */}
            {showCategoryForm && (
              <div className="mx-3 mb-3 p-3 bg-orange-50 rounded-lg border border-orange-100">
                <input
                  ref={categoryNameRef}
                  className="w-full border border-gray-200 rounded-md px-2.5 py-1.5 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
                  placeholder="Category name"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                />
                <input
                  className="w-full border border-gray-200 rounded-md px-2.5 py-1.5 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
                  placeholder="Description (optional)"
                  value={newCategoryDesc}
                  onChange={(e) => setNewCategoryDesc(e.target.value)}
                />
                <button
                  onClick={handleAddCategory}
                  disabled={!newCategoryName.trim()}
                  className="w-full bg-orange-500 text-white text-sm py-1.5 rounded-md hover:bg-orange-600 transition disabled:opacity-50"
                >
                  Save
                </button>
                {errors.addCategory && (
                  <p className="text-xs text-red-500 mt-1.5">{errors.addCategory}</p>
                )}
              </div>
            )}

            {/* Category list */}
            <div className="pb-2">
              {categories.length === 0 ? (
                <p className="text-sm text-gray-400 px-4 py-2">No categories yet.</p>
              ) : (
                categories.map((cat) => {
                  const isActive = selectedCategory?.id === cat.id
                  const count = itemCountByCategory[cat.id]
                  return (
                    <div
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat)}
                      className={`group flex items-center justify-between px-4 py-2.5 cursor-pointer transition border-l-2 ${
                        isActive
                          ? 'border-orange-500 bg-orange-50 text-orange-700'
                          : 'border-transparent hover:bg-gray-50 text-gray-600'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`text-sm font-medium truncate ${isActive ? 'text-orange-700' : 'text-gray-700'}`}>
                          {cat.name}
                        </span>
                        {count !== undefined && (
                          <span className={`text-[11px] font-semibold ${isActive ? 'text-orange-400' : 'text-gray-400'}`}>
                            {count}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteCategory(cat.id)
                        }}
                        className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition ml-1 shrink-0"
                        title="Delete category"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>

        {/* ─── Right panel ─── */}
        <div className="flex-1 min-w-0 flex flex-col">
          {!selectedCategory ? (
            <div className="flex-1 rounded-xl bg-white border border-gray-100 shadow-sm flex items-center justify-center text-gray-400 text-sm">
              Select a category to manage items
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col flex-1">
              {/* Panel header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div>
                  <h2 className="font-semibold text-gray-800">{selectedCategory.name}</h2>
                  {selectedCategory.description && (
                    <p className="text-xs text-gray-400 mt-0.5">{selectedCategory.description}</p>
                  )}
                </div>
                <button
                  onClick={() => setShowItemForm(!showItemForm)}
                  className="inline-flex items-center gap-1.5 bg-orange-500 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-orange-600 transition font-medium"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Add item
                </button>
              </div>

              {/* Add item form */}
              {showItemForm && (
                <div className="px-5 py-4 bg-orange-50 border-b border-orange-100">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input
                      autoFocus
                      className="border border-gray-200 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
                      placeholder="Item name *"
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                    />
                    <input
                      className="border border-gray-200 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
                      placeholder="Price in ₹ (e.g. 250) *"
                      value={newItemPrice}
                      type="number"
                      min="0"
                      onChange={(e) => setNewItemPrice(e.target.value)}
                    />
                    <input
                      className="border border-gray-200 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
                      placeholder="Prep time min (optional)"
                      value={newItemPrepTime}
                      type="number"
                      min="0"
                      onChange={(e) => setNewItemPrepTime(e.target.value)}
                    />
                    <input
                      className="border border-gray-200 rounded-md px-3 py-2 text-sm bg-white sm:col-span-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
                      placeholder="Description (optional)"
                      value={newItemDesc}
                      onChange={(e) => setNewItemDesc(e.target.value)}
                    />
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
                        <Toggle checked={newItemVeg} onChange={() => setNewItemVeg(!newItemVeg)} />
                        <span>{newItemVeg ? 'Veg' : 'Non-veg'}</span>
                      </label>
                      <button
                        onClick={handleAddItem}
                        disabled={!newItemName.trim() || !newItemPrice}
                        className="ml-auto bg-orange-500 text-white text-sm px-4 py-2 rounded-md hover:bg-orange-600 transition disabled:opacity-50"
                      >
                        Save item
                      </button>
                    </div>
                  </div>
                  {errors.addItem && (
                    <p className="text-xs text-red-500 mt-2">{errors.addItem}</p>
                  )}
                </div>
              )}

              {errors.fetchItems && (
                <p className="px-5 py-3 text-sm text-red-600 bg-red-50">{errors.fetchItems}</p>
              )}

              {/* Items table */}
              {itemsLoading ? (
                <div className="flex-1 flex items-center justify-center text-gray-400 text-sm py-12">
                  Loading items…
                </div>
              ) : items.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-gray-400 text-sm py-12">
                  No items yet. Add the first one above.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="px-5 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Item</th>
                        <th className="px-4 py-3 text-right text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Price</th>
                        <th className="px-4 py-3 text-center text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Prep</th>
                        <th className="px-4 py-3 text-center text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Avail</th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {items.map((item) => (
                        <tr key={item.id} className={`hover:bg-gray-50 transition ${!item.isAvailable ? 'opacity-50' : ''}`}>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2.5">
                              <VegDot isVegetarian={item.isVegetarian} />
                              <div>
                                <p className="font-medium text-gray-800">{item.name}</p>
                                {item.description && (
                                  <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{item.description}</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-700 tabular-nums">
                            {formatCurrency(item.price)}
                          </td>
                          <td className="px-4 py-3 text-center text-gray-500 tabular-nums">
                            {item.prepTimeMinutes ? `${item.prepTimeMinutes}m` : '—'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex justify-center">
                              <Toggle
                                checked={item.isAvailable}
                                onChange={() => handleToggleAvailability(item)}
                                disabled={togglingItem === item.id}
                              />
                            </div>
                            {errors[`toggle_${item.id}`] && (
                              <p className="text-[10px] text-red-500 mt-1">{errors[`toggle_${item.id}`]}</p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              className="text-gray-300 hover:text-red-400 transition"
                              title="Delete item"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                <path d="M10 11v6M14 11v6" />
                                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                              </svg>
                            </button>
                            {errors[`deleteItem_${item.id}`] && (
                              <p className="text-[10px] text-red-500 mt-1">{errors[`deleteItem_${item.id}`]}</p>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default MenuPage
