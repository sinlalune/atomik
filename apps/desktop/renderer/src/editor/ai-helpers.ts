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

/**
 * New-note path named after the SELECTION (owner directive
 * 2026-07-22): the selected text is the subject, so it names the
 * file — sanitized for the filesystem (separators and fs/link-hostile
 * characters dropped, whitespace collapsed, 60-char cap, no leading
 * dot / trailing dot-space for Windows), placed beside the source
 * note. Empty or unusable selection falls back to the `-ai` default.
 */
export function newNotePathForSelection(
  sourceRelPath: string,
  selectionText: string
): string {
  const name = selectionText
    .replace(/[\\/:*?"<>|#^[\]{}\n\r\t]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60)
    .replace(/^\.+/, '')
    .replace(/[. ]+$/, '')
  if (name.length === 0) return defaultNewNotePath(sourceRelPath)
  const slash = sourceRelPath.lastIndexOf('/')
  const folder = slash === -1 ? '' : sourceRelPath.slice(0, slash + 1)
  return `${folder}${name}.md`
}
