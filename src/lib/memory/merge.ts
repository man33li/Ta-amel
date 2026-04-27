import type { SearchHit, MemorySource } from '@/types'

const RRF_K = 60

/**
 * Reciprocal Rank Fusion across the three retrieval lanes mempalace's hybrid
 * v4 inspired: semantic, keyword, and recency. Each input list is already
 * sorted by its own definition of "best first"; RRF lets us combine them
 * without tuning weights.
 *
 * For one document, score = sum over lanes(1 / (k + rank_in_lane)). A doc
 * present in two lanes will outrank a doc present in only one, even if the
 * one-lane doc had a high raw score.
 */
export function mergeSearchHits(
  semantic: SearchHit[],
  keyword: SearchHit[],
  recent: SearchHit[],
  limit = 10
): SearchHit[] {
  const byKey = new Map<string, { hit: SearchHit; score: number }>()

  const ingest = (lane: SearchHit[], source: MemorySource) => {
    lane.forEach((hit, idx) => {
      const key = hit.card_id ?? hit.id
      const rrfBoost = 1 / (RRF_K + idx + 1)
      const existing = byKey.get(key)
      if (existing) {
        existing.score += rrfBoost
        // Keep the richest source label: prefer non-recent so users see why
        // it surfaced for content reasons, not just freshness.
        if (existing.hit.source === 'recent' && source !== 'recent') {
          existing.hit = { ...hit, source }
        }
      } else {
        byKey.set(key, { hit: { ...hit, source }, score: rrfBoost })
      }
    })
  }

  ingest(semantic, 'semantic')
  ingest(keyword, 'keyword')
  ingest(recent, 'recent')

  return Array.from(byKey.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ hit, score }) => ({ ...hit, score }))
}
