'use client'

import type { Room } from '@/types'
import { cn } from '@/lib/utils'

interface RoomListProps {
  rooms: Room[]
  activeRoomId: string | null
  wingSelected: boolean
  onSelect: (roomId: string) => void
  onCreate: () => void
}

export function RoomList({
  rooms,
  activeRoomId,
  wingSelected,
  onSelect,
  onCreate,
}: RoomListProps) {
  return (
    <section className="border-r border-gray-200 dark:border-gray-700 p-3 flex flex-col gap-2 min-w-[200px]">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Rooms
        </h2>
        <button
          onClick={onCreate}
          disabled={!wingSelected}
          aria-label="Create room"
          className="text-blue-600 dark:text-blue-400 hover:text-blue-700 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
        >
          + New
        </button>
      </div>

      {!wingSelected ? (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Select a wing to see its rooms.
        </p>
      ) : rooms.length === 0 ? (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          No rooms yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-1">
          {rooms.map((room) => (
            <li key={room.id}>
              <button
                onClick={() => onSelect(room.id)}
                className={cn(
                  'w-full text-left px-2 py-1.5 rounded text-sm transition-colors',
                  activeRoomId === room.id
                    ? 'bg-blue-100 text-blue-900 dark:bg-blue-900/30 dark:text-blue-200'
                    : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
                )}
              >
                {room.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
