import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/guard'
import { rekeyPassphrase } from '@/lib/auth/passphrase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const guard = await requireAuth()
  if (guard) return guard

  let body: { current?: string; next?: string }
  try {
    body = (await request.json()) as { current?: string; next?: string }
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 })
  }

  if (!body.current || !body.next) {
    return NextResponse.json(
      { ok: false, error: 'fields_required' },
      { status: 400 }
    )
  }

  try {
    await rekeyPassphrase(body.current, body.next)
  } catch (err) {
    const code = err instanceof Error ? err.message : 'rekey_failed'
    if (code === 'invalid_current_passphrase') {
      return NextResponse.json({ ok: false, error: code }, { status: 401 })
    }
    if (code === 'passphrase_too_short') {
      return NextResponse.json({ ok: false, error: code }, { status: 400 })
    }
    return NextResponse.json({ ok: false, error: 'rekey_failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
