import axiosInstance from './axiosInstance'
import type { PaginatedResponse } from '../types/api'
import type {
  CreateExpenseEntryPayload,
  ExpenseEntry,
  FinanceSummary,
  UpdateExpenseEntryPayload,
} from '../types/finance'

export const listExpenseEntriesApi = async (
  tenantId: string,
  fromDate?: string,
  toDate?: string,
  page = 0,
  size = 20
): Promise<PaginatedResponse<ExpenseEntry>> => {
  const params = new URLSearchParams({ tenantId, page: String(page), size: String(size) })
  if (fromDate) params.set('fromDate', fromDate)
  if (toDate) params.set('toDate', toDate)
  const res = await axiosInstance.get<PaginatedResponse<ExpenseEntry>>(`/api/v1/finance/expenses?${params.toString()}`)
  return res.data
}

export const createExpenseEntryApi = async (payload: CreateExpenseEntryPayload): Promise<ExpenseEntry> => {
  const res = await axiosInstance.post<ExpenseEntry>('/api/v1/finance/expenses', payload)
  return res.data
}

export const updateExpenseEntryApi = async (
  expenseId: string,
  tenantId: string,
  payload: UpdateExpenseEntryPayload
): Promise<ExpenseEntry> => {
  const res = await axiosInstance.put<ExpenseEntry>(`/api/v1/finance/expenses/${expenseId}?tenantId=${tenantId}`, payload)
  return res.data
}

export const deleteExpenseEntryApi = async (expenseId: string, tenantId: string): Promise<void> => {
  await axiosInstance.delete(`/api/v1/finance/expenses/${expenseId}?tenantId=${tenantId}`)
}

export const getFinanceSummaryApi = async (
  tenantId: string,
  fromDate?: string,
  toDate?: string
): Promise<FinanceSummary> => {
  const params = new URLSearchParams({ tenantId })
  if (fromDate) params.set('fromDate', fromDate)
  if (toDate) params.set('toDate', toDate)
  const res = await axiosInstance.get<FinanceSummary>(`/api/v1/finance/summary?${params.toString()}`)
  return res.data
}
