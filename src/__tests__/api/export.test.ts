// @vitest-environment node
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { __resetDbForTests } from '@/lib/db/sqlite'
import { createWing, createRoom, createCard, db } from '@/lib/db/repo'
import { GET } from '@/app/api/export/route'

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

describe('GET /api/export', () => {
  it('returns 401 when not authenticated', async () => {
    const { requireAuth } = await import('@/lib/auth/guard')
    const { NextResponse } = await import('next/server')
    ;(requireAuth as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
    )

    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('returns empty arrays on empty DB with correct envelope shape', async () => {
    const res = await GET()
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.version).toBe(1)
    expect(new Date(body.exported_at).toISOString()).toBe(body.exported_at)
    expect(body.wings).toEqual([])
    expect(body.rooms).toEqual([])
    expect(body.cards).toEqual([])
    expect(body.embeddings).toEqual([])
  })

  it('sets content-disposition attachment header', async () => {
    const res = await GET()
    const disposition = res.headers.get('content-disposition') ?? ''
    expect(disposition).toMatch(/attachment/)
    expect(disposition).toMatch(/mindforge-export-\d{4}-\d{2}-\d{2}\.json/)
  })

  it('includes seeded data and vector round-trips correctly', async () => {
    const wing = createWing({ name: 'Test Wing', color: '#ff0000' })
    const room = createRoom({ wing_id: wing.id, name: 'Test Room' })
    const card1 = createCard({ title: 'Card One', content: {}, roomId: room.id })
    const card2 = createCard({ title: 'Card Two', content: {} })

    // Insert a raw embedding BLOB (Float32Array of dim 4)
    const vec = new Float32Array([0.1, 0.2, 0.3, 0.4])
    const vecBuf = Buffer.from(vec.buffer)
    db()
      .prepare(
        'insert into card_embeddings (card_id, vector, dim, text, updated_at) values (?, ?, ?, ?, ?)'
      )
      .run(card1.id, vecBuf, 4, 'Card One', new Date().toISOString())

    const res = await GET()
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.wings).toHaveLength(1)
    expect(body.rooms).toHaveLength(1)
    expect(body.cards).toHaveLength(2)
    expect(body.embeddings).toHaveLength(1)

    const emb = body.embeddings[0]
    expect(emb.card_id).toBe(card1.id)
    expect(emb.dim).toBe(4)
    expect(typeof emb.vector_b64).toBe('string')

    // Decode base64 back to Float32Array and verify values
    const decoded = Buffer.from(emb.vector_b64, 'base64')
    const f32 = new Float32Array(decoded.buffer, decoded.byteOffset, emb.dim)
    expect(f32).toHaveLength(4)
    expect(f32[0]).toBeCloseTo(0.1)
    expect(f32[1]).toBeCloseTo(0.2)
    expect(f32[2]).toBeCloseTo(0.3)
    expect(f32[3]).toBeCloseTo(0.4)

    // card2 has no embedding — confirm only 1 embedding total
    const ids = body.cards.map((c: { id: string }) => c.id)
    expect(ids).toContain(card1.id)
    expect(ids).toContain(card2.id)
  })
})
