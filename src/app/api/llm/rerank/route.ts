import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/guard'
import { getLlmConfig, rerank, type RerankItem } from '@/lib/llm/ollama'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const guard = await requireAuth()
  if (guard) return guard

  if (!getLlmConfig().enabled) {
    return NextResponse.json({ ok: false, error: 'llm_disabled' }, { status: 503 })
  }

  let body: { query?: string; items?: RerankItem[] }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 })
  }

  if (!body.query || !Array.isArray(body.items)) {
    return NextResponse.json({ ok: false, error: 'invalid_payload' }, { status: 400 })
  }

  try {
    const items = await rerank(body.query, body.items)
    return NextResponse.json({ items })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'llm_error'
    return NextResponse.json({ ok: false, error: message }, { status: 502 })
  }
}
