// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { __resetDbForTests } from '@/lib/db/sqlite'
import {
  getLlmConfig,
  setLlmConfig,
  pingOllama,
  summarize,
  rerank,
  DEFAULT_ENDPOINT,
  DEFAULT_MODEL,
} from '@/lib/llm/ollama'

describe('LLM bridge', () => {
  beforeEach(() => {
    process.env.MINDFORGE_DB_PATH = ':memory:'
    __resetDbForTests()
  })
  afterEach(() => {
    __resetDbForTests()
    vi.restoreAllMocks()
  })

  it('defaults: disabled, default endpoint and model', () => {
    const cfg = getLlmConfig()
    expect(cfg.enabled).toBe(false)
    expect(cfg.endpoint).toBe(DEFAULT_ENDPOINT)
    expect(cfg.model).toBe(DEFAULT_MODEL)
  })

  it('setLlmConfig persists fields independently', () => {
    setLlmConfig({ enabled: true })
    expect(getLlmConfig().enabled).toBe(true)
    expect(getLlmConfig().endpoint).toBe(DEFAULT_ENDPOINT)
    setLlmConfig({ endpoint: 'http://other:8080', model: 'custom:7b' })
    const cfg = getLlmConfig()
    expect(cfg.endpoint).toBe('http://other:8080')
    expect(cfg.model).toBe('custom:7b')
    expect(cfg.enabled).toBe(true)
  })

  it('pingOllama returns false when fetch rejects', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('connection_refused'))
    expect(await pingOllama('http://localhost:11434')).toBe(false)
  })

  it('pingOllama returns true on 200', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('{"models":[]}', { status: 200 })
    )
    expect(await pingOllama('http://localhost:11434')).toBe(true)
  })

  it('summarize throws when llm is disabled', async () => {
    await expect(summarize('hello')).rejects.toThrow('llm_disabled')
  })

  it('summarize returns the model response when enabled', async () => {
    setLlmConfig({ enabled: true })
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ response: '  This is a summary.  ' }), {
        status: 200,
      })
    )
    const out = await summarize('Long body text here.')
    expect(out).toBe('This is a summary.')
  })

  it('rerank parses INDEX SCORE lines and reorders', async () => {
    setLlmConfig({ enabled: true })
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          response: '0 4\n1 9\n2 7',
        }),
        { status: 200 }
      )
    )
    const items = [
      { id: 'a', text: 'apples are red' },
      { id: 'b', text: 'best match' },
      { id: 'c', text: 'middling' },
    ]
    const out = await rerank('best?', items)
    expect(out.map((it) => it.id)).toEqual(['b', 'c', 'a'])
    expect(out[0].score).toBe(9)
  })

  it('rerank falls back to original order on parse failure', async () => {
    setLlmConfig({ enabled: true })
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ response: 'I do not understand the format.' }), {
        status: 200,
      })
    )
    const items = [
      { id: 'a', text: 'one' },
      { id: 'b', text: 'two' },
    ]
    const out = await rerank('q', items)
    expect(out.map((it) => it.id)).toEqual(['a', 'b'])
  })

  it('rerank passes through empty items list without calling fetch', async () => {
    setLlmConfig({ enabled: true })
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const out = await rerank('q', [])
    expect(out).toEqual([])
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
