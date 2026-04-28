'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Spinner } from '@/components/ui/Spinner'

/**
 * Login Page (v3.0 — local-first, single-user passphrase only).
 */
export const dynamic = 'force-dynamic'

export default function LoginPage() {
  const [passphrase, setPassphrase] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ passphrase }),
      })
      if (res.status === 409) {
        // App not yet set up — divert to /setup.
        router.push('/setup')
        return
      }
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        setError(
          data.error === 'invalid_passphrase'
            ? 'Wrong passphrase'
            : 'Login failed'
        )
        setLoading(false)
        return
      }
      router.push('/')
      router.refresh()
    } catch {
      setError('Network error')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            MindForge
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Local-first notes. Enter your passphrase.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="passphrase"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Passphrase
            </label>
            <input
              id="passphrase"
              type="password"
              autoFocus
              autoComplete="current-password"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              required
              className="mt-1 block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            {loading ? (
              <>
                <Spinner size="sm" className="inline mr-2" /> Unlocking...
              </>
            ) : (
              'Unlock'
            )}
          </button>
        </form>

        <p className="text-center text-xs text-gray-500 dark:text-gray-400">
          First time on this machine?{' '}
          <a href="/setup" className="text-blue-600 hover:text-blue-500 dark:text-blue-400">
            Set a passphrase
          </a>
          .
        </p>
      </div>
    </div>
  )
}
