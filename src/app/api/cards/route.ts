import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/guard'
import { listCards, createCard } from '@/lib/db/repo'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const guard = await requireAuth()
  if (guard) return guard

  const url = new URL(request.url)
  const roomId = url.searchParams.get('room_id')
  const cards = listCards({ roomId: roomId ?? undefined })
  return NextResponse.json({ cards })
}

export async function POST(request: Request) {
  const guard = await requireAuth()
  if (guard) return guard

  let body: { title?: string; content?: Record<string, unknown>; room_id?: string | null }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 })
  }

  const card = createCard({
    title: body.title,
    content: body.content,
    roomId: body.room_id ?? null,
  })
  return NextResponse.json({ card }, { status: 201 })
}
