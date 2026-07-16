/**
 * Pure helpers for the tree context menu (CP-MVP-007 S02). The menu
 * component stays thin; everything decidable without the DOM lives
 * here, testable in node.
 */

/** Menu target: a folder node (''-rooted relPath) + screen position. */
export type TreeMenuTarget = {
  relPath: string
  x: number
  y: number
}

const MAX_NAME = 120

/**
 * Child path for a name typed into the menu. Names are SEGMENTS —
 * one level, no separators, no hidden files; the main-side validator
 * re-checks everything (13: the renderer never gets to be the only
 * gate). Returns null on a name the UI should refuse.
 */
export function childRelPath(
  parentRelPath: string,
  name: string,
  kind: 'note' | 'folder'
): string | null {
  const clean = name.trim()
  if (clean.length === 0 || clean.length > MAX_NAME) return null
  if (/[/\\\0]/.test(clean)) return null
  if (clean.startsWith('.')) return null
  const base = parentRelPath.length > 0 ? `${parentRelPath}/` : ''
  if (kind === 'folder') return `${base}${clean}`
  return `${base}${clean.toLowerCase().endsWith('.md') ? clean : `${clean}.md`}`
}
