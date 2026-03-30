import { useMemo, useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const NAV_MAIN_TENANT = [
  { to: '/dashboard', label: 'Dashboard', end: true },
  { to: '/dashboard/menu', label: 'Menu' },
  { to: '/dashboard/kitchen', label: 'Kitchen' },
  { to: '/dashboard/inventory', label: 'Inventory' },
  { to: '/dashboard/reviews', label: 'Reviews' },
  { to: '/dashboard/tickets', label: 'Issues / Tickets' },
]

const NAV_MAIN_SUPER_ADMIN = [
  { to: '/dashboard', label: 'Platform Overview', end: true },
  { to: '/dashboard/restaurants', label: 'Restaurants' },
  { to: '/dashboard/tickets', label: 'Issues / Tickets' },
  { to: '/dashboard/reviews', label: 'Reviews' },
]

const NAV_SETTINGS_TENANT = [
  { to: '/dashboard/tables', label: 'Tables' },
  { to: '/dashboard/subscription', label: 'Subscription' },
]

const DashboardLayout = () => {
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { logout, token } = useAuth()

  const getUserInfo = () => {
    if (!token) return { name: 'User', role: 'STAFF', tenantId: null as string | null }
    try {
      const payload = JSON.parse(atob(token.split('.')[1])) as { sub?: string; role?: string; tenantId?: string }
      const email = payload.sub ?? ''
      const role = (payload.role ?? 'STAFF').replace('_', ' ')
      const nameGuess = email.includes('@') ? email.split('@')[0] : email
      const displayName = nameGuess
        .split(/[.\-_]/g)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ')
      return { name: displayName || 'User', role, tenantId: payload.tenantId ?? null }
    } catch {
      return { name: 'User', role: 'STAFF', tenantId: null as string | null }
    }
  }
  const user = getUserInfo()
  const isSuperAdmin = useMemo(() => user.role.toUpperCase().includes('SUPER ADMIN'), [user.role])
  const navMain = isSuperAdmin ? NAV_MAIN_SUPER_ADMIN : NAV_MAIN_TENANT
  const navSettings = isSuperAdmin ? [] : NAV_SETTINGS_TENANT
  const customerMenuUrl = user.tenantId ? `/menu/${user.tenantId}` : null

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `relative flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
      isActive
        ? 'text-orange-600 bg-orange-50 font-medium before:absolute before:left-0 before:top-1 before:bottom-1 before:w-0.5 before:rounded-full before:bg-orange-500'
        : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
    }`

  const NavGroup = ({ label, links }: { label: string; links: { to: string; label: string; end?: boolean }[] }) => (
    <div className="mb-4">
      <p className="px-3 mb-1 text-[10px] font-semibold tracking-widest text-gray-400 uppercase">
        {label}
      </p>
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.end ?? false}
          onClick={() => setSidebarOpen(false)}
          className={linkClass}
        >
          {link.label}
        </NavLink>
      ))}
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Top bar */}
      <header className="fixed top-0 inset-x-0 z-30 h-12 bg-white border-b border-gray-100 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="md:hidden text-gray-400 hover:text-gray-600 transition"
            aria-label="Toggle menu"
          >
            {sidebarOpen ? '✕' : '☰'}
          </button>
          <NavLink to="/dashboard" className="flex items-center gap-2">
            <span className="w-1.5 h-5 rounded-sm bg-orange-500 inline-block" />
            <span className="text-sm font-bold text-gray-900 tracking-tight">PlatterOps</span>
          </NavLink>
        </div>
        <div className="flex items-center gap-2">
          {!isSuperAdmin && customerMenuUrl && (
            <NavLink
              to={customerMenuUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs bg-orange-500 text-white hover:bg-orange-600 transition px-2.5 py-1.5 rounded"
            >
              Open Customer Menu
            </NavLink>
          )}
          <button
            onClick={handleLogout}
            className="text-xs text-gray-400 hover:text-gray-700 transition px-2 py-1 rounded hover:bg-gray-100"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex pt-12">

        {/* Sidebar */}
        <aside
          className={`
            fixed top-12 left-0 h-[calc(100vh-3rem)] w-52 bg-white border-r border-gray-100 z-20
            flex flex-col
            transform transition-transform duration-200
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            md:translate-x-0 md:sticky md:top-12 md:flex
          `}
        >
          <nav className="flex-1 overflow-y-auto p-3 pt-4">
            <NavGroup label="Main" links={navMain} />
            {navSettings.length > 0 && <NavGroup label="Settings" links={navSettings} />}
          </nav>

          {/* User identity block */}
          <div className="border-t border-gray-100 p-3 flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center text-xs font-semibold text-orange-600 shrink-0">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-gray-800 truncate">{user.name}</p>
              <p className="text-[10px] text-gray-400">{user.role}</p>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-h-[calc(100vh-3rem)] p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default DashboardLayout
