export type UserRole = 'SUPER_ADMIN' | 'TENANT_ADMIN' | 'STAFF' | 'CUSTOMER'

export interface User {
  id: string
  tenantId: string | null
  name: string
  email: string
  phone: string | null
  role: UserRole
  isActive: boolean
  createdAt: string
  updatedAt: string
}
