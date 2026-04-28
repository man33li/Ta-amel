import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/guard'
import { db } from '@/lib/db/repo'
import type { Wing, Room, Card } from '@/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface EmbeddingEntry {
  card_id: string
  vector_b64: string
  dim: number
  text: string
  updated_at: string
}

interface ImportPayload {
  version: number
  wings: Wing[]
  rooms: Room[]
  cards: Card[]
  embeddings: EmbeddingEntry[]
}

export async function POST(request: Request) {
  const guard = await requireAuth()
  if (guard) return guard

  let body: ImportPayload
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 })
  }

  if (body.version !== 1) {
    return NextResponse.json({ ok: false, error: 'unsupported_version' }, { status: 400 })
  }

  if (
    !Array.isArray(body.wings) ||
    !Array.isArray(body.rooms) ||
    !Array.isArray(body.cards) ||
    !Array.isArray(body.embeddings)
  ) {
    return NextResponse.json({ ok: false, error: 'invalid_payload' }, { status: 400 })
  }

  const database = db()

  const wingsStmt = database.prepare(
    'insert or ignore into wings (id, name, color, created_at, updated_at) values (?, ?, ?, ?, ?)'
  )
  const roomsStmt = database.prepare(
    'insert or ignore into rooms (id, wing_id, name, description, created_at, updated_at) values (?, ?, ?, ?, ?, ?)'
  )
  const cardsStmt = database.prepare(
    'insert or ignore into cards (id, title, content, room_id, created_at, updated_at) values (?, ?, ?, ?, ?, ?)'
  )
  const embeddingsStmt = database.prepare(
    'insert or ignore into card_embeddings (card_id, vector, dim, text, updated_at) values (?, ?, ?, ?, ?)'
  )

  const counts = { wings: 0, rooms: 0, cards: 0, embeddings: 0 }
  const skipped = { wings: 0, rooms: 0, cards: 0, embeddings: 0 }

  for (const wing of body.wings) {
    try {
      const result = wingsStmt.run(wing.id, wing.name, wing.color ?? null, wing.created_at, wing.updated_at)
      if (result.changes > 0) counts.wings++
      else skipped.wings++
    } catch {
      skipped.wings++
    }
  }

  for (const room of body.rooms) {
    try {
      const result = roomsStmt.run(room.id, room.wing_id, room.name, room.description ?? null, room.created_at, room.updated_at)
      if (result.changes > 0) counts.rooms++
      else skipped.rooms++
    } catch {
      skipped.rooms++
    }
  }

  for (const card of body.cards) {
    try {
      const content = typeof card.content === 'string' ? card.content : JSON.stringify(card.content ?? {})
      const result = cardsStmt.run(card.id, card.title, content, card.room_id ?? null, card.created_at, card.updated_at)
      if (result.changes > 0) counts.cards++
      else skipped.cards++
    } catch {
      skipped.cards++
    }
  }

  for (const emb of body.embeddings) {
    try {
      const vector = Buffer.from(emb.vector_b64, 'base64')
      const result = embeddingsStmt.run(emb.card_id, vector, emb.dim, emb.text, emb.updated_at)
      if (result.changes > 0) counts.embeddings++
      else skipped.embeddings++
    } catch {
      skipped.embeddings++
    }
  }

  return NextResponse.json({ ok: true, imported: counts, skipped })
}
