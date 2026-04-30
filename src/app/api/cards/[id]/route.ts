import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/guard'
import { getCard, updateCard, deleteCard } from '@/lib/db/repo'
import { syncCardEmbedding, removeCardEmbedding } from '@/lib/memory/store'
import { syncCardLinks } from '@/lib/links'
import { syncCardEntities } from '@/lib/entities'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface Params {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, { params }: Params) {
  const guard = await requireAuth()
  if (guard) return guard
  const { id } = await params
  const card = getCard(id)
  if (!card) {
    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 })
  }
  return NextResponse.json({ card })
}

export async function PATCH(request: Request, { params }: Params) {
  const guard = await requireAuth()
  if (guard) return guard
  const { id } = await params

  let body: {
    title?: string
    content?: Record<string, unknown>
    room_id?: string | null
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 })
  }

  const card = updateCard(id, body)
  if (!card) {
    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 })
  }

  // Re-parse [[card-id]] cross-references on every save. Synchronous because
  // it's pure SQLite and fast; failures bubble up as 500 (rare and we want to know).
  syncCardLinks(card)
  syncCardEntities(card)

  // Best-effort embedding refresh. Do not block the response on it; if the
  // embedder is slow or unavailable the card update has already succeeded.
  void syncCardEmbedding(card).catch(() => {})

  return NextResponse.json({ card })
}

export async function DELETE(_request: Request, { params }: Params) {
  const guard = await requireAuth()
  if (guard) return guard
  const { id } = await params
  const ok = deleteCard(id)
  if (!ok) {
    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 })
  }
  removeCardEmbedding(id)
  return NextResponse.json({ ok: true })
}
