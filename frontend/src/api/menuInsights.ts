import axiosInstance from './axiosInstance'
import type { MenuInsightsResponse } from '../types/menuInsights'

export const getMenuInsightsApi = async (
  tenantId: string,
  fromDate?: string,
  toDate?: string
): Promise<MenuInsightsResponse> => {
  const params = new URLSearchParams({ tenantId })
  if (fromDate) params.set('fromDate', fromDate)
  if (toDate) params.set('toDate', toDate)
  const res = await axiosInstance.get<MenuInsightsResponse>(`/api/v1/analytics/menu-insights?${params.toString()}`)
  return res.data
}
