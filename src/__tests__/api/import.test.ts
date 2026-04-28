// @vitest-environment node
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { __resetDbForTests } from '@/lib/db/sqlite'
import { createWing, db } from '@/lib/db/repo'
import { POST } from '@/app/api/import/route'
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

function makeRequest(body: unknown) {
  return new Request('http://test.local/api/import', {
    method: 'POST',
    body: typeof body === 'string' ? body : JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}

const emptyPayload = { version: 1, wings: [], rooms: [], cards: [], embeddings: [] }

describe('POST /api/import', () => {
  it('returns 401 when not authenticated', async () => {
    const { requireAuth } = await import('@/lib/auth/guard')
    const { NextResponse } = await import('next/server')
    ;(requireAuth as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
    )

    const res = await POST(makeRequest(emptyPayload))
    expect(res.status).toBe(401)
  })

  it('returns 400 invalid_json for a non-JSON body', async () => {
    const req = new Request('http://test.local/api/import', {
      method: 'POST',
      body: 'not json',
      headers: { 'content-type': 'text/plain' },
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ ok: false, error: 'invalid_json' })
  })

  it('returns 400 unsupported_version for version !== 1', async () => {
    const res = await POST(makeRequest({ ...emptyPayload, version: 2 }))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ ok: false, error: 'unsupported_version' })
  })

  it('returns 400 invalid_payload when arrays are missing', async () => {
    const res = await POST(makeRequest({ version: 1, wings: [] }))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ ok: false, error: 'invalid_payload' })
  })

  it('returns 400 invalid_payload when a field is not an array', async () => {
    const res = await POST(makeRequest({ version: 1, wings: [], rooms: [], cards: 'bad', embeddings: [] }))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ ok: false, error: 'invalid_payload' })
  })

  it('imports empty payload successfully with all-zero counts', async () => {
    const res = await POST(makeRequest(emptyPayload))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.imported).toEqual({ wings: 0, rooms: 0, cards: 0, embeddings: 0 })
    expect(body.skipped).toEqual({ wings: 0, rooms: 0, cards: 0, embeddings: 0 })
  })

  it('imports 1 wing, 1 room, 1 card and they appear in DB', async () => {
    const now = new Date().toISOString()
    const payload = {
      version: 1,
      wings: [{ id: 'w1', user_id: 'me', name: 'Wing A', color: null, created_at: now, updated_at: now }],
      rooms: [{ id: 'r1', wing_id: 'w1', user_id: 'me', name: 'Room A', description: null, created_at: now, updated_at: now }],
      cards: [{ id: 'c1', user_id: 'me', title: 'Card A', content: {}, room_id: 'r1', created_at: now, updated_at: now }],
      embeddings: [],
    }

    const res = await POST(makeRequest(payload))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.imported).toEqual({ wings: 1, rooms: 1, cards: 1, embeddings: 0 })
    expect(body.skipped).toEqual({ wings: 0, rooms: 0, cards: 0, embeddings: 0 })

    // Verify they are in the DB
    const wing = db().prepare('select * from wings where id = ?').get('w1') as { name: string } | undefined
    expect(wing?.name).toBe('Wing A')
    const room = db().prepare('select * from rooms where id = ?').get('r1') as { name: string } | undefined
    expect(room?.name).toBe('Room A')
    const card = db().prepare('select * from cards where id = ?').get('c1') as { title: string } | undefined
    expect(card?.title).toBe('Card A')
  })

  it('skips conflicting wing and preserves original name', async () => {
    const wing = createWing({ name: 'Original Name', color: null })
    const now = new Date().toISOString()

    const payload = {
      version: 1,
      wings: [{ id: wing.id, user_id: 'me', name: 'New Name', color: null, created_at: now, updated_at: now }],
      rooms: [],
      cards: [],
      embeddings: [],
    }

    const res = await POST(makeRequest(payload))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.imported.wings).toBe(0)
    expect(body.skipped.wings).toBe(1)

    // Original name must be unchanged
    const row = db().prepare('select * from wings where id = ?').get(wing.id) as { name: string } | undefined
    expect(row?.name).toBe('Original Name')
  })

  it('skips a card with a non-existent room_id (FK violation) but imports rest', async () => {
    const now = new Date().toISOString()
    const payload = {
      version: 1,
      wings: [{ id: 'w1', user_id: 'me', name: 'Wing A', color: null, created_at: now, updated_at: now }],
      rooms: [{ id: 'r1', wing_id: 'w1', user_id: 'me', name: 'Room A', description: null, created_at: now, updated_at: now }],
      cards: [
        // valid card
        { id: 'c1', user_id: 'me', title: 'Good Card', content: {}, room_id: 'r1', created_at: now, updated_at: now },
        // FK violation — room_id 'r-missing' does not exist
        { id: 'c2', user_id: 'me', title: 'Bad Card', content: {}, room_id: 'r-missing', created_at: now, updated_at: now },
      ],
      embeddings: [],
    }

    const res = await POST(makeRequest(payload))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    // c1 imported, c2 skipped
    expect(body.imported.cards).toBe(1)
    expect(body.skipped.cards).toBe(1)

    const good = db().prepare('select id from cards where id = ?').get('c1')
    expect(good).toBeDefined()
    const bad = db().prepare('select id from cards where id = ?').get('c2')
    expect(bad).toBeUndefined()
  })

  it('embeddings round-trip: export then import on fresh DB reconstitutes the same vector', async () => {
    // Seed data in first DB
    const now = new Date().toISOString()
    db().prepare('insert into wings (id, name, color, created_at, updated_at) values (?, ?, ?, ?, ?)').run('w1', 'Wing', null, now, now)
    db().prepare('insert into rooms (id, wing_id, name, description, created_at, updated_at) values (?, ?, ?, ?, ?, ?)').run('r1', 'w1', 'Room', null, now, now)
    db().prepare('insert into cards (id, title, content, room_id, created_at, updated_at) values (?, ?, ?, ?, ?, ?)').run('c1', 'Card', '{}', 'r1', now, now)

    const vec = new Float32Array([0.5, 0.25, 0.75, 0.1])
    const vecBuf = Buffer.from(vec.buffer)
    db().prepare('insert into card_embeddings (card_id, vector, dim, text, updated_at) values (?, ?, ?, ?, ?)').run('c1', vecBuf, 4, 'Card', now)

    // Export
    const exportRes = await GET()
    const exported = await exportRes.json()

    // Reset DB and import
    __resetDbForTests()

    const importRes = await POST(makeRequest(exported))
    expect(importRes.status).toBe(200)
    const importBody = await importRes.json()
    expect(importBody.imported.embeddings).toBe(1)

    // Re-export and verify vector matches
    const reExportRes = await GET()
    const reExported = await reExportRes.json()
    expect(reExported.embeddings).toHaveLength(1)

    const origB64 = exported.embeddings[0].vector_b64
    const reimportedB64 = reExported.embeddings[0].vector_b64
    expect(reimportedB64).toBe(origB64)

    // Decode and verify float values
    const decoded = Buffer.from(reimportedB64, 'base64')
    const f32 = new Float32Array(decoded.buffer, decoded.byteOffset, 4)
    expect(f32[0]).toBeCloseTo(0.5)
    expect(f32[1]).toBeCloseTo(0.25)
    expect(f32[2]).toBeCloseTo(0.75)
    expect(f32[3]).toBeCloseTo(0.1)
  })
})
