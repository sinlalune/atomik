/**
 * Citations (CP-MVP-010 S08) — the link from a sentence back to the note
 * it stood on.
 *
 * A grounded answer that cannot be traced is worse than an ungrounded
 * one: it borrows the authority of the vault without offering the way to
 * check it. So the model is given a NUMBERED list of the notes it may
 * cite, and the numbers it emits are turned back into real links here.
 *
 * Two forms are supported, because a model will produce both:
 *
 * ```text
 * [1]                     a numbered marker  -> the nth source
 * [text](<notes/x.md>)    a phrase-level link -> already a link
 * ```
 *
 * The markdown is NOT rewritten (owner bench round 6: "the idea that
 * you should use md citation format for it is a bad assumption, it
 * should be format normally but with a different render"). The answer
 * keeps the text the model wrote; the renderer decorates the markers
 * afterwards, the same way claim marks are applied. A citation is not a
 * link that happens to be short — it is its own kind of thing, and
 * borrowing the link pill made it read as neither.
 *
 * PURE: this module finds markers and maps numbers to sources; the DOM
 * work lives in the renderer beside the other decorators.
 */

export type CitationSource = {
  /** 1-based, the number the model was told to use. */
  number: number
  /** Vault relative path, or the canonical URL when `external` is set. */
  path: string
  title: string
  /** S07e: an external source cites through the SAME numbering and the same
   *  renderer — it is another source kind, not a second citation system.
   *  Before this the model invented its own convention (a blockquote and an
   *  em-dash attribution), which is exactly what the numbered contract exists
   *  to replace. */
  external?: { url: string; project: string; language: string }
}

/** The notes an answer was allowed to cite, in the order they were sent. */
export function citationSourcesOf(
  references: readonly { path: string; title: string }[]
): CitationSource[] {
  return references.map((reference, index) => ({
    number: index + 1,
    path: reference.path,
    title: reference.title
  }))
}

/** `1=notes/a.md|2=notes/b.md` — the transcript keeps its own citation
 *  map, so a reopened conversation still resolves its markers (the same
 *  comment idiom as the sent/run meta). */
export function serializeCitedMeta(sources: readonly CitationSource[]): string | null {
  if (sources.length === 0) return null
  return sources
    .map((source) => `${source.number}=${source.path.replace(/[|<>]/g, '')}`)
    .join('|')
}

export function parseCitedMeta(raw: string): { number: number; path: string }[] | null {
  const parsed: { number: number; path: string }[] = []
  for (const piece of raw.split('|')) {
    const match = /^\s*(\d+)=(.+?)\s*$/.exec(piece)
    if (!match) return null
    parsed.push({ number: Number(match[1]), path: match[2] as string })
  }
  return parsed.length > 0 ? parsed : null
}

/** A marker outside code: `[1]`, `[1,2]`, `[1, 2]`. Reference-style
 *  markdown links (`[text][1]`) and images are deliberately not matched. */
