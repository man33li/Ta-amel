// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { __resetDbForTests, isDbUnlocked, lockDb } from '@/lib/db/sqlite'
import { setPassphrase } from '@/lib/auth/passphrase'
import { GET } from '@/app/api/auth/session/route'

beforeEach(() => {
  process.env.MINDFORGE_DB_PATH = ':memory:'
  __resetDbForTests()
})

afterEach(() => {
  __resetDbForTests()
})

describe('GET /api/auth/session', () => {
  it('returns { setUp: false, authenticated: false } on a fresh DB', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ setUp: false, authenticated: false })
  })

  it('returns { setUp: true, authenticated: false } after passphrase is set', async () => {
    await setPassphrase('whatever123')
    const res = await GET()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ setUp: true, authenticated: false })
  })

  // Cold-start path added in 04df435: when the DB is locked, the session
  // secret can't be read, so we must short-circuit before calling getSession.
  it('short-circuits to unauthenticated when the DB is locked (cold start)', async () => {
    lockDb()
    expect(isDbUnlocked()).toBe(false)

    const res = await GET()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ setUp: false, authenticated: false })
  })
})
