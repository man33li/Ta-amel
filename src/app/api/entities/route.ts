import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/guard'
import { listEntities } from '@/lib/db/repo'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ALLOWED_TYPES = new Set(['person', 'place', 'org', 'topic', 'other'])

export async function GET(request: Request) {
  const guard = await requireAuth()
  if (guard) return guard

  const url = new URL(request.url)
  const typeParam = url.searchParams.get('type') ?? undefined
  const limitParam = url.searchParams.get('limit')
  const limit = limitParam ? Math.min(500, Math.max(1, parseInt(limitParam, 10) || 100)) : 100
  const type = typeParam && ALLOWED_TYPES.has(typeParam) ? typeParam : undefined

  return NextResponse.json({ entities: listEntities({ type, limit }) })
}
