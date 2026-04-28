// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { __resetDbForTests } from '@/lib/db/sqlite'
import { setPassphrase } from '@/lib/auth/passphrase'
import { GET, POST } from '@/app/api/auth/setup/route'

beforeEach(() => {
  process.env.MINDFORGE_DB_PATH = ':memory:'
  __resetDbForTests()
})

afterEach(() => {
  __resetDbForTests()
})

describe('GET /api/auth/setup', () => {
  it('returns { setUp: false } on a fresh DB', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ setUp: false })
  })

  it('returns { setUp: true } after setPassphrase', async () => {
    await setPassphrase('already-set123')
    const res = await GET()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ setUp: true })
  })
})

describe('POST /api/auth/setup', () => {
  it('accepts a valid passphrase and returns 200 { ok: true }', async () => {
    const res = await POST(
      new Request('http://test.local/api/auth/setup', {
        method: 'POST',
        body: JSON.stringify({ passphrase: 'valid-pass' }),
        headers: { 'content-type': 'application/json' },
      })
    )
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
  })

  it('marks the DB as set up after a successful POST', async () => {
    await POST(
      new Request('http://test.local/api/auth/setup', {
        method: 'POST',
        body: JSON.stringify({ passphrase: 'valid-pass' }),
        headers: { 'content-type': 'application/json' },
      })
    )
    const res = await GET()
    expect((await res.json()).setUp).toBe(true)
  })

  it('returns 400 passphrase_too_short for a short passphrase', async () => {
    const res = await POST(
      new Request('http://test.local/api/auth/setup', {
        method: 'POST',
        body: JSON.stringify({ passphrase: 'short' }),
        headers: { 'content-type': 'application/json' },
      })
    )
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ ok: false, error: 'passphrase_too_short' })
  })

  it('returns 400 passphrase_too_short for an empty passphrase', async () => {
    const res = await POST(
      new Request('http://test.local/api/auth/setup', {
        method: 'POST',
        body: JSON.stringify({ passphrase: '' }),
        headers: { 'content-type': 'application/json' },
      })
    )
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ ok: false, error: 'passphrase_too_short' })
  })

  it('returns 400 invalid_json for a non-JSON body', async () => {
    const res = await POST(
      new Request('http://test.local/api/auth/setup', {
        method: 'POST',
        body: 'not-json',
        headers: { 'content-type': 'text/plain' },
      })
    )
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ ok: false, error: 'invalid_json' })
  })

  it('returns 400 passphrase_too_short when body has no passphrase field', async () => {
    const res = await POST(
      new Request('http://test.local/api/auth/setup', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'content-type': 'application/json' },
      })
    )
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ ok: false, error: 'passphrase_too_short' })
  })

  it('returns 409 already_set_up when a passphrase is already stored', async () => {
    await setPassphrase('already-set123')
    const res = await POST(
      new Request('http://test.local/api/auth/setup', {
        method: 'POST',
        body: JSON.stringify({ passphrase: 'another-pass' }),
        headers: { 'content-type': 'application/json' },
      })
    )
    expect(res.status).toBe(409)
    expect(await res.json()).toEqual({ ok: false, error: 'already_set_up' })
  })
})
