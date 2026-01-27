import Link from 'next/link'
import type { Card } from '@/types'

interface NoteCardProps {
  note: Card
}

/**
 * NoteCard - Display a note as a clickable card
 * 
 * COP: Direct implementation
 * - Extract text from Tiptap JSON content
 * - Format date for display
 * - Link to note editor
 */
export function NoteCard({ note }: NoteCardProps) {
  const preview = extractTextFromContent(note.content)
  const formattedDate = formatDate(note.updated_at)

  return (
    <Link
      href={`/notes/${note.id}`}
      className="block p-4 border border-gray-200 dark:border-gray-700 rounded-lg 
                 hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600
                 bg-white dark:bg-gray-800 transition-all duration-200"
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
