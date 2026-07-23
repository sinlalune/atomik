import type { AiThreadTurn, VaultFolder } from '../../../shared/ipc-contract'
import { newNotePathForSelection, type BufferChange } from './ai-helpers'

/**
 * The chats/ convention (CP-MVP-008 S01 pin, owner: files): one chat =
 * one markdown note `chats/YYYY-MM-DD-<slug>.md`, frontmatter
 * `type: Atomik Chat` + engine + timestamp; the file is BORN at the
 * first message (never on panel open), and every turn appends as a
 * `## you` / `## atomik` section through the ordinary write path. A
 * transcript IS a note — editable, linkable, listed like any other —
 * so this module is pure text shaping over that convention; all IO
 * stays with the existing vault verbs.
 */

export type ChatRole = 'you' | 'atomik'

export type ChatTurn = { role: ChatRole; text: string }

export const CHATS_FOLDER = 'chats'

/** Renderer-side mirrors of the main validation caps (ai-mock S06):
 *  the thread we SEND already fits what main will accept. */
export const CHAT_THREAD_MAX_TURNS = 24
export const CHAT_THREAD_MAX_TURN_CHARS = 8000

/** Markdown links collapse to their label before naming anything —
 *  an @-quoted message must not carry `(<path.md>)` into a name. */
const stripLinks = (text: string): string =>
  text.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')

/** File-name slug from the first message (the subject names the chat,
 *  the S05 selection-names-the-note precedent): fs/link-hostile
 *  characters dropped, lowercased, dashed, capped. */
