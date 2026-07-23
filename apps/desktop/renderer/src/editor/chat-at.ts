import { relativePathBetween, type NoteLink, type SourceBundle } from './quick-actions'
import { insertDirectiveAt, type PromptFile } from './prompts'

/**
 * The chat input's `@` quick actions (CP-MVP-008 S06b, owner: "use @
 * quick actions (source, notes, prompts) to quote inside the chat").
 * Pure item building + pick application over the SAME providers the
 * editor's @ menu uses. Quoting costs nothing new downstream: a
 * picked note/source lands as a markdown LINK in the message, and the
 * run pipeline (S04o extractNoteLinks) already turns instruction
 * links into quoted linked-note selections; a picked message prompt
 * lands as its layer directive, expanded at run time (S03d).
 */

export type ChatAtItem = {
  kind: 'prompt' | 'note' | 'source'
  /** Human handle shown in the row. */
  title: string
  /** Vault-relative path of what gets referenced. */
  relPath: string
  /** Layer name (prompts only) — what the directive references. */
  name?: string
}

const CHAT_AT_CAP = 10

/** Providers → one filtered row list: prompts first (they change the
 *  ask), then notes (proximity-ordered by the caller), then sources. */
export function chatAtItems(
  prompts: PromptFile[],
  notes: NoteLink[],
  sources: SourceBundle[],
  query: string,
  cap = CHAT_AT_CAP
): ChatAtItem[] {
  const needle = query.trim().toLowerCase()
  const matches = (title: string): boolean =>
    needle.length === 0 || title.toLowerCase().includes(needle)
  const items: ChatAtItem[] = [
    ...prompts
      .filter((prompt) => prompt.kind === 'message')
      .filter((prompt) => matches(prompt.name) || matches(prompt.title))
      .map(
        (prompt): ChatAtItem => ({
          kind: 'prompt',
          title: prompt.title,
          relPath: prompt.relPath,
          name: prompt.name
        })
      ),
    ...notes
      .filter((note) => matches(note.name))
      .map(
        (note): ChatAtItem => ({
          kind: 'note',
          title: note.name,
          relPath: note.relPath
        })
      ),
    ...sources
      .filter((source) => matches(source.name))
      .map(
        (source): ChatAtItem => ({
          kind: 'source',
          title: source.name,
          relPath: source.dossierPath
        })
      )
  ]
  return items.slice(0, cap)
}

/**
 * Applies a pick to the input: the `@token` is consumed either by the
 * prompt's LAYER DIRECTIVE (full-line rule preserved) or by a
 * markdown link — written relative to the pane's note when one is
 * open (the run resolves it from the note outward), vault-relative
 * otherwise (the resolver's root fallback).
 */
export function applyChatAtPick(
  value: string,
  tokenStart: number,
  caret: number,
  item: ChatAtItem,
  notePath: string | null
): { text: string; caret: number } {
  if (item.kind === 'prompt') {
    const name = item.name ?? item.relPath.split('/').pop()!.replace(/\.md$/i, '')
    return insertDirectiveAt(value, tokenStart, caret, name)
  }
  const target = notePath
    ? relativePathBetween(notePath, item.relPath)
    : item.relPath
  const after = value.slice(caret)
  // a space follows the link unless one is already there
  const link = `[${item.title}](<${target}>)${/^\s/.test(after) ? '' : ' '}`
  const text = value.slice(0, tokenStart) + link + after
  return { text, caret: tokenStart + link.length }
}
