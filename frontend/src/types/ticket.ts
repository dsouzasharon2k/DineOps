export type TicketType =
  | 'BUG'
  | 'PAYMENT'
  | 'SUBSCRIPTION'
  | 'ORDER_SYNC'
  | 'INVENTORY'
  | 'ACCOUNT_ACCESS'
  | 'FEATURE_REQUEST'
  | 'OTHER'

export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'

export interface Ticket {
  id: string
  tenantId: string
  createdByEmail: string
  title: string
  description: string
  type: TicketType
  priority: TicketPriority
  status: TicketStatus
  assignedToEmail: string | null
  slaDueAt: string | null
  resolutionNotes: string | null
  createdAt: string
  updatedAt: string
}

export interface TicketComment {
  id: string
  ticketId: string
  authorEmail: string
  body: string
  createdAt: string
  updatedAt: string
}
