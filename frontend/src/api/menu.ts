import axiosInstance from './axiosInstance'
import type { MenuCategory, MenuItem } from '../types/menu'
import type { Order, OrderStatus, OrderStatusHistoryEntry } from '../types/order'

// --- Categories ---

export const getCategoriesApi = async (tenantId: string): Promise<MenuCategory[]> => {
  const response = await axiosInstance.get<MenuCategory[]>(`/api/v1/restaurants/${tenantId}/categories`)
  return response.data
}

export const createCategoryApi = async (
  tenantId: string,
  name: string,
  description: string
): Promise<MenuCategory> => {
  const response = await axiosInstance.post<MenuCategory>(`/api/v1/restaurants/${tenantId}/categories`, {
    name,
    description,
  })
  return response.data
}

export const deleteCategoryApi = async (tenantId: string, categoryId: string) => {
  await axiosInstance.delete(`/api/v1/restaurants/${tenantId}/categories/${categoryId}`)
}

// --- Menu Items ---

export const getItemsApi = async (tenantId: string, categoryId: string): Promise<MenuItem[]> => {
  const response = await axiosInstance.get<MenuItem[]>(
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
): Promise<MenuItem> => {
  const response = await axiosInstance.post<MenuItem>(
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
  tableNumber: string | null,
  notes: string,
  items: { menuItemId: string; quantity: number }[]
): Promise<Order> => {
  const res = await axiosInstance.post<Order>('/api/v1/orders', { tenantId, tableNumber, notes, items })
  return res.data
}

// Get order by ID (for status tracking)
export const getOrderApi = async (orderId: string): Promise<Order> => {
  const res = await axiosInstance.get<Order>(`/api/v1/orders/${orderId}`)
  return res.data
}

export const getOrderHistoryApi = async (orderId: string): Promise<OrderStatusHistoryEntry[]> => {
  const res = await axiosInstance.get<OrderStatusHistoryEntry[]>(`/api/v1/orders/${orderId}/history`)
  return res.data
}

export const cancelOrderApi = async (orderId: string): Promise<Order> => {
  const res = await axiosInstance.post<Order>(`/api/v1/orders/${orderId}/cancel`)
  return res.data
}

// Get all active orders for a restaurant (kitchen view)
export const getActiveOrdersApi = async (tenantId: string, token: string): Promise<Order[]> => {
  const res = await axiosInstance.get<Order[]>(`/api/v1/orders/active?tenantId=${tenantId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return res.data
}

// Update order status (kitchen staff action)
export const updateOrderStatusApi = async (
  orderId: string,
  status: OrderStatus,
  token: string
): Promise<Order> => {
  const res = await axiosInstance.patch<Order>(
    `/api/v1/orders/${orderId}/status`,
    { status },
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  )
  return res.data
}
