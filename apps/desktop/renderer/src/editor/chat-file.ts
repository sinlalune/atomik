import { parseCitedMeta } from '../../../shared/chat-citations'
import { parsePacketMeta } from '../../../shared/context-packet'
import type { AiThreadTurn, VaultFolder } from '../../../shared/ipc-contract'
import { newNotePathForSelection, type BufferChange } from './ai-helpers'

/**
 * The chats/ convention (CP-MVP-008 S01 pin, owner: files; S07b2
 * amendment, owner: per-date folders): one chat = one markdown note
 * `chats/YYYY-MM-DD/<slug>.md` — the DAY is the folder, the title
 * carries no date — frontmatter `type: Atomik Chat` + engine +
 * timestamp; the file is BORN at the first message (never on panel
 * open), and every turn appends as a `## you` / `## atomik` section
 * through the ordinary write path. Pre-amendment flat files
 * (`chats/YYYY-MM-DD-<slug>.md`) stay readable — the history walk
 * lists both, no rewrite on open. A transcript IS a note — editable,
 * linkable, listed like any other — so this module is pure text
 * shaping over that convention; all IO stays with the existing vault
 * verbs.
 */

export type ChatRole = 'you' | 'atomik'

/** One part of a persisted sent-breakdown (S07b10): kind + label +
 *  exact chars — token figures re-derive (chars/4) at display. */
export type SentPart = { kind: string; label: string; chars: number }

/** Persisted answer metrics (S07b16): what the run reported —
 *  re-displayed after reloads exactly as recorded. */
export type RunMeta = {
  inputTokens?: number
  outputTokens?: number
  basis?: string
  durationMs?: number
  costUsd?: number
}

export type ChatTurn = {
  role: ChatRole
  text: string
  /** S07b10: the you-turn's persisted request breakdown, when the
   *  answering write recorded one. */
  sent?: SentPart[]
  /** S07b16: the atomik-turn's persisted run metrics. */
  run?: RunMeta
  /** CP-MVP-010 S08: the answer's citation map (number → note path),
   *  so a reopened conversation still resolves its markers. */
  cited?: { number: number; path: string }[]
  /** CP-MVP-010 S08d: the you-turn's packet, stage by stage — enough to
   *  reopen "what the vault contributed" after the tab was closed. The
   *  excerpts stay session-only: figures persist, prompts never do. */
  packet?: { stage: string; path: string }[]
  /** CP-MVP-011 S07g: the answer's agent trace, as a vault path. The
   *  transcript keeps the LINK; the record itself lives in its own note. */
  trace?: string
  /** CP-MVP-011 S07j: this QUESTION got no answer — the run failed or was
   *  cancelled. The value is the trace that says what happened. */
  unanswered?: string
}

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

/** `chats/YYYY-MM-DD/<slug>.md` (S07b2: the day is the FOLDER, the
 *  title stays date-free); attempt > 1 suffixes `-2`, `-3`, … —
 *  createNote is exclusive, so collisions retry instead of
 *  clobbering; parents are made by the verb. */
export function chatRelPath(
  date: Date,
  firstMessage: string,
  attempt = 1
): string {
  const day = date.toISOString().slice(0, 10)
  const suffix = attempt > 1 ? `-${attempt}` : ''
  return `${CHATS_FOLDER}/${day}/${chatSlug(firstMessage)}${suffix}.md`
}

/**
 * The trace folder for one transcript (S07g, the owner's shape: *a separate
 * folder linked from the chat note*). It sits BESIDE the transcript, named
 * after it — `chats/<day>/<slug>-traces/` — so the pairing survives being
 * read in a file manager, and so `chatHistoryOf` (which walks `chats/` and
 * its day folders, one level each) never mistakes a trace for a chat.
 */
export function chatTraceFolder(chatRelPath: string): string {
  return chatRelPath.replace(/\.md$/i, '-traces')
}

/** One note per ANSWER turn — `turn-03.md`, zero-padded so the folder sorts
 *  the way the conversation ran; `attempt > 1` suffixes, as chat paths do. */
export function chatTracePath(
  chatRelPath: string,
  turnIndex: number,
  attempt = 1
): string {
  const suffix = attempt > 1 ? `-${attempt}` : ''
  const index = String(Math.max(0, Math.trunc(turnIndex))).padStart(2, '0')
  return `${chatTraceFolder(chatRelPath)}/turn-${index}${suffix}.md`
}

/**
 * The link to a turn's agent trace, as a WIKILINK (S07h, owner: *"in chat log
 * we mention the path of the trace but maybe wikilink better?"*). A bare path
 * is a string; `[[path]]` is an EDGE — `parseEdges` skips fenced blocks and
 * code spans but not HTML comments, so the trace becomes a node the graph can
 * reach while staying invisible in the rendered transcript. Invisible matters
 * twice: a visible link line would also travel back to the model as history.
 */
export function serializeTraceMeta(relPath: string): string {
  return `[[${relPath.replace(/\.md$/i, '')}]]`
}

