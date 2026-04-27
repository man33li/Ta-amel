'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Card } from '@/types'

/**
 * useNotes — fetch-based CRUD against /api/cards.
 *
 * v3.0 swapped Supabase-from-the-browser for a SQLite-backed API layer.
 * Optimistic updates and rollback semantics are preserved from v2.0.
 */
export function useNotes() {
  const [notes, setNotes] = useState<Card[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchNotes = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/cards', { cache: 'no-store' })
      if (!res.ok) {
        setError(`Failed to load notes (${res.status})`)
        setNotes([])
      } else {
        const data = (await res.json()) as { cards?: Card[] }
        setNotes(data.cards ?? [])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notes')
      setNotes([])
    } finally {
      setLoading(false)
    }
  }, [])

  const createNote = useCallback(
    async (
      title: string = 'Untitled',
      content: Record<string, unknown> = {},
      roomId: string | null = null
    ): Promise<Card> => {
      const previous = notes
      const tempId = crypto.randomUUID()
      const now = new Date().toISOString()
      const optimistic: Card = {
        id: tempId,
        user_id: 'me',
        title,
        content,
        room_id: roomId,
        created_at: now,
        updated_at: now,
      }
      setNotes((prev) => [optimistic, ...prev])

      try {
        const res = await fetch('/api/cards', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ title, content, room_id: roomId }),
        })
        if (!res.ok) throw new Error(`Failed to create note (${res.status})`)
        const data = (await res.json()) as { card: Card }
        setNotes((prev) => prev.map((n) => (n.id === tempId ? data.card : n)))
        return data.card
      } catch (err) {
        setNotes(previous)
        const message = err instanceof Error ? err.message : 'Failed to create note'
        setError(message)
        throw err
      }
    },
    [notes]
  )

  const updateNote = useCallback(
    async (
      id: string,
      updates: { title?: string; content?: Record<string, unknown>; room_id?: string | null }
    ): Promise<Card> => {
      const previous = notes
      const now = new Date().toISOString()
      setNotes((prev) =>
        prev.map((n) => (n.id === id ? { ...n, ...updates, updated_at: now } : n))
      )

      try {
        const res = await fetch(`/api/cards/${id}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(updates),
        })
        if (!res.ok) throw new Error(`Failed to update note (${res.status})`)
        const data = (await res.json()) as { card: Card }
        setNotes((prev) => prev.map((n) => (n.id === id ? data.card : n)))
        return data.card
      } catch (err) {
        setNotes(previous)
        const message = err instanceof Error ? err.message : 'Failed to update note'
        setError(message)
        throw err
      }
    },
    [notes]
  )

  const deleteNote = useCallback(
    async (id: string): Promise<void> => {
      const previous = notes
      setNotes((prev) => prev.filter((n) => n.id !== id))

      try {
        const res = await fetch(`/api/cards/${id}`, { method: 'DELETE' })
        if (!res.ok) throw new Error(`Failed to delete note (${res.status})`)
      } catch (err) {
        setNotes(previous)
        const message = err instanceof Error ? err.message : 'Failed to delete note'
        setError(message)
        throw err
      }
    },
    [notes]
  )

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchNotes()
  }, [fetchNotes])

  return {
    notes,
    loading,
    error,
    createNote,
    updateNote,
    deleteNote,
    refetch: fetchNotes,
  }
}
