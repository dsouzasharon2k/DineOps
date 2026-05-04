import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createRestaurantApi } from '../../api/restaurants'
import { getApiErrorMessage } from '../../api/error'

const onboardingSchema = z.object({
  name: z.string().trim().min(1, 'Restaurant name is required.'),
  address: z.string().trim().optional(),
  phone: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || /^[0-9+\-\s]{7,15}$/.test(value), 'Enter a valid phone number.'),
  cuisineType: z.string().trim().optional(),
  fssaiLicense: z
    .string()
    .trim()
    .min(1, 'FSSAI license is required.')
    .regex(/^[0-9A-Za-z-]{8,20}$/, 'Enter a valid FSSAI license format.'),
  gstNumber: z
    .string()
    .trim()
    .optional()
    .refine(
      (value) => !value || /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(value),
      'GST number format is invalid.'
    ),
  ownerEmail: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), 'Enter a valid email address.'),
})

type OnboardingForm = z.infer<typeof onboardingSchema>

const RestaurantOnboardingPage = () => {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const {
    register,
    watch,
    getValues,
    trigger,
    formState: { errors },
  } = useForm<OnboardingForm>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      name: '',
      address: '',
      phone: '',
      cuisineType: '',
      fssaiLicense: '',
      gstNumber: '',
      ownerEmail: '',
    },
  })

  const name = watch('name')
  const address = watch('address')
  const phone = watch('phone')
  const cuisineType = watch('cuisineType')
  const fssaiLicense = watch('fssaiLicense')
  const gstNumber = watch('gstNumber')

  const slugPreview = (name ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')

  const handleCreate = async () => {
    setSubmitting(true)
    setError('')
    try {
      const values = getValues()
      await createRestaurantApi({
        name: values.name,
        address: values.address,
        phone: values.phone,
        cuisineType: values.cuisineType,
        fssaiLicense: values.fssaiLicense,
        gstNumber: values.gstNumber?.toUpperCase(),
        ownerEmail: values.ownerEmail,
      })
      navigate('/dashboard/menu')
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to create restaurant. Please try again.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Restaurant Onboarding</h1>
      <p className="text-sm text-gray-500 mb-6">Step {step} of 3</p>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">
          {error}
        </div>
      )}

      {step === 1 && (
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h2 className="mb-2 text-lg font-semibold text-gray-800">Account confirmation</h2>
          <p className="mb-4 text-sm text-gray-500">
            This setup creates your restaurant profile, links ownership, and unlocks menu/kitchen/inventory modules.
          </p>
          <p className="mb-4 text-xs text-gray-400">
            Already onboarded? You can skip this and manage your menu directly.
          </p>
          <button
            onClick={() => setStep(2)}
            className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
          >
            Continue
          </button>
          <button
            onClick={() => navigate('/dashboard/menu')}
            className="ml-2 rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Skip for now
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">Restaurant details</h2>
          <div className="grid grid-cols-1 gap-3">
            <div>
              <input
                className={`rounded-lg border px-3 py-2 text-sm w-full ${errors.name ? 'border-red-400' : 'border-gray-300'}`}
                placeholder="Restaurant name *"
                {...register('name')}
              />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
            </div>
            <input
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Address"
              {...register('address')}
            />
            <div>
              <input
                className={`rounded-lg border px-3 py-2 text-sm w-full ${errors.phone ? 'border-red-400' : 'border-gray-300'}`}
                placeholder="Phone"
                {...register('phone')}
              />
              {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone.message}</p>}
            </div>
            <input
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Cuisine type"
              {...register('cuisineType')}
            />
            <div>
              <input
                className={`rounded-lg border px-3 py-2 text-sm w-full ${errors.fssaiLicense ? 'border-red-400' : 'border-gray-300'}`}
                placeholder="FSSAI license *"
                {...register('fssaiLicense')}
              />
              {errors.fssaiLicense && <p className="text-xs text-red-500 mt-1">{errors.fssaiLicense.message}</p>}
            </div>
            <div>
              <input
                className={`rounded-lg border px-3 py-2 text-sm w-full ${errors.gstNumber ? 'border-red-400' : 'border-gray-300'}`}
                placeholder="GST number"
                {...register('gstNumber')}
              />
              {errors.gstNumber && <p className="text-xs text-red-500 mt-1">{errors.gstNumber.message}</p>}
            </div>
            <div>
              <input
                className={`rounded-lg border px-3 py-2 text-sm w-full ${errors.ownerEmail ? 'border-red-400' : 'border-gray-300'}`}
                placeholder="Owner email (required for SUPER_ADMIN)"
                {...register('ownerEmail')}
              />
              {errors.ownerEmail && <p className="text-xs text-red-500 mt-1">{errors.ownerEmail.message}</p>}
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <button
              onClick={() => {
                setStep(1)
              }}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700"
            >
              Back
            </button>
            <button
              onClick={async () => {
                const valid = await trigger(['name', 'phone', 'fssaiLicense', 'gstNumber', 'ownerEmail'])
                if (valid) setStep(3)
              }}
              disabled={!name.trim()}
              className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              Review
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold text-gray-800">Review</h2>
          <p className="text-sm text-gray-600 mb-1"><span className="font-medium">Name:</span> {name}</p>
          <p className="text-sm text-gray-600 mb-1"><span className="font-medium">Slug:</span> {slugPreview || 'N/A'}</p>
          <p className="text-sm text-gray-600 mb-1"><span className="font-medium">Address:</span> {address || 'N/A'}</p>
          <p className="text-sm text-gray-600 mb-1"><span className="font-medium">Phone:</span> {phone || 'N/A'}</p>
          <p className="text-sm text-gray-600 mb-1"><span className="font-medium">Cuisine:</span> {cuisineType || 'N/A'}</p>
          <p className="text-sm text-gray-600 mb-1"><span className="font-medium">FSSAI:</span> {fssaiLicense || 'N/A'}</p>
          <p className="text-sm text-gray-600 mb-4"><span className="font-medium">GST:</span> {gstNumber || 'N/A'}</p>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setStep(2)}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700"
            >
              Back
            </button>
            <button
              onClick={handleCreate}
              disabled={submitting}
              className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Create and continue to menu setup'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default RestaurantOnboardingPage
