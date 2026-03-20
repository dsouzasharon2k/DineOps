export type DiningTableStatus = 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'OUT_OF_SERVICE'

export interface DiningTable {
  id: string
  tenantId: string
  tableNumber: string
  capacity: number
  status: DiningTableStatus
  qrCodeUrl: string | null
  createdAt: string
  updatedAt: string
}
