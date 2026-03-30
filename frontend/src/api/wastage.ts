import axiosInstance from './axiosInstance'
import type { WastageEvent } from '../types/wastage'

export const getWastageApi = async (tenantId: string): Promise<WastageEvent[]> => {
  const res = await axiosInstance.get<WastageEvent[]>(`/api/v1/wastage?tenantId=${tenantId}`)
  return res.data
}

export const logWastageApi = async (
  tenantId: string,
  menuItemId: string,
  quantity: number,
  reason: string
): Promise<WastageEvent> => {
  const res = await axiosInstance.post<WastageEvent>('/api/v1/wastage', {
    tenantId,
    menuItemId,
    quantity,
    reason,
  })
  return res.data
}
