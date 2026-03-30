import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { verify2faApi } from '../../api/auth'
import { useAuth } from '../../context/AuthContext'
import { getApiErrorMessage } from '../../api/error'

const TwoFactorVerifyPage = () => {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const tempToken = sessionStorage.getItem('dineops_temp_2fa_token')

  const submit = async () => {
    if (!tempToken) {
      setError('2FA session expired. Please login again.')
      return
    }
    setError('')
    setLoading(true)
    try {
      const data = await verify2faApi(tempToken, Number(code))
      if (!data.token) {
        setError('2FA verification failed.')
        return
      }
      sessionStorage.removeItem('dineops_temp_2fa_token')
      login(data.token)
      navigate('/dashboard')
    } catch (err) {
      setError(getApiErrorMessage(err, 'Invalid 2FA code.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gray-100 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-md border border-gray-100">
        <h1 className="text-2xl font-bold text-gray-900 mb-1 text-center">2FA verification</h1>
        <p className="text-gray-500 text-sm mb-6 text-center">Enter the TOTP code from your authenticator app.</p>
        {error && <p className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="6-digit code" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm mb-3" />
        <button onClick={submit} disabled={loading || !code.trim()} className="w-full bg-orange-500 text-white font-semibold py-2.5 rounded-lg disabled:opacity-50">
          {loading ? 'Verifying...' : 'Verify & sign in'}
        </button>
      </div>
    </main>
  )
}

export default TwoFactorVerifyPage
