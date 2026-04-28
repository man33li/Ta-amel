import { NextResponse } from 'next/server'
import { isDbUnlocked } from '@/lib/db/sqlite'
import { getSession } from '@/lib/auth/session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST() {
  // If the DB is locked we can't reach the iron-session secret to destroy
  // the cookie cleanly — but the only way to unlock again is a fresh login,
  // which issues a new cookie anyway, so logout while locked is a no-op.
  if (isDbUnlocked()) {
    const session = await getSession()
    session.destroy()
  }
  return NextResponse.json({ ok: true })
}
