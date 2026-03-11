import { Outlet, NavLink, useNavigate } from 'react-router-dom'

// DashboardLayout is the main shell for authenticated users.
// It has a top navbar and a sidebar on desktop, collapsing on mobile.
const DashboardLayout = () => {
  const navigate = useNavigate()

  const handleLogout = () => {
    // Remove the JWT token and redirect to login
    localStorage.removeItem('token')
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-100">

      {/* Top Navbar */}
      <nav className="bg-white shadow-sm px-4 py-3 flex items-center justify-between">
        <span className="text-xl font-bold text-orange-500">DineOps</span>
        <button
          onClick={handleLogout}
          className="text-sm text-gray-600 hover:text-red-500 transition"
        >
          Logout
        </button>
      </nav>

      <div className="flex">

        {/* Sidebar - hidden on mobile, visible on md+ screens */}
        <aside className="hidden md:flex flex-col w-56 min-h-screen bg-white shadow-sm p-4 gap-2">
          <NavLink
            to="/dashboard/restaurants"
            className={({ isActive }) =>
              `px-3 py-2 rounded-md text-sm font-medium transition ${
                isActive
                  ? 'bg-orange-500 text-white'
                  : 'text-gray-700 hover:bg-orange-50'
              }`
            }
          >
            Restaurants
          </NavLink>
        </aside>

        {/* Main content area - Outlet renders the current page */}
        <main className="flex-1 p-4 md:p-8">
          <Outlet />
        </main>

      </div>
    </div>
  )
}

export default DashboardLayout