import { requireAuth } from '@/lib/auth/guard'
import { listCards, listWings, listRooms, db } from '@/lib/db/repo'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface EmbeddingRow {
  card_id: string
  vector: Buffer
  dim: number
  text: string
  updated_at: string
}

export async function GET() {
  const guard = await requireAuth()
  if (guard) return guard

  const wings = listWings()
  const rooms = listRooms()
  const cards = listCards()

  const rows = db()
    .prepare('select card_id, vector, dim, text, updated_at from card_embeddings')
    .all() as EmbeddingRow[]

  const embeddings = rows.map((row) => ({
    card_id: row.card_id,
    vector_b64: Buffer.from(row.vector).toString('base64'),
    dim: row.dim,
    text: row.text,
    updated_at: row.updated_at,
  }))

  const date = new Date().toISOString().slice(0, 10)
  const body = JSON.stringify({
    version: 1,
    exported_at: new Date().toISOString(),
    wings,
    rooms,
    cards,
    embeddings,
  })

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="mindforge-export-${date}.json"`,
    },
  })
}
