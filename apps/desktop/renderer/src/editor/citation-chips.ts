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

  const marked: HTMLElement[] = []
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
      marked.push(fragment.lastElementChild as HTMLElement)
    }
    if (cursor === 0) continue
    fragment.append(doc.createTextNode(target.data.slice(cursor)))
    parent.replaceChild(fragment, target)
  }

  for (const chip of marked) wrapCitedSpan(chip)
  return found
}

/**
 * The EXTENT of a citation (owner bench round 8: "there is still no
 * visual clue or cue of the citation (the length of it for example)").
 *
 * A marker says where a citation ENDS; it says nothing about how much
 * of the text it covers, which is the question a reader actually has.
 * So the sentence carrying the marker is wrapped with it: hovering
 * anywhere in that sentence lights both up, and the reader sees exactly
 * how far the note's support reaches. Pure CSS from there — no hover
 * handlers, no state.
 *
 * The walk goes BACKWARD over siblings until a sentence boundary, so a
 * sentence containing bold or a link is captured whole. Failing that it
 * stops at the block, which is coarser but never wrong.
 */
function wrapCitedSpan(chip: HTMLElement): void {
  const parent = chip.parentElement
  if (!parent || parent.classList.contains('cited-span')) return
  const doc = chip.ownerDocument

  const collected: ChildNode[] = [chip]
  let node: ChildNode | null = chip.previousSibling
  let boundary = -1
  while (node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const data = (node as Text).data
      const match = /[.!?…:][\s"»]*(?=[^.!?…]*$)/.exec(data)
      if (match) {
        boundary = match.index + match[0].length
        break
      }
    }
    // Another citation's span: stop rather than swallow it.
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement
      if (element.classList.contains('cited-span')) break
      if (element.tagName === 'BR') break
    }
    collected.unshift(node)
    node = node.previousSibling
  }

  const span = doc.createElement('span')
  span.className = 'cited-span'
  const first = collected[0]
  if (!first) return
  if (boundary >= 0 && node && node.nodeType === Node.TEXT_NODE) {
    const text = node as Text
    const tail = text.splitText(boundary)
    collected.unshift(tail)
  }
  const anchor = collected[0] as ChildNode
  parent.insertBefore(span, anchor)
  for (const child of collected) span.append(child)
}
