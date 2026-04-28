// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// vi.hoisted ensures fakeEmbed is initialised before the hoisted vi.mock factory runs.
const { fakeEmbed } = vi.hoisted(() => {
  const fakeEmbed = vi.fn(async (text: string): Promise<Float32Array | null> => {
    if (!text.trim()) return null
    const v = new Float32Array(384)
    // Deterministic pattern: distinct text length → distinct direction.
    const seed = text.length || 1
    for (let i = 0; i < 384; i++) v[i] = Math.sin((i + 1) * seed * 0.0173)
    // Normalise so cosine == dot product.
    let norm = 0
    for (const x of v) norm += x * x
    norm = Math.sqrt(norm) || 1
    for (let i = 0; i < 384; i++) v[i] /= norm
    return v
  })
  return { fakeEmbed }
})

vi.mock('@/lib/embed/embedder', () => ({
  embed: fakeEmbed,
  EMBEDDING_DIM: 384,
  isEmbeddingDisabled: () => process.env.MINDFORGE_EMBEDDINGS_DISABLED === '1',
  __resetEmbedderForTests: () => {},
}))

import { __resetDbForTests } from '@/lib/db/sqlite'
import { createCard, db } from '@/lib/db/repo'
import { syncCardEmbedding, removeCardEmbedding, semanticSearch } from '@/lib/memory/store'
import type { Card } from '@/types'

// A minimal Tiptap doc with non-empty body text.
const tiptapDoc = (text: string) => ({
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
})

// Helper: create a card and return it.
function makeCard(title: string, body: string, roomId?: string | null): Card {
  return createCard({ title, content: tiptapDoc(body), roomId: roomId ?? null })
}

beforeEach(() => {
  process.env.MINDFORGE_DB_PATH = ':memory:'
  delete process.env.MINDFORGE_EMBEDDINGS_DISABLED
  __resetDbForTests()
  fakeEmbed.mockClear()
})

afterEach(() => {
  __resetDbForTests()
})

// ============================================================================
// syncCardEmbedding
// ============================================================================

describe('syncCardEmbedding', () => {
  it('stores a row with dim=384 and a non-empty buffer', async () => {
    const card = makeCard('Hello world', 'Some body text here')
    await syncCardEmbedding(card)

    const row = db()
      .prepare('select * from card_embeddings where card_id = ?')
      .get(card.id) as { card_id: string; vector: Buffer; dim: number; text: string } | undefined

    expect(row).toBeDefined()
    expect(row!.dim).toBe(384)
    expect(row!.vector.length).toBeGreaterThan(0)
    expect(fakeEmbed).toHaveBeenCalledOnce()
  })

  it('upserts on second call — no duplicate row, vector replaced', async () => {
    const card = makeCard('Title', 'First body text')
    await syncCardEmbedding(card)

    const firstRow = db()
      .prepare('select vector from card_embeddings where card_id = ?')
      .get(card.id) as { vector: Buffer }

    const updated = { ...card, title: 'Title updated body completely different words' }
    await syncCardEmbedding(updated)

    const count = (
      db()
        .prepare('select count(*) as n from card_embeddings where card_id = ?')
        .get(card.id) as { n: number }
    ).n
    expect(count).toBe(1)

    const secondRow = db()
      .prepare('select vector from card_embeddings where card_id = ?')
      .get(card.id) as { vector: Buffer }

    // Vectors differ because fakeEmbed is seeded by text length, which changed.
    expect(secondRow.vector.equals(firstRow.vector)).toBe(false)
  })

  it('skips embedding and inserts no row when MINDFORGE_EMBEDDINGS_DISABLED=1', async () => {
    process.env.MINDFORGE_EMBEDDINGS_DISABLED = '1'
    const card = makeCard('Hello', 'Body text here')
    await syncCardEmbedding(card)

    const row = db()
      .prepare('select * from card_embeddings where card_id = ?')
      .get(card.id)

    expect(row).toBeUndefined()
    expect(fakeEmbed).not.toHaveBeenCalled()
  })

  it('calls removeCardEmbedding when card has empty title and empty body', async () => {
    // First sync a real embedding so we can confirm it is deleted.
    const card = makeCard('Title', 'Body text to embed initially')
    await syncCardEmbedding(card)
    expect(
      db().prepare('select * from card_embeddings where card_id = ?').get(card.id)
    ).toBeDefined()

    // Now update card to have blank title and blank body.
    const emptyCard: Card = { ...card, title: '', content: tiptapDoc('') }
    await syncCardEmbedding(emptyCard)

    const row = db()
      .prepare('select * from card_embeddings where card_id = ?')
      .get(card.id)
    expect(row).toBeUndefined()
  })
})

// ============================================================================
// removeCardEmbedding
// ============================================================================

