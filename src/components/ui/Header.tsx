'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { ThemeToggle } from './ThemeToggle'

export function Header() {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  // holds the revert timer so we can cancel it on second click or unmount
  const revertTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
    router.push('/login')
    router.refresh()
  }

  const handleClick = () => {
    if (!confirming) {
      setConfirming(true)
      revertTimer.current = setTimeout(() => {
        setConfirming(false)
        revertTimer.current = null
      }, 3000)
    } else {
      if (revertTimer.current) {
        clearTimeout(revertTimer.current)
        revertTimer.current = null
      }
      setConfirming(false)
      handleLogout()
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
      <div className="container mx-auto px-4 h-14 flex items-center justify-between max-w-6xl">
        <Link
          href="/"
          className="text-xl font-bold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        >
          MindForge
        </Link>

        <nav className="flex items-center gap-4 text-sm">
          <Link
            href="/"
            className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            Notes
          </Link>
          <Link
            href="/palace"
            className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            Palace
          </Link>
          <Link
            href="/settings"
            className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            Settings
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={handleClick}
            className={
              confirming
                ? 'text-sm px-2 py-1 rounded transition-colors bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                : 'text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 px-2 py-1 rounded transition-colors'
            }
            aria-label={confirming ? 'Confirm lock?' : 'Lock'}
          >
            {confirming ? 'Confirm lock?' : 'Lock'}
          </button>
        </div>
      </div>
    </header>
  )
}
