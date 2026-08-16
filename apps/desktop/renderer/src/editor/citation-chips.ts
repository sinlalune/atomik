import {
  findCitationMarkers,
  sourceOfNumber,
  type AnswerCitations,
  type CitationSource
} from '../../../shared/chat-citations'

/**
 * Citation chips (CP-MVP-010 S08d) — the DOM half of `chat-citations`,
 * sitting beside `claim-highlight` because it does the same kind of job:
 * decorate rendered markdown without touching what the model wrote.
 *
 * The first version rewrote `[1]` into a markdown link, which made a
 * citation render as a link pill. The owner's bench was blunt about it
 * ("it still don't look like citation, its just plain text… the idea
 * that you should use md citation format for it is a bad assumption"),
 * and the objection is structural rather than cosmetic: a citation is
 * not a link that happens to be short. It is a reference marker bound to
 * the sentence in front of it, so it needs its own element and its own
 * shape — and the answer text stays exactly as written.
 */

const MARKER_RE = /\[(\d+(?:\s*,\s*\d+)*)\]/g
/** Where a `[1]` is code or already a link, it is not a citation. */
const SKIP = new Set(['CODE', 'PRE', 'A'])

export type AppliedCitations = AnswerCitations

/**
 * Replaces every resolvable marker in the container with a chip. Returns
 * what was found so the caller can render the sources block and the
 * unresolved diagnostic.
 */
export function applyCitationChips(
  container: HTMLElement,
  text: string,
  sources: readonly CitationSource[]
): AppliedCitations {
  const found = findCitationMarkers(text, sources)
  if (sources.length === 0) return found

  const doc = container.ownerDocument
  const walker = doc.createTreeWalker(container, NodeFilter.SHOW_TEXT)
  const targets: Text[] = []
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const parent = (node as Text).parentElement
    if (parent && !parent.closest('code, pre, a') && MARKER_RE.test((node as Text).data)) {
      targets.push(node as Text)
    }
    MARKER_RE.lastIndex = 0
  }

  for (const target of targets) {
    const parent = target.parentElement
    if (!parent || SKIP.has(parent.tagName)) continue
    const fragment = doc.createDocumentFragment()
    let cursor = 0
    for (const match of target.data.matchAll(MARKER_RE)) {
      const start = match.index ?? 0
      const numbers = (match[1] as string)
        .split(',')
        .map((piece) => Number(piece.trim()))
      const chips = numbers
        .map((number) => ({ number, source: sourceOfNumber(sources, number) }))
        .filter((entry) => entry.source !== undefined)
      // An invented number keeps its brackets: it is left as written so
      // the reader sees the model cited something that does not exist.
      if (chips.length === 0) continue

      fragment.append(doc.createTextNode(target.data.slice(cursor, start)))
      for (const chip of chips) {
        const anchor = doc.createElement('a')
        anchor.className = 'citation-chip'
        anchor.dataset['citation'] = chip.source!.path
        anchor.href = '#'
        anchor.textContent = String(chip.number)
        anchor.title = `${chip.source!.title} — ${chip.source!.path}`
        fragment.append(anchor)
      }
      cursor = start + match[0].length
    }
    if (cursor === 0) continue
    fragment.append(doc.createTextNode(target.data.slice(cursor)))
    parent.replaceChild(fragment, target)
  }

  return found
}
