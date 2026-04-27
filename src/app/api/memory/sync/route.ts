import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/guard'
import { getCard } from '@/lib/db/repo'
import { syncCardEmbedding } from '@/lib/memory/store'
import { isEmbeddingDisabled } from '@/lib/embed/embedder'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface SyncRequest {
  cardId?: string
}

export async function POST(request: Request) {
  const guard = await requireAuth()
  if (guard) return guard

  let body: SyncRequest
  try {
    body = (await request.json()) as SyncRequest
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 })
  }

  if (!body.cardId) {
    return NextResponse.json(
      { ok: false, error: 'missing_card_id' },
      { status: 400 }
    )
  }

  if (isEmbeddingDisabled()) {
    return NextResponse.json({ ok: true, synced: false, reason: 'disabled' })
  }

  const card = getCard(body.cardId)
  if (!card) {
    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 })
  }

  try {
    await syncCardEmbedding(card)
    return NextResponse.json({ ok: true, synced: true })
  } catch {
    // The card itself is already saved; embedding failures must never bubble.
    return NextResponse.json({ ok: true, synced: false })
  }
}
