import { db } from '@/lib/db/repo'
import { embed, EMBEDDING_DIM, isEmbeddingDisabled } from '@/lib/embed/embedder'
import { extractTextFromTiptap } from '@/lib/utils'
import type { Card, SearchHit } from '@/types'

/**
 * Local vector store backed by the same SQLite file as the rest of the app.
 * Vectors live as BLOBs (Float32 little-endian) in `card_embeddings`.
 *
 * Single-user means the row count is bounded by your note count. Cosine
 * similarity in JS over the full table is fast up to ~10k vectors; revisit
 * with sqlite-vec if you cross that.
 */

interface EmbeddingRow {
  card_id: string
  vector: Buffer
  dim: number
  text: string
  updated_at: string
}

const f32ToBuffer = (vec: Float32Array): Buffer =>
  Buffer.from(vec.buffer, vec.byteOffset, vec.byteLength)

const bufferToF32 = (buf: Buffer, dim: number): Float32Array =>
  new Float32Array(buf.buffer, buf.byteOffset, dim)

function cosine(a: Float32Array, b: Float32Array): number {
  // Embeddings are L2-normalised at the embedder, so the dot product equals
  // cosine similarity.
  let dot = 0
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i]
  return dot
}

export async function syncCardEmbedding(card: Card): Promise<void> {
  if (isEmbeddingDisabled()) return

  const text = composeText(card)
  if (!text) {
    removeCardEmbedding(card.id)
    return
  }

  const vector = await embed(text)
  if (!vector) return

  db()
    .prepare(
      `insert into card_embeddings (card_id, vector, dim, text, updated_at)
       values (?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ','now'))
       on conflict(card_id) do update set
         vector = excluded.vector,
         dim = excluded.dim,
         text = excluded.text,
         updated_at = excluded.updated_at`
    )
    .run(card.id, f32ToBuffer(vector), EMBEDDING_DIM, text)
}

export function removeCardEmbedding(cardId: string): void {
  db().prepare('delete from card_embeddings where card_id = ?').run(cardId)
}

export interface SemanticSearchOptions {
  query: string
  roomId?: string | null
  limit?: number
}

export async function semanticSearch({
  query,
  roomId,
  limit = 10,
}: SemanticSearchOptions): Promise<SearchHit[]> {
  if (isEmbeddingDisabled() || !query.trim()) return []

  const queryVec = await embed(query)
  if (!queryVec) return []

  const rows = roomId
    ? (db()
        .prepare(
          `select e.* from card_embeddings e
           inner join cards c on c.id = e.card_id
           where c.room_id = ?`
        )
        .all(roomId) as EmbeddingRow[])
    : (db().prepare('select * from card_embeddings').all() as EmbeddingRow[])

  const ranked = rows
    .map((row) => ({
      row,
      score: cosine(queryVec, bufferToF32(row.vector, row.dim)),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)

  // Hydrate titles + updated_at from the cards table for hit display.
  if (ranked.length === 0) return []
  const cardIds = ranked.map((r) => r.row.card_id)
  const placeholders = cardIds.map(() => '?').join(',')
  const cards = db()
    .prepare(
      `select id, title, updated_at from cards where id in (${placeholders})`
    )
    .all(...cardIds) as Array<{ id: string; title: string; updated_at: string }>

  const cardById = new Map(cards.map((c) => [c.id, c]))

  return ranked.map(({ row, score }) => {
    const card = cardById.get(row.card_id)
    return {
      id: `mem:${row.card_id}`,
      card_id: row.card_id,
      title: card?.title ?? row.text.slice(0, 80),
      preview: row.text.slice(0, 200),
      score,
      source: 'semantic' as const,
      updated_at: card?.updated_at ?? row.updated_at,
    }
  })
}

function composeText(card: Card): string {
  const body = extractTextFromTiptap(card.content as Record<string, unknown>)
  const title = card.title?.trim() ?? ''
  if (title && body) return `${title}\n\n${body}`
  return title || body
}
