import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/guard'
import { listRooms, createRoom } from '@/lib/db/repo'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const guard = await requireAuth()
  if (guard) return guard
  const url = new URL(request.url)
  const wingId = url.searchParams.get('wing_id')
  return NextResponse.json({ rooms: listRooms({ wingId: wingId ?? undefined }) })
}

export async function POST(request: Request) {
  const guard = await requireAuth()
  if (guard) return guard

  let body: { wing_id?: string; name?: string; description?: string | null }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 })
  }

  if (!body.wing_id || !body.name?.trim()) {
    return NextResponse.json(
      { ok: false, error: 'wing_id_and_name_required' },
      { status: 400 }
    )
  }

  const room = createRoom({
    wing_id: body.wing_id,
    name: body.name.trim(),
    description: body.description ?? null,
  })
  return NextResponse.json({ room }, { status: 201 })
}
