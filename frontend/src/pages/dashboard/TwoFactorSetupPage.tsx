import { useState } from 'react'
import { enable2faApi, setup2faApi } from '../../api/auth'
import { useAuth } from '../../context/AuthContext'
import { getApiErrorMessage } from '../../api/error'

const TwoFactorSetupPage = () => {
  const { token } = useAuth()
  const [secret, setSecret] = useState('')
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const [code, setCode] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const generate = async () => {
    if (!token) return
    setError('')
    setMessage('')
    setLoading(true)
    try {
      const data = await setup2faApi(token)
      setSecret(data.secret)
      setQrCodeUrl(data.qrCodeUrl)
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to initialize 2FA.'))
    } finally {
      setLoading(false)
    }
  }

  const enable = async () => {
    if (!token || !secret) return
    setError('')
    setMessage('')
    setLoading(true)
    try {
      await enable2faApi(token, secret, Number(code))
      setMessage('2FA enabled successfully.')
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to enable 2FA.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Two-Factor Authentication</h1>
      <p className="text-sm text-gray-500 mb-4">Secure admin/staff accounts with TOTP.</p>
      {error && <p className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      {message && <p className="mb-3 rounded bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>}
      <button onClick={generate} disabled={loading || !token} className="rounded bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50">
        {loading ? 'Generating...' : 'Generate 2FA secret'}
      </button>
      {secret && (
        <div className="mt-4 rounded-xl bg-white p-4 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500 mb-2">Scan in authenticator app (or use URL):</p>
          <p className="break-all text-xs text-gray-700 mb-3">{qrCodeUrl}</p>
          <p className="text-xs text-gray-500 mb-2">Secret:</p>
          <p className="font-mono text-sm text-gray-800 mb-3">{secret}</p>
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="6-digit code" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-3" />
          <button onClick={enable} disabled={loading || !code.trim()} className="w-full rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50">
            {loading ? 'Enabling...' : 'Enable 2FA'}
          </button>
        </div>
      )}
    </div>
  )
}

export default TwoFactorSetupPage
