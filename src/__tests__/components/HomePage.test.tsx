import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import HomePage from '@/app/(main)/page'
import { mockStore } from '../setup'
import type { Card } from '@/types'

// Mock useRouter
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    back: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}))

const testCards: Card[] = [
  {
    id: 'card-1',
    user_id: 'test-user-id',
    title: 'First Note',
    content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Content 1' }] }] },
    created_at: '2026-01-20T10:00:00Z',
    updated_at: '2026-01-25T10:00:00Z'
  },
  {
    id: 'card-2',
    user_id: 'test-user-id',
    title: 'Second Note',
    content: {},
    created_at: '2026-01-21T10:00:00Z',
    updated_at: '2026-01-24T10:00:00Z'
  },
  {
    id: 'card-3',
    user_id: 'test-user-id',
    title: 'Third Note',
    content: {},
    created_at: '2026-01-22T10:00:00Z',
    updated_at: '2026-01-23T10:00:00Z'
  }
]

describe('HomePage', () => {
  beforeEach(() => {
    mockStore.reset()
    vi.clearAllMocks()
  })

  describe('Loading State', () => {
    it('shows loading skeleton initially', () => {
      render(<HomePage />)
      
      // Should show loading indicator or skeleton
      expect(screen.getByTestId('loading-skeleton') || screen.getByText(/loading/i)).toBeInTheDocument()
    })
  })

  describe('Empty State', () => {
    it('shows empty state when no notes exist', async () => {
      render(<HomePage />)
      
      await waitFor(() => {
        expect(screen.getByText(/no notes/i)).toBeInTheDocument()
      })
    })

    it('shows create note prompt in empty state', async () => {
      render(<HomePage />)
      
      await waitFor(() => {
        // Check for either "Create your first note" button or "get started" text
        const hasCreateButton = screen.queryByRole('button', { name: /create.*first/i })
        const hasGetStarted = screen.queryByText(/get started/i)
        expect(hasCreateButton || hasGetStarted).toBeTruthy()
      })
    })
  })

  describe('Notes Grid', () => {
    it('displays notes in a grid', async () => {
      mockStore.seedCards(testCards)
      
      render(<HomePage />)
      
      await waitFor(() => {
        expect(screen.getByText('First Note')).toBeInTheDocument()
        expect(screen.getByText('Second Note')).toBeInTheDocument()
        expect(screen.getByText('Third Note')).toBeInTheDocument()
      })
    })

    it('renders NoteCard for each note', async () => {
      mockStore.seedCards(testCards)
      
      render(<HomePage />)
      
      await waitFor(() => {
        const links = screen.getAllByRole('link')
        // Should have links to each note
        expect(links.some(l => l.getAttribute('href') === '/notes/card-1')).toBe(true)
        expect(links.some(l => l.getAttribute('href') === '/notes/card-2')).toBe(true)
        expect(links.some(l => l.getAttribute('href') === '/notes/card-3')).toBe(true)
      })
    })
  })

  describe('Create Note Button', () => {
    it('renders create button', async () => {
      render(<HomePage />)
      
      await waitFor(() => {
        // Look for any button that creates notes
        const buttons = screen.getAllByRole('button')
        const createButton = buttons.find(btn => 
          btn.textContent?.toLowerCase().includes('new') ||
          btn.textContent?.toLowerCase().includes('create') ||
          btn.textContent?.includes('+')
        )
        expect(createButton).toBeTruthy()
      })
    })

    it('creates new note and navigates to it on click', async () => {
      const user = userEvent.setup()
      
      render(<HomePage />)
      
      await waitFor(() => {
        expect(screen.queryByTestId('loading-skeleton')).not.toBeInTheDocument()
      })
      
      // Get first create button (there may be multiple for responsive design)
      const buttons = screen.getAllByRole('button')
      const createButton = buttons.find(btn => 
        btn.textContent?.toLowerCase().includes('new') ||
        btn.textContent?.toLowerCase().includes('create') ||
        btn.textContent?.includes('+')
      )
      
      expect(createButton).toBeTruthy()
      await user.click(createButton!)
      
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith(expect.stringMatching(/\/notes\/.+/))
      })
    })
  })

  describe('Header', () => {
    it('displays page title', async () => {
      render(<HomePage />)
      
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /my notes/i })).toBeInTheDocument()
      })
    })
  })
})
