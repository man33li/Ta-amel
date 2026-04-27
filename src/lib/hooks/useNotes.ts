'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Card } from '@/types'

/**
 * useNotes - CRUD hook for note cards
 * 
 * COP: Concrete implementation, no premature abstraction
 * - Direct Supabase calls, no extra layers
 * - State managed locally, server as source of truth
 * - Optimistic updates for responsive UI
 */
export function useNotes() {
  const [notes, setNotes] = useState<Card[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Memoize supabase client to prevent infinite re-renders
  const supabase = useMemo(() => createClient(), [])

  // Fetch all notes for current user
  const fetchNotes = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const { data, error: fetchError } = await supabase
        .from('cards')
        .select('*')
        .order('updated_at', { ascending: false })

      if (fetchError) {
        setError(fetchError.message)
        setNotes([])
      } else {
        setNotes(data || [])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch notes')
      setNotes([])
    } finally {
      setLoading(false)
    }
  }, [supabase])

  // Create a new note
  const createNote = useCallback(async (
    title: string = 'Untitled',
    content: Record<string, unknown> = {},
    roomId: string | null = null
  ): Promise<Card> => {
    // Capture previous state for rollback
    const previousNotes = [...notes]
    
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) {
      throw new Error('Not authenticated')
    }

    // Create optimistic note with temp ID
    const tempId = crypto.randomUUID()
    const optimisticNote: Card = {
      id: tempId,
      user_id: userData.user.id,
      title,
      content,
      room_id: roomId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    // Optimistic update - show immediately
    setNotes(prev => [optimisticNote, ...prev])

    try {
      const { data, error: insertError } = await supabase
        .from('cards')
        .insert({
          user_id: userData.user.id,
          title,
          content,
          ...(roomId ? { room_id: roomId } : {})
        })
        .select()
        .single()

      if (insertError) {
        // Rollback on error
        setNotes(previousNotes)
        setError('Failed to create note: ' + insertError.message)
        throw new Error(insertError.message)
      }

      // Replace temp note with server-returned note
      setNotes(prev => prev.map(n => n.id === tempId ? data : n))
      return data
    } catch (err) {
      // Rollback on any error
      setNotes(previousNotes)
      const message = err instanceof Error ? err.message : 'Failed to create note'
      setError(message)
      throw err
    }
  }, [supabase, notes])

  // Update an existing note
  const updateNote = useCallback(async (
    id: string,
    updates: { title?: string; content?: Record<string, unknown>; room_id?: string | null }
  ): Promise<Card> => {
    // Capture previous state for rollback
    const previousNotes = [...notes]
    
    // Optimistic update - show changes immediately
    setNotes(prev => prev.map(note => 
      note.id === id ? { ...note, ...updates, updated_at: new Date().toISOString() } : note
    ))

    try {
      const { data, error: updateError } = await supabase
        .from('cards')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (updateError) {
        // Rollback on error
        setNotes(previousNotes)
        setError('Failed to update note: ' + updateError.message)
        throw new Error(updateError.message)
      }

      // Update local state with server data
      setNotes(prev => prev.map(note =>
        note.id === id ? data : note
      ))

      // Fire-and-forget memory sync. Failure must not block the editor.
      void fetch('/api/memory/sync', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ cardId: id }),
      }).catch(() => {})

      return data
    } catch (err) {
      // Rollback on any error
      setNotes(previousNotes)
      const message = err instanceof Error ? err.message : 'Failed to update note'
      setError(message)
      throw err
    }
  }, [supabase, notes])

  // Delete a note
  const deleteNote = useCallback(async (id: string): Promise<void> => {
    // Capture previous state for rollback
    const previousNotes = [...notes]
    
    // Optimistic update - remove immediately
    setNotes(prev => prev.filter(note => note.id !== id))

    try {
      // Supabase delete returns void on success
      const result = await supabase
        .from('cards')
        .delete()
        .eq('id', id)

      if (result.error) {
        // Rollback on error - note reappears
        setNotes(previousNotes)
        setError('Failed to delete note: ' + result.error.message)
        throw new Error(result.error.message)
      }
    } catch (err) {
      // Rollback on any error
      setNotes(previousNotes)
      const message = err instanceof Error ? err.message : 'Failed to delete note'
      setError(message)
      throw err
    }
  }, [supabase, notes])

  // Initial fetch on mount
  useEffect(() => {
    fetchNotes()
  }, [fetchNotes])

  return {
    notes,
    loading,
    error,
    createNote,
    updateNote,
    deleteNote,
    refetch: fetchNotes
  }
}
