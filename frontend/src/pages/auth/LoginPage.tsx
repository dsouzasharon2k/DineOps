import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { loginApi } from '../../api/auth'
import { useAuth } from '../../context/AuthContext'
import { getApiErrorMessage } from '../../api/error'

const LoginPage = () => {
  // State for form fields and error message
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const navigate = useNavigate()
  const { login } = useAuth()

  const [showPassword, setShowPassword] = useState(false)
  
  const handleLogin = async () => {
    setError('')
    setLoading(true)
    try {
      // Call the backend login API
      const data = await loginApi(email, password)

      // Store the JWT token in localStorage
      // This token will be attached to all future API requests by axiosInstance
      login(data.token)

      // Redirect to dashboard after successful login
      navigate('/dashboard')
    } catch (err) {
      setError(getApiErrorMessage(err, 'Login failed. Please try again.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    // Login page controls its own centering so other public pages can be full-width.
    <div className="min-h-screen flex items-center justify-center px-4 py-10">

      {/* Card */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-md p-8">

        {/* Logo / Title */}
        <h1 className="text-3xl font-bold text-orange-500 text-center mb-1">
          DineOps
        </h1>
        <p className="text-center text-gray-500 text-sm mb-6">
          Restaurant Management Platform
        </p>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 text-red-600 text-sm px-4 py-2 rounded-lg mb-4">
            {error}
          </div>
        )}

        {/* Email field */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="sharon@dineops.com"
            className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>

        {/* Password field */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 pr-10"
            />
            {/* Toggle password visibility */}
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-2 text-gray-400 hover:text-gray-600 text-sm"
            >
              {showPassword ? '🙈' : '👁️'}
            </button>
          </div>
        </div>

        {/* Login button */}
        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 rounded-lg transition disabled:opacity-50"
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>

        <p className="mt-4 text-center text-xs text-gray-500">
          By continuing, you agree to our{' '}
          <Link to="/terms" className="text-orange-600 hover:underline">Terms</Link>{' '}
          and{' '}
          <Link to="/privacy" className="text-orange-600 hover:underline">Privacy Policy</Link>.
        </p>

      </div>
    </div>
  )
}

export default LoginPage