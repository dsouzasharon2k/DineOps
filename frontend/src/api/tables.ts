import axiosInstance from './axiosInstance'
import type { DiningTable, DiningTableStatus } from '../types/table'

export const getTablesApi = async (tenantId: string): Promise<DiningTable[]> => {
  const res = await axiosInstance.get<DiningTable[]>(`/api/v1/restaurants/${tenantId}/tables`)
  return res.data
}

export const createTableApi = async (
  tenantId: string,
  payload: { tableNumber: string; capacity: number }
): Promise<DiningTable> => {
  const res = await axiosInstance.post<DiningTable>(`/api/v1/restaurants/${tenantId}/tables`, payload)
  return res.data
}

export const updateTableApi = async (
  tenantId: string,
  tableId: string,
  payload: { capacity: number; status: DiningTableStatus }
): Promise<DiningTable> => {
  const res = await axiosInstance.put<DiningTable>(
    `/api/v1/restaurants/${tenantId}/tables/${tableId}`,
    payload
  )
  return res.data
}

export const deleteTableApi = async (tenantId: string, tableId: string): Promise<void> => {
  await axiosInstance.delete(`/api/v1/restaurants/${tenantId}/tables/${tableId}`)
}
