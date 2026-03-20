import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const DashboardLayout = () => {
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { logout } = useAuth()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const navLinks = [
    { to: '/dashboard/restaurants', label: '🏠 Restaurants' },
    { to: '/dashboard/menu', label: '🍽️ Menu' },
    { to: '/dashboard/kitchen', label: '👨‍🍳 Kitchen' },
    { to: '/dashboard/tables', label: '🪑 Tables' },
  ]

  return (
    <div className="min-h-screen bg-gray-100">

      {/* Top Navbar */}
      <nav className="bg-white shadow-sm px-4 py-3 flex items-center justify-between fixed top-0 left-0 right-0 z-30">
        {/* Hamburger button - visible on small screens */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="md:hidden text-gray-600 hover:text-orange-500 transition"
        >
          {sidebarOpen ? (
            <span className="text-2xl">✕</span>
          ) : (
            <span className="text-2xl">☰</span>
          )}
        </button>

        <span className="text-xl font-bold text-orange-500">DineOps</span>

        <button
          onClick={handleLogout}
          className="text-sm text-gray-600 hover:text-red-500 transition"
        >
          Logout
        </button>
      </nav>

      {/* Overlay - closes sidebar when clicking outside on mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-30 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex pt-14">

        {/* Sidebar */}
        <aside
          className={`
            fixed top-14 left-0 h-full w-56 bg-white shadow-sm z-20 p-4 flex flex-col gap-2
            transform transition-transform duration-200
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            md:translate-x-0 md:static md:flex
          `}
        >
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `px-3 py-2 rounded-md text-sm font-medium transition ${
                  isActive
                    ? 'bg-orange-500 text-white'
                    : 'text-gray-700 hover:bg-orange-50'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </aside>

        {/* Main content */}
        <main className="flex-1 p-4 md:p-8 min-h-screen">
          <Outlet />
        </main>

      </div>
    </div>
  )
}

export default DashboardLayout