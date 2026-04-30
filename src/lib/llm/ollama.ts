import { getSetting, setSetting } from '@/lib/db/repo'

/**
 * Optional Ollama bridge. Off by default. Settings are persisted in the
 * encrypted `settings` table. Nothing in the rest of the app calls into
 * Ollama unless `llm_enabled === '1'` and the endpoint responds.
 */

const KEY_ENABLED = 'llm_enabled'
const KEY_ENDPOINT = 'llm_endpoint'
const KEY_MODEL = 'llm_model'

export const DEFAULT_ENDPOINT = 'http://localhost:11434'
export const DEFAULT_MODEL = 'llama3.2:3b'

export interface LlmConfig {
  enabled: boolean
  endpoint: string
  model: string
}

export function getLlmConfig(): LlmConfig {
  return {
    enabled: getSetting(KEY_ENABLED) === '1',
    endpoint: getSetting(KEY_ENDPOINT) ?? DEFAULT_ENDPOINT,
    model: getSetting(KEY_MODEL) ?? DEFAULT_MODEL,
  }
}

export function setLlmConfig(patch: Partial<LlmConfig>): LlmConfig {
  if (typeof patch.enabled === 'boolean') {
    setSetting(KEY_ENABLED, patch.enabled ? '1' : '0')
  }
  if (typeof patch.endpoint === 'string' && patch.endpoint.trim()) {
    setSetting(KEY_ENDPOINT, patch.endpoint.trim())
  }
  if (typeof patch.model === 'string' && patch.model.trim()) {
    setSetting(KEY_MODEL, patch.model.trim())
  }
  return getLlmConfig()
}

export async function pingOllama(endpoint: string): Promise<boolean> {
  try {
    const res = await fetch(new URL('/api/tags', endpoint), {
      method: 'GET',
      signal: AbortSignal.timeout(2000),
    })
    return res.ok
  } catch {
    return false
  }
}

interface OllamaGenerateResponse {
  response?: string
  error?: string
}

async function generate(prompt: string, options: { num_predict?: number } = {}): Promise<string> {
  const cfg = getLlmConfig()
  if (!cfg.enabled) throw new Error('llm_disabled')

  const res = await fetch(new URL('/api/generate', cfg.endpoint), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model: cfg.model,
      prompt,
      stream: false,
      options: { num_predict: options.num_predict ?? 256 },
    }),
    signal: AbortSignal.timeout(60_000),
  })

  if (!res.ok) {
    throw new Error(`ollama_${res.status}`)
  }
  const data = (await res.json()) as OllamaGenerateResponse
  if (data.error) throw new Error(data.error)
  return (data.response ?? '').trim()
}

export async function summarize(text: string): Promise<string> {
  const trimmed = text.trim()
  if (!trimmed) return ''
  const prompt = [
    'Summarize the following note in 2-3 short sentences.',
    'Be specific. Do not add a preamble like "Here is a summary".',
    '',
    '---',
    trimmed.slice(0, 8000),
    '---',
  ].join('\n')
  return generate(prompt, { num_predict: 200 })
}

export interface RerankItem {
  id: string
  text: string
  score?: number
}

/**
 * Asks the model to rate the relevance of each hit on a 0-10 scale and
 * returns the items sorted by that score (descending). On any parse failure
 * we keep the original order.
 */
export async function rerank(
  query: string,
  items: RerankItem[]
): Promise<RerankItem[]> {
  if (items.length === 0) return items
  const numbered = items
    .map((it, idx) => `[${idx}] ${it.text.slice(0, 400).replace(/\s+/g, ' ')}`)
    .join('\n')

  const prompt = [
    `Query: ${query}`,
    '',
    'For each numbered item below, output one line of the form:',
    'INDEX SCORE',
    'where SCORE is an integer 0-10 reflecting how well it answers the query.',
    'Only output those lines, no other text.',
    '',
    numbered,
  ].join('\n')

  let raw: string
  try {
    raw = await generate(prompt, { num_predict: items.length * 8 })
  } catch {
    return items
  }

  const scores = new Map<number, number>()
  for (const line of raw.split('\n')) {
    const m = line.trim().match(/^(\d+)\s+(\d+(?:\.\d+)?)/)
    if (!m) continue
    const idx = parseInt(m[1], 10)
    const score = parseFloat(m[2])
    if (idx >= 0 && idx < items.length && Number.isFinite(score)) {
      scores.set(idx, score)
    }
  }
  if (scores.size === 0) return items

  return items
    .map((it, idx) => ({ ...it, score: scores.get(idx) ?? 0 }))
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
}
