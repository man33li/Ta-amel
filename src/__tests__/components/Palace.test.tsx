import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { WingList } from '@/components/palace/WingList'
import { RoomList } from '@/components/palace/RoomList'
import { CardList } from '@/components/palace/CardList'
import type { Wing, Room, Card } from '@/types'

const wings: Wing[] = [
  {
    id: 'wing-1',
    user_id: 'user-1',
    name: 'Projects',
    color: '#3b82f6',
    created_at: '2026-04-01T00:00:00Z',
    updated_at: '2026-04-01T00:00:00Z',
  },
]

const rooms: Room[] = [
  {
    id: 'room-1',
    wing_id: 'wing-1',
    user_id: 'user-1',
    name: 'Architecture',
    description: null,
    created_at: '2026-04-01T00:00:00Z',
    updated_at: '2026-04-01T00:00:00Z',
  },
]

const cards: Card[] = [
  {
    id: 'card-1',
    user_id: 'user-1',
    title: 'Decision: GraphQL vs REST',
    content: { type: 'doc', content: [] },
    created_at: '2026-04-01T00:00:00Z',
    updated_at: '2026-04-25T10:00:00Z',
    room_id: 'room-1',
  },
]

describe('WingList', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows an empty state when no wings exist', () => {
    render(
      <WingList wings={[]} activeWingId={null} onSelect={() => {}} onCreate={() => {}} />
    )
    expect(screen.getByText(/no wings yet/i)).toBeInTheDocument()
  })

  it('lists wings and selects on click', () => {
    const onSelect = vi.fn()
    render(
      <WingList wings={wings} activeWingId={null} onSelect={onSelect} onCreate={() => {}} />
    )
    fireEvent.click(screen.getByText('Projects'))
    expect(onSelect).toHaveBeenCalledWith('wing-1')
  })

  it('triggers onCreate from the New button', () => {
    const onCreate = vi.fn()
    render(
      <WingList wings={[]} activeWingId={null} onSelect={() => {}} onCreate={onCreate} />
    )
    fireEvent.click(screen.getByLabelText(/create wing/i))
    expect(onCreate).toHaveBeenCalled()
  })
})

describe('RoomList', () => {
  it('prompts to select a wing when none is active', () => {
    render(
      <RoomList
        rooms={[]}
        activeRoomId={null}
        wingSelected={false}
        onSelect={() => {}}
        onCreate={() => {}}
      />
    )
    expect(screen.getByText(/select a wing/i)).toBeInTheDocument()
  })

  it('disables the create button when no wing is selected', () => {
    render(
      <RoomList
        rooms={[]}
        activeRoomId={null}
        wingSelected={false}
        onSelect={() => {}}
        onCreate={() => {}}
      />
    )
    expect(screen.getByLabelText(/create room/i)).toBeDisabled()
  })

  it('lists rooms when wing is selected and selects on click', () => {
    const onSelect = vi.fn()
    render(
      <RoomList
        rooms={rooms}
        activeRoomId={null}
        wingSelected
        onSelect={onSelect}
        onCreate={() => {}}
      />
    )
    fireEvent.click(screen.getByText('Architecture'))
    expect(onSelect).toHaveBeenCalledWith('room-1')
  })
})

describe('CardList', () => {
  it('prompts to select a room when none is active', () => {
    render(
      <CardList
        cards={[]}
        rooms={rooms}
        loading={false}
        roomSelected={false}
        onCreate={() => {}}
        onMoveCard={() => {}}
      />
    )
    expect(screen.getByText(/select a room/i)).toBeInTheDocument()
  })

  it('shows skeleton while loading with a room selected', () => {
    render(
      <CardList
        cards={[]}
        rooms={rooms}
        loading
        roomSelected
        onCreate={() => {}}
        onMoveCard={() => {}}
      />
    )
    expect(screen.getByTestId('palace-cards-loading')).toBeInTheDocument()
  })

  it('renders cards when room is selected and not loading', () => {
    render(
      <CardList
        cards={cards}
        rooms={rooms}
        loading={false}
        roomSelected
        onCreate={() => {}}
        onMoveCard={() => {}}
      />
    )
    expect(screen.getByText('Decision: GraphQL vs REST')).toBeInTheDocument()
  })

  it('moves a card via the embedded select', () => {
    const onMoveCard = vi.fn()
    render(
      <CardList
        cards={cards}
        rooms={rooms}
        loading={false}
        roomSelected
        onCreate={() => {}}
        onMoveCard={onMoveCard}
      />
    )
    fireEvent.change(screen.getByLabelText(/move to room/i), {
      target: { value: '' },
    })
    expect(onMoveCard).toHaveBeenCalledWith('card-1', null)
  })
})