describe('removeCardEmbedding', () => {
  it('deletes the row by card_id', async () => {
    const card = makeCard('Remove me', 'Some content to embed')
    await syncCardEmbedding(card)
    expect(
      db().prepare('select * from card_embeddings where card_id = ?').get(card.id)
    ).toBeDefined()

    removeCardEmbedding(card.id)

    expect(
      db().prepare('select * from card_embeddings where card_id = ?').get(card.id)
    ).toBeUndefined()
  })

  it('is idempotent — removing a non-existent card_id does not throw', () => {
    expect(() => removeCardEmbedding('non-existent-id')).not.toThrow()
  })
})

// ============================================================================
// semanticSearch
// ============================================================================

describe('semanticSearch', () => {
  it('returns [] for an empty query without calling embed', async () => {
    const results = await semanticSearch({ query: '   ' })
    expect(results).toEqual([])
    expect(fakeEmbed).not.toHaveBeenCalled()
  })

  it('returns [] when MINDFORGE_EMBEDDINGS_DISABLED=1', async () => {
    process.env.MINDFORGE_EMBEDDINGS_DISABLED = '1'
    const results = await semanticSearch({ query: 'something' })
    expect(results).toEqual([])
    expect(fakeEmbed).not.toHaveBeenCalled()
  })

  it('returns up to limit results sorted by score desc', async () => {
    const c1 = makeCard('Card one', 'Alpha beta gamma delta epsilon')
    const c2 = makeCard('Card two', 'Zeta eta theta iota kappa lambda mu')
    const c3 = makeCard('Card three', 'Nu xi omicron pi rho sigma tau upsilon phi chi')
    await syncCardEmbedding(c1)
    await syncCardEmbedding(c2)
    await syncCardEmbedding(c3)

    const results = await semanticSearch({ query: 'some query text', limit: 2 })

    expect(results).toHaveLength(2)
    // Scores must be descending.
    expect(results[0].score).toBeGreaterThanOrEqual(results[1].score)
  })

  it('filters by roomId', async () => {
    // We need a wing and room for FK purposes.
    const wing = db()
      .prepare(
        `insert into wings (id, name, created_at, updated_at)
         values ('wing-1', 'Test Wing', datetime('now'), datetime('now'))`
      )
      .run()
    void wing
    db()
      .prepare(
        `insert into rooms (id, wing_id, name, created_at, updated_at)
         values ('room-a', 'wing-1', 'Room A', datetime('now'), datetime('now'))`
      )
      .run()
    db()
      .prepare(
        `insert into rooms (id, wing_id, name, created_at, updated_at)
         values ('room-b', 'wing-1', 'Room B', datetime('now'), datetime('now'))`
      )
      .run()

    const inRoom = makeCard('In Room', 'Content for room a specifically', 'room-a')
    const outRoom = makeCard('Out Room', 'Content for room b specifically', 'room-b')
    await syncCardEmbedding(inRoom)
    await syncCardEmbedding(outRoom)

    const results = await semanticSearch({ query: 'content', roomId: 'room-a', limit: 10 })

    const ids = results.map((r) => r.card_id)
    expect(ids).toContain(inRoom.id)
    expect(ids).not.toContain(outRoom.id)
  })

  it('hits have source=semantic and id=mem:<card_id> and title from cards', async () => {
    const card = makeCard('My Card Title', 'Interesting body content here')
    await syncCardEmbedding(card)

    const results = await semanticSearch({ query: 'interesting content', limit: 5 })

    expect(results).toHaveLength(1)
    const hit = results[0]
    expect(hit.id).toBe(`mem:${card.id}`)
    expect(hit.card_id).toBe(card.id)
    expect(hit.title).toBe('My Card Title')
    expect(hit.source).toBe('semantic')
    expect(typeof hit.score).toBe('number')
  })

  it('orphan row falls back to text.slice(0,80) for title and uses embedding updated_at', async () => {
    const card = makeCard('Orphan Card', 'Orphan body text content here to embed')
    await syncCardEmbedding(card)

    // Get the embedding text before the card is removed.
    const embRow = db()
      .prepare('select text, updated_at from card_embeddings where card_id = ?')
      .get(card.id) as { text: string; updated_at: string }

    // Disable FK enforcement so we can delete the card without cascade removing the embedding.
    db().pragma('foreign_keys = OFF')
    db().prepare('delete from cards where id = ?').run(card.id)
    db().pragma('foreign_keys = ON')

    const results = await semanticSearch({ query: 'orphan body', limit: 5 })

    expect(results).toHaveLength(1)
    const hit = results[0]
    // Title falls back to the stored text snippet.
    expect(hit.title).toBe(embRow.text.slice(0, 80))
    expect(hit.updated_at).toBe(embRow.updated_at)
  })
})
