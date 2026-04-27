import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { isSetUp, verifyPassphrase } from '@/lib/auth/passphrase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  if (!isSetUp()) {
    return NextResponse.json(
      { ok: false, error: 'not_set_up' },
      { status: 409 }
    )
  }

  let body: { passphrase?: string }
  try {
    body = (await request.json()) as { passphrase?: string }
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 })
  }

  if (!body.passphrase) {
    return NextResponse.json(
      { ok: false, error: 'passphrase_required' },
      { status: 400 }
    )
  }

  const ok = await verifyPassphrase(body.passphrase)
  if (!ok) {
    return NextResponse.json(
      { ok: false, error: 'invalid_passphrase' },
      { status: 401 }
    )
  }

  const session = await getSession()
  session.authenticatedAt = Date.now()
  await session.save()

  return NextResponse.json({ ok: true })
}
