/** Pure helpers for the AI panel. */

/**
 * Default path for an AI-created note: beside the source note, named
 * after it. Shown prefilled in the input so the destination is always
 * visible before accepting (vault-root-relative, WYSIWYG).
 */
export function defaultNewNotePath(sourceRelPath: string): string {
  const slash = sourceRelPath.lastIndexOf('/')
  const folder = slash === -1 ? '' : sourceRelPath.slice(0, slash + 1)
  const base = sourceRelPath.slice(slash + 1).replace(/\.md$/i, '')
  return `${folder}${base}-ai.md`
}

/** Ensures a typed note path ends in .md (case-insensitive). */
export function ensureMdExtension(path: string): string {
  return path.toLowerCase().endsWith('.md') ? path : `${path}.md`
}
