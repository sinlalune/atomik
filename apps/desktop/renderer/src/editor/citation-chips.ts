import {
  citedQuotedPassageRange,
  citedSentenceRange,
  findCitationMarkers,
  sourceOfNumber,
  type AnswerCitations,
  type CitationSource
} from '../../../shared/chat-citations'

/**
 * Citation chips (CP-MVP-010 S08d, rebuilt at S10g) — the DOM half of
 * `chat-citations`, sitting beside `claim-highlight` because it does the
 * same kind of job: decorate rendered markdown without touching what the
 * model wrote.
 *
 * The first version rewrote `[1]` into a markdown link, which made a
 * citation render as a link pill. The owner's bench rejected that on the
 * right grounds — a citation is not a link that happens to be short — so
 * markers are decorated in place and the answer stays exactly as
 * written.
 *
 * S10i rebuilds the EXTENT (which sentence a citation covers) after the
 * owner's screenshot exposed the remaining false boundary: the point in
 * `€77.5` made only `million` light up. It works in two clean halves:
 *
 * ```text
 * WHICH sentence              pure block-local string work, unit-tested
 *                             (`citedSentenceRange`)
 * HOW it is wrapped           one DOM Range per sentence, then every
 *                             marker inside becomes a citation chip
 * ```
 *
 * Markers on the same sentence are grouped BEFORE any DOM mutation. That
 * prevents nested extents and keeps all offsets in the rendered text the
 * reader actually sees.
 *
 * S10j makes the existing blockquote rule true in the DOM: when a
 * citation closes a quote, its extent is the complete quoted passage,
 * even when that passage contains several sentences. An inline marker
 * followed by more quoted prose remains sentence-local.
 */

const MARKER_RE = /\[(\d+(?:\s*,\s*\d+)*)\]/g
const TRAILING_MARKER_RE = /\[(\d+(?:\s*,\s*\d+)*)\]/g
const SHOW_TEXT = 0x4 // NodeFilter.SHOW_TEXT, also usable in the node test DOM.
/** A citation belongs to its own innermost rendered block: it never
 *  reaches into a previous paragraph or list item. */
const BLOCKS = 'p, li, blockquote, td, th, h1, h2, h3, h4, h5, h6'

export type AppliedCitations = AnswerCitations

type TextSlot = { node: Text; from: number; to: number }
export type CitationExtent = { from: number; to: number }

/** Every text node under the container, with its offset in the whole. */
function textSlots(container: HTMLElement): TextSlot[] {
  const walker = container.ownerDocument.createTreeWalker(
    container,
    SHOW_TEXT
  )
  const slots: TextSlot[] = []
  let offset = 0
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node as Text
    slots.push({ node: text, from: offset, to: offset + text.data.length })
    offset += text.data.length
  }
  return slots
}

/** Inside code, or already inside a link, a `[1]` is not a citation. */
const isDecoratable = (node: Text): boolean =>
  node.parentElement?.closest('code, pre, a') == null

/**
 * Decorates every resolvable marker in the container and wraps the
 * sentence each one cites. Returns what was found, so the caller can
 * render the sources block and the unresolved diagnostic.
 */
export function applyCitationChips(
  container: HTMLElement,
  answer: string,
  sources: readonly CitationSource[]
): AppliedCitations {
  const found = findCitationMarkers(answer, sources)
  if (sources.length === 0) return found

  const doc = container.ownerDocument
  const rendered = container.textContent ?? ''
  const extents = citationExtents(container, rendered, sources)

  // Back to front: replacing `[1]` with `1` changes text length, but only
  // AFTER every still-to-be-used offset.
  for (const extent of extents.sort((a, b) => b.from - a.from)) {
    const span = wrapExtent(doc, container, extent)
    if (span) decorateMarkers(doc, span, sources)
  }

  return found
}

/**
 * Computes one block-bounded extent per cited sentence before the DOM is
 * touched. A paragraph/list item/quote is a hard ceiling even if its last
 * line has no punctuation.
 */
