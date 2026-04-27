import '@testing-library/jest-dom'
import { vi, beforeEach } from 'vitest'
import type { Card, Wing, Room } from '@/types'

// ============================================================================
// MOCK DATA STORE (COP: Flat arrays, explicit relationships)
// ============================================================================
export const mockStore = {
  cards: [] as Card[],
  wings: [] as Wing[],
  rooms: [] as Room[],
  currentUser: { id: 'test-user-id', email: 'test@example.com' } as { id: string; email: string } | null,

  reset() {
    this.cards = []
    this.wings = []
    this.rooms = []
    this.currentUser = { id: 'test-user-id', email: 'test@example.com' }
  },

  seedCards(cards: Card[]) {
    this.cards = [...cards]
  },

  seedWings(wings: Wing[]) {
    this.wings = [...wings]
  },

  seedRooms(rooms: Room[]) {
    this.rooms = [...rooms]
  }
}

// Fire-and-forget /api/memory/sync calls in useNotes must not pollute test
// output. Stub global fetch to a successful no-op when present.
if (typeof globalThis.fetch === 'undefined') {
  globalThis.fetch = vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ ok: true }), { status: 200 })
  )
} else {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify({ ok: true }), { status: 200 })
  )
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
    if (table === 'wings') return makeTableMock('wings')
    if (table === 'rooms') return makeTableMock('rooms')
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

// Generic table mock for wings/rooms (palace tests). Mirrors the card path
// but stays simple since palace CRUD doesn't exercise filtering shapes.
type TableName = 'wings' | 'rooms'
function makeTableMock(table: TableName) {
  const list = () =>
    (mockStore[table] as Array<{ user_id: string; id: string }>).filter(
      (row) => row.user_id === mockStore.currentUser?.id
    )

  const select = vi.fn(() => ({
    order: vi.fn(async () => ({ data: list(), error: null })),
    eq: vi.fn((_field: string, value: string) => ({
      order: vi.fn(async () => ({
        data: list().filter((row) =>
          'wing_id' in row
            ? (row as unknown as { wing_id: string }).wing_id === value
            : row.id === value
        ),
        error: null,
      })),
      single: vi.fn(async () => {
        const row = list().find((r) => r.id === value)
        return {
          data: row ?? null,
          error: row ? null : { message: 'Not found' },
        }
      }),
    })),
  }))

  const insert = vi.fn((data: Record<string, unknown>) => ({
    select: vi.fn(() => ({
      single: vi.fn(async () => {
        const id = `${table.slice(0, -1)}-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 6)}`
        const row = {
          id,
          user_id: mockStore.currentUser?.id ?? '',
          ...data,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        ;(mockStore[table] as unknown as Array<typeof row>).push(row)
        return { data: row, error: null }
      }),
    })),
  }))

  const update = vi.fn((data: Record<string, unknown>) => ({
    eq: vi.fn((_field: string, value: string) => ({
      select: vi.fn(() => ({
        single: vi.fn(async () => {
          const arr = mockStore[table] as Array<{ id: string }>
          const idx = arr.findIndex((r) => r.id === value)
          if (idx === -1)
            return { data: null, error: { message: 'Not found' } }
          arr[idx] = {
            ...arr[idx],
            ...data,
            updated_at: new Date().toISOString(),
          } as (typeof arr)[number]
          return { data: arr[idx], error: null }
        }),
      })),
    })),
  }))

  const del = vi.fn(() => ({
    eq: vi.fn((_field: string, value: string) => {
      const arr = mockStore[table] as Array<{ id: string }>
      ;(mockStore as unknown as Record<string, unknown>)[table] = arr.filter(
        (r) => r.id !== value
      )
      return Promise.resolve({ error: null })
    }),
  }))

  return { select, insert, update, delete: del }
}

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
