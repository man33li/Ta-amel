import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SignupPage from '@/app/(auth)/signup/page'

// Mock Supabase client
const mockSignUp = vi.fn()
const mockSignInWithOAuth = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signUp: mockSignUp,
      signInWithOAuth: mockSignInWithOAuth,
    },
  }),
}))

describe('SignupPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders signup form with email, password, and confirm password inputs', () => {
      render(<SignupPage />)
      
      expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Password')).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/confirm password/i)).toBeInTheDocument()
    })

    it('renders signup button', () => {
      render(<SignupPage />)
      
      expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument()
    })

    it('renders Google OAuth button', () => {
      render(<SignupPage />)
      
      expect(screen.getByRole('button', { name: /google/i })).toBeInTheDocument()
    })

    it('renders link to login page', () => {
      render(<SignupPage />)
      
      expect(screen.getByRole('link', { name: /log in/i })).toHaveAttribute('href', '/login')
    })
  })

  describe('Validation', () => {
    it('shows error when passwords do not match', async () => {
      const user = userEvent.setup()
      render(<SignupPage />)
      
      await user.type(screen.getByPlaceholderText(/email/i), 'test@example.com')
      await user.type(screen.getByPlaceholderText('Password'), 'password123')
      await user.type(screen.getByPlaceholderText(/confirm password/i), 'differentpassword')
      await user.click(screen.getByRole('button', { name: /sign up/i }))
      
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument()
      expect(mockSignUp).not.toHaveBeenCalled()
    })

    it('shows error when password is less than 6 characters', async () => {
      const user = userEvent.setup()
      render(<SignupPage />)
      
      await user.type(screen.getByPlaceholderText(/email/i), 'test@example.com')
      await user.type(screen.getByPlaceholderText('Password'), '12345')
      await user.type(screen.getByPlaceholderText(/confirm password/i), '12345')
      await user.click(screen.getByRole('button', { name: /sign up/i }))
      
      expect(screen.getByText(/password must be at least 6 characters/i)).toBeInTheDocument()
      expect(mockSignUp).not.toHaveBeenCalled()
    })
  })

  describe('Form Submission', () => {
    it('calls signUp with email and password on valid form submit', async () => {
      const user = userEvent.setup()
      mockSignUp.mockResolvedValue({ error: null })
      
      render(<SignupPage />)
      
      await user.type(screen.getByPlaceholderText(/email/i), 'test@example.com')
      await user.type(screen.getByPlaceholderText('Password'), 'password123')
      await user.type(screen.getByPlaceholderText(/confirm password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /sign up/i }))
      
      await waitFor(() => {
        expect(mockSignUp).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123',
          options: expect.objectContaining({
            emailRedirectTo: expect.stringContaining('/auth/callback'),
          }),
        })
      })
    })

    it('shows loading state during submission', async () => {
      const user = userEvent.setup()
      // Never resolve to keep loading state
      mockSignUp.mockImplementation(() => new Promise(() => {}))
      
      render(<SignupPage />)
      
      await user.type(screen.getByPlaceholderText(/email/i), 'test@example.com')
      await user.type(screen.getByPlaceholderText('Password'), 'password123')
      await user.type(screen.getByPlaceholderText(/confirm password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /sign up/i }))
      
      expect(screen.getByRole('button', { name: /creating account/i })).toBeInTheDocument()
    })

    it('shows success message after successful signup', async () => {
      const user = userEvent.setup()
      mockSignUp.mockResolvedValue({ error: null })
      
      render(<SignupPage />)
      
      await user.type(screen.getByPlaceholderText(/email/i), 'test@example.com')
      await user.type(screen.getByPlaceholderText('Password'), 'password123')
      await user.type(screen.getByPlaceholderText(/confirm password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /sign up/i }))
      
      await waitFor(() => {
        expect(screen.getByText(/check your email/i)).toBeInTheDocument()
      })
    })

    it('shows error message on signup failure', async () => {
      const user = userEvent.setup()
      mockSignUp.mockResolvedValue({ 
        error: { message: 'Email already registered' } 
      })
      
      render(<SignupPage />)
      
      await user.type(screen.getByPlaceholderText(/email/i), 'test@example.com')
      await user.type(screen.getByPlaceholderText('Password'), 'password123')
      await user.type(screen.getByPlaceholderText(/confirm password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /sign up/i }))
      
      await waitFor(() => {
        expect(screen.getByText(/email already registered/i)).toBeInTheDocument()
      })
    })
  })

  describe('Google OAuth', () => {
    it('calls signInWithOAuth when Google button is clicked', async () => {
      const user = userEvent.setup()
      mockSignInWithOAuth.mockResolvedValue({ error: null })
      
      render(<SignupPage />)
      
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
