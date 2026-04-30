'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'

interface CardTag {
  card_id: string
  tag: string
  source: 'auto' | 'user'
}

interface Props {
  cardId: string
}

export function TagChips({ cardId }: Props) {
  const [tags, setTags] = useState<CardTag[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch(`/api/cards/${cardId}/tags`, { cache: 'no-store' })
        if (!res.ok) return
        const body = (await res.json()) as { tags: CardTag[] }
        if (!cancelled) setTags(body.tags)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [cardId])

  const addTag = async () => {
    const value = draft.trim()
    if (!value) return
    const res = await fetch(`/api/cards/${cardId}/tags`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tag: value }),
    })
    if (!res.ok) {
      toast.error('Could not add tag')
      return
    }
    const body = (await res.json()) as { tags: CardTag[] }
    setTags(body.tags)
    setDraft('')
    setAdding(false)
  }

  const removeTag = async (tag: string) => {
    const res = await fetch(
      `/api/cards/${cardId}/tags?tag=${encodeURIComponent(tag)}`,
      { method: 'DELETE' }
    )
    if (!res.ok) return
    const body = (await res.json()) as { tags: CardTag[] }
    setTags(body.tags)
  }

  if (loading) return null

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {tags.map((t) => (
        <span
          key={`${t.source}:${t.tag}`}
          className={`
            inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs
            ${t.source === 'auto'
              ? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
              : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
            }
          `}
          title={t.source === 'auto' ? 'Auto-tag (extracted from content)' : 'Your tag'}
        >
          {t.tag}
          {t.source === 'user' && (
            <button
              onClick={() => removeTag(t.tag)}
              className="opacity-50 hover:opacity-100"
              aria-label={`Remove tag ${t.tag}`}
            >
              ×
            </button>
          )}
        </span>
      ))}

      {adding ? (
        <input
          autoFocus
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') addTag()
            if (e.key === 'Escape') {
              setAdding(false)
              setDraft('')
            }
          }}
          onBlur={() => {
            if (draft.trim()) addTag()
            else setAdding(false)
          }}
          placeholder="new tag"
          className="px-2 py-0.5 text-xs rounded-full border border-gray-300 dark:border-gray-600 bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="px-2 py-0.5 text-xs rounded-full border border-dashed border-gray-300 dark:border-gray-600 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
        >
          + tag
        </button>
      )}
    </div>
  )
}
