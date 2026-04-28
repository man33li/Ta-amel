import Database from 'better-sqlite3-multiple-ciphers'
import { existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'

/**
 * SQLite singleton with optional SQLCipher encryption.
 *
 * Production:
 *   - unlockDb(passphrase) opens (or creates) the encrypted file with that
 *     passphrase as the SQLCipher key. Subsequent getDb() calls return the
 *     same handle until lockDb() runs or the process exits.
 *   - Wrong passphrase = SQLITE_NOTADB on the first read; we surface that as
 *     a boolean false from unlockDb().
 *
 * Tests:
 *   - Set MINDFORGE_DISABLE_ENCRYPTION=1 in the test setup. unlockDb becomes
 *     a no-op once a plaintext handle is cached, and __resetDbForTests
 *     close-and-reopens that plaintext handle so existing tests keep working
 *     unchanged.
 *
 * Path resolution:
 *   1. MINDFORGE_DB_PATH (absolute)            — explicit override
 *   2. MINDFORGE_DATA_DIR + 'mindforge.db'     — for users who keep data
 *      somewhere stable like ~/.mindforge
 *   3. <cwd>/data/mindforge.db                 — sensible default
 */

let cached: Database.Database | null = null

const isEncryptionDisabled = (): boolean =>
  process.env.MINDFORGE_DISABLE_ENCRYPTION === '1'

export function getDb(): Database.Database {
  if (!cached) {
    throw new Error('database_not_initialized')
  }
  return cached
}

export function isDbUnlocked(): boolean {
  return cached !== null
}

export function isDbFilePresent(): boolean {
  const dbPath = resolveDbPath()
  if (dbPath === ':memory:') return false
  try {
    return existsSync(dbPath)
  } catch {
    return false
  }
}

/**
 * Open (or create) the database with the given passphrase as the SQLCipher key.
 * Returns false on wrong passphrase, true on success. Idempotent: a second
 * unlock with the same passphrase reuses the cached handle.
 */
export function unlockDb(passphrase: string): boolean {
  if (cached) return true

  const dbPath = resolveDbPath()
  if (dbPath !== ':memory:') {
    mkdirSync(dirname(dbPath), { recursive: true })
  }

  let db: Database.Database
  try {
    db = new Database(dbPath)
    if (!isEncryptionDisabled() && passphrase.length > 0) {
      db.pragma(`key = '${escapeSqlString(passphrase)}'`)
    }
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
    db.pragma('synchronous = NORMAL')
    // Force a read so a wrong key surfaces now rather than at first query.
    db.prepare('select count(*) from sqlite_master').get()
  } catch {
    return false
  }

  runMigrations(db)
  cached = db
  return true
}

export function lockDb(): void {
  if (cached) {
    cached.close()
    cached = null
  }
}

function resolveDbPath(): string {
  if (process.env.MINDFORGE_DB_PATH) return process.env.MINDFORGE_DB_PATH
  const dir = process.env.MINDFORGE_DATA_DIR ?? join(process.cwd(), 'data')
  return join(dir, 'mindforge.db')
}

function escapeSqlString(s: string): string {
  return s.replace(/'/g, "''")
}

function runMigrations(db: Database.Database) {
  db.exec(`
    create table if not exists _migrations (
      id         text primary key,
      applied_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    )
  `)

  const dir = join(process.cwd(), 'migrations')
  let files: string[]
  try {
    files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()
  } catch {
    return
  }

  const applied = new Set(
    db.prepare('select id from _migrations').all().map((r) => (r as { id: string }).id)
  )

  for (const file of files) {
    if (applied.has(file)) continue
    const sql = readFileSync(join(dir, file), 'utf-8')
    db.transaction(() => {
      db.exec(sql)
      db.prepare('insert into _migrations (id) values (?)').run(file)
    })()
  }
}

/**
 * Tests only — closes the cached handle and reopens a plaintext one so each
 * test starts from a clean migrated DB without going through the unlock flow.
 * Honors MINDFORGE_DISABLE_ENCRYPTION=1 set in the test setup.
 */
export function __resetDbForTests() {
  if (cached) {
    cached.close()
    cached = null
  }

  const dbPath = resolveDbPath()
  if (dbPath !== ':memory:') {
    mkdirSync(dirname(dbPath), { recursive: true })
  }
  const db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.pragma('synchronous = NORMAL')
  runMigrations(db)
  cached = db
}
