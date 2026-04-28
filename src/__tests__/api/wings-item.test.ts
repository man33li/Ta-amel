// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { __resetDbForTests } from '@/lib/db/sqlite'
import { createWing, createRoom, listRooms } from '@/lib/db/repo'
import { PATCH, DELETE } from '@/app/api/wings/[id]/route'
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

describe('PATCH /api/wings/[id]', () => {
  it('returns 401 when unauthenticated', async () => {
    ;(requireAuth as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
    )
    const res = await PATCH(
      new Request('http://test.local/api/wings/nonexistent', {
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
      new Request('http://test.local/api/wings/no-such-id', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'New Name' }),
        headers: { 'content-type': 'application/json' },
      }),
      { params: Promise.resolve({ id: 'no-such-id' }) }
    )
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ ok: false, error: 'not_found' })
  })

  it('updates name and returns the updated wing', async () => {
    const wing = createWing({ name: 'Old Name', color: null })
    const res = await PATCH(
      new Request(`http://test.local/api/wings/${wing.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: 'New Name' }),
        headers: { 'content-type': 'application/json' },
      }),
      { params: Promise.resolve({ id: wing.id }) }
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.wing).toMatchObject({ id: wing.id, name: 'New Name' })
  })

  it('returns 400 invalid_json for a non-JSON body', async () => {
    const wing = createWing({ name: 'Wing', color: null })
    const res = await PATCH(
      new Request(`http://test.local/api/wings/${wing.id}`, {
        method: 'PATCH',
        body: 'not-json',
        headers: { 'content-type': 'text/plain' },
      }),
      { params: Promise.resolve({ id: wing.id }) }
    )
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ ok: false, error: 'invalid_json' })
  })
})

describe('DELETE /api/wings/[id]', () => {
  it('returns 401 when unauthenticated', async () => {
    ;(requireAuth as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
    )
    const res = await DELETE(
      new Request('http://test.local/api/wings/nonexistent', { method: 'DELETE' }),
      { params: Promise.resolve({ id: 'nonexistent' }) }
    )
    expect(res.status).toBe(401)
  })

  it('returns 404 for an unknown id', async () => {
    const res = await DELETE(
      new Request('http://test.local/api/wings/no-such-id', { method: 'DELETE' }),
      { params: Promise.resolve({ id: 'no-such-id' }) }
    )
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ ok: false, error: 'not_found' })
  })

  it('deletes an existing wing and returns { ok: true }', async () => {
    const wing = createWing({ name: 'To Delete', color: null })
    const res = await DELETE(
      new Request(`http://test.local/api/wings/${wing.id}`, { method: 'DELETE' }),
      { params: Promise.resolve({ id: wing.id }) }
    )
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
  })

  it('cascades: rooms in the deleted wing are removed', async () => {
    const wing = createWing({ name: 'With Rooms', color: null })
    createRoom({ wing_id: wing.id, name: 'Room A', description: null })
    createRoom({ wing_id: wing.id, name: 'Room B', description: null })

    await DELETE(
      new Request(`http://test.local/api/wings/${wing.id}`, { method: 'DELETE' }),
      { params: Promise.resolve({ id: wing.id }) }
    )

    const remaining = listRooms({ wingId: wing.id })
    expect(remaining).toHaveLength(0)
  })
})
