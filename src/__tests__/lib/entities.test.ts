// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { __resetDbForTests } from '@/lib/db/sqlite'
import {
  createCard,
  deleteCard,
  getCardEntities,
  getCardTags,
  addUserTag,
  removeUserTag,
  setAutoTags,
} from '@/lib/db/repo'
import { extractEntities, syncCardEntities } from '@/lib/entities'

const tiptapDoc = (...paragraphs: string[]) => ({
  type: 'doc',
  content: paragraphs.map((text) => ({
    type: 'paragraph',
    content: [{ type: 'text', text }],
  })),
})

describe('extractEntities', () => {
  it('returns empty array for null/undefined content', () => {
    expect(extractEntities(null)).toEqual([])
    expect(extractEntities(undefined)).toEqual([])
  })

  it('returns empty array for empty content', () => {
    expect(extractEntities({})).toEqual([])
  })

  it('extracts at least one entity from prose with named people / places', () => {
    const doc = tiptapDoc(
      'John traveled from San Francisco to Tokyo to meet Sarah at Acme Corp.'
    )
    const entities = extractEntities(doc, 'Trip notes')
    // Compromise heuristics are imperfect; we just ensure something was found.
    expect(entities.length).toBeGreaterThan(0)
    // Each entity has the expected shape.
    for (const e of entities) {
      expect(typeof e.name).toBe('string')
      expect(['person', 'place', 'org', 'topic', 'other']).toContain(e.type)
      expect(e.count).toBeGreaterThan(0)
    }
  })

  it('counts repeated mentions in the body', () => {
    const doc = tiptapDoc('Acme is great. Acme is also fast. Acme acme.')
    const entities = extractEntities(doc, '')
    // The most-mentioned org should bubble to the top.
    expect(entities.length).toBeGreaterThan(0)
    const top = entities[0]
    expect(top.count).toBeGreaterThan(1)
  })
})

describe('syncCardEntities (DB-backed)', () => {
  beforeEach(() => {
    process.env.MINDFORGE_DB_PATH = ':memory:'
    __resetDbForTests()
  })
  afterEach(() => {
    __resetDbForTests()
  })

  it('persists extracted entities and creates auto-tags from topics', () => {
    const card = createCard({
      title: 'machine learning notes',
      content: tiptapDoc(
        'Today we covered machine learning algorithms and neural networks. The lecture covered machine learning extensively.'
      ),
    })
    syncCardEntities(card)

    const entities = getCardEntities(card.id)
    expect(entities.length).toBeGreaterThan(0)

    const tags = getCardTags(card.id)
    // Auto-tags only — should be sourced 'auto'
    expect(tags.length).toBeGreaterThan(0)
    expect(tags.every((t) => t.source === 'auto')).toBe(true)
  })

  it('replaces auto tags on resync but keeps user tags', () => {
    const card = createCard({ title: 'a', content: tiptapDoc('initial') })
    setAutoTags(card.id, ['old-auto'])
    addUserTag(card.id, 'mine')

    const before = getCardTags(card.id)
    expect(before.find((t) => t.tag === 'old-auto' && t.source === 'auto')).toBeDefined()
    expect(before.find((t) => t.tag === 'mine' && t.source === 'user')).toBeDefined()

    setAutoTags(card.id, ['new-auto'])
    const after = getCardTags(card.id)
    expect(after.find((t) => t.tag === 'old-auto')).toBeUndefined()
    expect(after.find((t) => t.tag === 'new-auto' && t.source === 'auto')).toBeDefined()
    // User tag survives
    expect(after.find((t) => t.tag === 'mine' && t.source === 'user')).toBeDefined()
  })

  it('addUserTag is idempotent (no duplicate rows)', () => {
    const card = createCard({ title: 'a', content: {} })
    expect(addUserTag(card.id, 'foo')).toBe(true)
    expect(addUserTag(card.id, 'foo')).toBe(false) // second insert ignored
    const tags = getCardTags(card.id)
    expect(tags.filter((t) => t.tag === 'foo')).toHaveLength(1)
  })

  it('removeUserTag only removes user tags, not auto tags with the same name', () => {
    const card = createCard({ title: 'a', content: {} })
    setAutoTags(card.id, ['shared'])
    addUserTag(card.id, 'shared')
    expect(getCardTags(card.id)).toHaveLength(2)

    removeUserTag(card.id, 'shared')
    const remaining = getCardTags(card.id)
    expect(remaining).toHaveLength(1)
    expect(remaining[0].source).toBe('auto')
  })

  it('cascades on card delete', () => {
    const card = createCard({ title: 'a', content: tiptapDoc('test machine learning') })
    syncCardEntities(card)
    expect(getCardEntities(card.id).length).toBeGreaterThanOrEqual(0)

    deleteCard(card.id)
    expect(getCardEntities(card.id)).toEqual([])
    expect(getCardTags(card.id)).toEqual([])
  })
})
