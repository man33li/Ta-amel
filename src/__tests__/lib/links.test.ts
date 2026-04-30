// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { __resetDbForTests } from '@/lib/db/sqlite'
import {
  createCard,
  deleteCard,
  setCardLinks,
  getOutgoingLinks,
  getIncomingLinks,
} from '@/lib/db/repo'
import { extractLinkedCardIds, syncCardLinks } from '@/lib/links'

const UUID_A = '00000000-0000-4000-8000-000000000001'
const UUID_B = '00000000-0000-4000-8000-000000000002'
const UUID_C = '00000000-0000-4000-8000-000000000003'

const tiptapDoc = (...paragraphs: string[]) => ({
  type: 'doc',
  content: paragraphs.map((text) => ({
    type: 'paragraph',
    content: [{ type: 'text', text }],
  })),
})

describe('extractLinkedCardIds', () => {
  it('returns ids matching [[uuid]] pattern, deduped and lowercased', () => {
    const doc = tiptapDoc(
      `See [[${UUID_A.toUpperCase()}]] and [[${UUID_B}]]`,
      `Also [[${UUID_A}]]` // duplicate
    )
    const ids = extractLinkedCardIds(doc).sort()
    expect(ids).toEqual([UUID_A, UUID_B].sort())
  })

  it('ignores non-uuid bracket pairs', () => {
    const doc = tiptapDoc('No links here, just [[words]] and [[abc]]')
    expect(extractLinkedCardIds(doc)).toEqual([])
  })

  it('returns empty array for null/undefined content', () => {
    expect(extractLinkedCardIds(null)).toEqual([])
    expect(extractLinkedCardIds(undefined)).toEqual([])
  })
})

describe('syncCardLinks (DB-backed)', () => {
  beforeEach(() => {
    process.env.MINDFORGE_DB_PATH = ':memory:'
    __resetDbForTests()
  })
  afterEach(() => {
    __resetDbForTests()
  })

  it('persists outgoing links and surfaces them as incoming on the target', () => {
    const target = createCard({ title: 'target', content: {} })
    const source = createCard({
      title: 'source',
      content: tiptapDoc(`look at [[${target.id}]]`),
    })

    syncCardLinks(source)

    const outgoing = getOutgoingLinks(source.id)
    const incoming = getIncomingLinks(target.id)
    expect(outgoing.map((c) => c.id)).toEqual([target.id])
    expect(incoming.map((c) => c.id)).toEqual([source.id])
  })

  it('skips self-references', () => {
    const card = createCard({ title: 'self', content: {} })
    setCardLinks(card.id, [card.id])
    expect(getOutgoingLinks(card.id)).toEqual([])
  })

  it('skips links to non-existent cards', () => {
    const card = createCard({ title: 'a', content: {} })
    setCardLinks(card.id, [UUID_C]) // UUID_C does not exist
    expect(getOutgoingLinks(card.id)).toEqual([])
  })

  it('replaces previous links on resync', () => {
    const a = createCard({ title: 'a', content: {} })
    const b = createCard({ title: 'b', content: {} })
    const source = createCard({
      title: 'source',
      content: tiptapDoc(`first [[${a.id}]]`),
    })
    syncCardLinks(source)
    expect(getOutgoingLinks(source.id).map((c) => c.id)).toEqual([a.id])

    const updated = { ...source, content: tiptapDoc(`now [[${b.id}]]`) }
    syncCardLinks(updated)
    expect(getOutgoingLinks(source.id).map((c) => c.id)).toEqual([b.id])
  })

  it('cascades on card delete (FK on delete cascade)', () => {
    const a = createCard({ title: 'a', content: {} })
    const b = createCard({ title: 'b', content: {} })
    setCardLinks(a.id, [b.id])
    expect(getIncomingLinks(b.id)).toHaveLength(1)
    // Delete card a → its outgoing link should disappear
    deleteCard(a.id)
    expect(getIncomingLinks(b.id)).toEqual([])
  })
})
