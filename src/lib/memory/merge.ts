import type { SearchHit, MemorySource } from '@/types'

const RRF_K = 60
// Continuous freshness boost. A 90-day-old card is worth half as much as a
// brand-new one *with the same content score*. Lower than that and stale notes
// drown anything new; higher than that and freshness barely registers.
const FRESHNESS_HALF_LIFE_DAYS = 90

function freshnessMultiplier(updatedAt: string, now: number): number {
  const ts = Date.parse(updatedAt)
  if (Number.isNaN(ts)) return 1
  const ageDays = Math.max(0, (now - ts) / (1000 * 60 * 60 * 24))
  return Math.exp((-Math.LN2 * ageDays) / FRESHNESS_HALF_LIFE_DAYS)
}

/**
 * Reciprocal Rank Fusion across the three retrieval lanes mempalace's hybrid
 * v4 inspired: semantic, keyword, and recency. Each input list is already
 * sorted by its own definition of "best first"; RRF lets us combine them
 * without tuning weights. After fusion, a continuous time-decay multiplier is
 * applied so very fresh notes outrank slightly-better-matching old ones.
 */
export function mergeSearchHits(
  semantic: SearchHit[],
  keyword: SearchHit[],
  recent: SearchHit[],
  limit = 10,
  now: number = Date.now()
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
    .map(({ hit, score }) => ({
      hit,
      score: score * freshnessMultiplier(hit.updated_at, now),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ hit, score }) => ({ ...hit, score }))
}
