import { useEffect, useState } from 'react'
import { useI18n } from '../i18n/I18nProvider'

const CONSENT_KEY = 'dineops_cookie_consent'

const CookieConsentBanner = () => {
  const { t } = useI18n()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const savedConsent = localStorage.getItem(CONSENT_KEY)
    setVisible(savedConsent !== 'accepted' && savedConsent !== 'rejected')
  }, [])

  if (!visible) {
    return null
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 rounded-xl border border-gray-200 bg-white p-4 shadow-lg md:left-auto md:max-w-md">
      <p className="text-sm font-semibold text-gray-900">{t('cookie.title')}</p>
      <p className="mt-1 text-xs text-gray-600">{t('cookie.body')}</p>
      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={() => {
            localStorage.setItem(CONSENT_KEY, 'accepted')
            setVisible(false)
          }}
          className="rounded-md bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-600"
        >
          {t('cookie.accept')}
        </button>
        <button
          onClick={() => {
            localStorage.setItem(CONSENT_KEY, 'rejected')
            setVisible(false)
          }}
          className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
        >
          {t('cookie.reject')}
        </button>
      </div>
    </div>
  )
}

export default CookieConsentBanner
