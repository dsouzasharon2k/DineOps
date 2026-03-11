import { Navigate } from 'react-router-dom'

// This component wraps any route that requires the user to be logged in.
// If there's no token in localStorage, redirect to login page instead.
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem('token')

  if (!token) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

export default ProtectedRoute