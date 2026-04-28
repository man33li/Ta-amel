// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { __resetDbForTests } from '@/lib/db/sqlite'
import { createWing, createRoom } from '@/lib/db/repo'
import { GET, POST } from '@/app/api/rooms/route'
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/guard'

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

const makeReq = (url: string) =>
  new Request(url, { method: 'GET' })

describe('GET /api/rooms', () => {
  it('returns 401 when unauthenticated', async () => {
    ;(requireAuth as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
    )
    const res = await GET(makeReq('http://test.local/api/rooms'))
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ ok: false, error: 'unauthorized' })
  })

  it('returns all rooms when no wing_id filter', async () => {
    const w1 = createWing({ name: 'W1', color: null })
    const w2 = createWing({ name: 'W2', color: null })
    createRoom({ wing_id: w1.id, name: 'R1', description: null })
    createRoom({ wing_id: w2.id, name: 'R2', description: null })

    const res = await GET(makeReq('http://test.local/api/rooms'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.rooms).toHaveLength(2)
  })

  it('filters rooms by wing_id query param', async () => {
    const w1 = createWing({ name: 'W1', color: null })
    const w2 = createWing({ name: 'W2', color: null })
    createRoom({ wing_id: w1.id, name: 'R1', description: null })
    createRoom({ wing_id: w2.id, name: 'R2', description: null })

    const res = await GET(makeReq(`http://test.local/api/rooms?wing_id=${w1.id}`))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.rooms).toHaveLength(1)
    expect(body.rooms[0].wing_id).toBe(w1.id)
  })

  it('returns empty array on fresh DB', async () => {
    const res = await GET(makeReq('http://test.local/api/rooms'))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ rooms: [] })
  })
})

describe('POST /api/rooms', () => {
  it('returns 401 when unauthenticated', async () => {
    ;(requireAuth as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
    )
    const res = await POST(
      new Request('http://test.local/api/rooms', {
        method: 'POST',
        body: JSON.stringify({ wing_id: 'x', name: 'Y' }),
        headers: { 'content-type': 'application/json' },
      })
    )
    expect(res.status).toBe(401)
  })

  it('creates a room and returns 201 with the new room', async () => {
    const wing = createWing({ name: 'Wing', color: null })
    const res = await POST(
      new Request('http://test.local/api/rooms', {
        method: 'POST',
        body: JSON.stringify({ wing_id: wing.id, name: 'Lab', description: 'A lab room' }),
        headers: { 'content-type': 'application/json' },
      })
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.room).toMatchObject({ wing_id: wing.id, name: 'Lab', description: 'A lab room' })
    expect(body.room.id).toBeTruthy()
  })

  it('returns 400 wing_id_and_name_required when wing_id is missing', async () => {
    const res = await POST(
      new Request('http://test.local/api/rooms', {
        method: 'POST',
        body: JSON.stringify({ name: 'No Wing' }),
        headers: { 'content-type': 'application/json' },
      })
    )
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ ok: false, error: 'wing_id_and_name_required' })
  })

  it('returns 400 wing_id_and_name_required when name is missing', async () => {
    const wing = createWing({ name: 'Wing', color: null })
    const res = await POST(
      new Request('http://test.local/api/rooms', {
        method: 'POST',
        body: JSON.stringify({ wing_id: wing.id }),
        headers: { 'content-type': 'application/json' },
      })
    )
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ ok: false, error: 'wing_id_and_name_required' })
  })

  it('returns 400 wing_id_and_name_required when name is blank whitespace', async () => {
    const wing = createWing({ name: 'Wing', color: null })
    const res = await POST(
      new Request('http://test.local/api/rooms', {
        method: 'POST',
        body: JSON.stringify({ wing_id: wing.id, name: '   ' }),
        headers: { 'content-type': 'application/json' },
      })
    )
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ ok: false, error: 'wing_id_and_name_required' })
  })

  it('returns 400 invalid_json for a non-JSON body', async () => {
    const res = await POST(
      new Request('http://test.local/api/rooms', {
        method: 'POST',
        body: 'not-json',
        headers: { 'content-type': 'text/plain' },
      })
    )
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ ok: false, error: 'invalid_json' })
  })
})
