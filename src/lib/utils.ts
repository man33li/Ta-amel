// Utility functions for MindForge

/**
 * Combines class names, filtering out falsy values
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}

/**
 * Walk a Tiptap doc and return concatenated plain text.
 */
export function extractTextFromTiptap(
  content: Record<string, unknown> | null | undefined,
  maxLength = 4000
): string {
  if (!content || typeof content !== 'object') return ''

  const parts: string[] = []
  const walk = (node: unknown) => {
    if (!node || typeof node !== 'object') return
    const n = node as Record<string, unknown>
    if (n.type === 'text' && typeof n.text === 'string') {
      parts.push(n.text)
      return
    }
    if (Array.isArray(n.content)) n.content.forEach(walk)
  }
  walk(content)

  return parts.join(' ').replace(/\s+/g, ' ').trim().slice(0, maxLength)
}
