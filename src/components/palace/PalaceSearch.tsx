'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { useDebouncedCallback } from 'use-debounce'
import type { SearchHit } from '@/types'
import { cn } from '@/lib/utils'

interface PalaceSearchProps {
  wingId: string | null
  roomId: string | null
}

const SOURCE_STYLES: Record<SearchHit['source'], string> = {
  semantic: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  keyword: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  recent: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
}

export function PalaceSearch({ wingId, roomId }: PalaceSearchProps) {
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<SearchHit[]>([])
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const runSearch = useCallback(
    async (q: string) => {
      if (!q.trim()) {
        setHits([])
        setError(null)
        return
      }
      setSearching(true)
      setError(null)
      try {
        const params = new URLSearchParams({ q })
        if (wingId) params.set('wing_id', wingId)
        if (roomId) params.set('room_id', roomId)
        const res = await fetch(`/api/memory/search?${params.toString()}`)
        if (!res.ok) {
          setError('Search failed')
          setHits([])
          return
        }
        const data = (await res.json()) as { hits?: SearchHit[] }
        setHits(data.hits ?? [])
      } catch {
        setError('Search failed')
        setHits([])
      } finally {
        setSearching(false)
      }
    },
    [wingId, roomId]
  )

  const debounced = useDebouncedCallback(runSearch, 300)

  return (
    <div className="border-b border-gray-200 dark:border-gray-700 px-4 py-3">
      <input
        type="search"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          debounced(e.target.value)
        }}
        placeholder="Search the palace…"
        className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {searching && (
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Searching…
        </p>
      )}
      {error && (
        <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>
      )}

      {hits.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2">
          {hits.map((hit) => (
            <li key={hit.id}>
              {hit.card_id ? (
                <Link
                  href={`/notes/${hit.card_id}`}
                  className="block px-3 py-2 rounded border border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
                >
                  <PalaceSearchHit hit={hit} />
                </Link>
              ) : (
                <div className="block px-3 py-2 rounded border border-gray-200 dark:border-gray-700">
                  <PalaceSearchHit hit={hit} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function PalaceSearchHit({ hit }: { hit: SearchHit }) {
  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
          {hit.title}
        </span>
        <span
          data-testid={`source-badge-${hit.source}`}
          className={cn(
            'text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded shrink-0',
            SOURCE_STYLES[hit.source]
          )}
        >
          {hit.source}
        </span>
      </div>
      {hit.preview && (
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
          {hit.preview}
        </p>
      )}
    </>
  )
}
