// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { __resetDbForTests } from '@/lib/db/sqlite'
import { createCard, createWing, createRoom, listCards } from '@/lib/db/repo'
import { GET, POST } from '@/app/api/cards/route'

vi.mock('@/lib/auth/guard', () => ({
  requireAuth: vi.fn(async () => null),
}))

beforeEach(() => {
  process.env.MINDFORGE_DB_PATH = ':memory:'
  __resetDbForTests()
  vi.clearAllMocks()
})

afterEach(() => {
  __resetDbForTests()
})

describe('GET /api/cards', () => {
  it('returns 401 when not authenticated', async () => {
    const { requireAuth } = await import('@/lib/auth/guard')
    const { NextResponse } = await import('next/server')
    ;(requireAuth as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
    )

    const res = await GET(new Request('http://test.local/api/cards'))
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ ok: false, error: 'unauthorized' })
  })

  it('returns { cards: [] } on empty DB', async () => {
    const res = await GET(new Request('http://test.local/api/cards'))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ cards: [] })
  })

  it('returns all cards ordered by updated_at desc after seeding 3', async () => {
    createCard({ title: 'First', content: {} })
    createCard({ title: 'Second', content: {} })
    createCard({ title: 'Third', content: {} })

    const res = await GET(new Request('http://test.local/api/cards'))
    expect(res.status).toBe(200)
    const { cards } = await res.json()
    expect(cards).toHaveLength(3)
    // updated_at desc — each subsequent card should be <= the previous
    for (let i = 1; i < cards.length; i++) {
      expect(cards[i].updated_at <= cards[i - 1].updated_at).toBe(true)
    }
  })

  it('filters by room_id when query param is present', async () => {
    const wing = createWing({ name: 'Wing A' })
    const room = createRoom({ wing_id: wing.id, name: 'Room X' })
    createCard({ title: 'In Room', content: {}, roomId: room.id })
    createCard({ title: 'No Room', content: {} })

    const res = await GET(
      new Request(`http://test.local/api/cards?room_id=${room.id}`)
    )
    expect(res.status).toBe(200)
    const { cards } = await res.json()
    expect(cards).toHaveLength(1)
    expect(cards[0].title).toBe('In Room')
    expect(cards[0].room_id).toBe(room.id)
  })
})

describe('POST /api/cards', () => {
  it('creates a card and returns 201 { card }', async () => {
    const res = await POST(
      new Request('http://test.local/api/cards', {
        method: 'POST',
        body: JSON.stringify({ title: 'New Card', content: { type: 'doc' } }),
        headers: { 'content-type': 'application/json' },
      })
    )
    expect(res.status).toBe(201)
    const { card } = await res.json()
    expect(card.title).toBe('New Card')
    expect(card.id).toBeDefined()

    const all = listCards()
    expect(all).toHaveLength(1)
    expect(all[0].id).toBe(card.id)
  })

  it('returns 400 invalid_json for a non-JSON body', async () => {
    const res = await POST(
      new Request('http://test.local/api/cards', {
        method: 'POST',
        body: 'not-json',
        headers: { 'content-type': 'text/plain' },
      })
    )
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ ok: false, error: 'invalid_json' })
  })

  it('accepts empty body {} and defaults to title Untitled, room_id null', async () => {
    const res = await POST(
      new Request('http://test.local/api/cards', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'content-type': 'application/json' },
      })
    )
    expect(res.status).toBe(201)
    const { card } = await res.json()
    expect(card.title).toBe('Untitled')
    expect(card.room_id).toBeNull()
  })
})
