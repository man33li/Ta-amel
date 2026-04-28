// @vitest-environment node
import { describe, it, expect, afterEach } from 'vitest'

// Import only the env-var helper — do NOT import `embed` or anything that
// pulls in @xenova/transformers (would download the 25MB ONNX model).
import { isEmbeddingDisabled } from '@/lib/embed/embedder'

afterEach(() => {
  delete process.env.MINDFORGE_EMBEDDINGS_DISABLED
})

describe('isEmbeddingDisabled', () => {
  it('returns true when env var is "1"', () => {
    process.env.MINDFORGE_EMBEDDINGS_DISABLED = '1'
    expect(isEmbeddingDisabled()).toBe(true)
  })

  it('returns false when env var is "0"', () => {
    process.env.MINDFORGE_EMBEDDINGS_DISABLED = '0'
    expect(isEmbeddingDisabled()).toBe(false)
  })

  it('returns false when env var is empty string', () => {
    process.env.MINDFORGE_EMBEDDINGS_DISABLED = ''
    expect(isEmbeddingDisabled()).toBe(false)
  })

  it('returns false when env var is undefined', () => {
    delete process.env.MINDFORGE_EMBEDDINGS_DISABLED
    expect(isEmbeddingDisabled()).toBe(false)
  })
})
