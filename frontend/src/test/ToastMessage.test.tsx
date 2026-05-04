import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import ToastMessage from '../components/ToastMessage'

afterEach(() => {
  vi.useRealTimers()
})

describe('ToastMessage', () => {
  test('renders message and variant styling', () => {
    render(<ToastMessage message="Saved successfully" variant="success" />)

    const message = screen.getByText('Saved successfully')
    expect(message).toBeInTheDocument()
    expect(message.closest('div')).toHaveClass('text-emerald-700')
  })

  test('calls onClose when dismiss is clicked', () => {
    const onClose = vi.fn()
    render(<ToastMessage message="Something failed" variant="error" onClose={onClose} />)

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  test('hides dismiss button when dismissible is false', () => {
    const onClose = vi.fn()
    render(
      <ToastMessage
        message="Non-dismissible"
        onClose={onClose}
        dismissible={false}
      />
    )

    expect(screen.queryByRole('button', { name: 'Dismiss' })).not.toBeInTheDocument()
  })

  test('renders action button and calls onAction', () => {
    const onAction = vi.fn()
    render(
      <ToastMessage
        message="Request failed"
        variant="error"
        actionLabel="Retry"
        onAction={onAction}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))

    expect(onAction).toHaveBeenCalledTimes(1)
  })

  test('auto hides and calls onClose after timeout', () => {
    vi.useFakeTimers()
    const onClose = vi.fn()
    render(
      <ToastMessage
        message="Auto hide"
        variant="info"
        onClose={onClose}
        autoHideMs={1200}
      />
    )

    expect(onClose).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1200)

    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
