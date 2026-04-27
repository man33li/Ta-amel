'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Wing, Room } from '@/types'

/**
 * usePalace — fetch-based CRUD against /api/wings and /api/rooms.
 *
 * Mirrors useNotes: optimistic updates, rollback, server is source of truth.
 */
export function usePalace() {
  const [wings, setWings] = useState<Wing[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [wRes, rRes] = await Promise.all([
        fetch('/api/wings', { cache: 'no-store' }),
        fetch('/api/rooms', { cache: 'no-store' }),
      ])
      if (!wRes.ok) {
        setError(`Failed to load wings (${wRes.status})`)
        setWings([])
      } else {
        const data = (await wRes.json()) as { wings?: Wing[] }
        setWings(data.wings ?? [])
      }
      if (!rRes.ok) {
        setError((prev) => prev ?? `Failed to load rooms (${rRes.status})`)
        setRooms([])
      } else {
        const data = (await rRes.json()) as { rooms?: Room[] }
        setRooms(data.rooms ?? [])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load palace')
      setWings([])
      setRooms([])
    } finally {
      setLoading(false)
    }
  }, [])

  const createWing = useCallback(
    async (name: string, color: string | null = null): Promise<Wing> => {
      const res = await fetch('/api/wings', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, color }),
      })
      if (!res.ok) {
        const message = `Failed to create wing (${res.status})`
        setError(message)
        throw new Error(message)
      }
      const data = (await res.json()) as { wing: Wing }
      setWings((prev) => [...prev, data.wing])
      return data.wing
    },
    []
  )

  const renameWing = useCallback(
    async (id: string, name: string): Promise<Wing> => {
      const previous = wings
      setWings((prev) => prev.map((w) => (w.id === id ? { ...w, name } : w)))
      try {
        const res = await fetch(`/api/wings/${id}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ name }),
        })
        if (!res.ok) throw new Error(`Failed to rename wing (${res.status})`)
        const data = (await res.json()) as { wing: Wing }
        setWings((prev) => prev.map((w) => (w.id === id ? data.wing : w)))
        return data.wing
      } catch (err) {
        setWings(previous)
        const message = err instanceof Error ? err.message : 'Failed to rename wing'
        setError(message)
        throw err
      }
    },
    [wings]
  )

  const deleteWing = useCallback(
    async (id: string): Promise<void> => {
      const prevWings = wings
      const prevRooms = rooms
      setWings((prev) => prev.filter((w) => w.id !== id))
      setRooms((prev) => prev.filter((r) => r.wing_id !== id))
      try {
        const res = await fetch(`/api/wings/${id}`, { method: 'DELETE' })
        if (!res.ok) throw new Error(`Failed to delete wing (${res.status})`)
      } catch (err) {
        setWings(prevWings)
        setRooms(prevRooms)
        const message = err instanceof Error ? err.message : 'Failed to delete wing'
        setError(message)
        throw err
      }
    },
    [wings, rooms]
  )

  const createRoom = useCallback(
    async (
      wingId: string,
      name: string,
      description: string | null = null
    ): Promise<Room> => {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ wing_id: wingId, name, description }),
      })
      if (!res.ok) {
        const message = `Failed to create room (${res.status})`
        setError(message)
        throw new Error(message)
      }
      const data = (await res.json()) as { room: Room }
      setRooms((prev) => [...prev, data.room])
      return data.room
    },
    []
  )

  const renameRoom = useCallback(
    async (id: string, name: string): Promise<Room> => {
      const previous = rooms
      setRooms((prev) => prev.map((r) => (r.id === id ? { ...r, name } : r)))
      try {
        const res = await fetch(`/api/rooms/${id}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ name }),
        })
        if (!res.ok) throw new Error(`Failed to rename room (${res.status})`)
        const data = (await res.json()) as { room: Room }
        setRooms((prev) => prev.map((r) => (r.id === id ? data.room : r)))
        return data.room
      } catch (err) {
        setRooms(previous)
        const message = err instanceof Error ? err.message : 'Failed to rename room'
        setError(message)
        throw err
      }
    },
    [rooms]
  )

  const deleteRoom = useCallback(
    async (id: string): Promise<void> => {
      const previous = rooms
      setRooms((prev) => prev.filter((r) => r.id !== id))
      try {
        const res = await fetch(`/api/rooms/${id}`, { method: 'DELETE' })
        if (!res.ok) throw new Error(`Failed to delete room (${res.status})`)
      } catch (err) {
        setRooms(previous)
        const message = err instanceof Error ? err.message : 'Failed to delete room'
        setError(message)
        throw err
      }
    },
    [rooms]
  )

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAll()
  }, [fetchAll])

  return {
    wings,
    rooms,
    loading,
    error,
    createWing,
    renameWing,
    deleteWing,
    createRoom,
    renameRoom,
    deleteRoom,
    refetch: fetchAll,
  }
}
