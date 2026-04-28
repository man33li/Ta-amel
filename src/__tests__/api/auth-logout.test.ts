// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { __resetDbForTests } from '@/lib/db/sqlite'
import { POST as logout } from '@/app/api/auth/logout/route'

beforeEach(() => {
  process.env.MINDFORGE_DB_PATH = ':memory:'
  __resetDbForTests()
})

afterEach(() => {
  __resetDbForTests()
})

describe('POST /api/auth/logout', () => {
  it('returns 200 { ok: true } regardless of session state', async () => {
    const res = await logout()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
  })

  it('returns 200 { ok: true } on repeated calls', async () => {
    await logout()
    const res = await logout()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
  })
})
