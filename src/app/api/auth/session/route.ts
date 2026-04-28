import { NextResponse } from 'next/server'
import { isDbUnlocked } from '@/lib/db/sqlite'
import { isSetUp } from '@/lib/auth/passphrase'
import { getSession, isAuthenticated } from '@/lib/auth/session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  // The DB is sealed before the user logs in, so we can't read the iron-session
  // secret. Treat that state as "not authenticated" without trying.
  if (!isDbUnlocked()) {
    return NextResponse.json({ setUp: isSetUp(), authenticated: false })
  }

  const session = await getSession()
  return NextResponse.json({
    setUp: isSetUp(),
    authenticated: isAuthenticated(session),
  })
}
