/**
 * Local sentence embedder via @xenova/transformers (transformers.js).
 *
 * Runs Xenova/all-MiniLM-L6-v2 in-process: ~25MB ONNX, 384-dim output.
 * The first call downloads the model and warms ONNX runtime; subsequent
 * calls are sub-100ms on a typical laptop. Set MINDFORGE_EMBEDDINGS_DISABLED=1
 * to skip embeddings entirely (palace search degrades to keyword + recent).
 */

import type { FeatureExtractionPipeline } from '@xenova/transformers'

const MODEL = 'Xenova/all-MiniLM-L6-v2'
export const EMBEDDING_DIM = 384

let extractor: FeatureExtractionPipeline | null = null
let loading: Promise<FeatureExtractionPipeline> | null = null

export function isEmbeddingDisabled(): boolean {
  return process.env.MINDFORGE_EMBEDDINGS_DISABLED === '1'
}

async function getExtractor(): Promise<FeatureExtractionPipeline> {
  if (extractor) return extractor
  if (!loading) {
    loading = (async () => {
      const { pipeline } = await import('@xenova/transformers')
      const ext = (await pipeline('feature-extraction', MODEL)) as
        unknown as FeatureExtractionPipeline
      extractor = ext
      return ext
    })()
  }
  return loading
}

export async function embed(text: string): Promise<Float32Array | null> {
  if (isEmbeddingDisabled() || !text.trim()) return null

  const ext = await getExtractor()
  const output = await ext(text, { pooling: 'mean', normalize: true })
  return new Float32Array((output as { data: Float32Array }).data)
}

// Tests only.
export function __resetEmbedderForTests() {
  extractor = null
  loading = null
}
