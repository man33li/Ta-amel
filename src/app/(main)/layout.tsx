import { Header } from '@/components/ui/Header'

/**
 * Main Layout - Applied to all authenticated pages
 * 
 * Includes:
 * - Header with navigation and theme toggle
 * - Main content area
 */
export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        {children}
      </main>
    </div>
  )
}
