import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { loginApi } from '../../api/auth'
import { useAuth } from '../../context/AuthContext'
import { getApiErrorMessage } from '../../api/error'
import { useI18n } from '../../i18n/I18nProvider'
import ToastMessage from '../../components/ToastMessage'

const loginSchema = z.object({
  email: z.email('Enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
})

type LoginForm = z.infer<typeof loginSchema>

const LoginPage = () => {
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const navigate = useNavigate()
  const { login } = useAuth()
  const { t } = useI18n()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const onSubmit = async (values: LoginForm) => {
    setError('')
    setLoading(true)
    try {
      const data = await loginApi(values.email, values.password)
      if (data.requires2fa && data.tempToken) {
        sessionStorage.setItem('dineops_temp_2fa_token', data.tempToken)
        navigate('/auth/2fa/verify')
        return
      }
      if (data.token) {
        login(data.token)
        navigate('/dashboard')
        return
      }
      setError('Unable to complete login.')
    } catch (err) {
      setError(getApiErrorMessage(err, 'Invalid email or password.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gray-100 flex items-center justify-center px-4 py-10">
      <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-md rounded-2xl bg-white p-8 shadow-md border border-gray-100">

        {/* Logo mark */}
        <div className="flex items-center justify-center gap-2.5 mb-6">
          <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 11l19-9-9 19-2-8-8-2z" />
            </svg>
          </div>
          <span className="text-gray-900 font-bold text-xl tracking-tight">PlatterOps</span>
        </div>

        {/* Heading */}
        <h1 className="text-2xl font-bold text-gray-900 mb-1 text-center">{t('login.welcome')}</h1>
        <p className="text-gray-500 text-sm mb-8 text-center">{t('login.subtitle')}</p>

        {/* Error */}
        {error && <ToastMessage message={error} variant="error" onClose={() => setError('')} />}

        {/* Email */}
        <div className="mb-4">
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            {t('login.email')}
          </label>
          <input
            id="email"
            type="email"
            {...register('email')}
            placeholder="you@restaurant.com"
            autoComplete="email"
            className="w-full border border-gray-300 text-gray-900 placeholder-gray-400 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
          {errors.email && <p className="mt-1 text-xs text-red-500">{t('login.invalidEmail')}</p>}
        </div>

        {/* Password */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              {t('login.password')}
            </label>
            <Link to="/forgot-password" className="text-xs text-orange-600 hover:underline">Forgot password?</Link>
          </div>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              {...register('password')}
              placeholder="••••••••"
              autoComplete="current-password"
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
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
          {errors.password && <p className="mt-1 text-xs text-red-500">{t('login.requiredPassword')}</p>}
        </div>

        {/* Sign in button */}
        <button
          type="submit"
          disabled={loading}
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
            t('common.signIn')
          )}
        </button>

        <p className="mt-4 text-center text-xs text-gray-500">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="text-orange-600 hover:underline">Register</Link>
          <span className="mx-2 text-gray-300">·</span>
          <Link to="/otp-login" className="text-orange-600 hover:underline">OTP login</Link>
        </p>

        <p className="mt-2 text-center text-xs text-gray-500">
          By continuing you agree to our{' '}
          <Link to="/terms" className="text-orange-600 hover:underline">Terms</Link>{' '}
          and{' '}
          <Link to="/privacy" className="text-orange-600 hover:underline">Privacy Policy</Link>.
        </p>

      </form>
    </main>
  )
}

export default LoginPage
