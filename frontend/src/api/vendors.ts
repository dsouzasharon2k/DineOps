import axiosInstance from './axiosInstance'

export interface VendorItemDetail {
  vendorItemId: string
  inventoryId: string
  menuItemName: string
  unit: string
  lastPurchasePrice: number | null
  preferredVendor: boolean
}

export interface Vendor {
  id: string
  tenantId: string
  vendorName: string
  contactPerson: string | null
  phoneNumber: string | null
  category: string
  address: string | null
  notes: string | null
  linkedItems: VendorItemDetail[]
  createdAt: string
  updatedAt: string
}

export interface POItemDetail {
  id: string
  inventoryId: string | null
  itemName: string
  quantity: number
  unit: string
  unitPrice: number
  totalPrice: number
}

export interface PurchaseOrder {
  id: string
  tenantId: string
  vendorId: string
  vendorName: string
  vendorPhone: string | null
  status: 'DRAFT' | 'SENT' | 'RECEIVED' | 'CANCELLED'
  totalAmount: number | null
  notes: string | null
  receivedAt: string | null
  items: POItemDetail[]
  createdAt: string
  updatedAt: string
}

// ── Vendors ──────────────────────────────────────────────────────────────────

export const getVendorsApi = (tenantId: string) =>
  axiosInstance.get<Vendor[]>(`/api/v1/restaurants/${tenantId}/vendors`).then((r) => r.data)

export const createVendorApi = (tenantId: string, payload: {
  vendorName: string; contactPerson?: string; phoneNumber?: string
  category?: string; address?: string; notes?: string
}) =>
  axiosInstance.post<Vendor>(`/api/v1/restaurants/${tenantId}/vendors`, payload).then((r) => r.data)

export const updateVendorApi = (tenantId: string, vendorId: string, payload: {
  vendorName: string; contactPerson?: string; phoneNumber?: string
  category?: string; address?: string; notes?: string
}) =>
  axiosInstance.put<Vendor>(`/api/v1/restaurants/${tenantId}/vendors/${vendorId}`, payload).then((r) => r.data)

export const deleteVendorApi = (tenantId: string, vendorId: string) =>
  axiosInstance.delete(`/api/v1/restaurants/${tenantId}/vendors/${vendorId}`)

export const linkInventoryToVendorApi = (tenantId: string, vendorId: string, payload: {
  inventoryId: string; lastPurchasePrice?: number; preferredVendor: boolean
}) =>
  axiosInstance.post<Vendor>(`/api/v1/restaurants/${tenantId}/vendors/${vendorId}/items`, payload).then((r) => r.data)

export const unlinkInventoryFromVendorApi = (tenantId: string, vendorId: string, inventoryId: string) =>
  axiosInstance.delete(`/api/v1/restaurants/${tenantId}/vendors/${vendorId}/items/${inventoryId}`)

// ── Purchase Orders ───────────────────────────────────────────────────────────

export const getPurchaseOrdersApi = (tenantId: string) =>
  axiosInstance.get<PurchaseOrder[]>(`/api/v1/restaurants/${tenantId}/purchase-orders`).then((r) => r.data)

export interface CreatePOPayload {
  vendorId: string
  notes?: string
  items: { inventoryId?: string; itemName: string; quantity: number; unit: string; unitPrice: number }[]
}

export const createPurchaseOrderApi = (tenantId: string, payload: CreatePOPayload) =>
  axiosInstance.post<PurchaseOrder>(`/api/v1/restaurants/${tenantId}/purchase-orders`, payload).then((r) => r.data)

export const updatePOStatusApi = (tenantId: string, poId: string, status: string) =>
  axiosInstance.patch<PurchaseOrder>(`/api/v1/restaurants/${tenantId}/purchase-orders/${poId}/status`, { status }).then((r) => r.data)
