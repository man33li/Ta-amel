// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { __resetDbForTests } from '@/lib/db/sqlite'
import { createCard } from '@/lib/db/repo'
import { POST } from '@/app/api/memory/sync/route'

vi.mock('@/lib/auth/guard', () => ({
  requireAuth: vi.fn(async () => null),
}))

vi.mock('@/lib/memory/store', () => ({
  syncCardEmbedding: vi.fn(async () => {}),
  removeCardEmbedding: vi.fn(() => {}),
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

describe('POST /api/memory/sync', () => {
  it('returns 401 when not authenticated', async () => {
    const { requireAuth } = await import('@/lib/auth/guard')
    const { NextResponse } = await import('next/server')
    ;(requireAuth as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
    )

    const res = await POST(
      new Request('http://test.local/api/memory/sync', {
        method: 'POST',
        body: JSON.stringify({ cardId: 'x' }),
        headers: { 'content-type': 'application/json' },
      })
    )
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ ok: false, error: 'unauthorized' })
  })

  it('returns 400 invalid_json for a non-JSON body', async () => {
    const res = await POST(
      new Request('http://test.local/api/memory/sync', {
        method: 'POST',
        body: 'not-json',
        headers: { 'content-type': 'text/plain' },
      })
    )
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ ok: false, error: 'invalid_json' })
  })

  it('returns 400 missing_card_id when cardId is absent', async () => {
    const res = await POST(
      new Request('http://test.local/api/memory/sync', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'content-type': 'application/json' },
      })
    )
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ ok: false, error: 'missing_card_id' })
  })

  it('returns 200 synced:false reason:disabled when embeddings are disabled', async () => {
    const { isEmbeddingDisabled } = await import('@/lib/embed/embedder')
    const { syncCardEmbedding } = await import('@/lib/memory/store')
    ;(isEmbeddingDisabled as ReturnType<typeof vi.fn>).mockReturnValueOnce(true)

    const res = await POST(
      new Request('http://test.local/api/memory/sync', {
        method: 'POST',
        body: JSON.stringify({ cardId: 'any-id' }),
        headers: { 'content-type': 'application/json' },
      })
    )
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true, synced: false, reason: 'disabled' })
    expect(syncCardEmbedding).not.toHaveBeenCalled()
  })

  it('returns 404 not_found for an unknown cardId', async () => {
    const res = await POST(
      new Request('http://test.local/api/memory/sync', {
        method: 'POST',
        body: JSON.stringify({ cardId: 'does-not-exist' }),
        headers: { 'content-type': 'application/json' },
      })
    )
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ ok: false, error: 'not_found' })
  })

  it('calls syncCardEmbedding and returns 200 synced:true for a valid card', async () => {
    const { syncCardEmbedding } = await import('@/lib/memory/store')
    const card = createCard({ title: 'My Card', content: { type: 'doc' } })

    const res = await POST(
      new Request('http://test.local/api/memory/sync', {
        method: 'POST',
        body: JSON.stringify({ cardId: card.id }),
        headers: { 'content-type': 'application/json' },
      })
    )
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true, synced: true })
    expect(syncCardEmbedding).toHaveBeenCalledOnce()
    expect((syncCardEmbedding as ReturnType<typeof vi.fn>).mock.calls[0][0].id).toBe(card.id)
  })

  it('returns 200 synced:false (swallowed) when syncCardEmbedding throws', async () => {
    const { syncCardEmbedding } = await import('@/lib/memory/store')
    ;(syncCardEmbedding as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('boom')
    )
    const card = createCard({ title: 'Error Card', content: {} })

    const res = await POST(
      new Request('http://test.local/api/memory/sync', {
        method: 'POST',
        body: JSON.stringify({ cardId: card.id }),
        headers: { 'content-type': 'application/json' },
      })
    )
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true, synced: false })
  })
})
