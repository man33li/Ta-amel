import { redirect } from 'next/navigation'
import { Header } from '@/components/ui/Header'
import { getSession, isAuthenticated } from '@/lib/auth/session'
import { isSetUp } from '@/lib/auth/passphrase'

export const dynamic = 'force-dynamic'

/**
 * (main) layout — gate behind passphrase. Server-rendered: no client-side
 * flash of unauthenticated content.
 *
 *   no passphrase set       -> /setup
 *   set but not logged in   -> /login
 *   logged in               -> render children
 */
export default async function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  if (!isSetUp()) redirect('/setup')

  const session = await getSession()
  if (!isAuthenticated(session)) redirect('/login')

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">{children}</main>
    </div>
  )
}
