import { describe, it, expect } from 'vitest'
import { mergeSearchHits } from '@/lib/memory/merge'
import type { SearchHit } from '@/types'

const make = (
  cardId: string,
  source: SearchHit['source'],
  title = `card-${cardId}`
): SearchHit => ({
  id: `${source}:${cardId}`,
  card_id: cardId,
  title,
  preview: title,
  score: 0,
  source,
  updated_at: '2026-04-27T00:00:00Z',
})

describe('mergeSearchHits (RRF over semantic + keyword + recent)', () => {
  it('returns empty array when all lanes empty', () => {
    expect(mergeSearchHits([], [], [])).toEqual([])
  })

  it('ranks an exact-title keyword hit above a weak semantic hit', () => {
    // Keyword hit at rank 0 has reciprocal 1/(60+1).
    // Semantic-only hit at rank 4 has reciprocal 1/(60+5).
    const semantic = [
      make('weakly-related', 'semantic'),
      make('weakly-related-2', 'semantic'),
      make('weakly-related-3', 'semantic'),
      make('weakly-related-4', 'semantic'),
      make('exact-title-match', 'semantic'),
    ]
    const keyword = [make('exact-title-match', 'keyword')]
    const recent: SearchHit[] = []

    const result = mergeSearchHits(semantic, keyword, recent)

    expect(result[0].card_id).toBe('exact-title-match')
    // Top hit appeared in two lanes — it should have the highest score.
    expect(result[0].score).toBeGreaterThan(result[1].score)
  })

  it('deduplicates by card_id across lanes and keeps richest source label', () => {
    const semantic = [make('a', 'semantic')]
    const keyword: SearchHit[] = []
    const recent = [make('a', 'recent')]

    const result = mergeSearchHits(semantic, keyword, recent)

    expect(result).toHaveLength(1)
    // 'recent' should be displaced by the more meaningful 'semantic' label.
    expect(result[0].source).toBe('semantic')
  })

  it('boosts a card present in all three lanes above any single-lane card', () => {
    const triple = [make('triple', 'semantic')]
    const tripleKw = [make('triple', 'keyword')]
    const tripleRecent = [make('triple', 'recent')]
    const single = [make('single', 'semantic')]

    const result = mergeSearchHits(
      [...triple, ...single],
      tripleKw,
      tripleRecent
    )

    expect(result[0].card_id).toBe('triple')
  })

  it('respects the limit argument', () => {
    const semantic = Array.from({ length: 20 }, (_, i) =>
      make(`s-${i}`, 'semantic')
    )
    const result = mergeSearchHits(semantic, [], [], 5)
    expect(result).toHaveLength(5)
  })

  it('falls back to id when card_id is null (semantic-only memory)', () => {
    const semantic: SearchHit[] = [
      { ...make('x', 'semantic'), card_id: null, id: 'mem-1' },
      { ...make('x', 'semantic'), card_id: null, id: 'mem-2' },
    ]
    const result = mergeSearchHits(semantic, [], [])
    expect(result).toHaveLength(2)
  })
})
