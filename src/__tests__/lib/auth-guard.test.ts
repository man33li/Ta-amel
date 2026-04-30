// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { __resetDbForTests, isDbUnlocked, lockDb } from '@/lib/db/sqlite'
import { requireAuth } from '@/lib/auth/guard'

beforeEach(() => {
  process.env.MINDFORGE_DB_PATH = ':memory:'
  __resetDbForTests()
})

afterEach(() => {
  __resetDbForTests()
})

describe('requireAuth', () => {
  it('returns 401 when the DB is locked (cold start short-circuit)', async () => {
    lockDb()
    expect(isDbUnlocked()).toBe(false)

    const res = await requireAuth()
    expect(res).not.toBeNull()
    expect(res!.status).toBe(401)
    expect(await res!.json()).toEqual({ ok: false, error: 'unauthorized' })
  })

  it('returns 401 when the DB is unlocked but no session exists', async () => {
    expect(isDbUnlocked()).toBe(true)

    const res = await requireAuth()
    expect(res).not.toBeNull()
    expect(res!.status).toBe(401)
  })
})
