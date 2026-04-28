// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { __resetDbForTests } from '@/lib/db/sqlite'
import { createWing } from '@/lib/db/repo'
import { GET, POST } from '@/app/api/wings/route'
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

describe('GET /api/wings', () => {
  it('returns 401 when unauthenticated', async () => {
    ;(requireAuth as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
    )
    const res = await GET()
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ ok: false, error: 'unauthorized' })
  })

  it('returns empty wings array on fresh DB', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ wings: [] })
  })

  it('returns seeded wings in created_at asc order', async () => {
    const w1 = createWing({ name: 'Alpha', color: '#ff0000' })
    const w2 = createWing({ name: 'Beta', color: null })
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.wings).toHaveLength(2)
    expect(body.wings[0].id).toBe(w1.id)
    expect(body.wings[1].id).toBe(w2.id)
  })
})

describe('POST /api/wings', () => {
  it('returns 401 when unauthenticated', async () => {
    ;(requireAuth as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
    )
    const res = await POST(
      new Request('http://test.local/api/wings', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test' }),
        headers: { 'content-type': 'application/json' },
      })
    )
    expect(res.status).toBe(401)
  })

  it('creates a wing and returns 201 with the new wing', async () => {
    const res = await POST(
      new Request('http://test.local/api/wings', {
        method: 'POST',
        body: JSON.stringify({ name: 'Science', color: '#0000ff' }),
        headers: { 'content-type': 'application/json' },
      })
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.wing).toMatchObject({ name: 'Science', color: '#0000ff' })
    expect(body.wing.id).toBeTruthy()
  })

  it('returns 400 invalid_json for a non-JSON body', async () => {
    const res = await POST(
      new Request('http://test.local/api/wings', {
        method: 'POST',
        body: 'not-json',
        headers: { 'content-type': 'text/plain' },
      })
    )
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ ok: false, error: 'invalid_json' })
  })

  it('returns 400 name_required when name is missing', async () => {
    const res = await POST(
      new Request('http://test.local/api/wings', {
        method: 'POST',
        body: JSON.stringify({ color: '#aabbcc' }),
        headers: { 'content-type': 'application/json' },
      })
    )
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ ok: false, error: 'name_required' })
  })

  it('returns 400 name_required when name is blank whitespace', async () => {
    const res = await POST(
      new Request('http://test.local/api/wings', {
        method: 'POST',
        body: JSON.stringify({ name: '   ' }),
        headers: { 'content-type': 'application/json' },
      })
    )
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ ok: false, error: 'name_required' })
  })
})
