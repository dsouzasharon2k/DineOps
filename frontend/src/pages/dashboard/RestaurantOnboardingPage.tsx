import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createRestaurantApi } from '../../api/restaurants'
import { getApiErrorMessage } from '../../api/error'

const RestaurantOnboardingPage = () => {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [cuisineType, setCuisineType] = useState('')
  const [fssaiLicense, setFssaiLicense] = useState('')
  const [gstNumber, setGstNumber] = useState('')
  const [ownerEmail, setOwnerEmail] = useState('')

  const slugPreview = name
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
      await createRestaurantApi({
        name,
        address,
        phone,
        cuisineType,
        fssaiLicense,
        gstNumber,
        ownerEmail,
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
            You are signed in. Continue to set up your restaurant.
          </p>
          <button
            onClick={() => setStep(2)}
            className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
          >
            Continue
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">Restaurant details</h2>
          <div className="grid grid-cols-1 gap-3">
            <input
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Restaurant name *"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
            <input
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <input
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Cuisine type"
              value={cuisineType}
              onChange={(e) => setCuisineType(e.target.value)}
            />
            <input
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="FSSAI license"
              value={fssaiLicense}
              onChange={(e) => setFssaiLicense(e.target.value)}
            />
            <input
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="GST number"
              value={gstNumber}
              onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
            />
            <input
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Owner email (required for SUPER_ADMIN)"
              value={ownerEmail}
              onChange={(e) => setOwnerEmail(e.target.value)}
            />
          </div>
          <div className="mt-4 flex items-center gap-2">
            <button
              onClick={() => setStep(1)}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700"
            >
              Back
            </button>
            <button
              onClick={() => setStep(3)}
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
