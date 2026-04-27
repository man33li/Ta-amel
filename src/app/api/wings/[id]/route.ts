import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/guard'
import { updateWing, deleteWing, getWing } from '@/lib/db/repo'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface Params {
  params: Promise<{ id: string }>
}

export async function PATCH(request: Request, { params }: Params) {
  const guard = await requireAuth()
  if (guard) return guard
  const { id } = await params

  let body: { name?: string; color?: string | null }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 })
  }

  const wing = updateWing(id, body)
  if (!wing) {
    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 })
  }
  return NextResponse.json({ wing })
}

export async function DELETE(_request: Request, { params }: Params) {
  const guard = await requireAuth()
  if (guard) return guard
  const { id } = await params

  if (!getWing(id)) {
    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 })
  }
  deleteWing(id)
  return NextResponse.json({ ok: true })
}
