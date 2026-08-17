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
  path: string
  title: string
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

/**
 * Where the sentence a marker cites BEGINS, given the rendered text and
 * the marker's position in it (CP-MVP-010 S10g).
 *
 * The first version walked the DOM backwards from the chip, and it got
 * two cases wrong for the same reason — it looked for "the previous
 * sentence boundary" and found the boundary of the sentence it was
 * supposed to include:
 *
 * ```text
 * a quote        « … à la raison). » [1]     the citation FOLLOWS the
 *                                            full stop, so the boundary
 *                                            immediately before it was
 *                                            the end of its own sentence
 *                                            -> an empty extent
 * a paragraph    … data [1]. It establishes … [1].
 *                                            fine for the first marker,
 *                                            fragile for the second
 * ```
 *
 * So the scan skips whatever CLOSES the cited sentence first — trailing
 * whitespace, the full stop, closing quotes and brackets — and only then
 * looks back for the end of the PREVIOUS one. Pure string work, which is
 * the point: it is the half that kept being wrong, and now it is the
 * half that is tested.
 */
const SENTENCE_END = /[.!?…]/
/** An opening quotation mark starts a unit of its own: a quoted passage
 *  is what a citation covers, not the sentence that introduced it. Only
 *  the unambiguous ones — a straight `"` closes as often as it opens. */
const QUOTE_OPEN = new Set(['«', '“'])
const CLOSERS = new Set([
  ' ', '\t', '\n', '»', '"', '”', '’', "'", ')', ']', '.', '!', '?', '…', ':', ';', ','
])
const OPENERS = new Set([' ', '\t', '\n', '«', '"', '“', '‘', "'", '(', '['])

export function citedSentenceStart(text: string, markerIndex: number): number {
  let index = Math.min(markerIndex, text.length)
  // 1. step over what closes the cited sentence
  while (index > 0 && CLOSERS.has(text[index - 1] as string)) index -= 1
  // 2. back to the end of the previous sentence, the start of a quoted
  //    passage, or the start of the text
  while (
    index > 0 &&
    !SENTENCE_END.test(text[index - 1] as string) &&
    !QUOTE_OPEN.has(text[index - 1] as string)
  ) {
    index -= 1
  }
  // 3. forward again over the punctuation and quotes that open this one
  while (
    index < markerIndex &&
    (SENTENCE_END.test(text[index] as string) || OPENERS.has(text[index] as string))
  ) {
    index += 1
  }
  return index
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
export const CITATION_INSTRUCTION =
  'Cite these notes inline with their number in square brackets — [1], [2] — ' +
  'right after the statement they support. You may also link a phrase directly ' +
  'to a note path. Never cite a number that is not in the list, and never cite ' +
  'a note you were not given.'
