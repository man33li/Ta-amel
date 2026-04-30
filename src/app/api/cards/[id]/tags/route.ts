import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/guard'
import { getCard, getCardTags, addUserTag, removeUserTag } from '@/lib/db/repo'

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
  return NextResponse.json({ tags: getCardTags(id) })
}

export async function POST(request: Request, { params }: Params) {
  const guard = await requireAuth()
  if (guard) return guard
  const { id } = await params
  if (!getCard(id)) {
    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 })
  }
  let body: { tag?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 })
  }
  if (!body.tag || typeof body.tag !== 'string') {
    return NextResponse.json({ ok: false, error: 'tag_required' }, { status: 400 })
  }
  addUserTag(id, body.tag)
  return NextResponse.json({ tags: getCardTags(id) })
}

export async function DELETE(request: Request, { params }: Params) {
  const guard = await requireAuth()
  if (guard) return guard
  const { id } = await params
  if (!getCard(id)) {
    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 })
  }
  const url = new URL(request.url)
  const tag = url.searchParams.get('tag')
  if (!tag) {
    return NextResponse.json({ ok: false, error: 'tag_required' }, { status: 400 })
  }
  removeUserTag(id, tag)
  return NextResponse.json({ tags: getCardTags(id) })
}
