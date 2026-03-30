export interface WastageEvent {
  id: string
  tenantId: string
  menuItemId: string | null
  menuItemName: string | null
  quantity: number
  unitCost: number
  reason: string | null
  createdAt: string
}
