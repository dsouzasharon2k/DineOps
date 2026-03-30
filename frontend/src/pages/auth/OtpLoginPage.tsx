import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { otpLoginApi, sendOtpApi } from '../../api/auth'
import { useAuth } from '../../context/AuthContext'
import { getApiErrorMessage } from '../../api/error'

const OtpLoginPage = () => {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSendOtp = async () => {
    setError('')
    setLoading(true)
    try {
      await sendOtpApi(phone)
      setOtpSent(true)
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to send OTP.'))
    } finally {
      setLoading(false)
    }
  }

  const handleOtpLogin = async () => {
    setError('')
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
      setError(getApiErrorMessage(err, 'Invalid OTP.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gray-100 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-md border border-gray-100">
        <h1 className="text-2xl font-bold text-gray-900 mb-1 text-center">OTP Login</h1>
        <p className="text-gray-500 text-sm mb-6 text-center">Customers can sign in with mobile OTP.</p>
        {error && <p className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm mb-3" />
        {otpSent && (
          <input value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="6-digit OTP" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm mb-3" />
        )}
        {!otpSent ? (
          <button onClick={handleSendOtp} disabled={loading || !phone.trim()} className="w-full bg-orange-500 text-white font-semibold py-2.5 rounded-lg disabled:opacity-50">
            {loading ? 'Sending OTP...' : 'Send OTP'}
          </button>
        ) : (
          <button onClick={handleOtpLogin} disabled={loading || !otp.trim()} className="w-full bg-orange-500 text-white font-semibold py-2.5 rounded-lg disabled:opacity-50">
            {loading ? 'Signing in...' : 'Verify & Sign in'}
          </button>
        )}
        <p className="mt-4 text-center text-xs text-gray-500">
          Admin/Staff login? <Link to="/login" className="text-orange-600 hover:underline">Email login</Link>
        </p>
      </div>
    </main>
  )
}

export default OtpLoginPage
