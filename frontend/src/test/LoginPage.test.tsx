import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import LoginPage from '../pages/auth/LoginPage'
import { AuthProvider } from '../context/AuthContext'

// Mock the auth API so we don't make real HTTP calls in tests
vi.mock('../api/auth', () => ({
  loginApi: vi.fn(),
}))

import { loginApi } from '../api/auth'

describe('LoginPage', () => {

  test('renders login form correctly', () => {
    render(
      <AuthProvider skipBootstrap>
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      </AuthProvider>
    )

    // Check that key elements are present
    expect(screen.getByText('DineOps')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('sharon@dineops.com')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument()
  })

  test('shows error message on failed login', async () => {
    // Make the mock API reject with an error
    vi.mocked(loginApi).mockRejectedValueOnce({
      response: { data: { message: 'Invalid credentials' } }
    })

    render(
      <AuthProvider skipBootstrap>
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      </AuthProvider>
    )

    // Fill in the form
    fireEvent.change(screen.getByPlaceholderText('sharon@dineops.com'), {
      target: { value: 'wrong@email.com' }
    })
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'wrongpassword' }
    })

    // Click login
    fireEvent.click(screen.getByRole('button', { name: /login/i }))

    // Wait for error message to appear
    const error = await screen.findByText('Invalid credentials')
    expect(error).toBeInTheDocument()
  })

  test('toggles password visibility', () => {
    render(
      <AuthProvider skipBootstrap>
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      </AuthProvider>
    )

    const passwordInput = screen.getByPlaceholderText('••••••••')
    const toggleButton = screen.getByText('👁️')

    // Initially password is hidden
    expect(passwordInput).toHaveAttribute('type', 'password')

    // Click eye icon
    fireEvent.click(toggleButton)

    // Now password should be visible
    expect(passwordInput).toHaveAttribute('type', 'text')
  })
})