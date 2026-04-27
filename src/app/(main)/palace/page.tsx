'use client'

import { useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useNotes } from '@/lib/hooks/useNotes'
import { usePalace } from '@/lib/hooks/usePalace'
import { useAppStore } from '@/stores/useAppStore'
import { WingList } from '@/components/palace/WingList'
import { RoomList } from '@/components/palace/RoomList'
import { CardList } from '@/components/palace/CardList'
import { PalaceSearch } from '@/components/palace/PalaceSearch'

/**
 * /palace — three-pane navigation across wings -> rooms -> cards.
 *
 * Mempalace's spatial taxonomy: wings group projects/people, rooms are
 * topics, cards (= drawers) hold the actual content. Empty states guide the
 * user through the create-wing -> create-room -> place-cards flow.
 */
export default function PalacePage() {
  const router = useRouter()
  const palace = usePalace()
  const notes = useNotes()
  const activeWingId = useAppStore((s) => s.activeWingId)
  const activeRoomId = useAppStore((s) => s.activeRoomId)
  const setActiveWingId = useAppStore((s) => s.setActiveWingId)
  const setActiveRoomId = useAppStore((s) => s.setActiveRoomId)

  // Reset stale selections (e.g. wing was deleted on another tab).
  useEffect(() => {
    if (activeWingId && !palace.wings.some((w) => w.id === activeWingId)) {
      setActiveWingId(null)
      setActiveRoomId(null)
    }
  }, [activeWingId, palace.wings, setActiveWingId, setActiveRoomId])

  useEffect(() => {
    if (activeRoomId && !palace.rooms.some((r) => r.id === activeRoomId)) {
      setActiveRoomId(null)
    }
  }, [activeRoomId, palace.rooms, setActiveRoomId])

  const roomsInActiveWing = useMemo(
    () =>
      activeWingId
        ? palace.rooms.filter((r) => r.wing_id === activeWingId)
        : [],
    [palace.rooms, activeWingId]
  )

  const cardsInActiveRoom = useMemo(
    () =>
      activeRoomId
        ? notes.notes.filter((c) => c.room_id === activeRoomId)
        : [],
    [notes.notes, activeRoomId]
  )

  const handleCreateWing = async () => {
    const name = window.prompt('Wing name?')
    if (!name?.trim()) return
    const wing = await palace.createWing(name.trim())
    setActiveWingId(wing.id)
    setActiveRoomId(null)
  }

  const handleCreateRoom = async () => {
    if (!activeWingId) return
    const name = window.prompt('Room name?')
    if (!name?.trim()) return
    const room = await palace.createRoom(activeWingId, name.trim())
    setActiveRoomId(room.id)
  }

  const handleCreateCard = async () => {
    if (!activeRoomId) return
    const card = await notes.createNote('Untitled', {}, activeRoomId)
    router.push(`/notes/${card.id}`)
  }

  const handleMoveCard = async (cardId: string, roomId: string | null) => {
    await notes.updateNote(cardId, { room_id: roomId })
  }

  if (palace.loading) {
    return (
      <div data-testid="palace-loading" className="p-6 text-sm text-gray-500 dark:text-gray-400">
        Loading palace…
      </div>
    )
  }

  if (palace.error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded">
          Error: {palace.error}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      <PalaceSearch wingId={activeWingId} roomId={activeRoomId} />

      <div className="flex flex-1 min-h-0">
        <WingList
          wings={palace.wings}
          activeWingId={activeWingId}
          onSelect={(id) => {
            setActiveWingId(id)
            setActiveRoomId(null)
          }}
          onCreate={handleCreateWing}
        />

        <RoomList
          rooms={roomsInActiveWing}
          activeRoomId={activeRoomId}
          wingSelected={!!activeWingId}
          onSelect={setActiveRoomId}
          onCreate={handleCreateRoom}
        />

        <CardList
          cards={cardsInActiveRoom}
          rooms={roomsInActiveWing}
          loading={notes.loading}
          roomSelected={!!activeRoomId}
          onCreate={handleCreateCard}
          onMoveCard={handleMoveCard}
        />
      </div>
    </div>
  )
}
