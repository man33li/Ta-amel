// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { lockDb, rekeyDb, unlockDb } from '@/lib/db/sqlite'
import { createWing, listWings } from '@/lib/db/repo'

let tmpDir: string
let dbPath: string

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'mindforge-rekey-'))
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

describe('SQLCipher rekey', () => {
  it('throws when the DB is not unlocked', () => {
    expect(() => rekeyDb('whatever')).toThrow('database_not_unlocked')
  })

  it('re-encrypts the file: the new key opens it, the old key does not', () => {
    expect(unlockDb('first-pass')).toBe(true)
    createWing({ name: 'Memory Hall' })
    rekeyDb('second-pass')
    lockDb()

    expect(unlockDb('first-pass')).toBe(false)
    expect(unlockDb('second-pass')).toBe(true)
    expect(listWings()).toHaveLength(1)
    expect(listWings()[0].name).toBe('Memory Hall')
  })

  it('keeps the open handle usable after rekey within the same process', () => {
    unlockDb('first-pass')
    createWing({ name: 'Wing A' })
    rekeyDb('second-pass')
    // Same handle still works — rekey is in-place, no reopen needed.
    createWing({ name: 'Wing B' })
    expect(listWings()).toHaveLength(2)
  })
})