export function chatSlug(firstMessage: string): string {
  const slug = stripLinks(firstMessage)
    .replace(/[\\/:*?"<>|#^[\]{}()\n\r\t.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .slice(0, 40)
    .trim()
    .replace(/ /g, '-')
  return slug.length > 0 ? slug : 'chat'
}

/** `chats/YYYY-MM-DD-<slug>.md`; attempt > 1 suffixes `-2`, `-3`, … —
 *  createNote is exclusive, so collisions retry instead of clobbering. */
export function chatRelPath(
  date: Date,
  firstMessage: string,
  attempt = 1
): string {
  const day = date.toISOString().slice(0, 10)
  const suffix = attempt > 1 ? `-${attempt}` : ''
  return `${CHATS_FOLDER}/${day}-${chatSlug(firstMessage)}${suffix}.md`
}

const turnSection = (role: ChatRole, text: string): string =>
  `## ${role}\n\n${text.replace(/\s+$/, '')}\n`

/** The transcript at birth: frontmatter + the first `## you` turn. */
export function newChatFileContent(
  engine: string,
  timestamp: Date,
  firstUserText: string
): string {
  return [
    '---',
    'type: Atomik Chat',
    `engine: ${engine}`,
    `timestamp: ${timestamp.toISOString()}`,
    '---',
    '',
    turnSection('you', firstUserText)
  ].join('\n')
}

/** Appends one turn section through plain text — the caller writes the
 *  result with the ordinary note verbs (mtime handshake included). */
export function appendChatTurn(
  content: string,
  role: ChatRole,
  text: string
): string {
  return `${content.replace(/\s+$/, '')}\n\n${turnSection(role, text)}`
}

/**
 * Turns from a transcript's markdown. Lenient by design — the file is
 * an editable note: frontmatter and any preamble before the first turn
 * heading are ignored, unknown headings stay inside the current turn,
 * and hand-edited spacing survives. Only exact `## you` / `## atomik`
 * lines start a turn.
 */
export function parseChatTurns(content: string): ChatTurn[] {
  let body = content
  const fence = /^---\r?\n[\s\S]*?\r?\n---\r?\n?/.exec(content)
  if (fence) body = content.slice(fence[0].length)
  const turns: ChatTurn[] = []
  let current: { role: ChatRole; lines: string[] } | null = null
  const flush = (): void => {
    if (!current) return
    const text = current.lines.join('\n').trim()
    if (text.length > 0) turns.push({ role: current.role, text })
    current = null
  }
  for (const line of body.split(/\r?\n/)) {
    const heading = /^##\s+(you|atomik)\s*$/.exec(line)
    if (heading) {
      flush()
      current = { role: heading[1] as ChatRole, lines: [] }
    } else if (current) {
      current.lines.push(line)
    }
  }
  flush()
  return turns
}

/** The operation's thread (S06): file roles map to wire roles, capped
 *  to what main validates — most recent turns win when over budget. */
export function threadFromTurns(turns: ChatTurn[]): AiThreadTurn[] {
  return turns.slice(-CHAT_THREAD_MAX_TURNS).map((turn) => ({
    role: turn.role === 'you' ? ('user' as const) : ('assistant' as const),
    content: turn.text.slice(0, CHAT_THREAD_MAX_TURN_CHARS)
  }))
}

/**
 * Rename target for a transcript (S06c3: double-click the chat tab):
 * the typed name, filesystem-sanitized, lands BESIDE the current file
 * (a rename, not a move); null when the draft is empty, unusable, or
 * a no-op — the caller then leaves the file alone.
 */
export function chatRenameTarget(
  currentRelPath: string,
  draft: string
): string | null {
  const name = draft
    .replace(/\.md$/i, '')
    .replace(/[\\/:*?"<>|#^[\]{}\n\r\t]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80)
    .replace(/^\.+/, '')
    .replace(/[. ]+$/, '')
  if (name.length === 0) return null
  const slash = currentRelPath.lastIndexOf('/')
  const folder = slash === -1 ? '' : currentRelPath.slice(0, slash + 1)
  const target = `${folder}${name}.md`
  return target === currentRelPath ? null : target
}

/** Folder-convention files that are not transcripts. */
const CHATS_CONVENTION_FILES = new Set(['index.md', 'log.md'])

/**
 * Past chats for the history menu (S06b): the vault-root chats/
 * folder's notes, newest first — the YYYY-MM-DD name prefix makes
 * reverse name order chronological. Convention files (index/log)
 * are the folder's, not transcripts.
 */
export function chatHistoryOf(
  tree: VaultFolder
): Array<{ name: string; relPath: string }> {
  const folder = tree.folders.find(
    (candidate) => candidate.relPath === CHATS_FOLDER
  )
  if (!folder) return []
  return folder.notes
    .filter((note) => !CHATS_CONVENTION_FILES.has(note.name))
    .map((note) => ({
      name: note.name.replace(/\.md$/i, ''),
      relPath: note.relPath
    }))
    .sort((a, b) => b.name.localeCompare(a.name))
}

/**
 * Note path for a chat answer promoted to its OWN note (S06b): the
 * answer's first heading is its subject and names the file (the
 * selection-names-the-note precedent); no heading falls back to the
 * first words of the prose. Placed beside the source note through the
 * same sanitizer the context-menu flow uses.
 */
export function chatNotePathForMessage(
  sourceRelPath: string,
  message: string
): string {
  const heading = /^#{1,6}[ \t]+(.+?)[ \t]*$/m.exec(message)?.[1]
  const firstWords = stripLinks(message)
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#>*_`[\]()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .slice(0, 8)
    .join(' ')
  return newNotePathForSelection(sourceRelPath, heading ?? firstWords)
}

/**
 * The insert-into-note change (S06: a chat answer lands through the
 * SAME buffer path as any accepted patch): a replace-range at the
 * cursor, padded so the insertion reads as its own block — exactly
 * one blank line from what precedes and follows it.
 */
export function insertionChange(
  doc: string,
  at: number,
  text: string
): BufferChange {
  const position = Math.max(0, Math.min(at, doc.length))
  const before = doc.slice(0, position)
  const after = doc.slice(position)
  const body = text.replace(/^\s+/, '').replace(/\s+$/, '')
  const prefix =
    before.length === 0 || /\n\s*\n$/.test(before)
      ? ''
      : before.endsWith('\n')
        ? '\n'
        : '\n\n'
  const suffix =
    after.length === 0 || /^\s*\n/.test(after) ? '\n' : '\n\n'
  return {
    kind: 'replace-range',
    range: { from: position, to: position },
    newText: `${prefix}${body}${suffix}`
  }
}
