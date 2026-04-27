'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Wing, Room } from '@/types'

/**
 * usePalace - CRUD for wings and rooms.
 *
 * Mirrors useNotes.ts: optimistic updates, rollback on error, server is the
 * source of truth. Wings and rooms are loaded together because the palace
 * page renders them side by side.
 */
export function usePalace() {
  const [wings, setWings] = useState<Wing[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = useMemo(() => createClient(), [])

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [wingsRes, roomsRes] = await Promise.all([
        supabase.from('wings').select('*').order('created_at', { ascending: true }),
        supabase.from('rooms').select('*').order('created_at', { ascending: true }),
      ])

      if (wingsRes.error) {
        setError(wingsRes.error.message)
        setWings([])
      } else {
        setWings(wingsRes.data ?? [])
      }

      if (roomsRes.error) {
        setError((prev) => prev ?? roomsRes.error!.message)
        setRooms([])
      } else {
        setRooms(roomsRes.data ?? [])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load palace')
      setWings([])
      setRooms([])
    } finally {
      setLoading(false)
    }
  }, [supabase])

  const createWing = useCallback(
    async (name: string, color: string | null = null): Promise<Wing> => {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error('Not authenticated')

      const { data, error: err } = await supabase
        .from('wings')
        .insert({ user_id: userData.user.id, name, color })
        .select()
        .single()

      if (err || !data) {
        const message = err?.message ?? 'Failed to create wing'
        setError(message)
        throw new Error(message)
      }
      setWings((prev) => [...prev, data])
      return data
    },
    [supabase]
  )

  const renameWing = useCallback(
    async (id: string, name: string): Promise<Wing> => {
      const previous = wings
      setWings((prev) => prev.map((w) => (w.id === id ? { ...w, name } : w)))
      const { data, error: err } = await supabase
        .from('wings')
        .update({ name })
        .eq('id', id)
        .select()
        .single()
      if (err || !data) {
        setWings(previous)
        const message = err?.message ?? 'Failed to rename wing'
        setError(message)
        throw new Error(message)
      }
      setWings((prev) => prev.map((w) => (w.id === id ? data : w)))
      return data
    },
    [supabase, wings]
  )

  const deleteWing = useCallback(
    async (id: string): Promise<void> => {
      const previousWings = wings
      const previousRooms = rooms
      setWings((prev) => prev.filter((w) => w.id !== id))
      setRooms((prev) => prev.filter((r) => r.wing_id !== id))
      const result = await supabase.from('wings').delete().eq('id', id)
      if (result.error) {
        setWings(previousWings)
        setRooms(previousRooms)
        setError(result.error.message)
        throw new Error(result.error.message)
      }
    },
    [supabase, wings, rooms]
  )

  const createRoom = useCallback(
    async (
      wingId: string,
      name: string,
      description: string | null = null
    ): Promise<Room> => {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error('Not authenticated')

      const { data, error: err } = await supabase
        .from('rooms')
        .insert({
          user_id: userData.user.id,
          wing_id: wingId,
          name,
          description,
        })
        .select()
        .single()

      if (err || !data) {
        const message = err?.message ?? 'Failed to create room'
        setError(message)
        throw new Error(message)
      }
      setRooms((prev) => [...prev, data])
      return data
    },
    [supabase]
  )

  const renameRoom = useCallback(
    async (id: string, name: string): Promise<Room> => {
      const previous = rooms
      setRooms((prev) => prev.map((r) => (r.id === id ? { ...r, name } : r)))
      const { data, error: err } = await supabase
        .from('rooms')
        .update({ name })
        .eq('id', id)
        .select()
        .single()
      if (err || !data) {
        setRooms(previous)
        const message = err?.message ?? 'Failed to rename room'
        setError(message)
        throw new Error(message)
      }
      setRooms((prev) => prev.map((r) => (r.id === id ? data : r)))
      return data
    },
    [supabase, rooms]
  )

  const deleteRoom = useCallback(
    async (id: string): Promise<void> => {
      const previous = rooms
      setRooms((prev) => prev.filter((r) => r.id !== id))
      const result = await supabase.from('rooms').delete().eq('id', id)
      if (result.error) {
        setRooms(previous)
        setError(result.error.message)
        throw new Error(result.error.message)
      }
    },
    [supabase, rooms]
  )

  useEffect(() => {
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
