import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import HomePage from '@/app/(main)/page'
import type { Card } from '@/types'

// Mock useNotes hook
const mockCreateNote = vi.fn()
vi.mock('@/lib/hooks/useNotes', () => ({
  useNotes: vi.fn()
}))

// Import after mock to get the mocked version
import { useNotes } from '@/lib/hooks/useNotes'
const mockedUseNotes = vi.mocked(useNotes)

// Mock next/navigation
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    back: vi.fn()
  })
}))

// Mock NoteCard to avoid testing its internals
vi.mock('@/components/notes/NoteCard', () => ({
  NoteCard: ({ note }: { note: Card }) => (
    <div data-testid={`note-card-${note.id}`}>{note.title}</div>
  )
}))

// Helper to create mock notes
function createMockNote(overrides: Partial<Card> = {}): Card {
  return {
    id: 'test-note-id',
    user_id: 'test-user-id',
    title: 'Test Note',
    content: { type: 'doc', content: [] },
    created_at: '2026-01-27T00:00:00Z',
    updated_at: '2026-01-27T00:00:00Z',
    ...overrides
  }
}

// Default mock return value
function getMockHookReturn(overrides: Partial<ReturnType<typeof useNotes>> = {}) {
  return {
    notes: [],
    loading: false,
    error: null,
    createNote: mockCreateNote,
    updateNote: vi.fn(),
    deleteNote: vi.fn(),
    refetch: vi.fn(),
    ...overrides
  }
}

