import type { ClaimRecord } from '../../../shared/ipc-contract'

/**
 * Epistemic highlighting of generated text (CP-MVP-008 S06c17, owner:
 * "the generated text highlighted in different color code for the
 * different epistemological status, label on hover, sourced claims
 * clickable"). Claims are SENTENCES of the raw markdown answer
 * (extractClaimCandidates), but the chat shows RENDERED markdown —
 * emphasis markers vanish, links collapse to their label — so a claim
 * is located in the rendered text by a whitespace-flexible match of
 * its markdown-stripped form. Pure functions here (offset math over
 * plain text, unit-tested); the DOM wrapping lives with the caller.
 */

/** Inline markdown syntax stripped for matching rendered text:
 *  emphasis/code markers drop, links keep their label. */
export function stripInlineMarkdown(text: string): string {
  return text
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_`~]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

const escapeRegExp = (text: string): string =>
  text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** A whitespace-flexible matcher for the claim inside rendered text;
 *  null when the claim is too short to anchor safely. `\s*` (not +):
 *  the renderer's `breaks: true` turns hard-wrapped lines into <br>,
 *  which contributes NOTHING to textContent — the words around a
 *  break arrive fused, and the claim must still land. */
export function claimPattern(text: string): RegExp | null {
  const stripped = stripInlineMarkdown(text)
  if (stripped.length < 12) return null
  const flexible = stripped
    .split(' ')
    .map(escapeRegExp)
    .join('\\s*')
  try {
    return new RegExp(flexible)
  } catch {
    return null
  }
}

export type ClaimRange = { from: number; to: number; claim: ClaimRecord }

/** Is `at` a place a highlight may begin or end — the text's edge, or
 *  a point where a word does not continue on both sides? */
export function isWordBoundary(text: string, at: number): boolean {
  if (at <= 0 || at >= text.length) return true
  const before = text[at - 1] as string
  const after = text[at] as string
  const isWord = (character: string): boolean => /[\p{L}\p{N}]/u.test(character)
  return !(isWord(before) && isWord(after))
}

/**
 * Locates each claim in the rendered text (longest claims first so a
 * sentence containing another can't steal its span); overlapping
 * matches are dropped — every character carries at most one label.
 */
export function findClaimRanges(
  renderedText: string,
  claims: ClaimRecord[]
): ClaimRange[] {
  const ranges: ClaimRange[] = []
  const taken: Array<{ from: number; to: number }> = []
  const ordered = [...claims].sort((a, b) => b.text.length - a.text.length)
  for (const claim of ordered) {
    const pattern = claimPattern(claim.text)
    if (!pattern) continue
    const match = pattern.exec(renderedText)
    if (!match) continue
    const from = match.index
    const to = from + match[0].length
    // A highlight that starts or ends INSIDE a word is worse than no
    // highlight: it reads as a rendering fault and it breaks the
    // sentence's continuity for the reader (CP-MVP-010 S10e, owner:
    // "careful with md formatting… it breaks continuity sometimes").
    // Better to say nothing than to say it wrong, so a match that does
    // not land on word boundaries is dropped.
    if (!isWordBoundary(renderedText, from) || !isWordBoundary(renderedText, to)) {
      continue
    }
    if (taken.some((slot) => from < slot.to && to > slot.from)) continue
    taken.push({ from, to })
    ranges.push({ from, to, claim })
  }
  return ranges.sort((a, b) => a.from - b.from)
}

/** Hover text: the label plus what it means, mechanically. */
export function claimTitle(
  claim: ClaimRecord,
  sourcePath: string | null
): string {
  switch (claim.label) {
    case 'source-backed':
      return `source-backed — exact quote of ${sourcePath ?? 'a supplied source'}; click to open it`
    case 'needs-citation':
      return 'needs-citation — stated as fact but not found in your sources'
    case 'interpretive':
      return 'interpretive — analysis or opinion, not a checkable fact'
    default:
      return 'model-only — produced by the model, not derived from your sources'
  }
}

/**
 * Wraps each located claim in the container with a labeled <mark>.
 * Ranges refer to the container's textContent; a claim spanning
 * several text nodes (emphasis splits them) wraps each slice. Marks
 * carry data-claim-id — the caller handles clicks by delegation.
 */
export function applyClaimMarks(
  container: HTMLElement,
  ranges: ClaimRange[],
  titleFor: (claim: ClaimRecord) => string
): void {
  if (ranges.length === 0) return
  const doc = container.ownerDocument
  const walker = doc.createTreeWalker(container, NodeFilter.SHOW_TEXT)
  const nodes: Array<{ node: Text; from: number; to: number }> = []
  let offset = 0
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const text = n as Text
    const length = text.data.length
    nodes.push({ node: text, from: offset, to: offset + length })
    offset += length
  }
  // wrap back-to-front so earlier offsets stay valid
  for (const range of [...ranges].reverse()) {
    for (const slot of [...nodes].reverse()) {
      const from = Math.max(range.from, slot.from) - slot.from
      const to = Math.min(range.to, slot.to) - slot.from
      if (from >= to) continue
      const text = slot.node
      const tail = to < text.data.length ? text.splitText(to) : null
      const middle = from > 0 ? text.splitText(from) : text
      const mark = doc.createElement('mark')
      mark.className = `claim-mark label-${range.claim.label}`
      mark.dataset['claimId'] = range.claim.id
      mark.title = titleFor(range.claim)
      middle.parentNode?.replaceChild(mark, middle)
      mark.appendChild(middle)
      void tail
    }
  }
}
