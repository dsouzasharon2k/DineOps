import { BrowserRouter, Routes, Route } from 'react-router-dom'
import PublicLayout from './layouts/PublicLayout'
import DashboardLayout from './layouts/DashboardLayout'
import ProtectedRoute from './routes/ProtectedRoute'
import LoginPage from './pages/auth/LoginPage'
import DashboardHome from './pages/dashboard/DashboardHome'
import RestaurantsPage from './pages/dashboard/RestaurantsPage'
import MenuPage from './pages/dashboard/MenuPage'
import KitchenPage from './pages/dashboard/KitchenPage'
import InventoryPage from './pages/dashboard/InventoryPage'
import RestaurantOnboardingPage from './pages/dashboard/RestaurantOnboardingPage'
import TableManagementPage from './pages/dashboard/TableManagementPage'
import SubscriptionPage from './pages/dashboard/SubscriptionPage'
import PublicMenuPage from './pages/menu/PublicMenuPage'
import OrderConfirmPage from './pages/menu/OrderConfirmPage'
import OrderStatusPage from './pages/menu/OrderStatusPage'
import OrderHistoryPage from './pages/menu/OrderHistoryPage'
import PrivacyPage from './pages/legal/PrivacyPage'
import TermsPage from './pages/legal/TermsPage'
import ErrorBoundary from './components/ErrorBoundary'
import SectionErrorFallback from './components/SectionErrorFallback'
import NotFoundPage from './pages/NotFoundPage'

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>

          {/* Public routes - no login required */}
          <Route
            element={
              <ErrorBoundary
                fallback={
                  <SectionErrorFallback
                    title="Public page unavailable"
                    description="Please refresh and try again."
                  />
                }
              >
                <PublicLayout />
              </ErrorBoundary>
            }
          >
            <Route path="/login" element={<LoginPage />} />
            <Route path="/menu/:tenantId" element={<PublicMenuPage />} />
            <Route path="/menu/:tenantId/confirm" element={<OrderConfirmPage />} />
            <Route path="/menu/:tenantId/order/:orderId" element={<OrderStatusPage />} />
            <Route path="/menu/:tenantId/track" element={<OrderHistoryPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />
          </Route>

          {/* Protected routes - login required */}
          <Route
            element={
              <ErrorBoundary
                fallback={
                  <SectionErrorFallback
                    title="Dashboard temporarily unavailable"
                    description="Please reload and sign in again if needed."
                  />
                }
              >
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              </ErrorBoundary>
            }
          >
            <Route path="/dashboard" element={<DashboardHome />} />
            <Route path="/dashboard/restaurants" element={<RestaurantsPage />} />
            <Route path="/dashboard/onboarding" element={<RestaurantOnboardingPage />} />
            <Route path="/dashboard/menu" element={<MenuPage />} />
            <Route path="/dashboard/kitchen" element={<KitchenPage />} />
            <Route path="/dashboard/inventory" element={<InventoryPage />} />
            <Route path="/dashboard/subscription" element={<SubscriptionPage />} />
            <Route path="/dashboard/tables" element={<TableManagementPage />} />
          </Route>

          {/* 404 route */}
          <Route path="*" element={<NotFoundPage />} />

        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App