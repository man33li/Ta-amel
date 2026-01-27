import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NoteCard } from '@/components/notes/NoteCard'
import type { Card } from '@/types'

const mockNote: Card = {
  id: 'card-1',
  user_id: 'user-1',
  title: 'Test Note Title',
  content: {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'This is the note content preview text.' }]
      }
    ]
  },
  created_at: '2026-01-20T10:00:00Z',
  updated_at: '2026-01-25T15:30:00Z'
}

const emptyContentNote: Card = {
  id: 'card-2',
  user_id: 'user-1',
  title: 'Empty Note',
  content: {},
  created_at: '2026-01-20T10:00:00Z',
  updated_at: '2026-01-20T10:00:00Z'
}

describe('NoteCard', () => {
  it('renders note title', () => {
    render(<NoteCard note={mockNote} />)
    
    expect(screen.getByText('Test Note Title')).toBeInTheDocument()
  })

  it('renders as a link to the note page', () => {
    render(<NoteCard note={mockNote} />)
    
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/notes/card-1')
  })

  it('extracts and displays text preview from Tiptap content', () => {
    render(<NoteCard note={mockNote} />)
    
    expect(screen.getByText(/This is the note content/)).toBeInTheDocument()
  })

  it('shows "No content" for empty notes', () => {
    render(<NoteCard note={emptyContentNote} />)
    
    expect(screen.getByText(/No content/i)).toBeInTheDocument()
  })

  it('displays formatted date', () => {
    render(<NoteCard note={mockNote} />)
    
    // Should show the updated_at date in some format
    // The exact format depends on locale, so we check for presence of date elements
    const dateText = screen.getByText(/2026|Jan|25/i)
    expect(dateText).toBeInTheDocument()
  })

  it('truncates long titles', () => {
    const longTitleNote: Card = {
      ...mockNote,
      title: 'This is a very long title that should be truncated when displayed in the card component'
    }
    
    render(<NoteCard note={longTitleNote} />)
    
    // Title element should have truncate class
    const title = screen.getByText(/This is a very long title/)
    expect(title).toHaveClass('truncate')
  })
})
