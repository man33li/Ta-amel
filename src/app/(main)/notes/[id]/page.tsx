'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useDebouncedCallback } from 'use-debounce'
import { createClient } from '@/lib/supabase/client'
import { TiptapEditor } from '@/components/notes/TiptapEditor'
import type { Card } from '@/types'

/**
 * Note Editing Page
 * 
 * COP: Direct implementation
 * - Load note by ID
 * - Editable title
 * - Tiptap rich text editor
 * - Debounced auto-save (1 second delay)
 * - Delete with confirmation
 */
export default function NotePage() {
  const params = useParams()
  const router = useRouter()
  const noteId = params.id as string
  
  const [note, setNote] = useState<Card | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const supabase = useMemo(() => createClient(), [])

  // Fetch note on mount
  useEffect(() => {
    async function fetchNote() {
      setLoading(true)
      setError(null)
      
      const { data, error: fetchError } = await supabase
        .from('cards')
        .select('*')
        .eq('id', noteId)
        .single()

      if (fetchError || !data) {
        setError('Note not found')
        setLoading(false)
        return
      }
      
      setNote(data)
      setLoading(false)
    }
    
    fetchNote()
  }, [noteId, supabase])

  // Debounced save function (1 second delay)
  const saveNote = useDebouncedCallback(
    async (updates: Partial<Card>) => {
      if (!note) return
      
      setSaving(true)
      
      const { error: updateError } = await supabase
        .from('cards')
        .update(updates)
        .eq('id', note.id)

      if (updateError) {
        console.error('Failed to save note:', updateError)
        setError('Failed to save: ' + updateError.message)
        // Auto-dismiss error after 5 seconds
        setTimeout(() => setError(null), 5000)
      }
      
      setSaving(false)
    },
    1000 // 1 second debounce
  )

  // Handle title change
  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value
    setNote(prev => prev ? { ...prev, title: newTitle } : null)
    saveNote({ title: newTitle })
  }, [saveNote])

  // Handle content change
  const handleContentChange = useCallback((content: Record<string, unknown>) => {
    setNote(prev => prev ? { ...prev, content } : null)
    saveNote({ content })
  }, [saveNote])

  // Handle delete
  const handleDelete = async () => {
    if (!note) return
    
    const confirmed = confirm('Are you sure you want to delete this note?')
    if (!confirmed) return
    
    const { error: deleteError } = await supabase
      .from('cards')
      .delete()
      .eq('id', note.id)

    if (deleteError) {
      console.error('Failed to delete note:', deleteError)
      setError('Failed to delete note')
      // Auto-dismiss error after 5 seconds
      setTimeout(() => setError(null), 5000)
      return
    }
    
    router.push('/')
  }

  // Loading state
  if (loading) {
    return (
      <div className="container mx-auto p-4 max-w-3xl">
        <div className="animate-pulse">
          <div className="h-6 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
          <div className="h-10 w-full bg-gray-200 dark:bg-gray-700 rounded mb-4" />
          <div className="h-96 w-full bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    )
  }

  // Error state
  if (error || !note) {
    return (
      <div className="container mx-auto p-4 max-w-3xl">
        <div className="text-center py-16">
          <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
            {error || 'Note not found'}
          </h2>
          <button
            onClick={() => router.push('/')}
            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            Back to Notes
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => router.push('/')}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 flex items-center gap-1"
        >
          <span>←</span>
          <span>Back</span>
        </button>
        
        <div className="flex items-center gap-4">
          {/* Saving indicator */}
          {saving && (
            <span className="text-sm text-gray-400 dark:text-gray-500 flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
              Saving...
            </span>
          )}
          
          {/* Delete button */}
          <button
            onClick={handleDelete}
            className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Error display - show save/delete errors when note exists */}
      {error && note && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Title Input */}
      <input
        type="text"
        value={note.title}
        onChange={handleTitleChange}
        placeholder="Untitled"
        className="w-full text-3xl font-bold mb-6 p-2 -ml-2 border-none bg-transparent 
                   text-gray-900 dark:text-white placeholder-gray-400
                   focus:outline-none focus:ring-0"
      />

      {/* Editor */}
      <TiptapEditor
        content={note.content}
        onUpdate={handleContentChange}
        placeholder="Start writing your note..."
      />
      
      {/* Metadata footer */}
      <div className="mt-6 text-sm text-gray-400 dark:text-gray-500">
        Last updated: {new Date(note.updated_at).toLocaleString()}
      </div>
    </div>
  )
}
