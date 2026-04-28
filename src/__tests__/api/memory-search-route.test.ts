// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { __resetDbForTests } from '@/lib/db/sqlite'
import { createCard } from '@/lib/db/repo'
import { GET } from '@/app/api/memory/search/route'

vi.mock('@/lib/auth/guard', () => ({
  requireAuth: vi.fn(async () => null),
}))

vi.mock('@/lib/memory/store', () => ({
  syncCardEmbedding: vi.fn(async () => {}),
  removeCardEmbedding: vi.fn(() => {}),
  semanticSearch: vi.fn(async () => []),
}))

vi.mock('@/lib/embed/embedder', () => ({
  isEmbeddingDisabled: vi.fn(() => false),
}))

beforeEach(() => {
  process.env.MINDFORGE_DB_PATH = ':memory:'
  __resetDbForTests()
  vi.clearAllMocks()
})

afterEach(() => {
  __resetDbForTests()
})

describe('GET /api/memory/search', () => {
  it('returns 401 when not authenticated', async () => {
    const { requireAuth } = await import('@/lib/auth/guard')
    const { NextResponse } = await import('next/server')
    ;(requireAuth as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
    )

    const res = await GET(new Request('http://test.local/api/memory/search?q=hello'))
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ ok: false, error: 'unauthorized' })
  })

  it('returns empty result and skips semanticSearch when query is missing', async () => {
    const { semanticSearch } = await import('@/lib/memory/store')

    const res = await GET(new Request('http://test.local/api/memory/search'))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ memories: [], cards: [], hits: [] })
    expect(semanticSearch).not.toHaveBeenCalled()
  })

  it('returns empty result and skips semanticSearch when query is blank', async () => {
    const { semanticSearch } = await import('@/lib/memory/store')

    const res = await GET(new Request('http://test.local/api/memory/search?q='))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ memories: [], cards: [], hits: [] })
    expect(semanticSearch).not.toHaveBeenCalled()
  })

  it('calls semanticSearch with query, roomId null, and default limit 10', async () => {
    const { semanticSearch } = await import('@/lib/memory/store')

    const res = await GET(new Request('http://test.local/api/memory/search?q=foo'))
    expect(res.status).toBe(200)
    expect(semanticSearch).toHaveBeenCalledOnce()
    const call = (semanticSearch as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(call).toEqual({ query: 'foo', roomId: null, limit: 10 })
  })

  it('passes roomId from room_id query param', async () => {
    const { semanticSearch } = await import('@/lib/memory/store')

    await GET(new Request('http://test.local/api/memory/search?q=foo&room_id=r1'))
    const call = (semanticSearch as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(call.roomId).toBe('r1')
  })

  it('passes numeric limit from limit query param', async () => {
    const { semanticSearch } = await import('@/lib/memory/store')

    await GET(new Request('http://test.local/api/memory/search?q=foo&limit=5'))
    const call = (semanticSearch as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(call.limit).toBe(5)
  })

  it('keyword lane: card with matching title appears in cards array', async () => {
    createCard({ title: 'alpha notes', content: {} })
    createCard({ title: 'beta notes', content: {} })

    const res = await GET(new Request('http://test.local/api/memory/search?q=alpha'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.cards.length).toBeGreaterThanOrEqual(1)
    expect(body.cards[0].title).toBe('alpha notes')
  })

  it('recent lane: recently created card appears in merged hits even with unmatching query', async () => {
    // createCard sets updated_at to now, so it falls inside the 14-day window.
    createCard({ title: 'recent-unique-card', content: {} })

    // semanticSearch returns empty; keyword won't match 'zzz-no-match'.
    const res = await GET(
      new Request('http://test.local/api/memory/search?q=zzz-no-match')
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    // The recent lane feeds into hits via RRF merge.
    const recentHit = body.hits.find(
      (h: { title: string }) => h.title === 'recent-unique-card'
    )
    expect(recentHit).toBeDefined()
    expect(recentHit.source).toBe('recent')
  })

  it('returns 200 with memories:[] when semanticSearch rejects', async () => {
    const { semanticSearch } = await import('@/lib/memory/store')
    ;(semanticSearch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('embed boom')
    )

    const res = await GET(new Request('http://test.local/api/memory/search?q=foo'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.memories).toEqual([])
  })
})
