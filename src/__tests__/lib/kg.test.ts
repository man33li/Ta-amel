// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { __resetDbForTests } from '@/lib/db/sqlite'
import {
  createCard,
  deleteCard,
  setCardEntities,
  setCardRelations,
  getCardEntities,
  getEntityById,
  getEntityNeighbors,
  getEntityCards,
} from '@/lib/db/repo'
import { syncCardEntities } from '@/lib/entities'

const tiptapDoc = (...paragraphs: string[]) => ({
  type: 'doc',
  content: paragraphs.map((text) => ({
    type: 'paragraph',
    content: [{ type: 'text', text }],
  })),
})

describe('knowledge graph relations', () => {
  beforeEach(() => {
    process.env.MINDFORGE_DB_PATH = ':memory:'
    __resetDbForTests()
  })
  afterEach(() => {
    __resetDbForTests()
  })

  it('co-occurs edges connect every entity pair in a card', () => {
    const card = createCard({ title: '', content: {} })
    setCardEntities(card.id, [
      { name: 'alice', type: 'person', count: 3 },
      { name: 'bob', type: 'person', count: 2 },
      { name: 'paris', type: 'place', count: 1 },
    ])
    const persisted = getCardEntities(card.id)
    expect(persisted).toHaveLength(3)
    setCardRelations(
      card.id,
      persisted.map((p) => p.id)
    )

    // Each entity sees the other two as neighbors.
    for (const e of persisted) {
      const neighbors = getEntityNeighbors(e.id)
      expect(neighbors.map((n) => n.name).sort()).toEqual(
        persisted
          .filter((p) => p.id !== e.id)
          .map((p) => p.name)
          .sort()
      )
    }
  })

  it('replaces old co-occurs edges from the same card on resync', () => {
    const card = createCard({ title: '', content: {} })
    setCardEntities(card.id, [
      { name: 'alpha', type: 'topic', count: 1 },
      { name: 'beta', type: 'topic', count: 1 },
    ])
    let persisted = getCardEntities(card.id)
    setCardRelations(card.id, persisted.map((p) => p.id))

    const alphaId = persisted.find((p) => p.name === 'alpha')!.id
    expect(getEntityNeighbors(alphaId).map((n) => n.name)).toEqual(['beta'])

    // Replace: alpha now co-occurs with gamma instead.
    setCardEntities(card.id, [
      { name: 'alpha', type: 'topic', count: 1 },
      { name: 'gamma', type: 'topic', count: 1 },
    ])
    persisted = getCardEntities(card.id)
    setCardRelations(card.id, persisted.map((p) => p.id))

    expect(getEntityNeighbors(alphaId).map((n) => n.name)).toEqual(['gamma'])
  })

  it('aggregates weight when the same pair co-occurs across multiple cards', () => {
    const c1 = createCard({ title: '', content: {} })
    const c2 = createCard({ title: '', content: {} })

    setCardEntities(c1.id, [
      { name: 'alice', type: 'person', count: 1 },
      { name: 'bob', type: 'person', count: 1 },
    ])
    setCardRelations(
      c1.id,
      getCardEntities(c1.id).map((p) => p.id)
    )
    setCardEntities(c2.id, [
      { name: 'alice', type: 'person', count: 1 },
      { name: 'bob', type: 'person', count: 1 },
    ])
    setCardRelations(
      c2.id,
      getCardEntities(c2.id).map((p) => p.id)
    )

    const alice = getCardEntities(c1.id).find((e) => e.name === 'alice')!
    const neighbors = getEntityNeighbors(alice.id)
    expect(neighbors).toHaveLength(1)
    expect(neighbors[0].name).toBe('bob')
    expect(neighbors[0].weight).toBe(2)
  })

  it('syncCardEntities builds the graph end-to-end', () => {
    const card = createCard({
      title: 'project notes',
      content: tiptapDoc(
        'Alice flew from Paris to meet Bob at Acme Corp. Alice and Bob discussed the project.'
      ),
    })
    syncCardEntities(card)
    const ents = getCardEntities(card.id)
    expect(ents.length).toBeGreaterThan(1)

    const first = ents[0]
    const neighbors = getEntityNeighbors(first.id)
    // Every other entity in the card is a neighbor of this one.
    expect(neighbors).toHaveLength(ents.length - 1)
  })

  it('getEntityCards lists cards mentioning the entity', () => {
    const c1 = createCard({ title: 'a', content: {} })
    const c2 = createCard({ title: 'b', content: {} })
    setCardEntities(c1.id, [{ name: 'shared', type: 'topic', count: 1 }])
    setCardEntities(c2.id, [{ name: 'shared', type: 'topic', count: 5 }])

    const sharedFromC1 = getCardEntities(c1.id)[0]
    const cards = getEntityCards(sharedFromC1.id)
    expect(cards).toHaveLength(2)
    // Higher mention count comes first.
    expect(cards[0].title).toBe('b')
  })

  it('cascades on card delete via source_card_id FK', () => {
    const card = createCard({ title: '', content: {} })
    setCardEntities(card.id, [
      { name: 'x', type: 'topic', count: 1 },
      { name: 'y', type: 'topic', count: 1 },
    ])
    const persisted = getCardEntities(card.id)
    setCardRelations(card.id, persisted.map((p) => p.id))

    const xId = persisted.find((p) => p.name === 'x')!.id
    expect(getEntityNeighbors(xId)).toHaveLength(1)

    deleteCard(card.id)
    // card_entities row gone via cascade; entity row survives but has no
    // neighbors left because relations cascaded too.
    expect(getEntityNeighbors(xId)).toHaveLength(0)
    expect(getEntityById(xId)).not.toBeNull()
  })
})
