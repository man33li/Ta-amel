'use client'

import { useRouter } from 'next/navigation'
import { useNotes } from '@/lib/hooks/useNotes'
import { NoteCard } from '@/components/notes/NoteCard'

/**
 * Home Page - Notes Grid
 * 
 * COP: Direct implementation
 * - Loading state with skeleton
 * - Empty state with prompt
 * - Notes grid with cards
 * - Floating create button
 */
export default function HomePage() {
  const router = useRouter()
  const { notes, loading, error, createNote, refetch } = useNotes()

  const handleCreateNote = async () => {
    try {
      const newNote = await createNote('Untitled')
      router.push(`/notes/${newNote.id}`)
    } catch (err) {
      console.error('Failed to create note:', err)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="container mx-auto p-4 max-w-6xl">
        <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-6 animate-pulse" />
        <div data-testid="loading-skeleton" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div 
              key={i} 
              className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" 
            />
          ))}
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="container mx-auto p-4 max-w-6xl">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">My Notes</h1>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg">
          Error loading notes: {error}
          <button
            onClick={refetch}
            className="mt-4 block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Notes</h1>
        
        {/* Desktop create button */}
        <button
          onClick={handleCreateNote}
          className="hidden sm:flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <span>+</span>
          <span>New Note</span>
        </button>
      </div>

      {/* Empty State */}
      {notes.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-gray-400 dark:text-gray-500 text-6xl mb-4">📝</div>
          <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
            No notes yet
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Create your first note to get started
          </p>
          <button
            onClick={handleCreateNote}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Create First Note
          </button>
        </div>
      ) : (
        /* Notes Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {notes.map((note) => (
            <NoteCard key={note.id} note={note} />
          ))}
        </div>
      )}

      {/* Floating Action Button (Mobile) */}
      <button
        onClick={handleCreateNote}
        className="sm:hidden fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center text-2xl transition-colors"
        aria-label="Create new note"
      >
        +
      </button>
    </div>
  )
}
