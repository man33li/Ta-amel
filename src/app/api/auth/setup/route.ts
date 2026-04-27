import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { isSetUp, setPassphrase } from '@/lib/auth/passphrase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({ setUp: isSetUp() })
}

export async function POST(request: Request) {
  if (isSetUp()) {
    return NextResponse.json(
      { ok: false, error: 'already_set_up' },
      { status: 409 }
    )
  }

  let body: { passphrase?: string }
  try {
    body = (await request.json()) as { passphrase?: string }
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 })
  }

  if (!body.passphrase || body.passphrase.length < 8) {
    return NextResponse.json(
      { ok: false, error: 'passphrase_too_short' },
      { status: 400 }
    )
  }

  await setPassphrase(body.passphrase)

  // Auto-log-in after setup so the user can go straight to /palace.
  const session = await getSession()
  session.authenticatedAt = Date.now()
  await session.save()

  return NextResponse.json({ ok: true })
}
