'use client'

import Link from 'next/link'
import { ThemeToggle } from './ThemeToggle'

/**
 * Header - Global navigation bar
 * 
 * COP: Simple, direct implementation
 * - Logo/brand link
 * - Theme toggle
 */
export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
      <div className="container mx-auto px-4 h-14 flex items-center justify-between max-w-6xl">
        {/* Logo */}
        <Link 
          href="/"
          className="text-xl font-bold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        >
          MindForge
        </Link>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
