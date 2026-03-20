import axiosInstance from './axiosInstance'
import type { InventoryItem } from '../types/inventory'

export const getInventoryByTenantApi = async (tenantId: string): Promise<InventoryItem[]> => {
  const res = await axiosInstance.get<InventoryItem[]>(`/api/v1/inventory?tenantId=${tenantId}`)
  return res.data
}

export const upsertInventoryApi = async (
  menuItemId: string,
  quantity: number,
  lowStockThreshold: number
): Promise<InventoryItem> => {
  const res = await axiosInstance.post<InventoryItem>('/api/v1/inventory', {
    menuItemId,
    quantity,
    lowStockThreshold,
  })
  return res.data
}

export const updateInventoryApi = async (
  inventoryId: string,
  quantity: number,
  lowStockThreshold: number
): Promise<InventoryItem> => {
  const res = await axiosInstance.put<InventoryItem>(`/api/v1/inventory/${inventoryId}`, {
    quantity,
    lowStockThreshold,
  })
  return res.data
}
