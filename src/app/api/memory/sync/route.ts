import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getMemory } from '@/lib/memory/client'
import { extractTextFromTiptap } from '@/lib/utils'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface SyncRequest {
  cardId?: string
}

export async function POST(request: Request) {
  let body: SyncRequest
  try {
    body = (await request.json()) as SyncRequest
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 })
  }

  if (!body.cardId) {
    return NextResponse.json({ ok: false, error: 'missing_card_id' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData.user) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  const { data: card, error: cardErr } = await supabase
    .from('cards')
    .select('id, title, content, room_id')
    .eq('id', body.cardId)
    .single()

  if (cardErr || !card) {
    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 })
  }

  let wingId: string | null = null
  if (card.room_id) {
    const { data: room } = await supabase
      .from('rooms')
      .select('wing_id')
      .eq('id', card.room_id)
      .single()
    wingId = room?.wing_id ?? null
  }

  const text = extractTextFromTiptap(card.content as Record<string, unknown>)
  const composed = card.title ? `${card.title}\n\n${text}` : text

  const memory = await getMemory()
  if (!memory.available || !composed.trim()) {
    return NextResponse.json({ ok: true, synced: false })
  }

  try {
    await memory.add({
      content: composed,
      userId: userData.user.id,
      cardId: card.id,
      wingId,
      roomId: card.room_id ?? null,
    })
    return NextResponse.json({ ok: true, synced: true })
  } catch {
    // Sync failures must never bubble up — the card is already saved.
    return NextResponse.json({ ok: true, synced: false })
  }
}
