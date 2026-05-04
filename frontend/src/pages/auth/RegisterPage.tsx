import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { registerApi } from '../../api/auth'
import { getApiErrorMessage } from '../../api/error'
import ToastMessage from '../../components/ToastMessage'

const registerSchema = z.object({
  name: z.string().trim().min(1, 'Full name is required.'),
  email: z.email('Enter a valid email address.'),
  phone: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || /^[0-9+\-\s]{7,15}$/.test(value), 'Enter a valid phone number.'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters.')
    .regex(/[A-Z]/, 'Must include at least one uppercase letter.')
    .regex(/[a-z]/, 'Must include at least one lowercase letter.')
    .regex(/[0-9]/, 'Must include at least one number.'),
  acceptTerms: z
    .boolean()
    .refine((v) => v === true, { message: 'You must accept the Terms of Service and Privacy Policy.' }),
})

type RegisterForm = z.infer<typeof registerSchema>

const getPasswordStrength = (password: string): { score: number; label: string; color: string } => {
  if (!password) return { score: 0, label: '', color: 'bg-gray-200' }
  let score = 0
  if (password.length >= 8) score++
  if (/[A-Z]/.test(password)) score++
  if (/[a-z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++
  if (score <= 2) return { score, label: 'Weak', color: 'bg-red-400' }
  if (score === 3) return { score, label: 'Fair', color: 'bg-yellow-400' }
  if (score === 4) return { score, label: 'Good', color: 'bg-blue-400' }
  return { score, label: 'Strong', color: 'bg-emerald-400' }
}

const RegisterPage = () => {
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      password: '',
      acceptTerms: false,
    },
  })

  const passwordValue = watch('password') ?? ''
  const strength = getPasswordStrength(passwordValue)

  const handleRegister = async (values: RegisterForm) => {
    setError('')
    setLoading(true)
    try {
      await registerApi({
        name: values.name.trim(),
        email: values.email.trim(),
        phone: values.phone?.trim() || undefined,
        password: values.password,
        acceptTerms: values.acceptTerms,
      })
      navigate('/login')
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to register. Please try again.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gray-100 flex items-center justify-center px-4 py-10">
      <form onSubmit={handleSubmit(handleRegister)} className="w-full max-w-md rounded-2xl bg-white p-8 shadow-md border border-gray-100">

        {/* Brand */}
        <div className="flex items-center justify-center gap-2.5 mb-6">
          <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 11l19-9-9 19-2-8-8-2z" />
            </svg>
          </div>
          <span className="text-gray-900 font-bold text-xl tracking-tight">PlatterOps</span>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-1 text-center">Create account</h1>
        <p className="text-gray-500 text-sm mb-6 text-center">Register as a customer to start ordering.</p>

        {error && <ToastMessage message={error} variant="error" onClose={() => setError('')} />}

        <div className="space-y-4">
          {/* Full name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Full name</label>
            <input
              id="name"
              {...register('name')}
              placeholder="Jane Smith"
              autoComplete="name"
              className="w-full border border-gray-300 text-gray-900 placeholder-gray-400 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
            {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              id="email"
              {...register('email')}
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              className="w-full border border-gray-300 text-gray-900 placeholder-gray-400 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
            {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
          </div>

          {/* Phone */}
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              Phone <span className="text-gray-400 font-normal">(optional — enables OTP login)</span>
            </label>
            <input
              id="phone"
              {...register('phone')}
              type="tel"
              placeholder="+91 98765 43210"
              autoComplete="tel"
              className="w-full border border-gray-300 text-gray-900 placeholder-gray-400 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
            {errors.phone && <p className="mt-1 text-xs text-red-500">{errors.phone.message}</p>}
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <div className="relative">
              <input
                id="password"
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
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
            {/* Password strength bar */}
            {passwordValue && (
              <div className="mt-2">
                <div className="flex gap-1 h-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className={`flex-1 rounded-full transition-colors ${i <= strength.score ? strength.color : 'bg-gray-200'}`}
                    />
                  ))}
                </div>
                <p className={`mt-1 text-[11px] font-medium ${strength.score <= 2 ? 'text-red-500' : strength.score === 3 ? 'text-yellow-600' : strength.score === 4 ? 'text-blue-600' : 'text-emerald-600'}`}>
                  {strength.label}
                </p>
              </div>
            )}
            {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
          </div>

          {/* Terms */}
          <label className="flex items-start gap-2.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-xs text-gray-700 cursor-pointer">
            <input type="checkbox" {...register('acceptTerms')} className="mt-0.5 accent-orange-500" />
            <span>
              I agree to the{' '}
              <Link to="/terms" className="text-orange-600 hover:underline">Terms of Service</Link>
              {' '}and{' '}
              <Link to="/privacy" className="text-orange-600 hover:underline">Privacy Policy</Link>.
            </span>
          </label>
          {errors.acceptTerms && <p className="text-xs text-red-500">{errors.acceptTerms.message}</p>}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-5 w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2.5 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Creating account…
            </span>
          ) : (
            'Create account'
          )}
        </button>

        <p className="mt-4 text-center text-xs text-gray-500">
          Already have an account?{' '}
          <Link to="/login" className="text-orange-600 hover:underline">Sign in</Link>
        </p>
      </form>
    </main>
  )
}

export default RegisterPage