export function citationExtents(
  container: HTMLElement,
  rendered: string,
  sources: readonly CitationSource[]
): CitationExtent[] {
  const slots = textSlots(container)
  const extents: CitationExtent[] = []

  for (const match of rendered.matchAll(MARKER_RE)) {
    const from = match.index ?? 0
    const to = from + match[0].length
    const numbers = (match[1] as string)
      .split(',')
      .map((piece) => Number(piece.trim()))
    if (!numbers.some((number) => sourceOfNumber(sources, number))) continue

    const slot = slots.find((candidate) => candidate.from <= from && to <= candidate.to)
    // A marker split by rendered markup, inside code, or already inside a
    // link remains plain. Half a citation is worse than no decoration.
    if (!slot || !isDecoratable(slot.node)) continue

    const scope =
      (slot.node.parentElement?.closest(BLOCKS) as HTMLElement | null) ?? container
    const scopeSlots = slots.filter((candidate) => scope.contains(candidate.node))
    const first = scopeSlots[0]
    if (!first) continue

    const scopeText = scope.textContent ?? ''
    const localFrom = from - first.from
    const localTo = to - first.from
    const inQuote = scope.matches('blockquote') || scope.closest('blockquote') !== null
    // A final marker attributes the complete quoted passage. Citation
    // markers, punctuation and closing quote characters may follow it;
    // any real prose after it keeps the marker sentence-local.
    const trailingQuoteText = scopeText
      .slice(localTo)
      .replace(TRAILING_MARKER_RE, '')
      .replace(/[\s.!?…»"”’')\]]/gu, '')
    const local =
      inQuote && trailingQuoteText.length === 0
        ? citedQuotedPassageRange(scopeText)
        : citedSentenceRange(scopeText, localFrom, localTo)
    const extent = { from: first.from + local.from, to: first.from + local.to }
    if (extent.from >= extent.to) continue
    if (!extents.some((known) => known.from === extent.from && known.to === extent.to)) {
      extents.push(extent)
    }
  }

  return extents
}

/**
 * Wraps an exact rendered-text range while preserving any bold, emphasis,
 * links or other inline markup inside it.
 */
function wrapExtent(
  doc: Document,
  container: HTMLElement,
  extent: CitationExtent
): HTMLSpanElement | null {
  const slots = textSlots(container)
  const start = slots.find(
    (slot) => slot.from <= extent.from && extent.from < slot.to
  )
  const end = slots.find((slot) => slot.from < extent.to && extent.to <= slot.to)
  if (!start || !end) return null

  const range = doc.createRange()
  range.setStart(start.node, extent.from - start.from)
  range.setEnd(end.node, extent.to - end.from)
  if (range.collapsed) return null

  const span = doc.createElement('span')
  span.className = 'cited-span'
  span.append(range.extractContents())
  range.insertNode(span)
  return span
}

/** Every fully-resolved marker in one sentence becomes its chip(s). */
function decorateMarkers(
  doc: Document,
  span: HTMLElement,
  sources: readonly CitationSource[]
): void {
  const targets: Text[] = []
  const walker = doc.createTreeWalker(span, NodeFilter.SHOW_TEXT)
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node as Text
    if (!isDecoratable(text)) continue
    MARKER_RE.lastIndex = 0
    if (MARKER_RE.test(text.data)) targets.push(text)
    MARKER_RE.lastIndex = 0
  }

  for (const target of targets) {
    const fragment = doc.createDocumentFragment()
    let cursor = 0
    for (const match of target.data.matchAll(MARKER_RE)) {
      const at = match.index ?? 0
      const resolved = (match[1] as string)
        .split(',')
        .map((piece) => Number(piece.trim()))
        .map((number) => ({ number, source: sourceOfNumber(sources, number) }))
      // If even one number is invented, keep the complete marker exactly
      // as written so its visible unresolved diagnostic is not laundered.
      if (resolved.some((entry) => !entry.source)) continue

      fragment.append(doc.createTextNode(target.data.slice(cursor, at)))
      for (const entry of resolved) {
        const anchor = doc.createElement('a')
        anchor.className = 'citation-chip'
        anchor.dataset['citation'] = entry.source!.path
        anchor.href = '#'
        anchor.textContent = String(entry.number)
        anchor.title = `${entry.source!.title} — ${entry.source!.path}`
        fragment.append(anchor)
      }
      cursor = at + match[0].length
    }
    if (cursor === 0) continue
    fragment.append(doc.createTextNode(target.data.slice(cursor)))
    target.parentNode?.replaceChild(fragment, target)
  }
}
