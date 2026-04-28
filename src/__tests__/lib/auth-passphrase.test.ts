import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { __resetDbForTests } from '@/lib/db/sqlite'
import { isSetUp, setPassphrase, verifyPassphrase } from '@/lib/auth/passphrase'

beforeEach(() => {
  process.env.MINDFORGE_DB_PATH = ':memory:'
  __resetDbForTests()
})

afterEach(() => {
  __resetDbForTests()
})

describe('isSetUp', () => {
  it('returns false on a fresh DB', () => {
    expect(isSetUp()).toBe(false)
  })

  it('returns true after setPassphrase', async () => {
    await setPassphrase('correct horse battery')
    expect(isSetUp()).toBe(true)
  })
})

describe('setPassphrase', () => {
  it('rejects passphrases shorter than 8 characters', async () => {
    await expect(setPassphrase('short')).rejects.toThrow(
      'Passphrase must be at least 8 characters.'
    )
  })

  it('accepts a passphrase that is exactly 8 characters', async () => {
    await expect(setPassphrase('exactly8c')).resolves.toBeUndefined()
  })
})

describe('verifyPassphrase', () => {
  it('returns false on a fresh DB with no hash stored', async () => {
    await expect(verifyPassphrase('anything')).resolves.toBe(false)
  })

  it('returns true for the correct passphrase', async () => {
    await setPassphrase('right-pass')
    await expect(verifyPassphrase('right-pass')).resolves.toBe(true)
  })

  it('returns false for a wrong passphrase', async () => {
    await setPassphrase('right-pass')
    await expect(verifyPassphrase('wrong-pass')).resolves.toBe(false)
  })

  it('second setPassphrase wins — new passphrase verifies, old one does not', async () => {
    await setPassphrase('first-passphrase')
    await setPassphrase('second-passphrase')
    await expect(verifyPassphrase('second-passphrase')).resolves.toBe(true)
    await expect(verifyPassphrase('first-passphrase')).resolves.toBe(false)
  })
})
