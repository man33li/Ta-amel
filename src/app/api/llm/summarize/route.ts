import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/guard'
import { getCard } from '@/lib/db/repo'
import { getLlmConfig, summarize } from '@/lib/llm/ollama'
import { extractTextFromTiptap } from '@/lib/utils'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const guard = await requireAuth()
  if (guard) return guard

  if (!getLlmConfig().enabled) {
    return NextResponse.json({ ok: false, error: 'llm_disabled' }, { status: 503 })
  }

  let body: { cardId?: string; text?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 })
  }

  let text = (body.text ?? '').trim()
  if (!text && body.cardId) {
    const card = getCard(body.cardId)
    if (!card) {
      return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 })
    }
    text = `${card.title}\n\n${extractTextFromTiptap(card.content)}`.trim()
  }

  if (!text) {
    return NextResponse.json({ ok: false, error: 'empty_input' }, { status: 400 })
  }

  try {
    const summary = await summarize(text)
    return NextResponse.json({ summary })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'llm_error'
    return NextResponse.json({ ok: false, error: message }, { status: 502 })
  }
}
