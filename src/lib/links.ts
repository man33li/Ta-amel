import { extractTextFromTiptap } from '@/lib/utils'
import { setCardLinks } from '@/lib/db/repo'
import type { Card } from '@/types'

// UUID-shaped card ids embedded as [[...]] inside Tiptap content. The brackets
// are intentionally non-conflicting with Markdown link syntax, mirroring the
// Zettelkasten / Obsidian convention.
const LINK_RE = /\[\[([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\]\]/gi

export function extractLinkedCardIds(
  content: Record<string, unknown> | null | undefined
): string[] {
  if (!content) return []
  const text = extractTextFromTiptap(content)
  const ids = new Set<string>()
  // Reset is required because LINK_RE has the global flag.
  LINK_RE.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = LINK_RE.exec(text)) !== null) ids.add(m[1].toLowerCase())
  return Array.from(ids)
}

export function syncCardLinks(card: Card): void {
  const ids = extractLinkedCardIds(card.content)
  setCardLinks(card.id, ids)
}
