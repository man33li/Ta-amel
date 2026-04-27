import bcrypt from 'bcryptjs'
import { getSetting, setSetting } from '@/lib/db/repo'

const HASH_KEY = 'passphrase_hash'
const ROUNDS = 12

export function isSetUp(): boolean {
  return getSetting(HASH_KEY) !== null
}

export async function setPassphrase(passphrase: string): Promise<void> {
  if (passphrase.length < 8) {
    throw new Error('Passphrase must be at least 8 characters.')
  }
  const hash = await bcrypt.hash(passphrase, ROUNDS)
  setSetting(HASH_KEY, hash)
}

export async function verifyPassphrase(passphrase: string): Promise<boolean> {
  const hash = getSetting(HASH_KEY)
  if (!hash) return false
  return bcrypt.compare(passphrase, hash)
}
