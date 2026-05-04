import { BrowserRouter, Routes, Route } from 'react-router-dom'
import PublicLayout from './layouts/PublicLayout'
import DashboardLayout from './layouts/DashboardLayout'
import ProtectedRoute from './routes/ProtectedRoute'
import RoleRoute from './routes/RoleRoute'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import OtpLoginPage from './pages/auth/OtpLoginPage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'
import TwoFactorVerifyPage from './pages/auth/TwoFactorVerifyPage'
import RestaurantsPage from './pages/dashboard/RestaurantsPage'
import MenuPage from './pages/dashboard/MenuPage'
import MenuInsightsPage from './pages/dashboard/MenuInsightsPage'
import KitchenPage from './pages/dashboard/KitchenPage'
import InventoryPage from './pages/dashboard/InventoryPage'
import RestaurantOnboardingPage from './pages/dashboard/RestaurantOnboardingPage'
import TableManagementPage from './pages/dashboard/TableManagementPage'
import SubscriptionPage from './pages/dashboard/SubscriptionPage'
import PublicMenuPage from './pages/menu/PublicMenuPage'
import OrderConfirmPage from './pages/menu/OrderConfirmPage'
import OrderStatusPage from './pages/menu/OrderStatusPage'
import OrderHistoryPage from './pages/menu/OrderHistoryPage'
import QrScanRedirectPage from './pages/menu/QrScanRedirectPage'
import PrivacyPage from './pages/legal/PrivacyPage'
import TermsPage from './pages/legal/TermsPage'
import ErrorBoundary from './components/ErrorBoundary'
import SectionErrorFallback from './components/SectionErrorFallback'
import NotFoundPage from './pages/NotFoundPage'
import LandingPage from './pages/LandingPage'
import DashboardEntryPage from './pages/dashboard/DashboardEntryPage'
import ReviewsPage from './pages/dashboard/ReviewsPage'
import TicketsPage from './pages/dashboard/TicketsPage'
import WastagePage from './pages/dashboard/WastagePage'
import TwoFactorSetupPage from './pages/dashboard/TwoFactorSetupPage'
import CookieConsentBanner from './components/CookieConsentBanner'
import FinancePage from './pages/dashboard/FinancePage'
import AlertCenterPage from './pages/dashboard/AlertCenterPage'
import StaffInsightsPage from './pages/dashboard/StaffInsightsPage'
import CustomerInsightsPage from './pages/dashboard/CustomerInsightsPage'
import DailyClosingReportPage from './pages/dashboard/DailyClosingReportPage'
import VendorPage from './pages/dashboard/VendorPage'
import MarketingPage from './pages/dashboard/MarketingPage'

function App() {
  const baseUrl = import.meta.env.BASE_URL || '/'
  const basename = baseUrl === '/' ? undefined : baseUrl.replace(/\/$/, '')

  return (
    <ErrorBoundary>
      <BrowserRouter basename={basename}>
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
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/otp-login" element={<OtpLoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/auth/2fa/verify" element={<TwoFactorVerifyPage />} />
            <Route path="/menu/scan/:sourceIdentifier" element={<QrScanRedirectPage />} />
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
            <Route path="/dashboard" element={<DashboardEntryPage />} />
            <Route
              path="/dashboard/restaurants"
              element={
                <RoleRoute allowedRoles={['SUPER_ADMIN']}>
                  <RestaurantsPage />
                </RoleRoute>
              }
            />
            <Route
              path="/dashboard/onboarding"
              element={
                <RoleRoute allowedRoles={['TENANT_ADMIN', 'STAFF']}>
                  <RestaurantOnboardingPage />
                </RoleRoute>
              }
            />
            <Route
              path="/dashboard/menu"
              element={
                <RoleRoute allowedRoles={['TENANT_ADMIN', 'STAFF']}>
                  <MenuPage />
                </RoleRoute>
              }
            />
            <Route
              path="/dashboard/menu-insights"
              element={
                <RoleRoute allowedRoles={['TENANT_ADMIN', 'STAFF']}>
                  <MenuInsightsPage />
                </RoleRoute>
              }
            />
            <Route
              path="/dashboard/kitchen"
              element={
                <RoleRoute allowedRoles={['TENANT_ADMIN', 'STAFF']}>
                  <KitchenPage />
                </RoleRoute>
              }
            />
            <Route
              path="/dashboard/inventory"
              element={
                <RoleRoute allowedRoles={['TENANT_ADMIN', 'STAFF']}>
                  <InventoryPage />
                </RoleRoute>
              }
            />
            <Route
              path="/dashboard/vendors"
              element={
                <RoleRoute allowedRoles={['TENANT_ADMIN']}>
                  <VendorPage />
                </RoleRoute>
              }
            />
            <Route
              path="/dashboard/marketing"
              element={
                <RoleRoute allowedRoles={['TENANT_ADMIN']}>
                  <MarketingPage />
                </RoleRoute>
              }
            />
            <Route
              path="/dashboard/wastage"
              element={
                <RoleRoute allowedRoles={['TENANT_ADMIN', 'STAFF']}>
                  <WastagePage />
                </RoleRoute>
              }
            />
            <Route
              path="/dashboard/finance"
              element={
                <RoleRoute allowedRoles={['TENANT_ADMIN', 'STAFF']}>
                  <FinancePage />
                </RoleRoute>
              }
            />
            <Route
              path="/dashboard/alerts"
              element={
                <RoleRoute allowedRoles={['TENANT_ADMIN', 'STAFF']}>
                  <AlertCenterPage />
                </RoleRoute>
              }
            />
            <Route
              path="/dashboard/staff"
              element={
                <RoleRoute allowedRoles={['TENANT_ADMIN', 'STAFF']}>
                  <StaffInsightsPage />
                </RoleRoute>
              }
            />
            <Route
              path="/dashboard/customers"
              element={
                <RoleRoute allowedRoles={['TENANT_ADMIN', 'STAFF']}>
                  <CustomerInsightsPage />
                </RoleRoute>
              }
            />
            <Route
              path="/dashboard/closing-report"
              element={
                <RoleRoute allowedRoles={['TENANT_ADMIN', 'STAFF']}>
                  <DailyClosingReportPage />
                </RoleRoute>
              }
            />
            <Route
              path="/dashboard/security/2fa"
              element={
                <RoleRoute allowedRoles={['SUPER_ADMIN', 'TENANT_ADMIN', 'STAFF']}>
                  <TwoFactorSetupPage />
                </RoleRoute>
              }
            />
            <Route
              path="/dashboard/subscription"
              element={
                <RoleRoute allowedRoles={['TENANT_ADMIN', 'STAFF']}>
                  <SubscriptionPage />
                </RoleRoute>
              }
            />
            <Route
              path="/dashboard/tables"
              element={
                <RoleRoute allowedRoles={['TENANT_ADMIN', 'STAFF']}>
                  <TableManagementPage />
                </RoleRoute>
              }
            />
            <Route
              path="/dashboard/reviews"
              element={
                <RoleRoute allowedRoles={['SUPER_ADMIN', 'TENANT_ADMIN', 'STAFF']}>
                  <ReviewsPage />
                </RoleRoute>
              }
            />
            <Route
              path="/dashboard/tickets"
              element={
                <RoleRoute allowedRoles={['SUPER_ADMIN', 'TENANT_ADMIN', 'STAFF']}>
                  <TicketsPage />
                </RoleRoute>
              }
            />
          </Route>

          {/* 404 route */}
          <Route path="*" element={<NotFoundPage />} />

        </Routes>
      </BrowserRouter>
      <CookieConsentBanner />
    </ErrorBoundary>
  )
}

export default App