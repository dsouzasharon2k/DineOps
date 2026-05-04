export interface JwtPayload {
  sub?: string
  role?: string
  tenantId?: string
  [key: string]: unknown
}

export const parseJwtPayload = (token: string | null): JwtPayload | null => {
  if (!token) return null
  try {
    const part = token.split('.')[1]
    if (!part) return null
    return JSON.parse(atob(part)) as JwtPayload
  } catch {
    return null
  }
}

export const extractTenantId = (token: string | null): string | null => {
  const payload = parseJwtPayload(token)
  return typeof payload?.tenantId === 'string' ? payload.tenantId : null
}
