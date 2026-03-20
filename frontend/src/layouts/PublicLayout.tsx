import { Outlet } from 'react-router-dom'

// PublicLayout is used for pages that don't require login (e.g. login page)
// Child pages control their own layout behavior.
const PublicLayout = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Outlet renders the child route component (e.g. LoginPage) */}
      <Outlet />
    </div>
  )
}

export default PublicLayout