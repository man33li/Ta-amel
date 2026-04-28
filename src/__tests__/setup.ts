import '@testing-library/jest-dom'
import { vi, beforeEach } from 'vitest'
import type { Card, Wing, Room, SearchHit } from '@/types'

// Tests run against plaintext SQLite. Encryption is exercised explicitly in
// src/__tests__/lib/db-encryption.test.ts which clears this flag.
process.env.MINDFORGE_DISABLE_ENCRYPTION = '1'

// ============================================================================
// MOCK DATA STORE
// ============================================================================

export const mockStore = {
  cards: [] as Card[],
  wings: [] as Wing[],
  rooms: [] as Room[],
  authenticated: true, // assume logged in for most tests
  reset() {
    this.cards = []
    this.wings = []
    this.rooms = []
    this.authenticated = true
  },
  seedCards(cards: Card[]) {
    this.cards = [...cards]
  },
  seedWings(wings: Wing[]) {
    this.wings = [...wings]
  },
  seedRooms(rooms: Room[]) {
    this.rooms = [...rooms]
  },
}

beforeEach(() => mockStore.reset())

// ============================================================================
// FETCH MOCK — simulates the v3.0 API surface against the in-memory store.
// ============================================================================

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  })

const newId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

interface FetchInput {
  url: string
  method: string
  body: unknown
}

