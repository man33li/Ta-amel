'use client'

import type { Wing } from '@/types'
import { cn } from '@/lib/utils'

interface WingListProps {
  wings: Wing[]
  activeWingId: string | null
  onSelect: (wingId: string) => void
  onCreate: () => void
}

export function WingList({ wings, activeWingId, onSelect, onCreate }: WingListProps) {
  return (
    <aside className="border-r border-gray-200 dark:border-gray-700 p-3 flex flex-col gap-2 min-w-[180px]">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Wings
        </h2>
        <button
          onClick={onCreate}
          aria-label="Create wing"
          className="text-blue-600 dark:text-blue-400 hover:text-blue-700 text-sm"
        >
          + New
        </button>
      </div>

      {wings.length === 0 ? (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          No wings yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-1">
          {wings.map((wing) => (
            <li key={wing.id}>
              <button
                onClick={() => onSelect(wing.id)}
                className={cn(
                  'w-full text-left px-2 py-1.5 rounded text-sm transition-colors',
                  activeWingId === wing.id
                    ? 'bg-blue-100 text-blue-900 dark:bg-blue-900/30 dark:text-blue-200'
                    : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
                )}
              >
                <span
                  className="inline-block w-2 h-2 rounded-full mr-2 align-middle"
                  style={{ backgroundColor: wing.color ?? '#9ca3af' }}
                  aria-hidden
                />
                {wing.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </aside>
  )
}