const MARKER_RE = /(?<![\]\w!])\[(\d+(?:\s*,\s*\d+)*)\](?!\()/g

export type CitationMarker = {
  /** Offsets in the text the marker was found in. */
  from: number
  to: number
  numbers: number[]
}

export type AnswerCitations = {
  markers: CitationMarker[]
  /** Numbers the model invented — no such source was ever sent. They
   *  stay visible as a diagnostic; a citation that silently vanished
   *  would be worse than one that admits it is broken. */
  unresolved: number[]
  /** Sources actually cited, for the answer's sources block. */
  cited: CitationSource[]
}

/**
 * Every citation marker in one plain-text run, with what it resolves to.
 * The caller decorates; nothing here rewrites the answer.
 */
export function findCitationMarkers(
  text: string,
  sources: readonly CitationSource[]
): AnswerCitations {
  const byNumber = new Map(sources.map((source) => [source.number, source]))
  const unresolved = new Set<number>()
  const cited = new Map<number, CitationSource>()
  const markers: CitationMarker[] = []

  for (const match of text.matchAll(MARKER_RE)) {
    const numbers = (match[1] as string).split(',').map((piece) => Number(piece.trim()))
    for (const number of numbers) {
      const source = byNumber.get(number)
      if (source) cited.set(number, source)
      else unresolved.add(number)
    }
    markers.push({
      from: match.index ?? 0,
      to: (match.index ?? 0) + match[0].length,
      numbers
    })
  }

  return {
    markers,
    unresolved: [...unresolved].sort((a, b) => a - b),
    cited: [...cited.values()].sort((a, b) => a.number - b.number)
  }
}

export type CitationSentenceRange = {
  /** Inclusive offset in the rendered block text. */
  from: number
  /** Exclusive offset in the rendered block text. */
  to: number
}

/**
 * The complete sentence a marker cites, including its terminal
 * punctuation (CP-MVP-010 S10g/S10i).
 *
 * This is deliberately BLOCK-local: the DOM half supplies one paragraph,
 * list item, quote, table cell or heading at a time, so an uncertain
 * punctuation decision can never make a citation swallow another block.
 * The marker is treated as transparent — both `sentence. [1]` and
 * `sentence [1].` return the same textual unit.
 *
 * S10i replaces the old "any dot is a stop" rule. That rule turned the
 * first Real Madrid citation in the owner's bench into the single word
 * `million`, because the decimal point in `€77.5` was mistaken for the
 * previous sentence boundary. Periods inside decimals, dotted initials,
 * abbreviations and other uninterrupted tokens are protected here.
 */
const TERMINAL = new Set(['.', '!', '?', '…'])
const QUOTE_OPEN = new Set(['«', '“'])
const QUOTE_CLOSE = new Set(['»', '"', '”', '’', "'", ')', ']'])
const OPENING = new Set([' ', '\t', '\n', '\r', '«', '"', '“', '‘', "'", '(', '['])
const ABBREVIATIONS = new Set([
  'av',
  'dr',
  'dre',
  'env',
  'etc',
  'fig',
  'm',
  'mlle',
  'mme',
  'mr',
  'mrs',
  'ms',
  'no',
  'p',
  'pp',
  'prof',
  'st',
  'vs'
])

const isSpace = (char: string | undefined): boolean => char !== undefined && /\s/u.test(char)
const isDigit = (char: string | undefined): boolean => char !== undefined && /\p{N}/u.test(char)
const isTokenChar = (char: string | undefined): boolean =>
  char !== undefined && /[\p{L}\p{N}.-]/u.test(char)

function tokenEndingAt(text: string, period: number): string {
  let start = period
  while (start > 0 && isTokenChar(text[start - 1])) start -= 1
  return text.slice(start, period).toLocaleLowerCase()
}

function protectedPeriod(text: string, index: number): boolean {
  const before = text[index - 1]
  const after = text[index + 1]

  // Decimal/version points and dots inside an uninterrupted token are
  // never sentence stops (`77.5`, `example.org`, the first dot of J.-C.).
  if (isDigit(before) && isDigit(after)) return true
  if (after !== undefined && !isSpace(after) && !QUOTE_CLOSE.has(after)) return true

  const token = tokenEndingAt(text, index)
  if (ABBREVIATIONS.has(token)) return true
  if (/^\p{L}$/u.test(token)) return true
  // Dotted initials/acronyms (`U.S.`, `J.-C.`) carry internal
  // punctuation before their final point.
  if ((token.match(/[.-]/g) ?? []).length >= 1) return true
  return false
}

function isSentenceEnd(text: string, index: number): boolean {
  const char = text[index]
  if (!char || !TERMINAL.has(char)) return false
  return char !== '.' || !protectedPeriod(text, index)
}

function afterSentenceStart(text: string, boundary: number, limit: number): number {
  let index = boundary
  while (index < limit && OPENING.has(text[index] as string)) index += 1
  return index
}

function afterSentenceEnd(text: string, boundary: number): number {
  let index = boundary
  while (index < text.length && TERMINAL.has(text[index] as string)) index += 1
  while (index < text.length && QUOTE_CLOSE.has(text[index] as string)) index += 1
  return index
}

export function citedSentenceRange(
  text: string,
  markerFrom: number,
  markerTo: number
): CitationSentenceRange {
  const from = Math.max(0, Math.min(markerFrom, text.length))
  const to = Math.max(from, Math.min(markerTo, text.length))

  // A marker may follow the sentence's own stop and closing quote. Find
  // that stop first so the backward scan skips it rather than calling it
  // the end of the PREVIOUS sentence.
  let before = from - 1
  while (before >= 0 && (isSpace(text[before]) || QUOTE_CLOSE.has(text[before] as string))) {
    before -= 1
  }
  const terminalBeforeMarker = before >= 0 && isSentenceEnd(text, before)
  const backwardFrom = terminalBeforeMarker ? before : from

  let rangeFrom = 0
  for (let index = backwardFrom - 1; index >= 0; index -= 1) {
    if (QUOTE_OPEN.has(text[index] as string)) {
      rangeFrom = afterSentenceStart(text, index + 1, from)
      break
    }
    if (isSentenceEnd(text, index)) {
      rangeFrom = afterSentenceStart(text, index + 1, from)
      break
    }
  }

  // When punctuation already precedes the marker, the marker closes the
  // unit. Otherwise find the stop after it, so `sentence [1].` includes
  // the full stop instead of leaving it outside the hover extent.
  let rangeTo = to
  if (!terminalBeforeMarker) {
    rangeTo = text.length
    for (let index = to; index < text.length; index += 1) {
      if (!isSentenceEnd(text, index)) continue
      rangeTo = afterSentenceEnd(text, index)
      break
    }
    while (rangeTo > to && isSpace(text[rangeTo - 1])) rangeTo -= 1
  }

  return { from: rangeFrom, to: rangeTo }
}

/**
 * A citation that closes a blockquote cites the quoted PASSAGE, not only
 * its final grammatical sentence (CP-MVP-010 S10j). The DOM half keeps
 * this bounded to the quote's innermost rendered block, so this helper
 * only has to remove renderer whitespace at that block's edges.
 */
export function citedQuotedPassageRange(text: string): CitationSentenceRange {
  let from = 0
  while (from < text.length && isSpace(text[from])) from += 1

  let to = text.length
  while (to > from && isSpace(text[to - 1])) to -= 1

  return { from, to }
}

/** The source a number points at, for the decorator. */
export function sourceOfNumber(
  sources: readonly CitationSource[],
  number: number
): CitationSource | undefined {
  return sources.find((source) => source.number === number)
}

/**
 * What the model is told about citing, appended to the reference list it
 * is given. Deliberately short: a rule the model can follow in one pass,
 * with the honest constraint that inventing a source is worse than
 * citing none.
 */
/** Given to the model INSIDE the tool result, so the numbers arrive with the
 *  material they belong to rather than in a prompt written before the lookup
 *  existed. */
export const EXTERNAL_CITATION_INSTRUCTION =
  'Cite these sources inline with their number in square brackets — [1], [2] — ' +
  'right after the statement they support, exactly as you would cite a note. ' +
  'Do not invent a different citation style, and do not attribute with a ' +
  'quotation block instead of a number. Never cite a number you were not given.'

export const CITATION_INSTRUCTION =
  'Cite these notes inline with their number in square brackets — [1], [2] — ' +
  'right after the statement they support. You may also link a phrase directly ' +
  'to a note path. Never cite a number that is not in the list, and never cite ' +
  'a note you were not given.'

/**
 * External sources (CP-MVP-011 S07b) — what the model actually consulted.
 *
 * The owner benched S07a and reported the real gap: "no wiki citation or
 * element surfacing on the answer UI". The lookup ran, the tokens were spent,
 * and the answer borrowed Wikipedia's authority while offering no way to check
 * it — the exact failure the vault citations above exist to prevent, repeated
 * one rung out.
 *
 * External material is another SOURCE KIND, not a second citation system. This
 * turns the transient `toolExecutions` payloads into a flat, deduplicated list
 * a turn can display and (later) persist.
 *
 * PURE: no DOM, no IPC. Given the bundle's executions, it yields what was read.
 */

export type ConsultedSource = {
  /** The citation number the model was given for this source, when one was
   *  assigned. Numbers are DATA, assigned in main where the material is
   *  gathered, so the renderer never has to re-derive them. */
  number?: number
  /** Canonical URL — also the dedup key across corpora and calls. */
  url: string
  kind: 'wikipedia-article' | 'wikidata-entity' | 'wiktionary-etymology'
  title: string
  project: string
  language: string
  /** Revision id when exposed, else the timestamp; null when neither is. */
  revision: string | null
  accessedAt: string
  license: { name: string; url: string } | null
}

export type ConsultedMedia = {
  url: string
  thumbnailUrl: string
  title: string
  /** Never empty: a media item without a creator is withheld upstream. */
  creator: string
  license: { name: string; url: string }
  sourcePage: string
  width: number
  height: number
}

/** A note the model pulled in by CALLING search_vault, as opposed to the
 *  deterministic pre-pass packet that rides the question. Both are vault
 *  retrieval; only this one had no surface at all before S07c. */
export type ConsultedNote = {
  path: string
  title: string
  stage: string
  reason: string
  tokens: number
}

export type ConsultedMaterial = {
  sources: ConsultedSource[]
  media: ConsultedMedia[]
  notes: ConsultedNote[]
  /** Corpus degradations and truncations worth showing beside the answer. */
  warnings: { kind: string; message: string }[]
}

type ResultLike = {
  kind?: unknown
  label?: unknown
  source?: {
    project?: unknown
    language?: unknown
    title?: unknown
    canonicalUrl?: unknown
    accessedAt?: unknown
    revision?: { id?: unknown; timestamp?: unknown } | null
    license?: { name?: unknown; url?: unknown } | null
  }
}

const text = (value: unknown): string | null =>
  typeof value === 'string' && value.length > 0 ? value : null

function sourceOf(result: ResultLike): ConsultedSource | null {
  const kind = result.kind
  if (
    kind !== 'wikipedia-article' &&
    kind !== 'wikidata-entity' &&
    kind !== 'wiktionary-etymology'
  ) {
    return null
  }
  const source = result.source
  const url = text(source?.canonicalUrl)
  const project = text(source?.project)
  const language = text(source?.language)
  const accessedAt = text(source?.accessedAt)
  if (url === null || project === null || language === null || accessedAt === null) {
    return null
  }
  const revisionId = source?.revision?.id
  const revision =
    typeof revisionId === 'number'
      ? String(revisionId)
      : text(source?.revision?.timestamp)
  const licenseName = text(source?.license?.name)
  const licenseUrl = text(source?.license?.url)
  return {
    url,
    kind,
    // A Wikidata entity carries its human name in `label`, not in the page
    // title (which is the bare QID) — showing "Q7186" would be citation
    // theatre.
    title: text(result.label) ?? text(source?.title) ?? url,
    project,
    language,
    revision,
    accessedAt,
    license:
      licenseName !== null && licenseUrl !== null
        ? { name: licenseName, url: licenseUrl }
        : null
  }
}

/** Flatten every wikimedia tool payload of a turn into what it read. */
export function consultedMaterialOf(
  executions: readonly {
    result: { ok: boolean }
    payload?: unknown
  }[]
): ConsultedMaterial {
  const sources = new Map<string, ConsultedSource>()
  const media = new Map<string, ConsultedMedia>()
  const notes = new Map<string, ConsultedNote>()
  const warnings: { kind: string; message: string }[] = []
  const seenWarnings = new Set<string>()

  for (const execution of executions) {
    const payload = execution.payload as
      | {
          kind?: unknown
          bundle?: { results?: unknown; media?: unknown; warnings?: unknown }
          packet?: { entries?: unknown }
        }
      | undefined

    if (payload?.kind === 'vault-context') {
      for (const entry of Array.isArray(payload.packet?.entries)
        ? payload.packet.entries
        : []) {
        const note = entry as Record<string, unknown>
        const path = text(note.path)
        if (path === null || notes.has(path)) continue
        notes.set(path, {
          path,
          title: text(note.title) ?? path,
          stage: text(note.stage) ?? 'unknown',
          reason: text(note.reason) ?? '',
          tokens: typeof note.tokens === 'number' ? note.tokens : 0
        })
      }
      continue
    }

    if (payload?.kind !== 'wikimedia') continue

    const numbers = new Map<string, number>()
    for (const entry of Array.isArray(
      (payload as { citations?: unknown }).citations
    )
      ? ((payload as { citations: unknown[] }).citations as Record<string, unknown>[])
      : []) {
      const url = text(entry.url)
      if (url !== null && typeof entry.number === 'number') {
        numbers.set(url, entry.number)
      }
    }

    for (const entry of Array.isArray(payload.bundle?.results)
      ? payload.bundle.results
      : []) {
      const source = sourceOf(entry as ResultLike)
      // First read wins: the same page reached twice is one source, and the
      // earliest access time is the honest one.
      if (source === null || sources.has(source.url)) continue
      const number = numbers.get(source.url)
      sources.set(
        source.url,
        number === undefined ? source : { ...source, number }
      )
    }

    for (const entry of Array.isArray(payload.bundle?.media)
      ? payload.bundle.media
      : []) {
      const item = entry as Record<string, any>
      const url = text(item.originalUrl)
      const thumbnailUrl = text(item.thumbnailUrl)
      const creator = text(item.creator)
      const licenseName = text(item.source?.license?.name)
      const licenseUrl = text(item.source?.license?.url)
      const sourcePage = text(item.source?.canonicalUrl)
      // Attribution is not decoration: an item missing any of it is dropped
      // here too, so a presentation bug can never become an unlicensed image.
      if (
        url === null ||
        thumbnailUrl === null ||
        creator === null ||
        licenseName === null ||
        licenseUrl === null ||
        sourcePage === null
      ) {
        continue
      }
      if (media.has(url)) continue
      media.set(url, {
        url,
        thumbnailUrl,
        title: text(item.fileTitle) ?? url,
        creator,
        license: { name: licenseName, url: licenseUrl },
        sourcePage,
        width: typeof item.width === 'number' ? item.width : 0,
        height: typeof item.height === 'number' ? item.height : 0
      })
    }

    for (const entry of Array.isArray(payload.bundle?.warnings)
      ? payload.bundle.warnings
      : []) {
      const warning = entry as { kind?: unknown; message?: unknown }
      const kind = text(warning.kind)
      const message = text(warning.message)
      if (kind === null || message === null) continue
      const key = `${kind}:${message}`
      if (seenWarnings.has(key)) continue
      seenWarnings.add(key)
      warnings.push({ kind, message })
    }
  }

  return {
    sources: [...sources.values()],
    media: [...media.values()],
    notes: [...notes.values()],
    warnings
  }
}
