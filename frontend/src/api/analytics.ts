import axiosInstance from './axiosInstance'
import type { AnalyticsSummary } from '../types/analytics'

export const getAnalyticsSummaryApi = async (tenantId: string): Promise<AnalyticsSummary> => {
  const res = await axiosInstance.get<AnalyticsSummary>(`/api/v1/analytics/summary?tenantId=${tenantId}`)
  return res.data
}
