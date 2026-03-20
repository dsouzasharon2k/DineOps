import { useCallback, useEffect, useMemo, useState } from 'react'
import { getApiErrorMessage } from '../../api/error'
import { getCurrentSubscriptionApi, startSubscriptionApi } from '../../api/subscriptions'
import { useAuth } from '../../context/AuthContext'
import type { Subscription, SubscriptionPlan } from '../../types/subscription'

const extractTenantId = (token: string | null): string | null => {
  if (!token) return null
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.tenantId ?? null
  } catch {
    return null
  }
}

const plans: { id: SubscriptionPlan; label: string; monthlyLimit: string }[] = [
  { id: 'STARTER', label: 'Starter', monthlyLimit: '300 orders / month' },
  { id: 'GROWTH', label: 'Growth', monthlyLimit: '2000 orders / month' },
  { id: 'ENTERPRISE', label: 'Enterprise', monthlyLimit: 'Unlimited orders' },
]

const SubscriptionPage = () => {
  const { token } = useAuth()
  const tenantId = useMemo(() => extractTenantId(token), [token])
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [startingPlan, setStartingPlan] = useState<SubscriptionPlan | null>(null)

  const load = useCallback(async () => {
    if (!tenantId) {
      setLoading(false)
      return
    }
    try {
      setError('')
      const current = await getCurrentSubscriptionApi(tenantId)
      setSubscription(current)
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load subscription.'))
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  useEffect(() => {
    load()
  }, [load])

  const handleStart = async (plan: SubscriptionPlan) => {
    if (!tenantId) return
    try {
      setStartingPlan(plan)
      setError('')
      const started = await startSubscriptionApi(tenantId, plan)
      setSubscription(started)
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to start subscription checkout.'))
    } finally {
      setStartingPlan(null)
    }
  }

  if (loading) return <p className="text-sm text-gray-500">Loading subscription...</p>
  if (!tenantId) return <p className="text-sm text-gray-500">Tenant context missing.</p>

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800">Subscription & Billing</h1>
      <p className="mt-2 text-sm text-gray-500">Manage your plan, billing cycle, and order limits.</p>
      {error && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <div className="mt-6 rounded-xl bg-white p-4 shadow-sm">
        <p className="mb-3 text-sm font-semibold text-gray-700">Current Subscription</p>
        {!subscription ? (
          <p className="text-sm text-gray-500">No active subscription found. Choose a plan below.</p>
        ) : (
          <div className="space-y-1 text-sm text-gray-700">
            <p>Plan: <span className="font-semibold">{subscription.plan}</span></p>
            <p>Status: <span className="font-semibold">{subscription.status}</span>{subscription.inGracePeriod ? ' (Grace period)' : ''}</p>
            <p>Starts: {new Date(subscription.startsAt).toLocaleString()}</p>
            <p>Expires: {new Date(subscription.expiresAt).toLocaleString()}</p>
            <p>
              Monthly order limit:{' '}
              {subscription.monthlyOrderLimit === Number.MAX_SAFE_INTEGER || subscription.monthlyOrderLimit > 2_000_000_000
                ? 'Unlimited'
                : subscription.monthlyOrderLimit}
            </p>
          </div>
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        {plans.map((plan) => (
          <div key={plan.id} className="rounded-xl bg-white p-4 shadow-sm">
            <p className="text-lg font-semibold text-gray-800">{plan.label}</p>
            <p className="mt-1 text-sm text-gray-500">{plan.monthlyLimit}</p>
            <button
              onClick={() => handleStart(plan.id)}
              disabled={startingPlan === plan.id}
              className="mt-4 w-full rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-60"
            >
              {startingPlan === plan.id ? 'Starting...' : 'Start Plan'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default SubscriptionPage
