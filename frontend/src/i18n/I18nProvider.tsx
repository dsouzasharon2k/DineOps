import { createContext, useContext, useMemo, useState } from 'react'
import type { Locale } from './translations'
import { translations } from './translations'

interface I18nContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string) => string
}

const STORAGE_KEY = 'dineops_locale'
const I18nContext = createContext<I18nContextValue | undefined>(undefined)

const readInitialLocale = (): Locale => {
  const stored = localStorage.getItem(STORAGE_KEY)
  return stored === 'hi' ? 'hi' : 'en'
}

export const I18nProvider = ({ children }: { children: React.ReactNode }) => {
  const [locale, setLocaleState] = useState<Locale>(readInitialLocale)

  const setLocale = (nextLocale: Locale) => {
    setLocaleState(nextLocale)
    localStorage.setItem(STORAGE_KEY, nextLocale)
  }

  const value = useMemo<I18nContextValue>(() => ({
    locale,
    setLocale,
    t: (key: string) => translations[locale][key] ?? translations.en[key] ?? key,
  }), [locale])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export const useI18n = (): I18nContextValue => {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider')
  }
  return context
}
