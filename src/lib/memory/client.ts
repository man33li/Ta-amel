import type { SearchHit } from '@/types'

/**
 * Server-only adapter around mem0ai/oss.
 *
 * Exposed as a thin interface so call sites are decoupled from mem0's
 * concrete API; if a future mem0 release shifts shapes, only this file
 * changes. When OPENAI_API_KEY or SUPABASE_DB_URL is missing the adapter
 * resolves to a no-op so /api/memory/* keeps returning 200.
 */

export interface MemoryAdapter {
  available: boolean
  add(input: AddInput): Promise<void>
  search(input: SearchInput): Promise<SearchHit[]>
  remove(input: RemoveInput): Promise<void>
}

export interface AddInput {
  content: string
  userId: string
  cardId: string
  wingId?: string | null
  roomId?: string | null
}

export interface SearchInput {
  query: string
  userId: string
  wingId?: string | null
  roomId?: string | null
  limit?: number
}

export interface RemoveInput {
  cardId: string
  userId: string
}

const NOOP: MemoryAdapter = {
  available: false,
  async add() {},
  async search() {
    return []
  },
  async remove() {},
}

let cached: MemoryAdapter | null = null

export async function getMemory(): Promise<MemoryAdapter> {
  if (cached) return cached

  const openaiKey = process.env.OPENAI_API_KEY
  const supabaseDbUrl = process.env.SUPABASE_DB_URL
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!openaiKey || !supabaseDbUrl || !supabaseUrl || !supabaseAnon) {
    cached = NOOP
    return cached
  }

  let pg: PgParts
  try {
    pg = parsePgUrl(supabaseDbUrl)
  } catch {
    cached = NOOP
    return cached
  }

  try {
    const mod = await import('mem0ai/oss')
    const Memory = (mod as { Memory: new (cfg: unknown) => Mem0Like }).Memory

    const memory = new Memory({
      embedder: {
        provider: 'openai',
        config: { apiKey: openaiKey, model: 'text-embedding-3-small' },
      },
      vectorStore: {
        provider: 'pgvector',
        config: {
          host: pg.host,
          port: pg.port,
          user: pg.user,
          password: pg.password,
          dbname: pg.dbname,
          collectionName: 'mindforge_memories',
          embeddingModelDims: 1536,
        },
      },
      llm: {
        provider: 'openai',
        config: { apiKey: openaiKey, model: 'gpt-4o-mini' },
      },
      historyStore: {
        provider: 'supabase',
        config: {
          supabaseUrl,
          supabaseKey: supabaseAnon,
          tableName: 'mindforge_memory_history',
        },
      },
    })

    cached = wrap(memory)
    return cached
  } catch {
    cached = NOOP
    return cached
  }
}

interface PgParts {
  host: string
  port: number
  user: string
  password: string
  dbname: string
}

function parsePgUrl(raw: string): PgParts {
  const url = new URL(raw)
  const dbname = url.pathname.replace(/^\//, '') || 'postgres'
  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : 5432,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    dbname,
  }
}

interface Mem0Like {
  add(content: string, options: Record<string, unknown>): Promise<unknown>
  search(query: string, options: Record<string, unknown>): Promise<unknown>
  deleteAll?(options: Record<string, unknown>): Promise<unknown>
}

function wrap(memory: Mem0Like): MemoryAdapter {
  return {
    available: true,

    async add({ content, userId, cardId, wingId, roomId }) {
      if (!content.trim()) return
      await memory.add(content, {
        userId,
        agentId: wingId ?? undefined,
        runId: roomId ?? undefined,
        metadata: { card_id: cardId },
      })
    },

    async search({ query, userId, wingId, roomId, limit = 10 }) {
      if (!query.trim()) return []
      const raw = await memory.search(query, {
        userId,
        agentId: wingId ?? undefined,
        runId: roomId ?? undefined,
        limit,
      })
      return normalizeSemanticHits(raw)
    },

    async remove({ cardId, userId }) {
      if (!memory.deleteAll) return
      await memory.deleteAll({
        userId,
        metadata: { card_id: cardId },
      })
    },
  }
}

function normalizeSemanticHits(raw: unknown): SearchHit[] {
  const list = extractList(raw)
  return list.map((row) => {
    const memory = stringField(row, 'memory') ?? stringField(row, 'text') ?? ''
    const score = numberField(row, 'score') ?? 0
    const id = stringField(row, 'id') ?? cryptoId()
    const metadata = (row as Record<string, unknown>).metadata as
      | Record<string, unknown>
      | undefined
    const cardId = (metadata && stringField(metadata, 'card_id')) ?? null
    const updatedAt =
      stringField(row, 'updated_at') ?? new Date().toISOString()

    return {
      id,
      card_id: cardId,
      title: memory.slice(0, 80) || 'Memory',
      preview: memory.slice(0, 200),
      score,
      source: 'semantic' as const,
      updated_at: updatedAt,
    }
  })
}

function extractList(raw: unknown): Record<string, unknown>[] {
  if (Array.isArray(raw)) return raw as Record<string, unknown>[]
  if (raw && typeof raw === 'object') {
    const results = (raw as Record<string, unknown>).results
    if (Array.isArray(results)) return results as Record<string, unknown>[]
  }
  return []
}

function stringField(obj: unknown, key: string): string | undefined {
  if (!obj || typeof obj !== 'object') return undefined
  const value = (obj as Record<string, unknown>)[key]
  return typeof value === 'string' ? value : undefined
}

function numberField(obj: unknown, key: string): number | undefined {
  if (!obj || typeof obj !== 'object') return undefined
  const value = (obj as Record<string, unknown>)[key]
  return typeof value === 'number' ? value : undefined
}

function cryptoId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return Math.random().toString(36).slice(2)
}

// Internal: lets tests reset the singleton.
export function __resetMemoryClientForTests() {
  cached = null
}
