/** Pure helpers for the AI surfaces (inline preview + chat column). */

/** A buffer edit an accepted AI change applies (06: the buffer changes
 *  exactly once, on accept, through the editor's applyChange + save).
 *  Lived in AiPanel until the S06 retirement. */
export type BufferChange =
  | { kind: 'replace-range'; range: { from: number; to: number }; newText: string }
  | { kind: 'append'; newText: string }

/** Built-in quick actions (S08): scaffolding only — free text stays
 *  first-class. Shared by the selection menu and the generated-note
 *  screen since the AiPanel retired (S06). */
export const PRESETS: Array<{ id: string; label: string; instruction: string }> = [
  { id: 'explain', label: 'explain', instruction: 'Explain this simply.' },
  { id: 'summarize', label: 'summarize', instruction: 'Summarize the selection.' },
  { id: 'rewrite', label: 'rewrite', instruction: 'Rewrite this more clearly.' }
]

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
 * The auto-link replacement (S05, owner amendment): after a new-note
 * run is ACCEPTED, the source selection becomes a relative link to
 * the created note — label = the selected text (whitespace
 * collapsed; a multi-line label would break the link), path relative
 * to the source note, angle-bracketed like every vault insertion.
 */
export function selectionLinkReplacement(
  sourceRelPath: string,
  selectedText: string,
  newNoteRelPath: string
): string {
  const label = selectedText.replace(/\s+/g, ' ').trim()
  const fromDir = sourceRelPath.split('/').slice(0, -1)
  const targetParts = newNoteRelPath.split('/')
  let common = 0
  while (
    common < fromDir.length &&
    common < targetParts.length - 1 &&
    fromDir[common] === targetParts[common]
  ) {
    common += 1
  }
  const ups = fromDir.length - common
  const rel = [...Array<string>(ups).fill('..'), ...targetParts.slice(common)].join('/')
  return `[${label}](<${rel}>)`
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
