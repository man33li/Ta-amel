import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/guard'
import { getLlmConfig, setLlmConfig, pingOllama } from '@/lib/llm/ollama'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const guard = await requireAuth()
  if (guard) return guard
  const cfg = getLlmConfig()
  const reachable = cfg.enabled ? await pingOllama(cfg.endpoint) : false
  return NextResponse.json({ ...cfg, reachable })
}

export async function POST(request: Request) {
  const guard = await requireAuth()
  if (guard) return guard
  let body: { enabled?: boolean; endpoint?: string; model?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 })
  }
  const cfg = setLlmConfig(body)
  const reachable = cfg.enabled ? await pingOllama(cfg.endpoint) : false
  return NextResponse.json({ ...cfg, reachable })
}
