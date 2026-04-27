import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/guard'
import { updateRoom, deleteRoom, getRoom } from '@/lib/db/repo'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface Params {
  params: Promise<{ id: string }>
}

export async function PATCH(request: Request, { params }: Params) {
  const guard = await requireAuth()
  if (guard) return guard
  const { id } = await params

  let body: { name?: string; description?: string | null }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 })
  }

  const room = updateRoom(id, body)
  if (!room) {
    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 })
  }
  return NextResponse.json({ room })
}

export async function DELETE(_request: Request, { params }: Params) {
  const guard = await requireAuth()
  if (guard) return guard
  const { id } = await params

  if (!getRoom(id)) {
    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 })
  }
  deleteRoom(id)
  return NextResponse.json({ ok: true })
}
