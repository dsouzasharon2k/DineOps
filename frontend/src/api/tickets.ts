import axiosInstance from './axiosInstance'
import type { PaginatedResponse } from '../types/api'
import type { Ticket, TicketComment, TicketPriority, TicketStatus, TicketType } from '../types/ticket'

export interface CreateTicketPayload {
  title: string
  description: string
  type: TicketType
  priority: TicketPriority
}

export const getTicketsApi = async (tenantId?: string): Promise<Ticket[]> => {
  const params = new URLSearchParams()
  if (tenantId) {
    params.set('tenantId', tenantId)
  }
  const query = params.toString()
  const res = await axiosInstance.get<PaginatedResponse<Ticket>>(`/api/v1/tickets${query ? `?${query}` : ''}`)
  return res.data.content
}

export const createTicketApi = async (payload: CreateTicketPayload, tenantId?: string): Promise<Ticket> => {
  const params = new URLSearchParams()
  if (tenantId) {
    params.set('tenantId', tenantId)
  }
  const query = params.toString()
  const res = await axiosInstance.post<Ticket>(`/api/v1/tickets${query ? `?${query}` : ''}`, payload)
  return res.data
}

export const updateTicketStatusApi = async (ticketId: string, status: TicketStatus): Promise<Ticket> => {
  const res = await axiosInstance.patch<Ticket>(`/api/v1/tickets/${ticketId}/status`, { status })
  return res.data
}

export interface UpdateTicketPayload {
  status?: TicketStatus
  priority?: TicketPriority
  assignedToEmail?: string | null
  slaDueAt?: string | null
  resolutionNotes?: string | null
}

export const updateTicketApi = async (ticketId: string, payload: UpdateTicketPayload): Promise<Ticket> => {
  const res = await axiosInstance.patch<Ticket>(`/api/v1/tickets/${ticketId}`, payload)
  return res.data
}

export const getTicketCommentsApi = async (ticketId: string): Promise<TicketComment[]> => {
  const res = await axiosInstance.get<TicketComment[]>(`/api/v1/tickets/${ticketId}/comments`)
  return res.data
}

export const addTicketCommentApi = async (ticketId: string, body: string): Promise<TicketComment> => {
  const res = await axiosInstance.post<TicketComment>(`/api/v1/tickets/${ticketId}/comments`, { body })
  return res.data
}
