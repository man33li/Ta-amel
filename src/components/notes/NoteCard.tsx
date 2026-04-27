import Link from 'next/link'
import type { Card, Room } from '@/types'

interface NoteCardProps {
  note: Card
  /** Optional: rooms available to move this card into (palace-aware views). */
  rooms?: Room[]
  /** Called with `null` for "unfile" or a room id otherwise. */
  onMove?: (roomId: string | null) => void
}

/**
 * NoteCard - Display a note as a clickable card
 *
 * Optional `rooms` + `onMove` props make this card palace-aware: a small
 * select lets the user move the card without opening it. When omitted, the
 * card renders exactly as in v1.0 so existing tests and screens keep working.
 */
export function NoteCard({ note, rooms, onMove }: NoteCardProps) {
  const preview = extractTextFromContent(note.content)
  const formattedDate = formatDate(note.updated_at)
  const showMove = rooms !== undefined && onMove !== undefined

  return (
    <div
      className="relative p-4 border border-gray-200 dark:border-gray-700 rounded-lg
                 hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600
                 bg-white dark:bg-gray-800 transition-all duration-200"
    >
      <Link
        href={`/notes/${note.id}`}
        className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900 rounded"
      >
        <h3 className="font-semibold text-lg text-gray-900 dark:text-white truncate">
          {note.title}
        </h3>

        <p className="text-gray-500 dark:text-gray-400 text-sm mt-2 line-clamp-2 min-h-[2.5rem]">
          {preview || 'No content'}
        </p>

        <p className="text-gray-400 dark:text-gray-500 text-xs mt-3">
          {formattedDate}
        </p>
      </Link>

      {showMove && (
        <div className="mt-3">
          <label
            htmlFor={`move-${note.id}`}
            className="sr-only"
          >
            Move to room
          </label>
          <select
            id={`move-${note.id}`}
            value={note.room_id ?? ''}
            onChange={(e) => onMove(e.target.value || null)}
            className="w-full text-xs px-2 py-1 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300"
          >
            <option value="">Unfiled</option>
            {rooms!.map((room) => (
              <option key={room.id} value={room.id}>
                {room.name}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
}

/**
 * Extract plain text from Tiptap JSON content
 * 
 * COP: Concrete recursive extraction, handles nested content
 */
function extractTextFromContent(content: Record<string, unknown>): string {
  if (!content || typeof content !== 'object') return ''
  
  // Handle text nodes directly
  if (content.type === 'text' && typeof content.text === 'string') {
    return content.text
  }
  
  // Recursively extract from content array
  if (Array.isArray(content.content)) {
    return content.content
      .map((node) => extractTextFromContent(node as Record<string, unknown>))
      .join(' ')
      .trim()
      .slice(0, 200) // Limit preview length
  }
  
  return ''
}

/**
 * Format date for display
 */
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  } catch {
    return dateString
  }
}
