'use client'

import type { Card, Room } from '@/types'
import { NoteCard } from '@/components/notes/NoteCard'

interface CardListProps {
  cards: Card[]
  rooms: Room[]
  loading: boolean
  roomSelected: boolean
  onCreate: () => void
  onMoveCard: (cardId: string, roomId: string | null) => void
}

export function CardList({
  cards,
  rooms,
  loading,
  roomSelected,
  onCreate,
  onMoveCard,
}: CardListProps) {
  return (
    <section className="flex-1 p-4 overflow-y-auto">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Cards
        </h2>
        <button
          onClick={onCreate}
          disabled={!roomSelected}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm disabled:opacity-40 disabled:cursor-not-allowed"
        >
          + New card
        </button>
      </div>

      {!roomSelected ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Select a room to see its cards.
        </p>
      ) : loading ? (
        <div data-testid="palace-cards-loading" className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"
            />
          ))}
        </div>
      ) : cards.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          This room is empty.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {cards.map((card) => (
            <NoteCard
              key={card.id}
              note={card}
              rooms={rooms}
              onMove={(roomId) => onMoveCard(card.id, roomId)}
            />
          ))}
        </div>
      )}
    </section>
  )
}
