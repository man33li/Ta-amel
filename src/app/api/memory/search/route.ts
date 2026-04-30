import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/guard'
import { db } from '@/lib/db/repo'
import { semanticSearch } from '@/lib/memory/store'
import { mergeSearchHits } from '@/lib/memory/merge'
import { bm25Search } from '@/lib/memory/bm25'
import { extractTextFromTiptap } from '@/lib/utils'
import type { Card, SearchHit } from '@/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const RECENT_WINDOW_MS = 1000 * 60 * 60 * 24 * 14 // 14 days

interface CardRow {
  id: string
  title: string
  content: string
  updated_at: string
  room_id: string | null
}

export async function GET(request: Request) {
  const guard = await requireAuth()
  if (guard) return guard

  const url = new URL(request.url)
  const q = url.searchParams.get('q')?.trim() ?? ''
  const roomId = url.searchParams.get('room_id')
  const limit = Number(url.searchParams.get('limit') ?? 10)

  if (!q) {
    return NextResponse.json({ memories: [], cards: [], hits: [] })
  }

  const [semantic, keyword, recent] = await Promise.all([
    semanticSearch({ query: q, roomId, limit }).catch(() => [] as SearchHit[]),
    Promise.resolve(keywordSearch({ q, roomId, limit })),
    Promise.resolve(recentSearch({ roomId, limit })),
  ])

  const merged = mergeSearchHits(semantic, keyword, recent, limit)

  return NextResponse.json({
    memories: semantic,
    cards: keyword,
    hits: merged,
  })
}

function keywordSearch({
  q,
  roomId,
  limit,
}: {
  q: string
  roomId: string | null
  limit: number
}): SearchHit[] {
  // Pull the candidate corpus (cards in scope), score with BM25 in-process.
  // At single-user scale (~bounded card count), this beats `LIKE %q%` on
  // partial / multi-token queries without needing FTS5 or maintaining an index.
  const rows = roomId
    ? (db()
        .prepare(
          `select id, title, content, updated_at, room_id from cards
           where room_id = ?`
        )
        .all(roomId) as CardRow[])
    : (db()
        .prepare(`select id, title, content, updated_at, room_id from cards`)
        .all() as CardRow[])

  if (rows.length === 0) return []

  const ranked = bm25Search(
    rows,
    (row) => {
      const content = parseContent(row.content) as Card['content']
      return `${row.title} ${extractTextFromTiptap(content as Record<string, unknown>)}`
    },
    q,
    limit
  )

  return ranked.map(({ doc, score }) => {
    const hit = rowToHit('keyword')(doc)
    return { ...hit, score }
  })
}

function recentSearch({
  roomId,
  limit,
}: {
  roomId: string | null
  limit: number
}): SearchHit[] {
  const since = new Date(Date.now() - RECENT_WINDOW_MS).toISOString()
  const rows = roomId
    ? (db()
        .prepare(
          `select id, title, content, updated_at, room_id from cards
           where room_id = ? and updated_at >= ?
           order by updated_at desc limit ?`
        )
        .all(roomId, since, limit) as CardRow[])
    : (db()
        .prepare(
          `select id, title, content, updated_at, room_id from cards
           where updated_at >= ?
           order by updated_at desc limit ?`
        )
        .all(since, limit) as CardRow[])

  return rows.map(rowToHit('recent'))
}

function rowToHit(source: SearchHit['source']) {
  return (row: CardRow): SearchHit => {
    const content = parseContent(row.content) as Card['content']
    return {
      id: `card:${row.id}`,
      card_id: row.id,
      title: row.title,
      preview: extractTextFromTiptap(content as Record<string, unknown>, 200),
      score: 0,
      source,
      updated_at: row.updated_at,
    }
  }
}

function parseContent(raw: string): unknown {
  try {
    return JSON.parse(raw)
  } catch {
    return {}
  }
}
