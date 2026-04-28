// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { __resetDbForTests } from '@/lib/db/sqlite'
import { setPassphrase } from '@/lib/auth/passphrase'
import { POST as login } from '@/app/api/auth/login/route'

beforeEach(() => {
  process.env.MINDFORGE_DB_PATH = ':memory:'
  __resetDbForTests()
})

afterEach(() => {
  __resetDbForTests()
})

const req = (body: unknown) =>
  new Request('http://test.local/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })

describe('POST /api/auth/login', () => {
  it('returns 409 not_set_up when no passphrase has been configured', async () => {
    const res = await login(req({ passphrase: 'anything' }))
    expect(res.status).toBe(409)
    expect(await res.json()).toEqual({ ok: false, error: 'not_set_up' })
  })

  it('returns 200 { ok: true } for the correct passphrase', async () => {
    await setPassphrase('right-pass')
    const res = await login(req({ passphrase: 'right-pass' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
  })

  it('returns 401 invalid_passphrase for a wrong passphrase', async () => {
    await setPassphrase('right-pass')
    const res = await login(req({ passphrase: 'wrong-pass' }))
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ ok: false, error: 'invalid_passphrase' })
  })

  it('returns 400 passphrase_required when passphrase field is missing', async () => {
    await setPassphrase('right-pass')
    const res = await login(req({}))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ ok: false, error: 'passphrase_required' })
  })

  it('returns 400 invalid_json for a non-JSON body', async () => {
    await setPassphrase('right-pass')
    const res = await login(
      new Request('http://test.local/api/auth/login', {
        method: 'POST',
        body: 'not-json',
        headers: { 'content-type': 'text/plain' },
      })
    )
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ ok: false, error: 'invalid_json' })
  })
})
