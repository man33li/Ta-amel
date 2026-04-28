// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { __resetDbForTests } from '@/lib/db/sqlite'
import { createWing, createRoom } from '@/lib/db/repo'
import { PATCH, DELETE } from '@/app/api/rooms/[id]/route'
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

describe('PATCH /api/rooms/[id]', () => {
  it('returns 401 when unauthenticated', async () => {
    ;(requireAuth as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
    )
    const res = await PATCH(
      new Request('http://test.local/api/rooms/nonexistent', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'x' }),
        headers: { 'content-type': 'application/json' },
      }),
      { params: Promise.resolve({ id: 'nonexistent' }) }
    )
    expect(res.status).toBe(401)
  })

  it('returns 404 for an unknown id', async () => {
    const res = await PATCH(
      new Request('http://test.local/api/rooms/no-such-id', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'New Name' }),
        headers: { 'content-type': 'application/json' },
      }),
      { params: Promise.resolve({ id: 'no-such-id' }) }
    )
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ ok: false, error: 'not_found' })
  })

  it('updates name and returns the updated room', async () => {
    const wing = createWing({ name: 'Wing', color: null })
    const room = createRoom({ wing_id: wing.id, name: 'Old Name', description: null })
    const res = await PATCH(
      new Request(`http://test.local/api/rooms/${room.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: 'New Name' }),
        headers: { 'content-type': 'application/json' },
      }),
      { params: Promise.resolve({ id: room.id }) }
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.room).toMatchObject({ id: room.id, name: 'New Name' })
  })

  it('updates description and returns the updated room', async () => {
    const wing = createWing({ name: 'Wing', color: null })
    const room = createRoom({ wing_id: wing.id, name: 'Room', description: null })
    const res = await PATCH(
      new Request(`http://test.local/api/rooms/${room.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ description: 'A detailed desc' }),
        headers: { 'content-type': 'application/json' },
      }),
      { params: Promise.resolve({ id: room.id }) }
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.room).toMatchObject({ id: room.id, description: 'A detailed desc' })
  })

  it('returns 400 invalid_json for a non-JSON body', async () => {
    const wing = createWing({ name: 'Wing', color: null })
    const room = createRoom({ wing_id: wing.id, name: 'Room', description: null })
    const res = await PATCH(
      new Request(`http://test.local/api/rooms/${room.id}`, {
        method: 'PATCH',
        body: 'not-json',
        headers: { 'content-type': 'text/plain' },
      }),
      { params: Promise.resolve({ id: room.id }) }
    )
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ ok: false, error: 'invalid_json' })
  })
})

describe('DELETE /api/rooms/[id]', () => {
  it('returns 401 when unauthenticated', async () => {
    ;(requireAuth as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
    )
    const res = await DELETE(
      new Request('http://test.local/api/rooms/nonexistent', { method: 'DELETE' }),
      { params: Promise.resolve({ id: 'nonexistent' }) }
    )
    expect(res.status).toBe(401)
  })

  it('returns 404 for an unknown id', async () => {
    const res = await DELETE(
      new Request('http://test.local/api/rooms/no-such-id', { method: 'DELETE' }),
      { params: Promise.resolve({ id: 'no-such-id' }) }
    )
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ ok: false, error: 'not_found' })
  })

  it('deletes an existing room and returns { ok: true }', async () => {
    const wing = createWing({ name: 'Wing', color: null })
    const room = createRoom({ wing_id: wing.id, name: 'To Delete', description: null })
    const res = await DELETE(
      new Request(`http://test.local/api/rooms/${room.id}`, { method: 'DELETE' }),
      { params: Promise.resolve({ id: room.id }) }
    )
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
  })
})
