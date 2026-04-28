// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, readFileSync, rmSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  __resetDbForTests,
  isDbFilePresent,
  isDbUnlocked,
  lockDb,
  unlockDb,
} from '@/lib/db/sqlite'
import { createWing, listWings } from '@/lib/db/repo'

let tmpDir: string
let dbPath: string

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'mindforge-encryption-'))
  dbPath = join(tmpDir, 'test.db')
  process.env.MINDFORGE_DB_PATH = dbPath
  delete process.env.MINDFORGE_DISABLE_ENCRYPTION
  lockDb()
})

afterEach(() => {
  lockDb()
  delete process.env.MINDFORGE_DB_PATH
  process.env.MINDFORGE_DISABLE_ENCRYPTION = '1'
  try {
    rmSync(tmpDir, { recursive: true, force: true })
  } catch {
    // Windows occasionally holds the WAL handle briefly; ignore.
  }
})

describe('SQLCipher integration', () => {
  it('creates an encrypted file when unlocking a new path', () => {
    expect(isDbFilePresent()).toBe(false)
    expect(isDbUnlocked()).toBe(false)

    expect(unlockDb('correct-horse-battery')).toBe(true)

    expect(isDbFilePresent()).toBe(true)
    expect(isDbUnlocked()).toBe(true)
  })

  it('writes random-looking bytes at the head of the file (not a SQLite header)', () => {
    unlockDb('correct-horse-battery')
    lockDb()

    const head = readFileSync(dbPath).slice(0, 16)
    // Plaintext SQLite starts with the literal "SQLite format 3\0".
    expect(head.toString('ascii').startsWith('SQLite format 3')).toBe(false)
  })

  it('rejects the wrong passphrase on an existing encrypted file', () => {
    expect(unlockDb('original-passphrase')).toBe(true)
    lockDb()

    expect(unlockDb('wrong-passphrase')).toBe(false)
    expect(isDbUnlocked()).toBe(false)
  })

  it('accepts the right passphrase on an existing encrypted file', () => {
    expect(unlockDb('original-passphrase')).toBe(true)
    lockDb()

    expect(unlockDb('original-passphrase')).toBe(true)
    expect(isDbUnlocked()).toBe(true)
  })

  it('persists data across lock / unlock cycles when the key matches', () => {
    unlockDb('persistent-passphrase')
    createWing({ name: 'Memory Hall' })
    expect(listWings()).toHaveLength(1)
    lockDb()

    expect(unlockDb('persistent-passphrase')).toBe(true)
    expect(listWings()).toHaveLength(1)
    expect(listWings()[0].name).toBe('Memory Hall')
  })

  it('is idempotent: a second unlock with the same passphrase reuses the cached handle', () => {
    expect(unlockDb('same-pass')).toBe(true)
    expect(unlockDb('same-pass')).toBe(true)
    expect(isDbUnlocked()).toBe(true)
  })

  it('does not leave the connection open if the wrong passphrase is supplied', () => {
    unlockDb('right')
    lockDb()
    // The DB file exists from the first unlock.
    expect(existsSync(dbPath)).toBe(true)

    expect(unlockDb('wrong')).toBe(false)
    expect(isDbUnlocked()).toBe(false)
  })

  it('honours __resetDbForTests by reopening plaintext when encryption is disabled', () => {
    process.env.MINDFORGE_DISABLE_ENCRYPTION = '1'
    process.env.MINDFORGE_DB_PATH = ':memory:'
    __resetDbForTests()
    expect(isDbUnlocked()).toBe(true)
  })
})
