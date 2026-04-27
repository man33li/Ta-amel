import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getMemory } from '@/lib/memory/client'
import { mergeSearchHits } from '@/lib/memory/merge'
import { extractTextFromTiptap } from '@/lib/utils'
import type { Card, SearchHit } from '@/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const RECENT_WINDOW_MS = 1000 * 60 * 60 * 24 * 14 // 14 days

export async function GET(request: Request) {
  const url = new URL(request.url)
  const q = url.searchParams.get('q')?.trim() ?? ''
  const wingId = url.searchParams.get('wing_id')
  const roomId = url.searchParams.get('room_id')
  const limit = Number(url.searchParams.get('limit') ?? 10)

  if (!q) {
    return NextResponse.json({ memories: [], cards: [], hits: [] })
  }

  const supabase = await createClient()
  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData.user) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }
  const userId = userData.user.id

  const memory = await getMemory()

  const [semantic, keyword, recent] = await Promise.all([
    memory
      .search({ query: q, userId, wingId, roomId, limit })
      .catch(() => [] as SearchHit[]),
    keywordSearch(supabase, { q, roomId, limit }),
    recentSearch(supabase, { roomId, limit }),
  ])

  const merged = mergeSearchHits(semantic, keyword, recent, limit)

  return NextResponse.json({
    memories: semantic,
    cards: keyword,
    hits: merged,
  })
}

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

async function keywordSearch(
  supabase: SupabaseClient,
  { q, roomId, limit }: { q: string; roomId: string | null; limit: number }
): Promise<SearchHit[]> {
  let query = supabase
    .from('cards')
    .select('id, title, content, updated_at, room_id')
    .ilike('title', `%${q}%`)
    .order('updated_at', { ascending: false })
    .limit(limit)

  if (roomId) query = query.eq('room_id', roomId)

  const { data, error } = await query
  if (error || !data) return []

  return (data as Card[]).map((card) => ({
    id: `card:${card.id}`,
    card_id: card.id,
    title: card.title,
    preview: extractTextFromTiptap(
      card.content as Record<string, unknown>,
      200
    ),
    score: 0,
    source: 'keyword' as const,
    updated_at: card.updated_at,
  }))
}

async function recentSearch(
  supabase: SupabaseClient,
  { roomId, limit }: { roomId: string | null; limit: number }
): Promise<SearchHit[]> {
  const since = new Date(Date.now() - RECENT_WINDOW_MS).toISOString()
  let query = supabase
    .from('cards')
    .select('id, title, content, updated_at, room_id')
    .gte('updated_at', since)
    .order('updated_at', { ascending: false })
    .limit(limit)

  if (roomId) query = query.eq('room_id', roomId)

  const { data, error } = await query
  if (error || !data) return []

  return (data as Card[]).map((card) => ({
    id: `card:${card.id}`,
    card_id: card.id,
    title: card.title,
    preview: extractTextFromTiptap(
      card.content as Record<string, unknown>,
      200
    ),
    score: 0,
    source: 'recent' as const,
    updated_at: card.updated_at,
  }))
}
