import { NextResponse } from 'next/server'
import { getSession, isAuthenticated } from '@/lib/auth/session'
import { isSetUp } from '@/lib/auth/passphrase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getSession()
  return NextResponse.json({
    setUp: isSetUp(),
    authenticated: isAuthenticated(session),
  })
}
