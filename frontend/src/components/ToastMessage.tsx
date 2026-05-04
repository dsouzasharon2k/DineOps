import { useEffect } from 'react'

type ToastVariant = 'success' | 'error' | 'info'

interface ToastMessageProps {
  message: string
  variant?: ToastVariant
  onClose?: () => void
  actionLabel?: string
  onAction?: () => void
  dismissible?: boolean
  autoHideMs?: number
}

const variantClass: Record<ToastVariant, string> = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  error: 'border-red-200 bg-red-50 text-red-700',
  info: 'border-sky-200 bg-sky-50 text-sky-700',
}

const ToastMessage = ({
  message,
  variant = 'info',
  onClose,
  actionLabel,
  onAction,
  dismissible = true,
  autoHideMs,
}: ToastMessageProps) => {
  if (!message) {
    return null
  }

  useEffect(() => {
    if (!onClose || !autoHideMs || autoHideMs <= 0) {
      return
    }
    const timeoutId = window.setTimeout(() => {
      onClose()
    }, autoHideMs)
    return () => window.clearTimeout(timeoutId)
  }, [onClose, autoHideMs, message])

  return (
    <div
      role="status"
      aria-live="polite"
      className={`mt-4 flex items-center justify-between gap-3 rounded border px-3 py-2 text-sm ${variantClass[variant]}`}
    >
      <span>{message}</span>
      <div className="flex items-center gap-2">
        {onAction && actionLabel && (
          <button
            onClick={onAction}
            className="rounded border border-current px-1.5 py-0.5 text-xs font-semibold hover:bg-white/50"
          >
            {actionLabel}
          </button>
        )}
        {dismissible && onClose && (
          <button
            onClick={onClose}
            className="rounded px-1.5 py-0.5 text-xs font-semibold hover:bg-white/50"
          >
            Dismiss
          </button>
        )}
      </div>
    </div>
  )
}

export default ToastMessage
