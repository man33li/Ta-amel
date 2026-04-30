import { randomUUID } from 'node:crypto'
import type Database from 'better-sqlite3-multiple-ciphers'
import { getDb } from './sqlite'
import type { Card, Wing, Room } from '@/types'

/**
 * Thin typed repository over SQLite. Pure function calls — no ORM.
 */

interface CardRow {
  id: string
  title: string
  content: string
  room_id: string | null
  created_at: string
  updated_at: string
}

const cardFromRow = (row: CardRow): Card => ({
  id: row.id,
  user_id: 'me', // single-user mode; preserved for type compat with v2.0
  title: row.title,
  content: parseJson(row.content),
  room_id: row.room_id,
  created_at: row.created_at,
  updated_at: row.updated_at,
})

const parseJson = (raw: string): Record<string, unknown> => {
  if (!raw) return {}
  try {
    return JSON.parse(raw) as Record<string, unknown>
  } catch {
    return {}
  }
}

const nowIso = () => new Date().toISOString()

// Cards ------------------------------------------------------------------

export function listCards(opts: { roomId?: string | null } = {}): Card[] {
  const db = getDb()
  const rows = opts.roomId
    ? (db
        .prepare(
          'select * from cards where room_id = ? order by updated_at desc'
        )
        .all(opts.roomId) as CardRow[])
    : (db
        .prepare('select * from cards order by updated_at desc')
        .all() as CardRow[])
  return rows.map(cardFromRow)
}

export function getCard(id: string): Card | null {
  const row = getDb().prepare('select * from cards where id = ?').get(id) as
    | CardRow
    | undefined
  return row ? cardFromRow(row) : null
}

export function createCard(input: {
  title?: string
  content?: Record<string, unknown>
  roomId?: string | null
}): Card {
  const id = randomUUID()
  const now = nowIso()
  const content = JSON.stringify(input.content ?? {})

  getDb()
    .prepare(
      `insert into cards (id, title, content, room_id, created_at, updated_at)
       values (?, ?, ?, ?, ?, ?)`
    )
    .run(id, input.title ?? 'Untitled', content, input.roomId ?? null, now, now)

  return getCard(id)!
}

export function updateCard(
  id: string,
  patch: { title?: string; content?: Record<string, unknown>; room_id?: string | null }
): Card | null {
  const fields: string[] = []
  const values: unknown[] = []

  if (patch.title !== undefined) {
    fields.push('title = ?')
    values.push(patch.title)
  }
  if (patch.content !== undefined) {
    fields.push('content = ?')
    values.push(JSON.stringify(patch.content))
  }
  if (patch.room_id !== undefined) {
    fields.push('room_id = ?')
    values.push(patch.room_id)
  }

  if (fields.length === 0) return getCard(id)

  fields.push('updated_at = ?')
  values.push(nowIso())
  values.push(id)

  const result = getDb()
    .prepare(`update cards set ${fields.join(', ')} where id = ?`)
    .run(...values)

  return result.changes > 0 ? getCard(id) : null
}

export function deleteCard(id: string): boolean {
  const result = getDb().prepare('delete from cards where id = ?').run(id)
  return result.changes > 0
}

// Wings ------------------------------------------------------------------

export function listWings(): Wing[] {
  const rows = getDb()
    .prepare('select * from wings order by created_at asc')
    .all() as Array<Omit<Wing, 'user_id'>>
  return rows.map((row) => ({ ...row, user_id: 'me' }) as Wing)
}

export function getWing(id: string): Wing | null {
  const row = getDb().prepare('select * from wings where id = ?').get(id) as
    | Omit<Wing, 'user_id'>
    | undefined
  return row ? ({ ...row, user_id: 'me' } as Wing) : null
}

export function createWing(input: { name: string; color?: string | null }): Wing {
  const id = randomUUID()
  const now = nowIso()
  getDb()
    .prepare(
      `insert into wings (id, name, color, created_at, updated_at)
       values (?, ?, ?, ?, ?)`
    )
    .run(id, input.name, input.color ?? null, now, now)
  return getWing(id)!
}

export function updateWing(
  id: string,
  patch: { name?: string; color?: string | null }
): Wing | null {
  const fields: string[] = []
  const values: unknown[] = []
  if (patch.name !== undefined) {
    fields.push('name = ?')
    values.push(patch.name)
  }
  if (patch.color !== undefined) {
    fields.push('color = ?')
    values.push(patch.color)
  }
  if (fields.length === 0) return getWing(id)

  fields.push('updated_at = ?')
  values.push(nowIso())
  values.push(id)

  const result = getDb()
    .prepare(`update wings set ${fields.join(', ')} where id = ?`)
    .run(...values)
  return result.changes > 0 ? getWing(id) : null
}

