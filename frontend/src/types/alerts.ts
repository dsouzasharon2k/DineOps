export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL'

export interface AlertSummaryItem {
  id: string | null
  severity: AlertSeverity
  type: string
  title: string
  description: string
  action: string
  read: boolean
  createdAt: string
}

export interface AlertUnreadCountResponse {
  unreadCount: number
}
