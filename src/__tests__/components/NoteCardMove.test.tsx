import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { NoteCard } from '@/components/notes/NoteCard'
import type { Card, Room } from '@/types'

const baseNote: Card = {
  id: 'card-1',
  user_id: 'user-1',
  title: 'My note',
  content: { type: 'doc', content: [] },
  created_at: '2026-04-01T00:00:00Z',
  updated_at: '2026-04-25T10:00:00Z',
  room_id: null,
}

const rooms: Room[] = [
  {
    id: 'room-a',
    wing_id: 'wing-1',
    user_id: 'user-1',
    name: 'Architecture',
    description: null,
    created_at: '2026-04-01T00:00:00Z',
    updated_at: '2026-04-01T00:00:00Z',
  },
  {
    id: 'room-b',
    wing_id: 'wing-1',
    user_id: 'user-1',
    name: 'Bugs',
    description: null,
    created_at: '2026-04-01T00:00:00Z',
    updated_at: '2026-04-01T00:00:00Z',
  },
]

describe('NoteCard move-to-room control', () => {
  it('does not render the select when rooms+onMove are absent', () => {
    render(<NoteCard note={baseNote} />)
    expect(screen.queryByLabelText(/move to room/i)).toBeNull()
  })

  it('renders the select with all rooms when rooms+onMove are provided', () => {
    render(<NoteCard note={baseNote} rooms={rooms} onMove={() => {}} />)

    const select = screen.getByLabelText(/move to room/i) as HTMLSelectElement
    expect(select).toBeInTheDocument()
    expect(select.options).toHaveLength(3) // Unfiled + 2 rooms
    expect(select.options[1].textContent).toBe('Architecture')
  })

  it('shows the current room as selected', () => {
    render(
      <NoteCard
        note={{ ...baseNote, room_id: 'room-b' }}
        rooms={rooms}
        onMove={() => {}}
      />
    )
    const select = screen.getByLabelText(/move to room/i) as HTMLSelectElement
    expect(select.value).toBe('room-b')
  })

  it('calls onMove with room id when changed to a room', () => {
    const onMove = vi.fn()
    render(<NoteCard note={baseNote} rooms={rooms} onMove={onMove} />)

    fireEvent.change(screen.getByLabelText(/move to room/i), {
      target: { value: 'room-a' },
    })
    expect(onMove).toHaveBeenCalledWith('room-a')
  })

  it('calls onMove with null when changed to Unfiled', () => {
    const onMove = vi.fn()
    render(
      <NoteCard
        note={{ ...baseNote, room_id: 'room-a' }}
        rooms={rooms}
        onMove={onMove}
      />
    )

    fireEvent.change(screen.getByLabelText(/move to room/i), {
      target: { value: '' },
    })
    expect(onMove).toHaveBeenCalledWith(null)
  })
})
