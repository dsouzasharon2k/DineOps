import axiosInstance from './axiosInstance'

// --- Categories ---

export const getCategoriesApi = async (tenantId: string) => {
  const response = await axiosInstance.get(`/api/v1/restaurants/${tenantId}/categories`)
  return response.data
}

export const createCategoryApi = async (tenantId: string, name: string, description: string) => {
  const response = await axiosInstance.post(`/api/v1/restaurants/${tenantId}/categories`, {
    name,
    description,
  })
  return response.data
}

export const deleteCategoryApi = async (tenantId: string, categoryId: string) => {
  await axiosInstance.delete(`/api/v1/restaurants/${tenantId}/categories/${categoryId}`)
}

// --- Menu Items ---

export const getItemsApi = async (tenantId: string, categoryId: string) => {
  const response = await axiosInstance.get(
    `/api/v1/restaurants/${tenantId}/categories/${categoryId}/items`
  )
  return response.data
}

export const createItemApi = async (
  tenantId: string,
  categoryId: string,
  item: {
    name: string
    description: string
    price: number
    isVegetarian: boolean
    imageUrl: string | null
  }
) => {
  const response = await axiosInstance.post(
    `/api/v1/restaurants/${tenantId}/categories/${categoryId}/items`,
    item
  )
  return response.data
}

export const deleteItemApi = async (
  tenantId: string,
  categoryId: string,
  itemId: string
) => {
  await axiosInstance.delete(
    `/api/v1/restaurants/${tenantId}/categories/${categoryId}/items/${itemId}`
  )
}

// Place a new order
export const placeOrderApi = async (
  tenantId: string,
  notes: string,
  items: { menuItemId: string; quantity: number }[]
) => {
  const res = await axiosInstance.post('/api/v1/orders', { tenantId, notes, items })
  return res.data
}

// Get order by ID (for status tracking)
export const getOrderApi = async (orderId: string) => {
  const res = await axiosInstance.get(`/api/v1/orders/${orderId}`)
  return res.data
}