/** Lenient inverse, accepting the S07g bare path too — transcripts written
 *  before the wikilink still resolve. A path that could close the comment or
 *  smuggle a newline reads as absent, exactly like a mangled `sent:`. */
export function parseTraceMeta(raw: string): string | null {
  const trimmed = raw.trim()
  const wiki = /^\[\[(.+?)\]\]$/.exec(trimmed)
  const path = wiki ? wiki[1]!.trim() : trimmed
  if (path.length === 0 || path.length > 400) return null
  // Only the WIKILINK form may omit the extension — that is its convention.
  // A bare path is taken literally, so `x.txt` stays wrong instead of
  // becoming `x.txt.md`.
  const withMd = wiki && !/\.md$/i.test(path) ? `${path}.md` : path
  return /^[^\s<>|"[\]]+\.md$/i.test(withMd) ? withMd : null
}

const turnSection = (
  role: ChatRole,
  text: string,
  comments?: string | readonly (string | null | undefined)[]
): string => {
  const list = (typeof comments === 'string' ? [comments] : (comments ?? []))
    .filter((comment): comment is string => Boolean(comment))
    .map((comment) => ` <!-- ${comment} -->`)
    .join('')
  return `## ${role}${list}\n\n${text.replace(/\s+$/, '')}\n`
}

/**
 * Run-metrics persistence (S07b16, owner: "token counters on response
 * messages don't persist"): the answer's measured figures ride ITS
 * heading the way the sent breakdown rides the you-turn's — same
 * comment idiom, figures only.
 */
export function serializeRunMeta(meta: RunMeta): string | null {
  const pieces = [
    ...(meta.inputTokens !== undefined ? [`in=${meta.inputTokens}`] : []),
    ...(meta.outputTokens !== undefined ? [`out=${meta.outputTokens}`] : []),
    ...(meta.basis ? [`basis=${meta.basis.replace(/[|=\s]/g, '')}`] : []),
    ...(meta.durationMs !== undefined
      ? [`ms=${Math.round(meta.durationMs)}`]
      : []),
    ...(meta.costUsd !== undefined ? [`usd=${meta.costUsd.toFixed(6)}`] : [])
  ]
  return pieces.length > 0 ? pieces.join('|') : null
}

/** Lenient inverse — unknown keys skip, garbage reads as no meta. */
export function parseRunMeta(raw: string): RunMeta | null {
  const meta: RunMeta = {}
  for (const piece of raw.split('|')) {
    const match = /^\s*([a-z]+)=([\d.]+|[a-z-]+)\s*$/.exec(piece)
    if (!match) return null
    const value = match[2]!
    if (match[1] === 'in') meta.inputTokens = Number(value)
    else if (match[1] === 'out') meta.outputTokens = Number(value)
    else if (match[1] === 'basis') meta.basis = value
    else if (match[1] === 'ms') meta.durationMs = Number(value)
    else if (match[1] === 'usd') meta.costUsd = Number(value)
  }
  return Object.keys(meta).length > 0 ? meta : null
}

/**
 * Sent-breakdown persistence (S07b10, owner: "the token count split
 * pills in my message don't survive tab switch or app reload"): the
 * breakdown rides the TRANSCRIPT FILE as an HTML comment on the
 * you-turn heading — invisible in rendered markdown, visible and
 * hand-editable in source, diff-friendly, no hidden store. Only
 * derived FIGURES persist (kind/label/chars), never request text.
 */
const sanitizeMetaLabel = (label: string): string =>
  label.replace(/[|=:\n\r]/g, '/').trim()

export function serializeSentMeta(
  parts: ReadonlyArray<{ kind: string; label: string; chars: number }>
): string {
  return parts
    .map((part) =>
      part.label === part.kind
        ? `${part.kind}=${part.chars}`
        : `${part.kind}=${part.chars}:${sanitizeMetaLabel(part.label)}`
    )
    .join('|')
}

/** Lenient inverse — a hand-mangled comment reads as no meta. */
export function parseSentMeta(raw: string): SentPart[] | null {
  const parts: SentPart[] = []
  for (const piece of raw.split('|')) {
    const match = /^\s*([a-z-]+)=(\d+)(?::(.*))?\s*$/.exec(piece)
    if (!match) return null
    parts.push({
      kind: match[1]!,
      label: match[3]?.trim() || match[1]!,
      chars: Number(match[2])
    })
  }
  return parts.length > 0 ? parts : null
}

/** Sets (or replaces) the sent comment on the LAST `## you` heading —
 *  called by the ANSWER's write, so one write persists both. */
export function withSentMetaOnLastYou(
  content: string,
  meta: string | null,
  extra?: readonly (string | null | undefined)[]
): string {
  const headings = [...content.matchAll(/^##[ \t]+you[ \t]*(?:<!--.*?-->)*[ \t]*$/gm)]
  const last = headings.at(-1)
  if (!last) return content
  const start = last.index
  // S08d: a you-heading may carry its packet beside its breakdown, so
  // the vault pill still opens after the tab is closed and reopened.
  // S07j: a FAILED run stamps the you-turn with `unanswered:` and may have no
  // breakdown to record, so the sent meta became optional.
  const comments = [meta === null ? null : `sent: ${meta}`, ...(extra ?? [])]
    .filter((comment): comment is string => Boolean(comment))
    .map((comment) => ` <!-- ${comment} -->`)
    .join('')
  return (
    content.slice(0, start) + `## you${comments}` + content.slice(start + last[0].length)
  )
}

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
  text: string,
  comments?: string | readonly (string | null | undefined)[]
): string {
  return `${content.replace(/\s+$/, '')}\n\n${turnSection(role, text, comments)}`
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
  let current: {
    role: ChatRole
    lines: string[]
    sent?: SentPart[]
    run?: RunMeta
    cited?: { number: number; path: string }[]
    packet?: { stage: string; path: string }[]
    trace?: string
    unanswered?: string
  } | null = null
  const flush = (): void => {
    if (!current) return
    const text = current.lines.join('\n').trim()
    if (text.length > 0)
      turns.push({
        role: current.role,
        text,
        ...(current.sent ? { sent: current.sent } : {}),
        ...(current.run ? { run: current.run } : {}),
        ...(current.cited ? { cited: current.cited } : {}),
        ...(current.packet ? { packet: current.packet } : {}),
        ...(current.trace ? { trace: current.trace } : {}),
        ...(current.unanswered ? { unanswered: current.unanswered } : {})
      })
    current = null
  }
  for (const line of body.split(/\r?\n/)) {
    // S07b10: a heading may carry a comment — `sent:` comments parse
    // into the turn's persisted breakdown, unknown ones are ignored;
    // either way the line still STARTS a turn.
    // S08: a heading may carry SEVERAL comments — an answer records
    // both its metrics and its citation map — so they are read as a
    // list rather than as one slot.
    const heading = /^##\s+(you|atomik)\s*((?:<!--.*?-->\s*)*)$/.exec(line)
    if (heading) {
      flush()
      const comments = [...(heading[2] ?? '').matchAll(/<!--\s*(.*?)\s*-->/g)].map(
        (match) => match[1] as string
      )
      const commentWith = (prefix: string): string | null => {
        const found = comments.find((comment) => comment.startsWith(prefix))
        return found === undefined ? null : found.slice(prefix.length)
      }
      const sentRaw = commentWith('sent:')
      const runRaw = commentWith('run:')
      const citedRaw = commentWith('cited:')
      const packetRaw = commentWith('packet:')
      const traceRaw = commentWith('trace:')
      const unansweredRaw = commentWith('unanswered:')
      const sent = sentRaw === null ? null : parseSentMeta(sentRaw)
      const run = runRaw === null ? null : parseRunMeta(runRaw)
      const cited = citedRaw === null ? null : parseCitedMeta(citedRaw)
      const packet = packetRaw === null ? null : parsePacketMeta(packetRaw)
      const trace = traceRaw === null ? null : parseTraceMeta(traceRaw)
      const unanswered =
        unansweredRaw === null ? null : parseTraceMeta(unansweredRaw)
      current = {
        role: heading[1] as ChatRole,
        lines: [],
        ...(sent ? { sent } : {}),
        ...(run ? { run } : {}),
        ...(cited ? { cited } : {}),
        ...(packet ? { packet } : {}),
        ...(trace ? { trace } : {}),
        ...(unanswered ? { unanswered } : {})
      }
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
 * Past chats for the history menu (S06b; S07b2 per-date folders):
 * transcripts live in `chats/<YYYY-MM-DD>/` day folders — and, from
 * before the amendment, flat in `chats/` with the date as a name
 * prefix. Both list, newest first: the sort key is `<day>-<name>`
 * either way (a flat file's name IS that key), so the two eras
 * interleave chronologically. Convention files (index/log) are the
 * folders', not transcripts.
 */
export function chatHistoryOf(
  tree: VaultFolder
): Array<{ name: string; relPath: string }> {
  const folder = tree.folders.find(
    (candidate) => candidate.relPath === CHATS_FOLDER
  )
  if (!folder) return []
  const transcriptsOf = (
    host: VaultFolder
  ): Array<{ name: string; relPath: string }> =>
    host.notes
      .filter((note) => !CHATS_CONVENTION_FILES.has(note.name))
      .map((note) => ({
        name: note.name.replace(/\.md$/i, ''),
        relPath: note.relPath
      }))
  const keyed = [
    ...transcriptsOf(folder).map((entry) => ({ entry, key: entry.name })),
    ...folder.folders.flatMap((day) =>
      transcriptsOf(day).map((entry) => ({
        entry,
        key: `${day.name}-${entry.name}`
      }))
    )
  ]
  return keyed
    .sort((a, b) => b.key.localeCompare(a.key))
    .map(({ entry }) => entry)
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
