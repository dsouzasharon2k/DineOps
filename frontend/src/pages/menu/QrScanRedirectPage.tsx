import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import axiosInstance from '../../api/axiosInstance'

/**
 * Landing page for zone-aware QR code scans.
 * The backend stores a unique `source_identifier` in qr_codes, and the QR URL points here.
 * We call the backend to resolve the identifier → tenantId + optional zone context,
 * then redirect to the standard public menu page preserving zone info as a query param.
 */
const QrScanRedirectPage = () => {
  const { sourceIdentifier } = useParams<{ sourceIdentifier: string }>()
  const navigate = useNavigate()
  const [error, setError] = useState('')

  useEffect(() => {
    if (!sourceIdentifier) {
      setError('Invalid QR code.')
      return
    }

    // The backend QrCodeController GET /{sourceIdentifier} returns zone-aware menu items,
    // but we also need the tenantId to build the redirect URL.
    // We resolve by hitting the meta endpoint which returns the tenant + zone info.
    axiosInstance
      .get<{ tenantId: string; zoneId?: string; tableNumber?: number }>(
        `/api/v1/qr-scan/${sourceIdentifier}`
      )
      .then((res) => {
        const { tenantId, zoneId, tableNumber } = res.data
        const params = new URLSearchParams()
        if (zoneId) params.set('zone', zoneId)
        if (tableNumber != null) params.set('table', String(tableNumber))
        const query = params.toString()
        navigate(`/menu/${tenantId}${query ? `?${query}` : ''}`, { replace: true })
      })
      .catch(() => {
        setError('This QR code is no longer valid or has expired.')
      })
  }, [sourceIdentifier, navigate])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-sm rounded-xl bg-white p-6 text-center shadow-sm border border-red-100">
          <div className="text-4xl mb-3">📵</div>
          <p className="font-semibold text-red-600 text-sm">QR Code Error</p>
          <p className="text-xs text-gray-500 mt-1">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="text-4xl mb-3 animate-pulse">📱</div>
        <p className="text-sm text-gray-500">Loading menu…</p>
      </div>
    </div>
  )
}

export default QrScanRedirectPage