export function deleteWing(id: string): boolean {
  const result = getDb().prepare('delete from wings where id = ?').run(id)
  return result.changes > 0
}

// Rooms ------------------------------------------------------------------

export function listRooms(opts: { wingId?: string } = {}): Room[] {
  const rows = opts.wingId
    ? (getDb()
        .prepare(
          'select * from rooms where wing_id = ? order by created_at asc'
        )
        .all(opts.wingId) as Array<Omit<Room, 'user_id'>>)
    : (getDb()
        .prepare('select * from rooms order by created_at asc')
        .all() as Array<Omit<Room, 'user_id'>>)
  return rows.map((row) => ({ ...row, user_id: 'me' }) as Room)
}

export function getRoom(id: string): Room | null {
  const row = getDb().prepare('select * from rooms where id = ?').get(id) as
    | Omit<Room, 'user_id'>
    | undefined
  return row ? ({ ...row, user_id: 'me' } as Room) : null
}

export function createRoom(input: {
  wing_id: string
  name: string
  description?: string | null
}): Room {
  const id = randomUUID()
  const now = nowIso()
  getDb()
    .prepare(
      `insert into rooms (id, wing_id, name, description, created_at, updated_at)
       values (?, ?, ?, ?, ?, ?)`
    )
    .run(id, input.wing_id, input.name, input.description ?? null, now, now)
  return getRoom(id)!
}

export function updateRoom(
  id: string,
  patch: { name?: string; description?: string | null }
): Room | null {
  const fields: string[] = []
  const values: unknown[] = []
  if (patch.name !== undefined) {
    fields.push('name = ?')
    values.push(patch.name)
  }
  if (patch.description !== undefined) {
    fields.push('description = ?')
    values.push(patch.description)
  }
  if (fields.length === 0) return getRoom(id)

  fields.push('updated_at = ?')
  values.push(nowIso())
  values.push(id)

  const result = getDb()
    .prepare(`update rooms set ${fields.join(', ')} where id = ?`)
    .run(...values)
  return result.changes > 0 ? getRoom(id) : null
}

export function deleteRoom(id: string): boolean {
  const result = getDb().prepare('delete from rooms where id = ?').run(id)
  return result.changes > 0
}

// Settings (key/value bag) -----------------------------------------------

export function getSetting(key: string): string | null {
  const row = getDb().prepare('select value from settings where key = ?').get(key) as
    | { value: string }
    | undefined
  return row?.value ?? null
}

export function setSetting(key: string, value: string): void {
  getDb()
    .prepare(
      `insert into settings (key, value) values (?, ?)
       on conflict(key) do update set value = excluded.value`
    )
    .run(key, value)
}

// Inserts only when the key is absent. Returns true if the row was inserted.
export function setSettingIfAbsent(key: string, value: string): boolean {
  const result = getDb()
    .prepare('insert or ignore into settings (key, value) values (?, ?)')
    .run(key, value)
  return result.changes > 0
}

// Card links --------------------------------------------------------------

export function setCardLinks(fromId: string, toIds: string[]): void {
  const dbi = getDb()
  const tx = dbi.transaction(() => {
    dbi.prepare('delete from card_links where from_id = ?').run(fromId)
    if (toIds.length === 0) return
    const insert = dbi.prepare(
      'insert or ignore into card_links (from_id, to_id) values (?, ?)'
    )
    const cardExists = dbi.prepare('select 1 from cards where id = ?')
    for (const toId of toIds) {
      if (toId === fromId) continue
      if (!cardExists.get(toId)) continue
      insert.run(fromId, toId)
    }
  })
  tx()
}

export function getOutgoingLinks(fromId: string): Card[] {
  const rows = getDb()
    .prepare(
      `select c.* from card_links l
       inner join cards c on c.id = l.to_id
       where l.from_id = ?
       order by c.updated_at desc`
    )
    .all(fromId) as CardRow[]
  return rows.map(cardFromRow)
}

export function getIncomingLinks(toId: string): Card[] {
  const rows = getDb()
    .prepare(
      `select c.* from card_links l
       inner join cards c on c.id = l.from_id
       where l.to_id = ?
       order by c.updated_at desc`
    )
    .all(toId) as CardRow[]
  return rows.map(cardFromRow)
}

// Direct DB access for embedding store + tests
export function db(): Database.Database {
  return getDb()
}
