// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { __resetDbForTests } from '@/lib/db/sqlite'
import { createCard, getCard } from '@/lib/db/repo'
import { GET, PATCH, DELETE } from '@/app/api/cards/[id]/route'

vi.mock('@/lib/auth/guard', () => ({
  requireAuth: vi.fn(async () => null),
}))

vi.mock('@/lib/memory/store', () => ({
  syncCardEmbedding: vi.fn(async () => {}),
  removeCardEmbedding: vi.fn(() => {}),
}))

beforeEach(() => {
  process.env.MINDFORGE_DB_PATH = ':memory:'
  __resetDbForTests()
  vi.clearAllMocks()
})

afterEach(() => {
  __resetDbForTests()
})

const params = (id: string) => ({ params: Promise.resolve({ id }) })

describe('GET /api/cards/[id]', () => {
  it('returns 401 when not authenticated', async () => {
    const { requireAuth } = await import('@/lib/auth/guard')
    const { NextResponse } = await import('next/server')
    ;(requireAuth as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
    )

    const res = await GET(
      new Request('http://test.local/api/cards/missing'),
      params('missing')
    )
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ ok: false, error: 'unauthorized' })
  })

  it('returns 404 for an unknown id', async () => {
    const res = await GET(
      new Request('http://test.local/api/cards/no-such-id'),
      params('no-such-id')
    )
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ ok: false, error: 'not_found' })
  })

  it('returns 200 { card } for an existing id', async () => {
    const seeded = createCard({ title: 'Hello', content: {} })
    const res = await GET(
      new Request(`http://test.local/api/cards/${seeded.id}`),
      params(seeded.id)
    )
    expect(res.status).toBe(200)
    const { card } = await res.json()
    expect(card.id).toBe(seeded.id)
    expect(card.title).toBe('Hello')
  })
})

describe('PATCH /api/cards/[id]', () => {
  it('returns 404 for an unknown id', async () => {
    const res = await PATCH(
      new Request('http://test.local/api/cards/ghost', {
        method: 'PATCH',
        body: JSON.stringify({ title: 'x' }),
        headers: { 'content-type': 'application/json' },
      }),
      params('ghost')
    )
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ ok: false, error: 'not_found' })
  })

  it('returns 400 invalid_json for a non-JSON body', async () => {
    const seeded = createCard({ title: 'Original', content: {} })
    const res = await PATCH(
      new Request(`http://test.local/api/cards/${seeded.id}`, {
        method: 'PATCH',
        body: 'not-json',
        headers: { 'content-type': 'text/plain' },
      }),
      params(seeded.id)
    )
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ ok: false, error: 'invalid_json' })
  })

  it('updates the card title and calls syncCardEmbedding once', async () => {
    const { syncCardEmbedding } = await import('@/lib/memory/store')
    const seeded = createCard({ title: 'Old Title', content: {} })

    const res = await PATCH(
      new Request(`http://test.local/api/cards/${seeded.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ title: 'new title' }),
        headers: { 'content-type': 'application/json' },
      }),
      params(seeded.id)
    )
    expect(res.status).toBe(200)
    const { card } = await res.json()
    expect(card.title).toBe('new title')
    expect(syncCardEmbedding).toHaveBeenCalledOnce()
    expect((syncCardEmbedding as ReturnType<typeof vi.fn>).mock.calls[0][0].id).toBe(seeded.id)
  })

  it('still returns 200 when syncCardEmbedding rejects', async () => {
    const { syncCardEmbedding } = await import('@/lib/memory/store')
    ;(syncCardEmbedding as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('boom')
    )
    const seeded = createCard({ title: 'Title', content: {} })

    const res = await PATCH(
      new Request(`http://test.local/api/cards/${seeded.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ title: 'patched' }),
        headers: { 'content-type': 'application/json' },
      }),
      params(seeded.id)
    )
    expect(res.status).toBe(200)
    const { card } = await res.json()
    expect(card.title).toBe('patched')
  })
})

describe('DELETE /api/cards/[id]', () => {
  it('returns 404 for an unknown id', async () => {
    const res = await DELETE(
      new Request('http://test.local/api/cards/ghost', { method: 'DELETE' }),
      params('ghost')
    )
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ ok: false, error: 'not_found' })
  })

  it('deletes the card, returns 200 { ok: true }, calls removeCardEmbedding', async () => {
    const { removeCardEmbedding } = await import('@/lib/memory/store')
    const seeded = createCard({ title: 'Bye', content: {} })

    const res = await DELETE(
      new Request(`http://test.local/api/cards/${seeded.id}`, { method: 'DELETE' }),
      params(seeded.id)
    )
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
    expect(getCard(seeded.id)).toBeNull()
    expect(removeCardEmbedding).toHaveBeenCalledOnce()
    expect((removeCardEmbedding as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe(seeded.id)
  })
})
