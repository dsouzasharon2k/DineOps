import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { registerApi } from '../../api/auth'
import { getApiErrorMessage } from '../../api/error'

const RegisterPage = () => {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleRegister = async () => {
    setError('')
    setLoading(true)
    try {
      await registerApi({ name, email, phone: phone || undefined, password })
      navigate('/login')
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to register.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gray-100 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-md border border-gray-100">
        <h1 className="text-2xl font-bold text-gray-900 mb-1 text-center">Create account</h1>
        <p className="text-gray-500 text-sm mb-6 text-center">Register as a customer.</p>
        {error && <p className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        <div className="space-y-3">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm" />
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm" />
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone (optional)" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm" />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm" />
        </div>
        <button
          onClick={handleRegister}
          disabled={loading || !name.trim() || !email.trim() || !password}
          className="mt-5 w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2.5 rounded-lg transition disabled:opacity-50"
        >
          {loading ? 'Creating account...' : 'Register'}
        </button>
        <p className="mt-4 text-center text-xs text-gray-500">
          Already have an account? <Link to="/login" className="text-orange-600 hover:underline">Sign in</Link>
        </p>
      </div>
    </main>
  )
}

export default RegisterPage
