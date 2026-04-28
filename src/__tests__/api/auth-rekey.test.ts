// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { __resetDbForTests } from '@/lib/db/sqlite'
import { setPassphrase, verifyCurrentPassphrase } from '@/lib/auth/passphrase'
import { POST as rekey } from '@/app/api/auth/rekey/route'

vi.mock('@/lib/auth/guard', () => ({
  requireAuth: vi.fn().mockResolvedValue(null),
}))

beforeEach(() => {
  process.env.MINDFORGE_DB_PATH = ':memory:'
  __resetDbForTests()
})

afterEach(() => {
  __resetDbForTests()
})

const req = (body: unknown) =>
  new Request('http://test.local/api/auth/rekey', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })

describe('POST /api/auth/rekey', () => {
  it('rotates the bcrypt hash so the new passphrase verifies and the old one does not', async () => {
    await setPassphrase('original-pass')

    const res = await rekey(req({ current: 'original-pass', next: 'second-pass' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })

    expect(await verifyCurrentPassphrase('second-pass')).toBe(true)
    expect(await verifyCurrentPassphrase('original-pass')).toBe(false)
  })

  it('returns 401 invalid_current_passphrase for the wrong current passphrase', async () => {
    await setPassphrase('original-pass')
    const res = await rekey(req({ current: 'wrong', next: 'second-pass' }))
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ ok: false, error: 'invalid_current_passphrase' })
  })

  it('returns 400 passphrase_too_short when the new passphrase is < 8 chars', async () => {
    await setPassphrase('original-pass')
    const res = await rekey(req({ current: 'original-pass', next: 'short' }))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ ok: false, error: 'passphrase_too_short' })
  })

  it('returns 400 fields_required when current or next is missing', async () => {
    await setPassphrase('original-pass')
    const res = await rekey(req({ current: 'original-pass' }))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ ok: false, error: 'fields_required' })
  })

  it('returns 400 invalid_json for a non-JSON body', async () => {
    await setPassphrase('original-pass')
    const res = await rekey(
      new Request('http://test.local/api/auth/rekey', {
        method: 'POST',
        body: 'not-json',
        headers: { 'content-type': 'text/plain' },
      })
    )
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ ok: false, error: 'invalid_json' })
  })
})
