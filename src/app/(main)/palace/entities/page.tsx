'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { Card } from '@/types'

interface Entity {
  id: string
  name: string
  type: string
  mention_count: number
}

interface Neighbor extends Entity {
  predicate: string
  weight: number
}

const TYPES: Array<{ key: string; label: string }> = [
  { key: '', label: 'All' },
  { key: 'person', label: 'People' },
  { key: 'place', label: 'Places' },
  { key: 'org', label: 'Orgs' },
  { key: 'topic', label: 'Topics' },
]

export default function EntitiesPage() {
  const [type, setType] = useState('')
  const [entities, setEntities] = useState<Entity[]>([])
  const [selected, setSelected] = useState<Entity | null>(null)
  const [neighbors, setNeighbors] = useState<Neighbor[]>([])
  const [cards, setCards] = useState<Card[]>([])

  useEffect(() => {
    const url = type ? `/api/entities?type=${type}` : '/api/entities'
    fetch(url, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { entities: [] }))
      .then((b: { entities: Entity[] }) => setEntities(b.entities))
  }, [type])

  useEffect(() => {
    if (!selected) return
    fetch(`/api/entities/${selected.id}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then(
        (
          b: { neighbors: Neighbor[]; cards: Card[] } | null
        ) => {
          if (!b) return
          setNeighbors(b.neighbors)
          setCards(b.cards)
        }
      )
  }, [selected])

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Entities</h1>
        <div className="flex gap-2">
          {TYPES.map((t) => (
            <button
              key={t.key}
              onClick={() => {
                setType(t.key)
                setSelected(null)
              }}
              className={`px-3 py-1 text-sm rounded-full border ${
                type === t.key
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <div className="space-y-1">
            {entities.length === 0 && (
              <p className="text-sm text-gray-500">
                No entities yet. Add a few notes — entities appear automatically.
              </p>
            )}
            {entities.map((e) => (
              <button
                key={e.id}
                onClick={() => setSelected(e)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between ${
                  selected?.id === e.id
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <span>
                  <span className="font-medium">{e.name}</span>
                  <span className="ml-2 text-xs text-gray-400">{e.type}</span>
                </span>
                <span className="text-xs text-gray-400">{e.mention_count}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="md:col-span-2">
          {!selected ? (
            <p className="text-sm text-gray-500">
              Select an entity to see its neighbors and source cards.
            </p>
          ) : (
            <div className="space-y-6">
              <section>
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Co-occurs with
                </h2>
                <div className="flex flex-wrap gap-1.5">
                  {neighbors.length === 0 && (
                    <p className="text-sm text-gray-500">No co-occurrences yet.</p>
                  )}
                  {neighbors.map((n) => (
                    <button
                      key={n.id}
                      onClick={() =>
                        setSelected({
                          id: n.id,
                          name: n.name,
                          type: n.type,
                          mention_count: 0,
                        })
                      }
                      className="px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-blue-100 dark:hover:bg-blue-900/40"
                    >
                      {n.name}
                      <span className="ml-1 text-gray-400">·{n.weight}</span>
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Cards mentioning {selected.name}
                </h2>
                <div className="space-y-1">
                  {cards.length === 0 && (
                    <p className="text-sm text-gray-500">No cards.</p>
                  )}
                  {cards.map((c) => (
                    <Link
                      key={c.id}
                      href={`/notes/${c.id}`}
                      className="block px-3 py-2 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      {c.title || 'Untitled'}
                    </Link>
                  ))}
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
