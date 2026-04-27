import { NextResponse } from 'next/server'
import { getSession, isAuthenticated } from '@/lib/auth/session'

/**
 * Use at the top of an API route handler:
 *
 *   const guard = await requireAuth()
 *   if (guard) return guard
 *   // ... authenticated work
 *
 * Returns null when authenticated, or a 401 NextResponse otherwise.
 */
export async function requireAuth(): Promise<NextResponse | null> {
  const session = await getSession()
  if (!isAuthenticated(session)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }
  return null
}
