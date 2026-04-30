import nlp from 'compromise'
import { extractTextFromTiptap } from '@/lib/utils'
import { setCardEntities, setAutoTags } from '@/lib/db/repo'
import type { Card } from '@/types'

export type EntityType = 'person' | 'place' | 'org' | 'topic' | 'other'

export interface ExtractedEntity {
  name: string
  type: EntityType
  count: number
}

const MAX_AUTO_TAGS = 5

const STOP_WORDS = new Set([
  'thing', 'things', 'time', 'times', 'day', 'days', 'today', 'yesterday',
  'tomorrow', 'lot', 'lots', 'way', 'ways', 'one', 'two', 'three',
  'kind', 'sort', 'type', 'part', 'place', 'people', 'person',
])

const normalize = (s: string): string =>
  s.toLowerCase().trim().replace(/\s+/g, ' ').replace(/[^\p{L}\p{N}\s'-]/gu, '')

export function extractEntities(
  content: Record<string, unknown> | null | undefined,
  title?: string
): ExtractedEntity[] {
  const titleText = title?.trim() ?? ''
  const bodyText = content ? extractTextFromTiptap(content) : ''
  const text = `${titleText}\n${bodyText}`.trim()
  if (!text) return []

  const doc = nlp(text)
  const counts = new Map<string, ExtractedEntity>()
  const claimedNames = new Set<string>()

  const ingest = (names: string[], type: EntityType) => {
    for (const raw of names) {
      const name = normalize(raw)
      if (!name || name.length < 2) continue
      claimedNames.add(name)
      const key = `${type}:${name}`
      const existing = counts.get(key)
      if (existing) existing.count++
      else counts.set(key, { name, type, count: 1 })
    }
  }

  ingest(doc.people().out('array') as string[], 'person')
  ingest(doc.places().out('array') as string[], 'place')
  ingest(doc.organizations().out('array') as string[], 'org')

  // Topics: compromise's topics() catches named entities; we supplement with
  // nouns() so multi-word phrases ("machine learning") and bare repeated
  // nouns ("Acme") get picked up. Skip nouns already claimed as person /
  // place / org so we don't double-count.
  const topicCounts = new Map<string, number>()

  for (const raw of doc.topics().out('array') as string[]) {
    const norm = normalize(raw)
    if (!norm || norm.length < 2) continue
    if (claimedNames.has(norm) || STOP_WORDS.has(norm)) continue
    topicCounts.set(norm, (topicCounts.get(norm) ?? 0) + 1)
  }

  for (const raw of doc.nouns().out('array') as string[]) {
    const norm = normalize(raw)
    if (!norm || norm.length < 3) continue
    if (claimedNames.has(norm) || STOP_WORDS.has(norm)) continue
    topicCounts.set(norm, (topicCounts.get(norm) ?? 0) + 1)
  }

  for (const [name, count] of topicCounts.entries()) {
    // Single-mention bare nouns are too noisy; require >= 2 mentions for
    // single-word topics. Multi-word phrases survive a single mention because
    // they are usually meaningful on their own.
    if (count < 2 && !name.includes(' ')) continue
    counts.set(`topic:${name}`, { name, type: 'topic', count })
  }

  return Array.from(counts.values()).sort((a, b) => b.count - a.count)
}

export function syncCardEntities(card: Card): void {
  const entities = extractEntities(card.content, card.title)
  setCardEntities(
    card.id,
    entities.map((e) => ({ name: e.name, type: e.type, count: e.count }))
  )

  const autoTags = entities
    .filter((e) => e.type === 'topic')
    .slice(0, MAX_AUTO_TAGS)
    .map((e) => e.name)
  setAutoTags(card.id, autoTags)
}
