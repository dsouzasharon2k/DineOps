import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import PublicLayout from './layouts/PublicLayout'
import DashboardLayout from './layouts/DashboardLayout'
import ProtectedRoute from './routes/ProtectedRoute'
import LoginPage from './pages/auth/LoginPage'
import DashboardHome from './pages/dashboard/DashboardHome'
import RestaurantsPage from './pages/dashboard/RestaurantsPage'
import MenuPage from './pages/dashboard/MenuPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Public routes - no login required */}
        <Route element={<PublicLayout />}>
          <Route path="/login" element={<LoginPage />} />
        </Route>

        {/* Protected routes - login required */}
        <Route
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardHome />} />
          <Route path="/dashboard/restaurants" element={<RestaurantsPage />} />
          <Route path="/dashboard/menu" element={<MenuPage />} />
          </Route>

        {/* Default redirect */}
        <Route path="*" element={<Navigate to="/login" replace />} />

      </Routes>
    </BrowserRouter>
  )
}

export default App