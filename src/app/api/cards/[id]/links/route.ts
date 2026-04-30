import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/guard'
import { getCard, getOutgoingLinks, getIncomingLinks } from '@/lib/db/repo'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface Params {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, { params }: Params) {
  const guard = await requireAuth()
  if (guard) return guard

  const { id } = await params
  if (!getCard(id)) {
    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 })
  }

  return NextResponse.json({
    outgoing: getOutgoingLinks(id),
    incoming: getIncomingLinks(id),
  })
}
