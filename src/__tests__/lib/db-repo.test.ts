// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { __resetDbForTests } from '@/lib/db/sqlite'
import {
  createCard, getCard, listCards, updateCard, deleteCard,
  createWing, getWing, listWings, updateWing, deleteWing,
  createRoom, getRoom, listRooms, updateRoom, deleteRoom,
  getSetting, setSetting, setSettingIfAbsent,
} from '@/lib/db/repo'

beforeEach(() => {
  process.env.MINDFORGE_DB_PATH = ':memory:'
  __resetDbForTests()
})

afterEach(() => {
  __resetDbForTests()
})

// ---------------------------------------------------------------------------
// Cards
// ---------------------------------------------------------------------------

describe('createCard', () => {
  it('returns a Card with a uuid id, default title, ISO timestamps, and null room_id when not provided', () => {
    const card = createCard({})
    expect(card.id).toMatch(/^[0-9a-f-]{36}$/)
    expect(card.title).toBe('Untitled')
    expect(card.room_id).toBeNull()
    expect(card.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(card.updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('persists explicit title, content, and roomId', () => {
    const wing = createWing({ name: 'W' })
    const room = createRoom({ wing_id: wing.id, name: 'R' })
    const content = { type: 'doc', content: [] }
    const card = createCard({ title: 'My Card', content, roomId: room.id })
    expect(card.title).toBe('My Card')
    expect(card.content).toEqual(content)
    expect(card.room_id).toBe(room.id)
  })
})

describe('getCard', () => {
  it('returns null for an unknown id', () => {
    expect(getCard('does-not-exist')).toBeNull()
  })

  it('returns the card for a known id', () => {
    const card = createCard({ title: 'Hello' })
    expect(getCard(card.id)).toMatchObject({ id: card.id, title: 'Hello' })
  })
})

describe('listCards', () => {
  it('returns all cards sorted by updated_at desc', async () => {
    const a = createCard({ title: 'A' })
    // ensure distinct timestamps
    await new Promise((r) => setTimeout(r, 5))
    const b = createCard({ title: 'B' })
    const cards = listCards()
    expect(cards[0].id).toBe(b.id)
    expect(cards[1].id).toBe(a.id)
  })

  it('filters by roomId when provided', () => {
    const wing = createWing({ name: 'W' })
    const room = createRoom({ wing_id: wing.id, name: 'R' })
    const inRoom = createCard({ roomId: room.id })
    createCard({}) // no room
    const filtered = listCards({ roomId: room.id })
    expect(filtered).toHaveLength(1)
    expect(filtered[0].id).toBe(inRoom.id)
  })
})

describe('updateCard', () => {
  it('returns the unmodified card when no fields are supplied', () => {
    const card = createCard({ title: 'Original' })
    const result = updateCard(card.id, {})
    expect(result).toMatchObject({ id: card.id, title: 'Original' })
  })

  it('mutates supplied fields and refreshes updated_at, leaving others alone', async () => {
    const card = createCard({ title: 'Before', content: { v: 1 } })
    await new Promise((r) => setTimeout(r, 5))
    const updated = updateCard(card.id, { title: 'After' })
    expect(updated!.title).toBe('After')
    expect(updated!.content).toEqual({ v: 1 })
    expect(updated!.updated_at > card.updated_at).toBe(true)
  })

  it('returns null for an unknown id', () => {
    expect(updateCard('no-such-id', { title: 'X' })).toBeNull()
  })
})

describe('deleteCard', () => {
  it('returns true on a hit and false on a miss', () => {
    const card = createCard({})
    expect(deleteCard(card.id)).toBe(true)
    expect(deleteCard(card.id)).toBe(false)
  })

  it('subsequent getCard returns null after deletion', () => {
    const card = createCard({})
    deleteCard(card.id)
    expect(getCard(card.id)).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Wings
// ---------------------------------------------------------------------------

describe('createWing', () => {
  it('creates a wing with a name and null color when color not provided', () => {
    const wing = createWing({ name: 'Alpha' })
    expect(wing.name).toBe('Alpha')
    expect(wing.color).toBeNull()
    expect(wing.id).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('creates a wing with a color string when provided', () => {
    const wing = createWing({ name: 'Beta', color: '#ff0000' })
    expect(wing.color).toBe('#ff0000')
  })
})

describe('getWing', () => {
  it('returns null for an unknown id', () => {
    expect(getWing('no-wing')).toBeNull()
  })

  it('returns the wing with user_id injected as "me"', () => {
    const wing = createWing({ name: 'Gamma' })
    const fetched = getWing(wing.id)
    expect(fetched).not.toBeNull()
    expect(fetched!.user_id).toBe('me')
    expect(fetched!.name).toBe('Gamma')
  })
})

describe('listWings', () => {
  it('returns wings ordered by created_at asc', async () => {
    const a = createWing({ name: 'First' })
    await new Promise((r) => setTimeout(r, 5))
    const b = createWing({ name: 'Second' })
    const wings = listWings()
    expect(wings[0].id).toBe(a.id)
    expect(wings[1].id).toBe(b.id)
  })
})

describe('updateWing', () => {
  it('updates name independently', () => {
    const wing = createWing({ name: 'Old', color: '#abc' })
    const updated = updateWing(wing.id, { name: 'New' })
    expect(updated!.name).toBe('New')
    expect(updated!.color).toBe('#abc')
  })

  it('updates color independently', () => {
    const wing = createWing({ name: 'Stay', color: '#111' })
    const updated = updateWing(wing.id, { color: '#222' })
    expect(updated!.color).toBe('#222')
    expect(updated!.name).toBe('Stay')
  })
})

describe('deleteWing', () => {
  it('returns true on hit and the wing is gone', () => {
    const wing = createWing({ name: 'Gone' })
    expect(deleteWing(wing.id)).toBe(true)
    expect(getWing(wing.id)).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Rooms
// ---------------------------------------------------------------------------

describe('createRoom', () => {
  it('creates a room with wing_id, name, and null description when not provided', () => {
    const wing = createWing({ name: 'W' })
    const room = createRoom({ wing_id: wing.id, name: 'Main' })
    expect(room.wing_id).toBe(wing.id)
    expect(room.name).toBe('Main')
    expect(room.description).toBeNull()
    expect(room.id).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('stores description when provided', () => {
    const wing = createWing({ name: 'W' })
    const room = createRoom({ wing_id: wing.id, name: 'Lab', description: 'Science stuff' })
    expect(room.description).toBe('Science stuff')
  })
})

describe('listRooms', () => {
  it('filters by wingId when provided', () => {
    const w1 = createWing({ name: 'W1' })
    const w2 = createWing({ name: 'W2' })
    createRoom({ wing_id: w1.id, name: 'R1' })
    createRoom({ wing_id: w2.id, name: 'R2' })
    const rooms = listRooms({ wingId: w1.id })
    expect(rooms).toHaveLength(1)
    expect(rooms[0].wing_id).toBe(w1.id)
  })

  it('returns all rooms when wingId not provided', () => {
    const w1 = createWing({ name: 'W1' })
    const w2 = createWing({ name: 'W2' })
    createRoom({ wing_id: w1.id, name: 'R1' })
    createRoom({ wing_id: w2.id, name: 'R2' })
    expect(listRooms()).toHaveLength(2)
  })
})

describe('updateRoom', () => {
  it('updates name independently', () => {
    const wing = createWing({ name: 'W' })
    const room = createRoom({ wing_id: wing.id, name: 'Old', description: 'Desc' })
    const updated = updateRoom(room.id, { name: 'New' })
    expect(updated!.name).toBe('New')
    expect(updated!.description).toBe('Desc')
  })

  it('updates description independently', () => {
    const wing = createWing({ name: 'W' })
    const room = createRoom({ wing_id: wing.id, name: 'Keep', description: 'Old desc' })
    const updated = updateRoom(room.id, { description: 'New desc' })
    expect(updated!.description).toBe('New desc')
    expect(updated!.name).toBe('Keep')
  })
})

describe('deleteRoom', () => {
  it('returns true on hit and false on miss', () => {
    const wing = createWing({ name: 'W' })
    const room = createRoom({ wing_id: wing.id, name: 'R' })
    expect(deleteRoom(room.id)).toBe(true)
    expect(deleteRoom(room.id)).toBe(false)
  })

  it('subsequent getRoom returns null after deletion', () => {
    const wing = createWing({ name: 'W' })
    const room = createRoom({ wing_id: wing.id, name: 'R' })
    deleteRoom(room.id)
    expect(getRoom(room.id)).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

describe('getSetting', () => {
  it('returns null on miss', () => {
    expect(getSetting('nonexistent')).toBeNull()
  })
})

describe('setSetting', () => {
  it('inserts and returns the value via getSetting', () => {
    setSetting('theme', 'dark')
    expect(getSetting('theme')).toBe('dark')
  })

  it('overwrites on conflict — second set wins', () => {
    setSetting('theme', 'dark')
    setSetting('theme', 'light')
    expect(getSetting('theme')).toBe('light')
  })
})

describe('setSettingIfAbsent', () => {
  it('returns true on first insert and the value is stored', () => {
    const inserted = setSettingIfAbsent('key', 'value1')
    expect(inserted).toBe(true)
    expect(getSetting('key')).toBe('value1')
  })

  it('returns false on subsequent call and the original value is preserved', () => {
    setSettingIfAbsent('key', 'value1')
    const inserted = setSettingIfAbsent('key', 'value2')
    expect(inserted).toBe(false)
    expect(getSetting('key')).toBe('value1')
  })
})
