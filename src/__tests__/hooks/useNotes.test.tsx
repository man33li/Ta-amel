import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useNotes } from '@/lib/hooks/useNotes'
import { mockStore } from '../setup'
import type { Card } from '@/types'

// Test data - COP: Concrete, specific test cases
const testCards: Card[] = [
  {
    id: 'card-1',
    user_id: 'test-user-id',
    title: 'First Note',
    content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] }] },
    created_at: '2026-01-20T10:00:00Z',
    updated_at: '2026-01-20T10:00:00Z'
  },
  {
    id: 'card-2',
    user_id: 'test-user-id',
    title: 'Second Note',
    content: {},
    created_at: '2026-01-21T10:00:00Z',
    updated_at: '2026-01-21T12:00:00Z'
  }
]

describe('useNotes', () => {
  beforeEach(() => {
    mockStore.reset()
  })

  describe('fetching notes', () => {
    it('returns empty array when no notes exist', async () => {
      const { result } = renderHook(() => useNotes())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.notes).toEqual([])
      expect(result.current.error).toBeNull()
    })

    it('fetches notes on mount', async () => {
      mockStore.seedCards(testCards)

      const { result } = renderHook(() => useNotes())

      // Initially loading
      expect(result.current.loading).toBe(true)

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.notes).toHaveLength(2)
      expect(result.current.notes[0].title).toBe('First Note')
    })

    it('only fetches notes for current user', async () => {
      const cardsWithOtherUser: Card[] = [
        ...testCards,
        {
          id: 'card-other',
          user_id: 'other-user-id',
          title: 'Other User Note',
          content: {},
          created_at: '2026-01-22T10:00:00Z',
          updated_at: '2026-01-22T10:00:00Z'
        }
      ]
      mockStore.seedCards(cardsWithOtherUser)

      const { result } = renderHook(() => useNotes())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Should only have 2 notes (not the other user's note)
      expect(result.current.notes).toHaveLength(2)
    })
  })

  describe('creating notes', () => {
    it('creates a new note with title', async () => {
      const { result } = renderHook(() => useNotes())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      let createdNote: Card | undefined
      await act(async () => {
        createdNote = await result.current.createNote('My New Note')
      })

      expect(createdNote).toBeDefined()
      expect(createdNote!.title).toBe('My New Note')
      expect(result.current.notes).toHaveLength(1)
      expect(result.current.notes[0].title).toBe('My New Note')
    })

    it('creates note with default title when not provided', async () => {
      const { result } = renderHook(() => useNotes())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      let createdNote: Card | undefined
      await act(async () => {
        createdNote = await result.current.createNote()
      })

      expect(createdNote!.title).toBe('Untitled')
    })

    it('creates note with initial content', async () => {
      const { result } = renderHook(() => useNotes())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const initialContent = { type: 'doc', content: [] }
      let createdNote: Card | undefined
      await act(async () => {
        createdNote = await result.current.createNote('Test', initialContent)
      })

      expect(createdNote!.content).toEqual(initialContent)
    })
  })

  describe('updating notes', () => {
    it('updates note title', async () => {
      mockStore.seedCards(testCards)
      const { result } = renderHook(() => useNotes())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.updateNote('card-1', { title: 'Updated Title' })
      })

      expect(result.current.notes.find(n => n.id === 'card-1')?.title).toBe('Updated Title')
    })

    it('updates note content', async () => {
      mockStore.seedCards(testCards)
      const { result } = renderHook(() => useNotes())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const newContent = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Updated' }] }] }
      await act(async () => {
        await result.current.updateNote('card-1', { content: newContent })
      })

      expect(result.current.notes.find(n => n.id === 'card-1')?.content).toEqual(newContent)
    })

    it('updates updated_at timestamp on update', async () => {
      mockStore.seedCards(testCards)
      const { result } = renderHook(() => useNotes())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const originalUpdatedAt = result.current.notes.find(n => n.id === 'card-1')?.updated_at

      await act(async () => {
        await result.current.updateNote('card-1', { title: 'Changed' })
      })

      const newUpdatedAt = result.current.notes.find(n => n.id === 'card-1')?.updated_at
      expect(newUpdatedAt).not.toBe(originalUpdatedAt)
    })
  })

  describe('deleting notes', () => {
    it('deletes a note by id', async () => {
      mockStore.seedCards(testCards)
      const { result } = renderHook(() => useNotes())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.notes).toHaveLength(2)

      await act(async () => {
        await result.current.deleteNote('card-1')
      })

      expect(result.current.notes).toHaveLength(1)
      expect(result.current.notes.find(n => n.id === 'card-1')).toBeUndefined()
    })

    it('keeps other notes after deletion', async () => {
      mockStore.seedCards(testCards)
      const { result } = renderHook(() => useNotes())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.deleteNote('card-1')
      })

      expect(result.current.notes.find(n => n.id === 'card-2')).toBeDefined()
    })
  })

  describe('refetch', () => {
    it('provides refetch function to reload data', async () => {
      const { result } = renderHook(() => useNotes())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Add a card directly to store
      mockStore.cards.push({
        id: 'card-new',
        user_id: 'test-user-id',
        title: 'New Card',
        content: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

      // Refetch should pick up the new card
      await act(async () => {
        await result.current.refetch()
      })

      expect(result.current.notes).toHaveLength(1)
    })
  })
})
