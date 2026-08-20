import { BM25_B, BM25_K1, parseQuery, tokenize } from './retrieval-core'

/**
 * Choosing WHICH part of an article to read (CP-MVP-011 S07i).
 *
 * The owner's ruling, after reading a trace whose warning said only that an
 * article had been "clipped": *"We can't set a limit to a page if we have no
 * tool to semantically or lexically assert that we have reached the part that
 * fits the answer."* Exactly right. Until now the byte budget cut the FIRST
 * 6 000 characters of the flattened page — position, not relevance. Ask about
 * a 2023 pension reform and you got the lead and the early biography, then a
 * warning that implied the loss was incidental.
 *
 * So the budget becomes a SELECTION rule. The scorer is the one the vault
 * already runs on — BM25 over `retrieval-core`'s tokenizer, same constants,
 * same folding, no new dependency and no embeddings (those are M9, and 33's
 * lexical baseline is what this rung is measured against). Sections compete;
 * the best ones fill the budget; what was kept and what was skipped is
 * reported rather than implied.
 *
 * PURE: sections in, selection out. The HTML walk stays in the main-side
 * client, so this file is unit-testable without a DOM.
 */

export type WikiSection = {
  /** Empty for the lead — the text before the first heading. */
  heading: string
  text: string
}

export type WikiSectionSelection = {
  /** Reading order preserved: sections compete on score, then go back into
   *  document order, because an article read out of order reads as nonsense. */
  text: string
  /** True when anything at all was dropped — the existing contract. */
  truncated: boolean
  /** Headings that made it, in reading order; the lead is `(lead)`. */
  kept: string[]
  /** How many sections the budget or the scorer left out. */
  skipped: number
}

/** The lead identifies the subject, so it is never scored out — but it is
 *  capped, or a long lead eats a budget the answer needed elsewhere. */
const LEAD_BUDGET_SHARE = 0.4

/** A heading is a strong signal about what a section is FOR, and short
 *  enough that BM25's length normalization would otherwise drown it. */
const HEADING_WEIGHT = 3

const LEAD_LABEL = '(lead)'

const clip = (text: string, maxChars: number): string => {
  if (text.length <= maxChars) return text
  const cut = text.slice(0, maxChars)
  const lastSpace = cut.lastIndexOf(' ')
  return cut.slice(0, lastSpace > maxChars * 0.8 ? lastSpace : maxChars).trimEnd()
}

const termCounts = (text: string): Map<string, number> => {
  const counts = new Map<string, number>()
  for (const token of tokenize(text)) {
    counts.set(token.term, (counts.get(token.term) ?? 0) + 1)
  }
  return counts
}

/**
 * BM25 over the sections of ONE article: the section is the document, the
 * article is the corpus. That is the honest unit here — an inverse document
 * frequency computed across the whole of Wikipedia would say nothing about
 * which paragraph of THIS page answers the question.
 */
function scoreSections(
  sections: readonly WikiSection[],
  query: string
): number[] {
  const terms = parseQuery(query).terms
  if (terms.length === 0) return sections.map(() => 0)
  const bodies = sections.map((section) => termCounts(section.text))
  const headings = sections.map((section) => termCounts(section.heading))
  const lengths = bodies.map((counts) =>
    [...counts.values()].reduce((sum, count) => sum + count, 0)
  )
  const total = lengths.reduce((sum, length) => sum + length, 0)
  const avgdl = sections.length > 0 ? total / sections.length : 0
  if (avgdl === 0) return sections.map(() => 0)

  const idf = new Map<string, number>()
  for (const term of terms) {
    const df = bodies.filter((counts, index) =>
      counts.has(term) || headings[index]!.has(term)
    ).length
    // The standard BM25 idf, floored: a term present in EVERY section still
    // contributes a little rather than turning negative.
    idf.set(
      term,
      Math.max(
        0.01,
        Math.log(1 + (sections.length - df + 0.5) / (df + 0.5))
      )
    )
  }

  return sections.map((_section, index) => {
    const body = bodies[index]!
    const heading = headings[index]!
    const dl = lengths[index]!
    let score = 0
    for (const term of terms) {
      const weight = idf.get(term)!
      const f = body.get(term) ?? 0
      if (f > 0) {
        score +=
          weight * ((f * (BM25_K1 + 1)) / (f + BM25_K1 * (1 - BM25_B + BM25_B * (dl / avgdl))))
      }
      if (heading.has(term)) score += weight * HEADING_WEIGHT
    }
    return score
  })
}

/**
 * Fill `maxChars` with the sections that answer, keeping the lead and reading
 * order. A query with no usable terms falls back to document order, which is
 * the old behaviour and the right default: with nothing to be relevant TO,
 * the start of the article is the best guess available.
 */
export function selectWikiSections(
  sections: readonly WikiSection[],
  query: string,
  maxChars: number
): WikiSectionSelection {
  const usable = sections.filter((section) => section.text.length > 0)
  if (usable.length === 0) return { text: '', truncated: false, kept: [], skipped: 0 }

  const scores = scoreSections(usable, query)
  const hasLead = usable[0]!.heading.length === 0
  const chosen = new Map<number, string>()
  let budget = maxChars

  if (hasLead) {
    const lead = clip(usable[0]!.text, Math.max(1, Math.floor(maxChars * LEAD_BUDGET_SHARE)))
    chosen.set(0, lead)
    budget -= lead.length
  }

  const ranked = usable
    .map((_section, index) => ({ index, score: scores[index]! }))
    .filter((entry) => !chosen.has(entry.index))
    .sort((a, b) => b.score - a.score || a.index - b.index)

  for (const entry of ranked) {
    if (budget <= 0) break
    const section = usable[entry.index]!
    // A heading earns its own characters: the model is being handed an
    // EXCERPT of an article, and unlabelled prose from the middle of a page
    // reads as if it were the article.
    const prefix = section.heading.length > 0 ? `${section.heading}. ` : ''
    const room = budget - prefix.length
    if (room <= 0) break
    const body = clip(section.text, room)
    if (body.length === 0) continue
    chosen.set(entry.index, `${prefix}${body}`)
    budget -= prefix.length + body.length
  }

  // Budget the competing sections could not spend goes back to the lead: the
  // cap exists to stop a long lead crowding out an answer, not to leave the
  // budget unspent when there was no competitor (a one-section page would
  // otherwise be cut to 40% of a budget it fits inside).
  if (hasLead && budget > 0) {
    const grown = clip(usable[0]!.text, chosen.get(0)!.length + budget)
    budget -= grown.length - chosen.get(0)!.length
    chosen.set(0, grown)
  }

  const keptIndexes = [...chosen.keys()].sort((a, b) => a - b)
  const text = keptIndexes.map((index) => chosen.get(index)!).join('\n\n')
  const kept = keptIndexes.map((index) =>
    usable[index]!.heading.length > 0 ? usable[index]!.heading : LEAD_LABEL
  )
  const wholeLength = usable.reduce((sum, section) => sum + section.text.length, 0)
  return {
    text,
    truncated: text.length < wholeLength,
    kept,
    skipped: usable.length - keptIndexes.length
  }
}
