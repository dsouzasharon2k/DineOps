import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import NotFoundPage from '../pages/NotFoundPage'

describe('NotFoundPage', () => {
  test('renders not found content and navigation links', () => {
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>
    )

    expect(screen.getByText('404')).toBeInTheDocument()
    expect(screen.getByText('Page not found')).toBeInTheDocument()

    const loginLink = screen.getByRole('link', { name: 'Go to Login' })
    const dashboardLink = screen.getByRole('link', { name: 'Open Dashboard' })

    expect(loginLink).toHaveAttribute('href', '/login')
    expect(dashboardLink).toHaveAttribute('href', '/dashboard')
  })
})
