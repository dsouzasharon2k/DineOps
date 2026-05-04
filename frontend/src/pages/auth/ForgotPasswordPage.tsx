import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { forgotPasswordApi, resetPasswordApi } from '../../api/auth'
import { getApiErrorMessage } from '../../api/error'
import ToastMessage from '../../components/ToastMessage'

const ForgotPasswordPage = () => {
  const navigate = useNavigate()
  const [identifier, setIdentifier] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  const sendOtp = async () => {
    setError('')
    setSuccess('')
    setLoading(true)
    try {
      const data = await forgotPasswordApi(identifier)
      setOtpSent(true)
      setSuccess(data?.message ?? 'If an account exists, an OTP has been sent.')
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to send reset OTP. Please try again.'))
    } finally {
      setLoading(false)
    }
  }

  const resendOtp = async () => {
    setOtp('')
    setNewPassword('')
    setOtpSent(false)
    await sendOtp()
  }

  const resetPassword = async () => {
    setError('')
    setSuccess('')
    setLoading(true)
    try {
      const data = await resetPasswordApi(identifier, otp, newPassword)
      setSuccess(data?.message ?? 'Password reset successfully.')
      setTimeout(() => navigate('/login'), 2000)
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to reset password. Check your OTP and try again.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gray-100 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-md border border-gray-100">

        {/* Brand */}
        <div className="flex items-center justify-center gap-2.5 mb-6">
          <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 11l19-9-9 19-2-8-8-2z" />
            </svg>
          </div>
          <span className="text-gray-900 font-bold text-xl tracking-tight">PlatterOps</span>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-1 text-center">Reset password</h1>
        <p className="text-gray-500 text-sm mb-6 text-center">
          {!otpSent
            ? 'Enter your email or phone to receive a reset OTP.'
            : 'Enter the OTP sent to your contact and choose a new password.'}
        </p>

        {error && <ToastMessage message={error} variant="error" onClose={() => setError('')} />}
        {success && <ToastMessage message={success} variant="success" onClose={() => setSuccess('')} />}

        {/* Step 1 — Identifier */}
        <div className="mb-4">
          <label htmlFor="identifier" className="block text-sm font-medium text-gray-700 mb-1">Email or phone</label>
          <input
            id="identifier"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="you@example.com or +91 98765 43210"
            disabled={otpSent}
            className="w-full border border-gray-300 text-gray-900 placeholder-gray-400 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 disabled:bg-gray-50 disabled:text-gray-400"
          />
        </div>

        {/* Step 2 — OTP + new password */}
        {otpSent && (
          <>
            <div className="mb-4">
              <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-1">6-digit OTP</label>
              <input
                id="otp"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="123456"
                maxLength={6}
                inputMode="numeric"
                className="w-full border border-gray-300 text-gray-900 placeholder-gray-400 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 tracking-widest"
              />
            </div>
            <div className="mb-6">
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">New password</label>
              <div className="relative">
                <input
                  id="newPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  className="w-full border border-gray-300 text-gray-900 placeholder-gray-400 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                >
                  {showPassword ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </>
        )}

        {/* Primary action */}
        {!otpSent ? (
          <button
            type="button"
            onClick={sendOtp}
            disabled={loading || !identifier.trim()}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2.5 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Sending OTP…
              </span>
            ) : (
              'Send OTP'
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={resetPassword}
            disabled={loading || !otp.trim() || newPassword.length < 8}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2.5 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Resetting…
              </span>
            ) : (
              'Reset password'
            )}
          </button>
        )}

        <div className="mt-4 flex items-center justify-center gap-3 text-xs text-gray-500">
          {otpSent && (
            <>
              <button
                type="button"
                onClick={resendOtp}
                disabled={loading}
                className="text-orange-600 hover:underline disabled:opacity-50"
              >
                Resend OTP
              </button>
              <span className="text-gray-300">·</span>
            </>
          )}
          <Link to="/login" className="text-orange-600 hover:underline">Back to sign in</Link>
        </div>
      </div>
    </main>
  )
}

export default ForgotPasswordPage
