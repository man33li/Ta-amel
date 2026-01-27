'use client'

import Link from 'next/link'

/**
 * 404 Not Found Page
 * 
 * COP: Simple, direct — matches error.tsx styling
 */
export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="text-center max-w-md">
        <div className="text-gray-400 text-6xl mb-4">404</div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Page not found
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          The page you&apos;re looking for doesn&apos;t exist.
        </p>
        <Link
          href="/"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors inline-block"
        >
          Go home
        </Link>
      </div>
    </div>
  )
}
