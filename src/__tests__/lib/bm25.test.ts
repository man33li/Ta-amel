import { describe, it, expect } from 'vitest'
import { tokenize, computeStats, scoreDoc, bm25Search } from '@/lib/memory/bm25'

describe('tokenize', () => {
  it('lowercases and splits on punctuation', () => {
    expect(tokenize('Hello, World! Foo-bar baz.')).toEqual([
      'hello', 'world', 'foo-bar', 'baz',
    ])
  })

  it('drops stop words and 1-character tokens', () => {
    expect(tokenize('the quick a b cd')).toEqual(['quick', 'cd'])
  })

  it('handles empty / null-ish input', () => {
    expect(tokenize('')).toEqual([])
    expect(tokenize('   ')).toEqual([])
  })

  it('keeps alphanumerics and hyphens/apostrophes inside tokens', () => {
    expect(tokenize("don't worry — covid-19")).toContain("don't")
    expect(tokenize("don't worry — covid-19")).toContain('covid-19')
  })
})

describe('BM25 scoring', () => {
  const docs = [
    { id: '1', text: 'The cat sat on the mat' },
    { id: '2', text: 'Dogs love balls and parks' },
    { id: '3', text: 'A cat watched a dog from the window' },
  ]
  const toText = (d: { text: string }) => d.text

  it('ranks an exact-content match above a partial match', () => {
    const hits = bm25Search(docs, toText, 'cat mat', 10)
    expect(hits[0].doc.id).toBe('1')
  })

  it('returns no hits for a query with only stop words', () => {
    expect(bm25Search(docs, toText, 'the a of', 10)).toEqual([])
  })

  it('ignores query terms not present in any doc', () => {
    const hits = bm25Search(docs, toText, 'cat zebra', 10)
    // doc 1 and doc 3 both contain "cat"; doc 2 contains neither.
    expect(hits.length).toBe(2)
    expect(new Set(hits.map((h) => h.doc.id))).toEqual(new Set(['1', '3']))
  })

  it('scores higher when a term is rarer in the corpus (IDF effect)', () => {
    // "cat" appears in 2/3 docs; "balls" in 1/3 — same TF should give
    // "balls" a higher score per occurrence.
    const corpus = [
      { id: 'a', text: 'cat cat cat' },
      { id: 'b', text: 'balls' },
      { id: 'c', text: 'cat dogs' },
    ]
    const stats = computeStats(corpus.map((d) => ({ id: d.id, tokens: ['cat'] }))) // dummy
    // Use the real flow:
    const hitsCat = bm25Search(corpus, toText, 'cat', 10)
    const hitsBalls = bm25Search(corpus, toText, 'balls', 10)
    expect(hitsBalls[0].score).toBeGreaterThan(hitsCat[0].score)
    void stats
  })

  it('respects the limit', () => {
    const many = Array.from({ length: 20 }, (_, i) => ({
      id: String(i),
      text: 'cat dog tree',
    }))
    expect(bm25Search(many, toText, 'cat', 5)).toHaveLength(5)
  })

  it('handles empty corpus', () => {
    expect(bm25Search<{ id: string; text: string }>([], toText, 'cat', 5)).toEqual([])
  })
})

describe('scoreDoc edge cases', () => {
  it('returns 0 when corpus is empty', () => {
    const stats = computeStats([])
    expect(scoreDoc({ id: '1', tokens: ['cat'] }, ['cat'], stats)).toBe(0)
  })
  it('returns 0 when doc has no tokens', () => {
    const stats = computeStats([{ id: '1', tokens: ['cat'] }])
    expect(scoreDoc({ id: '2', tokens: [] }, ['cat'], stats)).toBe(0)
  })
})
