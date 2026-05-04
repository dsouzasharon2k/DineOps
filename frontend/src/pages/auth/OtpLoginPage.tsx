import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { otpLoginApi, sendOtpApi } from '../../api/auth'
import { useAuth } from '../../context/AuthContext'
import { getApiErrorMessage } from '../../api/error'
import ToastMessage from '../../components/ToastMessage'

const OtpLoginPage = () => {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  const handleSendOtp = async () => {
    setError('')
    setInfo('')
    setLoading(true)
    try {
      await sendOtpApi(phone)
      setOtpSent(true)
      setInfo('OTP sent! Check your phone.')
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to send OTP. Please check your number and try again.'))
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setOtp('')
    setOtpSent(false)
    await handleSendOtp()
  }

  const handleOtpLogin = async () => {
    setError('')
    setInfo('')
    setLoading(true)
    try {
      const data = await otpLoginApi(phone, otp)
      if (data.token) {
        login(data.token)
        navigate('/dashboard')
      } else {
        setError('Unable to login with OTP.')
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Invalid or expired OTP. Please try again.'))
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

        <h1 className="text-2xl font-bold text-gray-900 mb-1 text-center">Sign in with OTP</h1>
        <p className="text-gray-500 text-sm mb-6 text-center">
          {!otpSent
            ? 'Enter your registered phone number to receive a one-time code.'
            : 'Enter the 6-digit code sent to your phone.'}
        </p>

        {error && <ToastMessage message={error} variant="error" onClose={() => setError('')} />}
        {info && <ToastMessage message={info} variant="success" onClose={() => setInfo('')} />}

        {/* Phone number */}
        <div className="mb-4">
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">Phone number</label>
          <input
            id="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            type="tel"
            placeholder="+91 98765 43210"
            disabled={otpSent}
            inputMode="tel"
            autoComplete="tel"
            className="w-full border border-gray-300 text-gray-900 placeholder-gray-400 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 disabled:bg-gray-50 disabled:text-gray-400"
          />
        </div>

        {/* OTP input (appears after send) */}
        {otpSent && (
          <div className="mb-6">
            <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-1">One-time code</label>
            <input
              id="otp"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="123456"
              maxLength={6}
              inputMode="numeric"
              autoComplete="one-time-code"
              className="w-full border border-gray-300 text-gray-900 placeholder-gray-400 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 tracking-widest text-center text-lg font-semibold"
            />
          </div>
        )}

        {/* Primary action button */}
        {!otpSent ? (
          <button
            type="button"
            onClick={handleSendOtp}
            disabled={loading || !phone.trim()}
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
            onClick={handleOtpLogin}
            disabled={loading || otp.trim().length < 6}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2.5 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Signing in…
              </span>
            ) : (
              'Verify & Sign in'
            )}
          </button>
        )}

        <div className="mt-4 flex items-center justify-center gap-3 text-xs text-gray-500">
          {otpSent && (
            <>
              <button
                type="button"
                onClick={handleResend}
                disabled={loading}
                className="text-orange-600 hover:underline disabled:opacity-50"
              >
                Resend OTP
              </button>
              <span className="text-gray-300">·</span>
            </>
          )}
          <Link to="/login" className="text-orange-600 hover:underline">Email login</Link>
          <span className="text-gray-300">·</span>
          <Link to="/register" className="text-orange-600 hover:underline">Register</Link>
        </div>
      </div>
    </main>
  )
}

export default OtpLoginPage
