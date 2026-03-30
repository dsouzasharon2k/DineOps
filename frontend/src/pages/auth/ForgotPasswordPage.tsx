import { useState } from 'react'
import { Link } from 'react-router-dom'
import { forgotPasswordApi, resetPasswordApi } from '../../api/auth'
import { getApiErrorMessage } from '../../api/error'

const ForgotPasswordPage = () => {
  const [identifier, setIdentifier] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const sendOtp = async () => {
    setError('')
    setMessage('')
    setLoading(true)
    try {
      const data = await forgotPasswordApi(identifier)
      setOtpSent(true)
      setMessage(data?.message ?? 'If an account exists, an OTP has been sent.')
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to send reset OTP.'))
    } finally {
      setLoading(false)
    }
  }

  const resetPassword = async () => {
    setError('')
    setMessage('')
    setLoading(true)
    try {
      const data = await resetPasswordApi(identifier, otp, newPassword)
      setMessage(data?.message ?? 'Password reset successfully.')
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to reset password.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gray-100 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-md border border-gray-100">
        <h1 className="text-2xl font-bold text-gray-900 mb-1 text-center">Forgot password</h1>
        <p className="text-gray-500 text-sm mb-6 text-center">Reset using OTP sent to phone/email.</p>
        {error && <p className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        {message && <p className="mb-3 rounded bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>}
        <input value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="Email or phone" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm mb-3" />
        {otpSent && (
          <>
            <input value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="OTP" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm mb-3" />
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New password" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm mb-3" />
          </>
        )}
        {!otpSent ? (
          <button onClick={sendOtp} disabled={loading || !identifier.trim()} className="w-full bg-orange-500 text-white font-semibold py-2.5 rounded-lg disabled:opacity-50">
            {loading ? 'Sending OTP...' : 'Send OTP'}
          </button>
        ) : (
          <button onClick={resetPassword} disabled={loading || !otp.trim() || !newPassword} className="w-full bg-orange-500 text-white font-semibold py-2.5 rounded-lg disabled:opacity-50">
            {loading ? 'Resetting...' : 'Reset password'}
          </button>
        )}
        <p className="mt-4 text-center text-xs text-gray-500">
          Back to <Link to="/login" className="text-orange-600 hover:underline">Sign in</Link>
        </p>
      </div>
    </main>
  )
}

export default ForgotPasswordPage
