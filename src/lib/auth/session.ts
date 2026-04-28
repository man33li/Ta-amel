import { randomBytes } from 'node:crypto'
import { cookies } from 'next/headers'
import { getIronSession } from 'iron-session'
import { getSetting, setSettingIfAbsent } from '@/lib/db/repo'

export interface SessionData {
  authenticatedAt?: number // unix ms
}

const COOKIE_NAME = 'mindforge_session'
const SECRET_KEY = 'session_secret'

export function getSessionPassword(): string {
  const existing = getSetting(SECRET_KEY)
  if (existing) return existing
  // Race-safe: INSERT OR IGNORE means only one writer wins; re-read to get whichever value landed.
  setSettingIfAbsent(SECRET_KEY, randomBytes(32).toString('hex'))
  return getSetting(SECRET_KEY)!
}

export async function getSession(): Promise<SessionData & {
  save(): Promise<void>
  destroy(): void
}> {
  const cookieStore = await cookies()
  return getIronSession<SessionData>(cookieStore, {
    cookieName: COOKIE_NAME,
    password: getSessionPassword(),
    cookieOptions: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      // Session cookie persists across browser restarts (7 days).
      maxAge: 60 * 60 * 24 * 7,
    },
  })
}

export function isAuthenticated(session: SessionData): boolean {
  return typeof session.authenticatedAt === 'number'
}
