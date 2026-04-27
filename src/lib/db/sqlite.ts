import Database from 'better-sqlite3'
import { mkdirSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'

/**
 * SQLite singleton.
 *
 * One file, one connection per process. Migrations in /migrations apply on
 * first open and are tracked in the `_migrations` table — idempotent, so
 * restarting the dev server is safe.
 *
 * Path resolution:
 *   1. MINDFORGE_DB_PATH (absolute)            — explicit override
 *   2. MINDFORGE_DATA_DIR + 'mindforge.db'     — for users who keep data
 *      somewhere stable like ~/.mindforge
 *   3. <cwd>/data/mindforge.db                 — sensible default
 */

let cached: Database.Database | null = null

export function getDb(): Database.Database {
  if (cached) return cached

  const dbPath = resolveDbPath()
  mkdirSync(dirname(dbPath), { recursive: true })

  const db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.pragma('synchronous = NORMAL')

  runMigrations(db)
  cached = db
  return db
}

function resolveDbPath(): string {
  if (process.env.MINDFORGE_DB_PATH) return process.env.MINDFORGE_DB_PATH
  const dir = process.env.MINDFORGE_DATA_DIR ?? join(process.cwd(), 'data')
  return join(dir, 'mindforge.db')
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
    return // No migrations directory yet — nothing to do.
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

// Tests only — closes and forgets the singleton so the next getDb() opens fresh.
export function __resetDbForTests() {
  if (cached) {
    cached.close()
    cached = null
  }
}
