import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LoginPage from '@/app/(auth)/login/page'

// Mock Supabase client
const mockSignInWithPassword = vi.fn()
const mockSignInWithOAuth = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signInWithPassword: mockSignInWithPassword,
      signInWithOAuth: mockSignInWithOAuth,
    },
  }),
}))

// Mock next/navigation
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    back: vi.fn(),
  }),
}))

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders login form with email and password inputs', () => {
      render(<LoginPage />)
      
      expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/password/i)).toBeInTheDocument()
    })

    it('renders login button', () => {
      render(<LoginPage />)
      
      expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument()
    })

    it('renders Google login button', () => {
      render(<LoginPage />)
      
      expect(screen.getByRole('button', { name: /google/i })).toBeInTheDocument()
    })

    it('renders link to signup page', () => {
      render(<LoginPage />)
      
      expect(screen.getByRole('link', { name: /sign up/i })).toHaveAttribute('href', '/signup')
    })
  })

  describe('Email/Password Login', () => {
    it('calls signInWithPassword with email and password on form submit', async () => {
      const user = userEvent.setup()
      mockSignInWithPassword.mockResolvedValue({ error: null })
      
      render(<LoginPage />)
      
      await user.type(screen.getByPlaceholderText(/email/i), 'test@example.com')
      await user.type(screen.getByPlaceholderText(/password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /login/i }))
      
      await waitFor(() => {
        expect(mockSignInWithPassword).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123',
        })
      })
    })

    it('redirects to home on successful login', async () => {
      const user = userEvent.setup()
      mockSignInWithPassword.mockResolvedValue({ error: null })
      
      render(<LoginPage />)
      
      await user.type(screen.getByPlaceholderText(/email/i), 'test@example.com')
      await user.type(screen.getByPlaceholderText(/password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /login/i }))
      
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/')
      })
    })

    it('displays error message on failed login', async () => {
      const user = userEvent.setup()
      mockSignInWithPassword.mockResolvedValue({ 
        error: { message: 'Invalid credentials' } 
      })
      
      render(<LoginPage />)
      
      await user.type(screen.getByPlaceholderText(/email/i), 'test@example.com')
      await user.type(screen.getByPlaceholderText(/password/i), 'wrongpassword')
      await user.click(screen.getByRole('button', { name: /login/i }))
      
      await waitFor(() => {
        expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument()
      })
    })

    it('shows loading state during login', async () => {
      const user = userEvent.setup()
      // Never resolve to keep loading state
      mockSignInWithPassword.mockImplementation(() => new Promise(() => {}))
      
      render(<LoginPage />)
      
      await user.type(screen.getByPlaceholderText(/email/i), 'test@example.com')
      await user.type(screen.getByPlaceholderText(/password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /login/i }))
      
      expect(screen.getByRole('button', { name: /loading/i })).toBeInTheDocument()
    })
  })

  describe('Google OAuth Login', () => {
    it('calls signInWithOAuth when Google button is clicked', async () => {
      const user = userEvent.setup()
      mockSignInWithOAuth.mockResolvedValue({ error: null })
      
      render(<LoginPage />)
      
      await user.click(screen.getByRole('button', { name: /google/i }))
      
      expect(mockSignInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: expect.objectContaining({
          redirectTo: expect.stringContaining('/auth/callback'),
        }),
      })
    })
  })
})
