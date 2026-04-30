// In-process Okapi BM25 over the cards table. Single-user scale means we can
// recompute corpus stats per query without an inverted index. If the corpus
// crosses ~10k cards, swap in SQLite FTS5 (and keep this module as a fallback).

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'been', 'being',
  'but', 'by', 'for', 'from', 'has', 'have', 'he', 'her', 'his',
  'i', 'if', 'in', 'is', 'it', 'its', 'me', 'my', 'of', 'on',
  'or', 'our', 'she', 'so', 'than', 'that', 'the', 'their', 'them',
  'these', 'they', 'this', 'those', 'to', 'us', 'was', 'we', 'were',
  'what', 'which', 'who', 'whom', 'with', 'you', 'your',
])

const TOKEN_RE = /[a-z0-9][a-z0-9'-]*/g

export function tokenize(text: string): string[] {
  if (!text) return []
  const lower = text.toLowerCase()
  const out: string[] = []
  let m: RegExpExecArray | null
  while ((m = TOKEN_RE.exec(lower)) !== null) {
    const tok = m[0]
    if (tok.length < 2) continue
    if (STOP_WORDS.has(tok)) continue
    out.push(tok)
  }
  return out
}

interface CorpusStats {
  N: number
  avgdl: number
  df: Map<string, number>
}

interface TokenisedDoc {
  id: string
  tokens: string[]
}

const K1 = 1.5
const B = 0.75

export function computeStats(docs: TokenisedDoc[]): CorpusStats {
  const df = new Map<string, number>()
  let totalLen = 0
  for (const doc of docs) {
    totalLen += doc.tokens.length
    const seen = new Set<string>()
    for (const tok of doc.tokens) {
      if (seen.has(tok)) continue
      seen.add(tok)
      df.set(tok, (df.get(tok) ?? 0) + 1)
    }
  }
  return { N: docs.length, avgdl: docs.length > 0 ? totalLen / docs.length : 0, df }
}

export function scoreDoc(
  doc: TokenisedDoc,
  queryTokens: string[],
  stats: CorpusStats
): number {
  if (stats.N === 0 || doc.tokens.length === 0) return 0

  const tf = new Map<string, number>()
  for (const tok of doc.tokens) tf.set(tok, (tf.get(tok) ?? 0) + 1)

  const dl = doc.tokens.length
  const avgdl = stats.avgdl || 1

  let score = 0
  for (const qt of queryTokens) {
    const f = tf.get(qt) ?? 0
    if (f === 0) continue
    const n = stats.df.get(qt) ?? 0
    // Robertson-Sparck-Jones IDF, the lucene-friendly variant:
    //   idf = log(1 + (N - n + 0.5) / (n + 0.5))
    const idf = Math.log(1 + (stats.N - n + 0.5) / (n + 0.5))
    const numerator = f * (K1 + 1)
    const denominator = f + K1 * (1 - B + B * (dl / avgdl))
    score += idf * (numerator / denominator)
  }
  return score
}

export interface BM25Hit<T> {
  doc: T
  score: number
}

export function bm25Search<T extends { id: string }>(
  docs: T[],
  toText: (doc: T) => string,
  query: string,
  limit: number
): BM25Hit<T>[] {
  const queryTokens = tokenize(query)
  if (queryTokens.length === 0 || docs.length === 0) return []

  const tokenised: TokenisedDoc[] = docs.map((doc) => ({
    id: doc.id,
    tokens: tokenize(toText(doc)),
  }))
  const stats = computeStats(tokenised)

  const ranked: BM25Hit<T>[] = []
  for (let i = 0; i < docs.length; i++) {
    const score = scoreDoc(tokenised[i], queryTokens, stats)
    if (score > 0) ranked.push({ doc: docs[i], score })
  }
  ranked.sort((a, b) => b.score - a.score)
  return ranked.slice(0, limit)
}
