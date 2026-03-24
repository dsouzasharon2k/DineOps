import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

type RoleRouteProps = {
  children: React.ReactNode
  allowedRoles: string[]
}

const extractRole = (token: string | null): string | null => {
  if (!token) return null
  try {
    const payload = JSON.parse(atob(token.split('.')[1])) as { role?: string }
    return payload.role ?? null
  } catch {
    return null
  }
}

const RoleRoute = ({ children, allowedRoles }: RoleRouteProps) => {
  const { token, initializing } = useAuth()
  if (initializing) return null

  const role = extractRole(token)
  if (!role || !allowedRoles.includes(role)) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

export default RoleRoute

