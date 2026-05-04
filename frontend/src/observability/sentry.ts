import * as Sentry from '@sentry/react'

const dsn = import.meta.env.VITE_SENTRY_DSN

export const initSentry = () => {
  if (!dsn) return

  Sentry.init({
    dsn,
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE,
    release: import.meta.env.VITE_RELEASE || undefined,
    tracesSampleRate: Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
    sendDefaultPii: false,
  })
}

export const captureUiException = (error: Error, extra?: Record<string, unknown>) => {
  if (!dsn) return
  Sentry.captureException(error, {
    extra,
  })
}
