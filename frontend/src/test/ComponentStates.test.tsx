import { render, screen } from '@testing-library/react'
import EmptyState from '../components/EmptyState'
import ErrorBoundary from '../components/ErrorBoundary'
import LoadingState from '../components/LoadingState'

const CrashyComponent = () => {
  throw new Error('boom')
}

describe('LoadingState', () => {
  test('renders default loading message', () => {
    render(<LoadingState />)
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  test('renders custom message', () => {
    render(<LoadingState message="Fetching restaurants..." />)
    expect(screen.getByText('Fetching restaurants...')).toBeInTheDocument()
  })
})

describe('EmptyState', () => {
  test('renders title and optional description', () => {
    render(<EmptyState title="No orders" description="Create your first order." />)
    expect(screen.getByText('No orders')).toBeInTheDocument()
    expect(screen.getByText('Create your first order.')).toBeInTheDocument()
  })

  test('renders default icon when icon is not provided', () => {
    render(<EmptyState title="Nothing yet" />)
    expect(screen.getByText('📭')).toBeInTheDocument()
  })
})

describe('ErrorBoundary', () => {
  test('shows provided fallback UI when child throws', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <ErrorBoundary fallback={<div>Section failed</div>}>
        <CrashyComponent />
      </ErrorBoundary>
    )

    expect(screen.getByText('Section failed')).toBeInTheDocument()
    consoleErrorSpy.mockRestore()
  })
})
