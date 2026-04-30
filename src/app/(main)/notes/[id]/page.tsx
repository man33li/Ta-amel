'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useDebouncedCallback } from 'use-debounce'
import { TiptapEditor } from '@/components/notes/TiptapEditor'
import { BacklinksPanel } from '@/components/notes/BacklinksPanel'
import { TagChips } from '@/components/notes/TagChips'
import type { Card } from '@/types'

/**
 * Note Editing Page — fetch-based against /api/cards/[id].
 *
 * Auto-saves with a 1s debounce. After the save round-trips successfully,
 * the embedding sync is fired and forgotten — failure never blocks the UI.
 */
export default function NotePage() {
  const params = useParams()
  const router = useRouter()
  const noteId = params.id as string

  const [note, setNote] = useState<Card | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<string | null>(null)
  const [summarizing, setSummarizing] = useState(false)

  const fetchNote = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/cards/${noteId}`, { cache: 'no-store' })
      if (!res.ok) {
        setError('Note not found')
        setNote(null)
      } else {
        const data = (await res.json()) as { card: Card }
        setNote(data.card)
      }
    } catch {
      setError('Failed to load note')
    } finally {
      setLoading(false)
    }
  }, [noteId])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchNote()
  }, [fetchNote])

  const saveNote = useDebouncedCallback(
    async (updates: Partial<Card>) => {
      if (!note) return
      setSaving(true)
      try {
        const res = await fetch(`/api/cards/${note.id}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(updates),
        })
        if (!res.ok) {
          setError(`Failed to save (${res.status})`)
          setTimeout(() => setError(null), 5000)
        } else {
          // Fire-and-forget embedding refresh.
          void fetch('/api/memory/sync', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ cardId: note.id }),
          }).catch(() => {})
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save')
        setTimeout(() => setError(null), 5000)
      } finally {
        setSaving(false)
      }
    },
    1000
  )

  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newTitle = e.target.value
      setNote((prev) => (prev ? { ...prev, title: newTitle } : null))
      saveNote({ title: newTitle })
    },
    [saveNote]
  )

  const handleContentChange = useCallback(
    (content: Record<string, unknown>) => {
      setNote((prev) => (prev ? { ...prev, content } : null))
      saveNote({ content })
    },
    [saveNote]
  )

  const handleSummarize = async () => {
    if (!note) return
    setSummarizing(true)
    setSummary(null)
    try {
      const res = await fetch('/api/llm/summarize', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ cardId: note.id }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || data.ok === false) {
        const code = data.error ?? 'unknown'
        if (code === 'llm_disabled') {
          setError('Local LLM is off. Enable it in /settings.')
        } else {
          setError(`Could not summarize: ${code}`)
        }
        setTimeout(() => setError(null), 5000)
      } else {
        setSummary(data.summary as string)
      }
    } finally {
      setSummarizing(false)
    }
  }

  const handleDelete = async () => {
    if (!note) return
    const confirmed = confirm('Are you sure you want to delete this note?')
    if (!confirmed) return

    const res = await fetch(`/api/cards/${note.id}`, { method: 'DELETE' })
    if (!res.ok) {
      setError('Failed to delete note')
      setTimeout(() => setError(null), 5000)
      return
    }
    router.push('/')
  }

  if (loading) {
    return (
      <div className="container mx-auto p-4 max-w-3xl">
        <div className="animate-pulse">
          <div className="h-6 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
          <div className="h-10 w-full bg-gray-200 dark:bg-gray-700 rounded mb-4" />
          <div className="h-96 w-full bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    )
  }

  if (error && !note) {
    return (
      <div className="container mx-auto p-4 max-w-3xl">
        <div className="text-center py-16">
          <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
            {error}
          </h2>
          <div className="mt-4 flex items-center justify-center gap-3">
            <button
              onClick={fetchNote}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition-colors"
            >
              Back to Notes
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!note) {
    return (
      <div className="container mx-auto p-4 max-w-3xl">
        <div className="text-center py-16">
          <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Note not found
          </h2>
          <button
            onClick={() => router.push('/')}
            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            Back to Notes
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => router.push('/')}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 flex items-center gap-1"
        >
          <span>←</span>
          <span>Back</span>
        </button>

        <div className="flex items-center gap-4">
          {saving && (
            <span className="text-sm text-gray-400 dark:text-gray-500 flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
              Saving...
            </span>
          )}
          <button
            onClick={handleSummarize}
            disabled={summarizing}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-sm disabled:opacity-50"
          >
            {summarizing ? 'Summarizing…' : 'Summarize'}
          </button>
          <button
            onClick={handleDelete}
            className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm"
          >
            Delete
          </button>
        </div>
      </div>

      {error && note && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      <input
        type="text"
        value={note.title}
        onChange={handleTitleChange}
        placeholder="Untitled"
        className="w-full text-3xl font-bold mb-3 p-2 -ml-2 border-none bg-transparent
                   text-gray-900 dark:text-white placeholder-gray-400
                   focus:outline-none focus:ring-0"
      />

      <div className="mb-6">
        <TagChips cardId={note.id} />
      </div>

      {summary && (
        <div className="mb-6 p-4 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 text-sm text-blue-900 dark:text-blue-100">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
              Summary
            </span>
            <button
              onClick={() => setSummary(null)}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              dismiss
            </button>
          </div>
          <p className="whitespace-pre-wrap">{summary}</p>
        </div>
      )}

      <TiptapEditor
        content={note.content}
        onUpdate={handleContentChange}
        placeholder="Start writing your note..."
      />

      <div className="mt-6 text-sm text-gray-400 dark:text-gray-500">
        Last updated: {new Date(note.updated_at).toLocaleString()}
      </div>

      <BacklinksPanel cardId={note.id} />
    </div>
  )
}