describe('HomePage (Dashboard)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Loading State', () => {
    it('shows loading skeleton when loading', () => {
      mockedUseNotes.mockReturnValue(getMockHookReturn({ loading: true }))

      render(<HomePage />)

      expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument()
    })

    it('shows skeleton grid with 6 placeholder cards', () => {
      mockedUseNotes.mockReturnValue(getMockHookReturn({ loading: true }))

      render(<HomePage />)

      const skeleton = screen.getByTestId('loading-skeleton')
      expect(skeleton.children.length).toBe(6)
    })
  })

  describe('Empty State', () => {
    it('shows "No notes yet" when notes array is empty', () => {
      mockedUseNotes.mockReturnValue(getMockHookReturn({ notes: [], loading: false }))

      render(<HomePage />)

      expect(screen.getByText(/no notes yet/i)).toBeInTheDocument()
    })

    it('shows "Create First Note" button in empty state', () => {
      mockedUseNotes.mockReturnValue(getMockHookReturn({ notes: [], loading: false }))

      render(<HomePage />)

      expect(screen.getByRole('button', { name: /create first note/i })).toBeInTheDocument()
    })

    it('shows descriptive text encouraging note creation', () => {
      mockedUseNotes.mockReturnValue(getMockHookReturn({ notes: [], loading: false }))

      render(<HomePage />)

      expect(screen.getByText(/create your first note to get started/i)).toBeInTheDocument()
    })
  })

  describe('Notes List', () => {
    it('renders NoteCard for each note', () => {
      const mockNotes = [
        createMockNote({ id: 'note-1', title: 'First Note' }),
        createMockNote({ id: 'note-2', title: 'Second Note' }),
        createMockNote({ id: 'note-3', title: 'Third Note' })
      ]
      mockedUseNotes.mockReturnValue(getMockHookReturn({ notes: mockNotes }))

      render(<HomePage />)

      expect(screen.getByTestId('note-card-note-1')).toBeInTheDocument()
      expect(screen.getByTestId('note-card-note-2')).toBeInTheDocument()
      expect(screen.getByTestId('note-card-note-3')).toBeInTheDocument()
    })

    it('displays note titles in cards', () => {
      const mockNotes = [
        createMockNote({ id: 'note-1', title: 'My First Note' }),
        createMockNote({ id: 'note-2', title: 'Shopping List' })
      ]
      mockedUseNotes.mockReturnValue(getMockHookReturn({ notes: mockNotes }))

      render(<HomePage />)

      expect(screen.getByText('My First Note')).toBeInTheDocument()
      expect(screen.getByText('Shopping List')).toBeInTheDocument()
    })

    it('shows "My Notes" header when notes exist', () => {
      const mockNotes = [createMockNote({ id: 'note-1' })]
      mockedUseNotes.mockReturnValue(getMockHookReturn({ notes: mockNotes }))

      render(<HomePage />)

      expect(screen.getByRole('heading', { name: /my notes/i })).toBeInTheDocument()
    })
  })

  describe('Create Note', () => {
    it('clicking "Create First Note" calls createNote with "Untitled"', async () => {
      const user = userEvent.setup()
      const newNote = createMockNote({ id: 'new-note-id', title: 'Untitled' })
      mockCreateNote.mockResolvedValue(newNote)
      mockedUseNotes.mockReturnValue(getMockHookReturn({ notes: [], loading: false }))

      render(<HomePage />)
      await user.click(screen.getByRole('button', { name: /create first note/i }))

      expect(mockCreateNote).toHaveBeenCalledWith('Untitled')
    })

    it('navigates to new note after creation from empty state', async () => {
      const user = userEvent.setup()
      const newNote = createMockNote({ id: 'created-note-123', title: 'Untitled' })
      mockCreateNote.mockResolvedValue(newNote)
      mockedUseNotes.mockReturnValue(getMockHookReturn({ notes: [], loading: false }))

      render(<HomePage />)
      await user.click(screen.getByRole('button', { name: /create first note/i }))

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/notes/created-note-123')
      })
    })

    it('clicking "New Note" button (desktop) calls createNote', async () => {
      const user = userEvent.setup()
      const newNote = createMockNote({ id: 'desktop-note-id', title: 'Untitled' })
      mockCreateNote.mockResolvedValue(newNote)
      const mockNotes = [createMockNote({ id: 'existing-note' })]
      mockedUseNotes.mockReturnValue(getMockHookReturn({ notes: mockNotes }))

      render(<HomePage />)
      // Find all buttons and get the desktop one (which has "New Note" text inside a span)
      const allButtons = screen.getAllByRole('button')
      const desktopNewNoteButton = allButtons.find(
        (btn) => btn.textContent?.includes('New Note') && !btn.getAttribute('aria-label')
      )
      expect(desktopNewNoteButton).toBeTruthy()
      await user.click(desktopNewNoteButton!)

      expect(mockCreateNote).toHaveBeenCalledWith('Untitled')
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/notes/desktop-note-id')
      })
    })

    it('handles createNote error gracefully', async () => {
      const user = userEvent.setup()
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockCreateNote.mockRejectedValue(new Error('Failed to create note'))
      mockedUseNotes.mockReturnValue(getMockHookReturn({ notes: [], loading: false }))

      render(<HomePage />)
      await user.click(screen.getByRole('button', { name: /create first note/i }))

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to create note:', expect.any(Error))
      })
      // Should not navigate on error
      expect(mockPush).not.toHaveBeenCalled()
      consoleSpy.mockRestore()
    })
  })

  describe('Error State', () => {
    it('shows error message when fetch fails', () => {
      mockedUseNotes.mockReturnValue(
        getMockHookReturn({ error: 'Failed to fetch notes', loading: false })
      )

      render(<HomePage />)

      expect(screen.getByText(/error loading notes/i)).toBeInTheDocument()
      expect(screen.getByText(/failed to fetch notes/i)).toBeInTheDocument()
    })

    it('shows "My Notes" header even in error state', () => {
      mockedUseNotes.mockReturnValue(
        getMockHookReturn({ error: 'Database connection failed', loading: false })
      )

      render(<HomePage />)

      expect(screen.getByRole('heading', { name: /my notes/i })).toBeInTheDocument()
    })

    it('displays specific error message from hook', () => {
      const specificError = 'Network timeout - please try again'
      mockedUseNotes.mockReturnValue(getMockHookReturn({ error: specificError, loading: false }))

      render(<HomePage />)

      // Error message is rendered as part of a larger string, use regex
      expect(screen.getByText((content) => content.includes(specificError))).toBeInTheDocument()
    })
  })

  describe('Floating Action Button', () => {
    it('renders floating create button for mobile', () => {
      const mockNotes = [createMockNote({ id: 'note-1' })]
      mockedUseNotes.mockReturnValue(getMockHookReturn({ notes: mockNotes }))

      render(<HomePage />)

      expect(screen.getByRole('button', { name: /create new note/i })).toBeInTheDocument()
    })

    it('FAB calls createNote when clicked', async () => {
      const user = userEvent.setup()
      const newNote = createMockNote({ id: 'fab-note-id', title: 'Untitled' })
      mockCreateNote.mockResolvedValue(newNote)
      const mockNotes = [createMockNote({ id: 'existing' })]
      mockedUseNotes.mockReturnValue(getMockHookReturn({ notes: mockNotes }))

      render(<HomePage />)
      await user.click(screen.getByRole('button', { name: /create new note/i }))

      expect(mockCreateNote).toHaveBeenCalledWith('Untitled')
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/notes/fab-note-id')
      })
    })
  })
})