const parseInput = async (
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<FetchInput> => {
  const url = typeof input === 'string' ? input : input.toString()
  const method = (init?.method ?? 'GET').toUpperCase()
  let body: unknown = null
  if (init?.body) {
    try {
      body = JSON.parse(init.body as string)
    } catch {
      body = init.body
    }
  }
  return { url, method, body }
}

async function handleFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const { url, method, body } = await parseInput(input, init)
  const path = url.startsWith('http') ? new URL(url).pathname + new URL(url).search : url
  const [pathname, query = ''] = path.split('?')
  const params = new URLSearchParams(query)

  if (!mockStore.authenticated && !pathname.startsWith('/api/auth/')) {
    return json({ ok: false, error: 'unauthorized' }, 401)
  }

  // Auth -----------------------------------------------------------------
  if (pathname === '/api/auth/session' && method === 'GET') {
    return json({ setUp: true, authenticated: mockStore.authenticated })
  }
  if (pathname === '/api/auth/login' && method === 'POST') {
    mockStore.authenticated = true
    return json({ ok: true })
  }
  if (pathname === '/api/auth/logout' && method === 'POST') {
    mockStore.authenticated = false
    return json({ ok: true })
  }
  if (pathname === '/api/auth/setup' && method === 'POST') {
    mockStore.authenticated = true
    return json({ ok: true })
  }

  // Cards ----------------------------------------------------------------
  if (pathname === '/api/cards' && method === 'GET') {
    const roomId = params.get('room_id')
    const cards = roomId
      ? mockStore.cards.filter((c) => c.room_id === roomId)
      : [...mockStore.cards]
    cards.sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    return json({ cards })
  }
  if (pathname === '/api/cards' && method === 'POST') {
    const b = (body ?? {}) as {
      title?: string
      content?: Record<string, unknown>
      room_id?: string | null
    }
    const card: Card = {
      id: newId('card'),
      user_id: 'me',
      title: b.title ?? 'Untitled',
      content: b.content ?? {},
      room_id: b.room_id ?? null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    mockStore.cards.unshift(card)
    return json({ card }, 201)
  }
  const cardIdMatch = pathname.match(/^\/api\/cards\/([^/]+)$/)
  if (cardIdMatch) {
    const id = cardIdMatch[1]
    const idx = mockStore.cards.findIndex((c) => c.id === id)
    if (method === 'GET') {
      const card = mockStore.cards[idx]
      return card ? json({ card }) : json({ ok: false, error: 'not_found' }, 404)
    }
    if (method === 'PATCH') {
      if (idx === -1) return json({ ok: false, error: 'not_found' }, 404)
      const b = (body ?? {}) as Partial<Card>
      mockStore.cards[idx] = {
        ...mockStore.cards[idx],
        ...b,
        updated_at: new Date().toISOString(),
      }
      return json({ card: mockStore.cards[idx] })
    }
    if (method === 'DELETE') {
      if (idx === -1) return json({ ok: false, error: 'not_found' }, 404)
      mockStore.cards.splice(idx, 1)
      return json({ ok: true })
    }
  }

  // Wings ----------------------------------------------------------------
  if (pathname === '/api/wings' && method === 'GET') {
    return json({ wings: [...mockStore.wings] })
  }
  if (pathname === '/api/wings' && method === 'POST') {
    const b = (body ?? {}) as { name?: string; color?: string | null }
    const wing: Wing = {
      id: newId('wing'),
      user_id: 'me',
      name: b.name ?? '',
      color: b.color ?? null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    mockStore.wings.push(wing)
    return json({ wing }, 201)
  }
  const wingIdMatch = pathname.match(/^\/api\/wings\/([^/]+)$/)
  if (wingIdMatch) {
    const id = wingIdMatch[1]
    const idx = mockStore.wings.findIndex((w) => w.id === id)
    if (method === 'PATCH') {
      if (idx === -1) return json({ ok: false, error: 'not_found' }, 404)
      const b = (body ?? {}) as Partial<Wing>
      mockStore.wings[idx] = {
        ...mockStore.wings[idx],
        ...b,
        updated_at: new Date().toISOString(),
      }
      return json({ wing: mockStore.wings[idx] })
    }
    if (method === 'DELETE') {
      if (idx === -1) return json({ ok: false, error: 'not_found' }, 404)
      mockStore.wings.splice(idx, 1)
      // Cascade: rooms in this wing go away too.
      mockStore.rooms = mockStore.rooms.filter((r) => r.wing_id !== id)
      return json({ ok: true })
    }
  }

  // Rooms ----------------------------------------------------------------
  if (pathname === '/api/rooms' && method === 'GET') {
    const wingId = params.get('wing_id')
    const rooms = wingId
      ? mockStore.rooms.filter((r) => r.wing_id === wingId)
      : [...mockStore.rooms]
    return json({ rooms })
  }
  if (pathname === '/api/rooms' && method === 'POST') {
    const b = (body ?? {}) as {
      wing_id?: string
      name?: string
      description?: string | null
    }
    if (!b.wing_id || !b.name) {
      return json({ ok: false, error: 'wing_id_and_name_required' }, 400)
    }
    const room: Room = {
      id: newId('room'),
      wing_id: b.wing_id,
      user_id: 'me',
      name: b.name,
      description: b.description ?? null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    mockStore.rooms.push(room)
    return json({ room }, 201)
  }
  const roomIdMatch = pathname.match(/^\/api\/rooms\/([^/]+)$/)
  if (roomIdMatch) {
    const id = roomIdMatch[1]
    const idx = mockStore.rooms.findIndex((r) => r.id === id)
    if (method === 'PATCH') {
      if (idx === -1) return json({ ok: false, error: 'not_found' }, 404)
      const b = (body ?? {}) as Partial<Room>
      mockStore.rooms[idx] = {
        ...mockStore.rooms[idx],
        ...b,
        updated_at: new Date().toISOString(),
      }
      return json({ room: mockStore.rooms[idx] })
    }
    if (method === 'DELETE') {
      if (idx === -1) return json({ ok: false, error: 'not_found' }, 404)
      mockStore.rooms.splice(idx, 1)
      return json({ ok: true })
    }
  }

  // Memory ---------------------------------------------------------------
  if (pathname === '/api/memory/sync' && method === 'POST') {
    return json({ ok: true, synced: false })
  }
  if (pathname === '/api/memory/search' && method === 'GET') {
    return json({ memories: [], cards: [], hits: [] as SearchHit[] })
  }

  return json({ ok: false, error: 'not_found' }, 404)
}

vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) =>
  handleFetch(input as RequestInfo | URL, init as RequestInit | undefined)
)

// ============================================================================
// next/navigation, next/headers — unchanged from v2.0
// ============================================================================

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

vi.mock('next/headers', () => ({
  cookies: () => ({
    get: vi.fn(),
    getAll: vi.fn(() => []),
    set: vi.fn(),
    delete: vi.fn(),
  }),
  headers: () => new Headers(),
}))
