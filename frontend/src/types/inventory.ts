export interface InventoryItem {
  id: string
  menuItemId: string
  menuItemName: string
  tenantId: string
  quantity: number
  lowStockThreshold: number
  lowStock: boolean
  menuItemAvailable: boolean
  createdAt: string
  updatedAt: string
}
