import {
  citedSentenceStart,
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
 * S10g rebuilt the EXTENT (which sentence a citation covers) after four
 * rounds of it working "sometimes". The old version walked the DOM
 * backwards from the chip asking "where is the previous sentence
 * boundary?", which is the wrong question whenever the citation follows
 * the full stop of the sentence it cites — a quote, always. It now works
 * in two clean halves:
 *
 * ```text
 * WHERE the sentence starts   pure string work on the rendered text,
 *                             unit-tested (citedSentenceStart)
 * HOW it is wrapped           offset ranges over the container's text
 *                             nodes — the same slicing claim marks use
 * ```
 *
 * That split is the point: the half that kept being wrong is now the
 * half that can be tested without a browser.
 */

const MARKER_RE = /\[(\d+(?:\s*,\s*\d+)*)\]/g
/** A citation belongs to its own block: it never reaches back into a
 *  previous paragraph, and inside a blockquote the quote is the unit. */
const BLOCKS = 'p, li, blockquote, td, th, h1, h2, h3, h4, h5, h6'

export type AppliedCitations = AnswerCitations

type TextSlot = { node: Text; from: number; to: number }

/** Every text node under the container, with its offset in the whole. */
function textSlots(container: HTMLElement): TextSlot[] {
  const walker = container.ownerDocument.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT
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

  // Markers as ranges over the RENDERED text — what the reader sees, and
  // what the sentence rule reasons about.
  const markers: { from: number; to: number; numbers: number[] }[] = []
  for (const match of rendered.matchAll(MARKER_RE)) {
    const from = match.index ?? 0
    const numbers = (match[1] as string)
      .split(',')
      .map((piece) => Number(piece.trim()))
      .filter((number) => sourceOfNumber(sources, number) !== undefined)
    // An invented number keeps its brackets: the reader should see that
    // the model cited something that does not exist.
    if (numbers.length === 0) continue
    markers.push({ from, to: from + match[0].length, numbers })
  }

  // Back to front, so earlier offsets stay valid as the DOM changes —
  // the discipline `applyClaimMarks` follows for the same reason.
  for (const marker of [...markers].reverse()) {
    const chips = replaceMarker(doc, container, marker, sources)
    if (chips.length === 0) continue
    wrapSentence(doc, container, marker, chips, rendered)
  }

  return found
}

/** The marker's text becomes chips, in place. */
function replaceMarker(
  doc: Document,
  container: HTMLElement,
  marker: { from: number; to: number; numbers: number[] },
  sources: readonly CitationSource[]
): HTMLElement[] {
  const slot = textSlots(container).find(
    (candidate) => candidate.from <= marker.from && marker.to <= candidate.to
  )
  // A marker split across text nodes is left alone: rare, and a
  // half-decorated citation is worse than a plain one.
  if (!slot || !isDecoratable(slot.node)) return []

  const localTo = marker.to - slot.from
  const localFrom = marker.from - slot.from
  const tail = localTo < slot.node.data.length ? slot.node.splitText(localTo) : null
  const middle = localFrom > 0 ? slot.node.splitText(localFrom) : slot.node

  const chips: HTMLElement[] = []
  const fragment = doc.createDocumentFragment()
  for (const number of marker.numbers) {
    const source = sourceOfNumber(sources, number)
    if (!source) continue
    const anchor = doc.createElement('a')
    anchor.className = 'citation-chip'
    anchor.dataset['citation'] = source.path
    anchor.href = '#'
    anchor.textContent = String(number)
    anchor.title = `${source.title} — ${source.path}`
    fragment.append(anchor)
    chips.push(anchor)
  }
  middle.parentNode?.replaceChild(fragment, middle)
  void tail
  return chips
}

/**
 * Wraps the cited sentence — from `citedSentenceStart` up to the marker
 * — in one `.cited-span`, so hovering anywhere in it lights the sentence
 * and its chips together.
 */
function wrapSentence(
  doc: Document,
  container: HTMLElement,
  marker: { from: number; to: number },
  chips: HTMLElement[],
  rendered: string
): void {
  const scope = chips[0]?.parentElement?.closest(BLOCKS) ?? container
  const start = citedSentenceStart(rendered, marker.from)

  const span = doc.createElement('span')
  span.className = 'cited-span'
  const first = chips[0] as HTMLElement
  first.parentNode?.insertBefore(span, first)

  for (const slot of textSlots(container)) {
    if (!scope.contains(slot.node)) continue
    const localFrom = Math.max(start - slot.from, 0)
    const localTo = Math.min(marker.from - slot.from, slot.node.data.length)
    if (localFrom >= localTo) continue
    const tail = localTo < slot.node.data.length ? slot.node.splitText(localTo) : null
    const middle = localFrom > 0 ? slot.node.splitText(localFrom) : slot.node
    span.append(middle)
    void tail
  }

  // Nothing but the chip would be a one-character "extent", which reads
  // as the feature failing rather than as an extent.
  if ((span.textContent ?? '').trim().length === 0) {
    span.remove()
    return
  }
  for (const chip of chips) span.append(chip)
}
