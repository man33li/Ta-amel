import bcrypt from 'bcryptjs'
import { getSetting, setSetting } from '@/lib/db/repo'
import { isDbFilePresent, isDbUnlocked, unlockDb } from '@/lib/db/sqlite'

/**
 * Passphrase management on top of SQLCipher.
 *
 * Production (encryption on): the passphrase IS the SQLCipher key. unlockDb
 * verifies it — wrong key throws SQLITE_NOTADB on first read. The bcrypt hash
 * stored in settings is defense-in-depth, redundant with the key check.
 *
 * Tests (MINDFORGE_DISABLE_ENCRYPTION=1): no encryption, so unlockDb can't
 * verify the passphrase. We fall back to bcrypt against the stored hash —
 * same behaviour as v3.0 had before SQLCipher landed.
 */

const HASH_KEY = 'passphrase_hash'
const ROUNDS = 12
const MIN_LENGTH = 8

const isEncryptionDisabled = (): boolean =>
  process.env.MINDFORGE_DISABLE_ENCRYPTION === '1'

export function isSetUp(): boolean {
  // Production: presence of the encrypted file is the source of truth.
  if (isDbFilePresent()) return true
  // :memory: fallback for tests — once we've stored a hash, we're set up.
  if (isDbUnlocked()) {
    return getSetting(HASH_KEY) !== null
  }
  return false
}

export async function setPassphrase(passphrase: string): Promise<void> {
  if (passphrase.length < MIN_LENGTH) {
    throw new Error(`Passphrase must be at least ${MIN_LENGTH} characters.`)
  }
  if (isSetUp()) {
    throw new Error('Already set up.')
  }

  if (!isEncryptionDisabled()) {
    const ok = unlockDb(passphrase)
    if (!ok) {
      throw new Error('Failed to initialize encrypted database.')
    }
  }

  const hash = await bcrypt.hash(passphrase, ROUNDS)
  setSetting(HASH_KEY, hash)
}

export async function verifyPassphrase(passphrase: string): Promise<boolean> {
  if (!isSetUp()) return false

  if (!isEncryptionDisabled()) {
    // Production: opening the DB with this passphrase IS the verification.
    return unlockDb(passphrase)
  }

  // Test path: compare against the bcrypt hash.
  const hash = getSetting(HASH_KEY)
  if (!hash) return false
  return bcrypt.compare(passphrase, hash)
}
