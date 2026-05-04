import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import LoginPage from '../pages/auth/LoginPage'
import { AuthProvider } from '../context/AuthContext'
import { I18nProvider } from '../i18n/I18nProvider'

const navigateMock = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => navigateMock,
  }
})

// Mock the auth API so we don't make real HTTP calls in tests
vi.mock('../api/auth', () => ({
  loginApi: vi.fn(),
}))

import { loginApi } from '../api/auth'

describe('LoginPage', () => {

  test('renders login form correctly', () => {
    render(
      <I18nProvider>
        <AuthProvider skipBootstrap>
          <MemoryRouter>
            <LoginPage />
          </MemoryRouter>
        </AuthProvider>
      </I18nProvider>
    )

    // Check that key elements are present
    expect(screen.getByText('PlatterOps')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('you@restaurant.com')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  test('shows error message on failed login', async () => {
    // Make the mock API reject with an error
    vi.mocked(loginApi).mockRejectedValueOnce({
      response: { data: { message: 'Invalid credentials' } }
    })

    render(
      <I18nProvider>
        <AuthProvider skipBootstrap>
          <MemoryRouter>
            <LoginPage />
          </MemoryRouter>
        </AuthProvider>
      </I18nProvider>
    )

    // Fill in the form
    fireEvent.change(screen.getByPlaceholderText('you@restaurant.com'), {
      target: { value: 'wrong@email.com' }
    })
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'wrongpassword' }
    })

    // Click login
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

    // Wait for error message to appear
    const error = await screen.findByText('Invalid email or password.')
    expect(error).toBeInTheDocument()
  })

  test('logs in and navigates to dashboard on happy path', async () => {
    vi.mocked(loginApi).mockResolvedValueOnce({ token: 'token-value', requires2fa: false })

    render(
      <I18nProvider>
        <AuthProvider skipBootstrap>
          <MemoryRouter>
            <LoginPage />
          </MemoryRouter>
        </AuthProvider>
      </I18nProvider>
    )

    fireEvent.change(screen.getByPlaceholderText('you@restaurant.com'), {
      target: { value: 'owner@dineops.com' },
    })
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'PasswordA1' },
    })

    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(loginApi).toHaveBeenCalledWith('owner@dineops.com', 'PasswordA1')
      expect(navigateMock).toHaveBeenCalledWith('/dashboard')
    })
  })

  test('toggles password visibility', () => {
    render(
      <I18nProvider>
        <AuthProvider skipBootstrap>
          <MemoryRouter>
            <LoginPage />
          </MemoryRouter>
        </AuthProvider>
      </I18nProvider>
    )

    const passwordInput = screen.getByPlaceholderText('••••••••')
    const toggleButton = screen.getByRole('button', { name: /show password/i })

    // Initially password is hidden
    expect(passwordInput).toHaveAttribute('type', 'password')

    // Click eye icon
    fireEvent.click(toggleButton)

    // Now password should be visible
    expect(passwordInput).toHaveAttribute('type', 'text')
  })
})