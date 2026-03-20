import { useEffect, useState } from 'react'
import {
  getCategoriesApi,
  createCategoryApi,
  deleteCategoryApi,
  getItemsApi,
  createItemApi,
  deleteItemApi,
} from '../../api/menu'
import type { MenuCategory, MenuItem } from '../../types/menu'
import { getApiErrorMessage } from '../../api/error'

// We hardcode the tenant ID for now - in Sprint 5 this will come from the JWT token
const TENANT_ID = 'a085284e-ca00-4f64-a2c7-42fc0572bb97'

const MenuPage = () => {
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [selectedCategory, setSelectedCategory] = useState<MenuCategory | null>(null)
  const [items, setItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Add category form state
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryDesc, setNewCategoryDesc] = useState('')
  const [showCategoryForm, setShowCategoryForm] = useState(false)

  // Add item form state
  const [newItemName, setNewItemName] = useState('')
  const [newItemDesc, setNewItemDesc] = useState('')
  const [newItemPrice, setNewItemPrice] = useState('')
  const [newItemVeg, setNewItemVeg] = useState(false)
  const [showItemForm, setShowItemForm] = useState(false)

  // Load categories on mount
  useEffect(() => {
    fetchCategories()
  }, [])

  // Load items when a category is selected
  useEffect(() => {
    if (selectedCategory) {
      fetchItems(selectedCategory.id)
    }
  }, [selectedCategory])

  const fetchCategories = async () => {
    try {
      const data = await getCategoriesApi(TENANT_ID)
      setCategories(data)
      if (data.length > 0) setSelectedCategory(data[0])
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load categories.'))
    } finally {
      setLoading(false)
    }
  }

  const fetchItems = async (categoryId: string) => {
    try {
      const data = await getItemsApi(TENANT_ID, categoryId)
      setItems(data)
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load items.'))
    }
  }

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return
    try {
      await createCategoryApi(TENANT_ID, newCategoryName, newCategoryDesc)
      setNewCategoryName('')
      setNewCategoryDesc('')
      setShowCategoryForm(false)
      fetchCategories()
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to create category.'))
    }
  }

  const handleDeleteCategory = async (categoryId: string) => {
    try {
      await deleteCategoryApi(TENANT_ID, categoryId)
      if (selectedCategory?.id === categoryId) setSelectedCategory(null)
      fetchCategories()
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to delete category.'))
    }
  }

  const handleAddItem = async () => {
    if (!newItemName.trim() || !newItemPrice) return
    try {
      // Convert rupees to paise (multiply by 100)
      await createItemApi(TENANT_ID, selectedCategory!.id, {
        name: newItemName,
        description: newItemDesc,
        price: Math.round(parseFloat(newItemPrice) * 100),
        isVegetarian: newItemVeg,
        imageUrl: null,
      })
      setNewItemName('')
      setNewItemDesc('')
      setNewItemPrice('')
      setNewItemVeg(false)
      setShowItemForm(false)
      fetchItems(selectedCategory!.id)
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to create item.'))
    }
  }

  const handleDeleteItem = async (itemId: string) => {
    try {
      await deleteItemApi(TENANT_ID, selectedCategory!.id, itemId)
      fetchItems(selectedCategory!.id)
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to delete item.'))
    }
  }

  if (loading) return <div className="text-gray-400 text-center mt-20">Loading...</div>

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Menu Management</h1>
      {error && (
        <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      <div className="flex flex-col md:flex-row gap-6">

        {/* Left panel - Categories */}
        <div className="w-full md:w-64 shrink-0">
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-700">Categories</h2>
              <button
                onClick={() => setShowCategoryForm(!showCategoryForm)}
                className="text-orange-500 text-sm hover:underline"
              >
                + Add
              </button>
            </div>

            {/* Add category form */}
            {showCategoryForm && (
              <div className="mb-3 p-3 bg-orange-50 rounded-lg">
                <input
                  className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
                  placeholder="Category name"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                />
                <input
                  className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
                  placeholder="Description (optional)"
                  value={newCategoryDesc}
                  onChange={(e) => setNewCategoryDesc(e.target.value)}
                />
                <button
                  onClick={handleAddCategory}
                  className="w-full bg-orange-500 text-white text-sm py-1.5 rounded-md hover:bg-orange-600 transition"
                >
                  Save
                </button>
              </div>
            )}

            {/* Category list */}
            {categories.length === 0 ? (
              <p className="text-sm text-gray-400">No categories yet.</p>
            ) : (
              categories.map((cat) => (
                <div
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat)}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer mb-1 transition ${
                    selectedCategory?.id === cat.id
                      ? 'bg-orange-500 text-white'
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <span className="text-sm font-medium">{cat.name}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteCategory(cat.id)
                    }}
                    className="text-xs opacity-60 hover:opacity-100"
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right panel - Menu Items */}
        <div className="flex-1">
          {!selectedCategory ? (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-400">
              <p className="text-4xl mb-3">🍽️</p>
              <p>Select a category to view items</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-700">{selectedCategory.name}</h2>
                <button
                  onClick={() => setShowItemForm(!showItemForm)}
                  className="bg-orange-500 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-orange-600 transition"
                >
                  + Add Item
                </button>
              </div>

              {/* Add item form */}
              {showItemForm && (
                <div className="mb-4 p-4 bg-orange-50 rounded-lg grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                    placeholder="Item name"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                  />
                  <input
                    className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                    placeholder="Price in ₹ (e.g. 250)"
                    value={newItemPrice}
                    onChange={(e) => setNewItemPrice(e.target.value)}
                  />
                  <input
                    className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 sm:col-span-2"
                    placeholder="Description (optional)"
                    value={newItemDesc}
                    onChange={(e) => setNewItemDesc(e.target.value)}
                  />
                  <label className="flex items-center gap-2 text-sm text-gray-600">
                    <input
                      type="checkbox"
                      checked={newItemVeg}
                      onChange={(e) => setNewItemVeg(e.target.checked)}
                    />
                    Vegetarian
                  </label>
                  <button
                    onClick={handleAddItem}
                    className="bg-orange-500 text-white text-sm py-1.5 rounded-md hover:bg-orange-600 transition"
                  >
                    Save Item
                  </button>
                </div>
              )}

              {/* Items list */}
              {items.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">
                  No items in this category yet.
                </p>
              ) : (
                <div className="divide-y">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between py-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-800">{item.name}</span>
                          {item.isVegetarian && (
                            <span className="text-xs bg-green-100 text-green-600 px-1.5 py-0.5 rounded">
                              🌿 Veg
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">{item.description}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        {/* Convert paise to rupees for display */}
                        <span className="text-sm font-semibold text-gray-700">
                          ₹{(item.price / 100).toFixed(2)}
                        </span>
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="text-red-400 hover:text-red-600 text-xs"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
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