import '@testing-library/jest-dom'
import { vi, beforeEach } from 'vitest'
import type { Card } from '@/types'

// ============================================================================
// MOCK DATA STORE (COP: Flat arrays, explicit relationships)
// ============================================================================
export const mockStore = {
  cards: [] as Card[],
  currentUser: { id: 'test-user-id', email: 'test@example.com' } as { id: string; email: string } | null,
  
  reset() {
    this.cards = []
    this.currentUser = { id: 'test-user-id', email: 'test@example.com' }
  },
  
  seedCards(cards: Card[]) {
    this.cards = [...cards]
  }
}

// Reset before each test
beforeEach(() => {
  mockStore.reset()
})

// ============================================================================
// SUPABASE CLIENT MOCK
// ============================================================================
export const createMockSupabaseClient = () => ({
  auth: {
    getUser: vi.fn().mockImplementation(async () => ({
      data: { user: mockStore.currentUser },
      error: null
    })),
    getSession: vi.fn().mockImplementation(async () => ({
      data: { session: mockStore.currentUser ? { user: mockStore.currentUser } : null },
      error: null
    })),
    signInWithPassword: vi.fn().mockImplementation(async ({ email, password }) => {
      if (email === 'test@example.com' && password === 'password123') {
        mockStore.currentUser = { id: 'test-user-id', email }
        return { data: { user: mockStore.currentUser }, error: null }
      }
      return { data: { user: null }, error: { message: 'Invalid credentials' } }
    }),
    signInWithOAuth: vi.fn().mockImplementation(async () => ({
      data: { url: 'https://oauth.example.com' },
      error: null
    })),
    signUp: vi.fn().mockImplementation(async ({ email }) => {
      mockStore.currentUser = { id: 'new-user-id', email }
      return { data: { user: mockStore.currentUser }, error: null }
    }),
    signOut: vi.fn().mockImplementation(async () => {
      mockStore.currentUser = null
      return { error: null }
    }),
    onAuthStateChange: vi.fn().mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } }
    })
  },
  from: vi.fn().mockImplementation((table: string) => {
    if (table !== 'cards') return {}
    
    return {
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockImplementation(async () => ({
          data: mockStore.cards.filter(c => c.user_id === mockStore.currentUser?.id),
          error: null
        })),
        eq: vi.fn().mockImplementation((field: string, value: string) => ({
          single: vi.fn().mockImplementation(async () => {
            const card = mockStore.cards.find(c => c.id === value)
            return { data: card || null, error: card ? null : { message: 'Not found' } }
          })
        }))
      }),
      insert: vi.fn().mockImplementation((data: Partial<Card>) => ({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockImplementation(async () => {
            const newCard: Card = {
              id: `card-${Date.now()}`,
              user_id: mockStore.currentUser?.id || '',
              title: data.title || 'Untitled',
              content: data.content || {},
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
            mockStore.cards.push(newCard)
            return { data: newCard, error: null }
          })
        })
      })),
      update: vi.fn().mockImplementation((data: Partial<Card>) => ({
        eq: vi.fn().mockImplementation((field: string, value: string) => ({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockImplementation(async () => {
              const index = mockStore.cards.findIndex(c => c.id === value)
              if (index === -1) return { data: null, error: { message: 'Not found' } }
              mockStore.cards[index] = { 
                ...mockStore.cards[index], 
                ...data, 
                updated_at: new Date().toISOString() 
              }
              return { data: mockStore.cards[index], error: null }
            })
          })
        }))
      })),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockImplementation((field: string, value: string) => {
          // Return a promise that resolves with the result
          const result = Promise.resolve({ error: null })
          // Side effect: remove from store
          mockStore.cards = mockStore.cards.filter(c => c.id !== value)
          return result
        })
      })
    }
  })
})

// Global Supabase mock
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => createMockSupabaseClient()
}))

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
  useParams: () => ({}),
  redirect: vi.fn(),
  notFound: vi.fn(),
}))

// Mock next/headers (for server components testing)
vi.mock('next/headers', () => ({
  cookies: () => ({
    get: vi.fn(),
    getAll: vi.fn(() => []),
    set: vi.fn(),
    delete: vi.fn(),
  }),
  headers: () => new Headers(),
}))

// Suppress console.error for expected test failures (optional)
// Uncomment if needed:
// const originalError = console.error
// beforeAll(() => {
//   console.error = (...args: unknown[]) => {
//     if (typeof args[0] === 'string' && args[0].includes('Warning:')) return
//     originalError.call(console, ...args)
//   }
// })
// afterAll(() => {
//   console.error = originalError
// })
