import axiosInstance from './axiosInstance'
import type { AlertSummaryItem } from '../types/alerts'
import type { DailyDigest } from '../types/digest'
import type { AlertUnreadCountResponse } from '../types/alerts'

export const getAlertsSummaryApi = async (tenantId: string): Promise<AlertSummaryItem[]> => {
  const res = await axiosInstance.get<AlertSummaryItem[]>(`/api/v1/alerts/summary?tenantId=${tenantId}`)
  return res.data
}

export const getDailyDigestApi = async (tenantId: string): Promise<DailyDigest> => {
  const res = await axiosInstance.get<DailyDigest>(`/api/v1/alerts/digest?tenantId=${tenantId}`)
  return res.data
}

export const markAlertReadApi = async (tenantId: string, alertId: string): Promise<AlertSummaryItem> => {
  const res = await axiosInstance.patch<AlertSummaryItem>(`/api/v1/alerts/${alertId}/read?tenantId=${tenantId}`)
  return res.data
}

export const getUnreadAlertsCountApi = async (tenantId: string): Promise<AlertUnreadCountResponse> => {
  const res = await axiosInstance.get<AlertUnreadCountResponse>(`/api/v1/alerts/unread-count?tenantId=${tenantId}`)
  return res.data
}

export const markAllAlertsReadApi = async (tenantId: string): Promise<AlertUnreadCountResponse> => {
  const res = await axiosInstance.patch<AlertUnreadCountResponse>(`/api/v1/alerts/read-all?tenantId=${tenantId}`)
  return res.data
}
