// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { __resetDbForTests } from '@/lib/db/sqlite'
import { setSettingIfAbsent } from '@/lib/db/repo'
import { getSessionPassword } from '@/lib/auth/session'

beforeEach(() => {
  process.env.MINDFORGE_DB_PATH = ':memory:'
  __resetDbForTests()
})

afterEach(() => {
  __resetDbForTests()
})

describe('getSessionPassword', () => {
  it('returns a 64-char hex string and persists it', () => {
    const secret = getSessionPassword()
    expect(secret).toHaveLength(64)
    expect(secret).toMatch(/^[0-9a-f]{64}$/)
  })

  it('returns the same value on repeated calls (idempotent)', () => {
    const first = getSessionPassword()
    const second = getSessionPassword()
    expect(second).toBe(first)
  })

  it('returns a pre-existing value when the key is already set (no clobber)', () => {
    const preExisting = 'a'.repeat(64)
    setSettingIfAbsent('session_secret', preExisting)
    const result = getSessionPassword()
    expect(result).toBe(preExisting)
  })
})
