import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { usePalace } from '@/lib/hooks/usePalace'
import { mockStore } from '../setup'
import type { Wing, Room } from '@/types'

const seedWing: Wing = {
  id: 'wing-1',
  user_id: 'test-user-id',
  name: 'Existing Wing',
  color: '#ff00ff',
  created_at: '2026-04-01T00:00:00Z',
  updated_at: '2026-04-01T00:00:00Z',
}

const seedRoom: Room = {
  id: 'room-1',
  user_id: 'test-user-id',
  wing_id: 'wing-1',
  name: 'Existing Room',
  description: null,
  created_at: '2026-04-01T00:00:00Z',
  updated_at: '2026-04-01T00:00:00Z',
}

describe('usePalace', () => {
  beforeEach(() => mockStore.reset())

  it('returns empty arrays when palace is empty', async () => {
    const { result } = renderHook(() => usePalace())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.wings).toEqual([])
    expect(result.current.rooms).toEqual([])
  })

  it('loads seeded wings and rooms on mount', async () => {
    mockStore.seedWings([seedWing])
    mockStore.seedRooms([seedRoom])

    const { result } = renderHook(() => usePalace())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.wings).toHaveLength(1)
    expect(result.current.rooms).toHaveLength(1)
    expect(result.current.wings[0].name).toBe('Existing Wing')
  })

  it('createWing appends a wing', async () => {
    const { result } = renderHook(() => usePalace())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.createWing('Projects', '#3b82f6')
    })

    expect(result.current.wings).toHaveLength(1)
    expect(result.current.wings[0].name).toBe('Projects')
  })

  it('createRoom appends a room scoped to its wing', async () => {
    mockStore.seedWings([seedWing])
    const { result } = renderHook(() => usePalace())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.createRoom('wing-1', 'Architecture')
    })

    expect(result.current.rooms).toHaveLength(1)
    expect(result.current.rooms[0].wing_id).toBe('wing-1')
    expect(result.current.rooms[0].name).toBe('Architecture')
  })

  it('renameWing updates the wing name optimistically', async () => {
    mockStore.seedWings([seedWing])
    const { result } = renderHook(() => usePalace())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.renameWing('wing-1', 'Renamed')
    })

    expect(result.current.wings[0].name).toBe('Renamed')
  })

  it('deleteWing removes the wing and any rooms inside it', async () => {
    mockStore.seedWings([seedWing])
    mockStore.seedRooms([seedRoom])
    const { result } = renderHook(() => usePalace())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.deleteWing('wing-1')
    })

    expect(result.current.wings).toHaveLength(0)
    expect(result.current.rooms).toHaveLength(0)
  })

  it('deleteRoom removes only that room', async () => {
    mockStore.seedWings([seedWing])
    mockStore.seedRooms([seedRoom])
    const { result } = renderHook(() => usePalace())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.deleteRoom('room-1')
    })

    expect(result.current.rooms).toHaveLength(0)
    expect(result.current.wings).toHaveLength(1)
  })
})
