import { Outlet } from 'react-router-dom'

// PublicLayout is used for pages that don't require login (e.g. login page)
// It's a simple centered layout with a background
const PublicLayout = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      {/* Outlet renders the child route component (e.g. LoginPage) */}
      <Outlet />
    </div>
  )
}

export default PublicLayout