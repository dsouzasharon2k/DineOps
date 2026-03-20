import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// This component wraps any route that requires the user to be logged in.
// If there's no token in localStorage, redirect to login page instead.
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

export default ProtectedRoute