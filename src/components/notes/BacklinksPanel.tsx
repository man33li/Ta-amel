'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import type { Card } from '@/types'

interface LinksResponse {
  outgoing: Card[]
  incoming: Card[]
}

interface Props {
  cardId: string
}

export function BacklinksPanel({ cardId }: Props) {
  const [data, setData] = useState<LinksResponse>({ outgoing: [], incoming: [] })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const res = await fetch(`/api/cards/${cardId}/links`, { cache: 'no-store' })
        if (!res.ok) return
        const body = (await res.json()) as LinksResponse
        if (!cancelled) setData(body)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [cardId])

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`[[${cardId}]]`)
      toast.success('Link copied. Paste into another note to cross-reference.')
    } catch {
      toast.error('Could not copy. Long-press the card id instead.')
    }
  }

  if (loading) return null

  const total = data.outgoing.length + data.incoming.length
  return (
    <section className="mt-10 pt-6 border-t border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300">
          Cross-references
        </h3>
        <button
          onClick={copyLink}
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
        >
          Copy [[link]] for this card
        </button>
      </div>

      {total === 0 ? (
        <p className="text-xs text-gray-400 dark:text-gray-500">
          No cross-references. Paste{' '}
          <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">
            [[card-id]]
          </code>{' '}
          into another note to link to this one.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <LinkColumn
            title={`Linked to (${data.outgoing.length})`}
            empty="This note doesn't link out."
            cards={data.outgoing}
          />
          <LinkColumn
            title={`Linked from (${data.incoming.length})`}
            empty="No notes link here yet."
            cards={data.incoming}
          />
        </div>
      )}
    </section>
  )
}

function LinkColumn({
  title,
  empty,
  cards,
}: {
  title: string
  empty: string
  cards: Card[]
}) {
  return (
    <div>
      <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
        {title}
      </h4>
      {cards.length === 0 ? (
        <p className="text-xs text-gray-400 dark:text-gray-500">{empty}</p>
      ) : (
        <ul className="space-y-1">
          {cards.map((card) => (
            <li key={card.id}>
              <Link
                href={`/notes/${card.id}`}
                className="block text-sm text-blue-600 dark:text-blue-400 hover:underline truncate"
              >
                {card.title || 'Untitled'}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
