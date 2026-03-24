import DashboardHome from './DashboardHome'
import SuperAdminDashboardPage from './SuperAdminDashboardPage'
import { useAuth } from '../../context/AuthContext'

const extractRole = (token: string | null): string | null => {
  if (!token) return null
  try {
    const payload = JSON.parse(atob(token.split('.')[1])) as { role?: string }
    return payload.role ?? null
  } catch {
    return null
  }
}

const DashboardEntryPage = () => {
  const { token } = useAuth()
  const role = extractRole(token)
  if (role === 'SUPER_ADMIN') return <SuperAdminDashboardPage />
  return <DashboardHome />
}

export default DashboardEntryPage

