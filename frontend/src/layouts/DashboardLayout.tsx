import { useEffect, useMemo, useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../i18n/I18nProvider'
import { getUnreadAlertsCountApi } from '../api/alerts'

const NAV_MAIN_TENANT = [
  { to: '/dashboard', labelKey: 'nav.dashboard', icon: 'home', end: true },
  { to: '/dashboard/kitchen', labelKey: 'nav.kitchen', icon: 'kitchen' },
  { to: '/dashboard/menu', labelKey: 'nav.menu', icon: 'menu' },
  { to: '/dashboard/menu-insights', labelKey: 'nav.menuInsights', icon: 'insights' },
  { to: '/dashboard/inventory', labelKey: 'nav.inventory', icon: 'inventory' },
  { to: '/dashboard/vendors', labelKey: 'nav.vendors', icon: 'vendors' },
  { to: '/dashboard/wastage', labelKey: 'nav.wastage', icon: 'wastage' },
  { to: '/dashboard/finance', labelKey: 'nav.finance', icon: 'finance' },
  { to: '/dashboard/staff', labelKey: 'nav.staff', icon: 'staff' },
  { to: '/dashboard/customers', labelKey: 'nav.customers', icon: 'customers' },
  { to: '/dashboard/marketing', labelKey: 'nav.marketing', icon: 'marketing' },
  { to: '/dashboard/alerts', labelKey: 'nav.alerts', icon: 'alerts' },
  { to: '/dashboard/reviews', labelKey: 'nav.reviews', icon: 'reviews' },
  { to: '/dashboard/tickets', labelKey: 'nav.tickets', icon: 'tickets' },
]

const NAV_MAIN_SUPER_ADMIN = [
  { to: '/dashboard', labelKey: 'nav.dashboard', icon: 'home', end: true },
  { to: '/dashboard/restaurants', labelKey: 'nav.restaurants', icon: 'menu' },
  { to: '/dashboard/tickets', labelKey: 'nav.tickets', icon: 'tickets' },
  { to: '/dashboard/reviews', labelKey: 'nav.reviews', icon: 'reviews' },
]

const NAV_SETTINGS_TENANT = [
  { to: '/dashboard/closing-report', labelKey: 'nav.closingReport', icon: 'report' },
  { to: '/dashboard/tables', labelKey: 'nav.tables', icon: 'tables' },
  { to: '/dashboard/subscription', labelKey: 'nav.subscription', icon: 'subscription' },
  { to: '/dashboard/security/2fa', labelKey: 'nav.security2fa', icon: 'security' },
]

const NavIcon = ({ icon }: { icon: string }) => {
  switch (icon) {
    case 'home':
      return <path d="M3 10L12 3l9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V10z" />
    case 'menu':
      return <path d="M4 6h16M4 12h16M4 18h16" />
    case 'insights':
      return <path d="M4 18h16M7 14l3-3 3 2 4-5" />
    case 'alerts':
      return <path d="M12 3l9 16H3l9-16zm0 6v4m0 3h.01" />
    case 'kitchen':
      return <path d="M7 3v7M11 3v7M3 10h12M17 3v18M21 7h-4" />
    case 'inventory':
      return <path d="M3 7l9-4 9 4-9 4-9-4zm0 5l9 4 9-4m-18 5l9 4 9-4" />
    case 'finance':
      return <path d="M4 18h16M7 15v-4m5 4V7m5 8v-2" />
    case 'wastage':
      return <path d="M6 7h12l-1 13H7L6 7zm3-3h6l1 3H8l1-3z" />
    case 'reviews':
      return <path d="M12 2l3 6 6 .8-4.5 4.3 1 6.1L12 16l-5.5 3.2 1-6.1L3 8.8 9 8z" />
    case 'tickets':
      return <path d="M4 9V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4a2 2 0 0 0 0 6v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-4a2 2 0 0 0 0-6z" />
    case 'tables':
      return <path d="M4 10h16M8 10V6h8v4M9 10v8m6-8v8" />
    case 'subscription':
      return <path d="M12 2v20M2 12h20" />
    case 'security':
      return <path d="M12 2l8 4v6c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6l8-4zm0 7a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
    case 'report':
      return <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8" />
    case 'staff':
      return <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm10 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm4 10v-2a4 4 0 0 0-3-3.87" />
    case 'customers':
      return <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm6 8v-2a3 3 0 0 0-2.12-2.88" />
    case 'vendors':
      return <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9zM9 22V12h6v10" />
    case 'marketing':
      return <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.77 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.72 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.64a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 15.92z" />
    default:
      return <circle cx="12" cy="12" r="8" />
  }
}

const DashboardLayout = () => {
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [unreadAlertsCount, setUnreadAlertsCount] = useState(0)
  const { logout, token } = useAuth()
  const { locale, setLocale, t } = useI18n()

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

  useEffect(() => {
    if (!user.tenantId || isSuperAdmin) {
      setUnreadAlertsCount(0)
      return
    }

    let active = true
    const loadUnreadCount = async () => {
      try {
        const response = await getUnreadAlertsCountApi(user.tenantId!)
        if (active) {
          setUnreadAlertsCount(response.unreadCount)
        }
      } catch {
        if (active) {
          setUnreadAlertsCount(0)
        }
      }
    }

    void loadUnreadCount()
    const intervalId = window.setInterval(() => {
      void loadUnreadCount()
    }, 30000)

    return () => {
      active = false
      window.clearInterval(intervalId)
    }
  }, [isSuperAdmin, user.tenantId])

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `relative flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
      isActive
        ? 'text-orange-600 bg-orange-50 font-medium before:absolute before:left-0 before:top-1 before:bottom-1 before:w-0.5 before:rounded-full before:bg-orange-500'
        : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
    }`

  const NavGroup = ({ label, links }: { label: string; links: { to: string; labelKey: string; icon: string; end?: boolean }[] }) => (
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
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <NavIcon icon={link.icon} />
          </svg>
          <span className="flex-1 truncate">{t(link.labelKey)}</span>
          {link.icon === 'alerts' && unreadAlertsCount > 0 && (
            <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
              {unreadAlertsCount > 99 ? '99+' : unreadAlertsCount}
            </span>
          )}
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
              {t('common.openCustomerMenu')}
            </NavLink>
          )}
          <select
            value={locale}
            onChange={(event) => setLocale(event.target.value as 'en' | 'hi')}
            className="rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-600"
            aria-label="Language selector"
          >
            <option value="en">EN</option>
            <option value="hi">HI</option>
          </select>
          <button
            onClick={handleLogout}
            className="text-xs text-gray-400 hover:text-gray-700 transition px-2 py-1 rounded hover:bg-gray-100"
          >
            {t('common.signOut')}
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
            <NavGroup label={t('nav.main')} links={navMain} />
            {navSettings.length > 0 && <NavGroup label={t('nav.settings')} links={navSettings} />}
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
