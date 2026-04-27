import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/guard'
import { listWings, createWing } from '@/lib/db/repo'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const guard = await requireAuth()
  if (guard) return guard
  return NextResponse.json({ wings: listWings() })
}

export async function POST(request: Request) {
  const guard = await requireAuth()
  if (guard) return guard

  let body: { name?: string; color?: string | null }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 })
  }

  if (!body.name?.trim()) {
    return NextResponse.json(
      { ok: false, error: 'name_required' },
      { status: 400 }
    )
  }

  const wing = createWing({ name: body.name.trim(), color: body.color ?? null })
  return NextResponse.json({ wing }, { status: 201 })
}
