import { BM25_B, BM25_K1, foldTerm, parseQuery, tokenize } from './retrieval-core'

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

/**
 * A term that appears in almost every section of a page is a STOPWORD FOR
 * THIS PAGE: it says the article is about the subject, which we already knew,
 * and it cannot say which part answers. Scoring it back in is what makes
 * ranking degenerate into keyword DENSITY — the longest section that repeats
 * the topic wins.
 *
 * S07j tried to catch this with the MEAN share across query terms, and the
 * owner's re-bench (2026-08-20, `macron-et-la-réforme-des-retraites-4`) showed
 * why a mean is the wrong instrument: one discriminating term ("2010") drags
 * the average under any threshold while "réforme", "des", "retraites" and "en"
 * still saturate the page. The rule is per TERM now — drop the ones that
 * cannot discriminate, rank on what is left, and when nothing is left, read
 * from the top and say so.
 */
const PAGE_STOPWORD_SHARE = 0.8

/**
 * The direct instrument, after two failed indirect ones (S07j, third
 * iteration). If the query IS the article's title, there is by construction
 * nothing to rank: every section of "Réforme des retraites en France en 2023"
 * is about the réforme des retraites en France en 2023. Term-frequency
 * heuristics kept missing this — a single surviving term ("france", "2023")
 * is enough to make the scorer confident, and it hands the budget to whichever
 * long section repeats that term, which is how §Manifestations et grèves won
 * three benches in a row.
 *
 * So the title is asked directly: when this share of the query's terms appear
 * in the page title, the query cannot discriminate inside the page, and the
 * article is read from the top.
 */
const TITLE_MATCH_SHARE = 0.8

/** Below this, ranking barely matters and the budget usually fits anyway. */
const SATURATION_MIN_SECTIONS = 4

/**
 * The apparatus is not the article (S07j re-bench). "Notes et références" won
 * the whole budget for `Réforme des retraites en France en 2010`, because a
 * reference list repeats the page's title in every citation — the densest
 * possible match, and the emptiest possible reading. Bibliographies, external
 * links and see-also lists are the page's plumbing; the byte budget is for
 * prose. `.reflist` chrome is already stripped upstream, but the SECTION
 * survives with its leftovers.
 */
const APPARATUS_HEADINGS = new Set(
  [
    'notes',
    'notes et references',
    'note et references',
    'references',
    'notes and references',
    'bibliographie',
    'bibliography',
    'voir aussi',
    'see also',
    'liens externes',
    'external links',
    'annexes',
    'annexe',
    'articles connexes',
    'further reading',
    'lectures complementaires',
    'sources',
    'works cited',
    'pour approfondir'
  ].map((heading) => heading)
)

/** Headings arrive with accents, case and stray punctuation. */
export function isApparatusHeading(heading: string): boolean {
  const normalized = foldTerm(heading)
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return APPARATUS_HEADINGS.has(normalized)
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
  /** False when the query could not discriminate inside this page, so the
   *  article was read from the top rather than ranked — see SATURATION_SHARE.
   *  Reported rather than hidden: "we ranked" and "we gave up ranking" are
   *  different claims about the same text. */
  focused: boolean
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
  query: string,
  title: string
): { scores: number[]; focused: boolean } {
  const unfocused = { scores: sections.map(() => 0), focused: false }
  const terms = parseQuery(query).terms
  if (terms.length === 0) return unfocused

  const titleTerms = new Set(tokenize(title).map((token) => token.term))
  if (titleTerms.size > 0) {
    const inTitle = terms.filter((term) => titleTerms.has(term)).length
    if (inTitle / terms.length >= TITLE_MATCH_SHARE) return unfocused
  }
  const bodies = sections.map((section) => termCounts(section.text))
  const headings = sections.map((section) => termCounts(section.heading))
  const lengths = bodies.map((counts) =>
    [...counts.values()].reduce((sum, count) => sum + count, 0)
  )
  const total = lengths.reduce((sum, length) => sum + length, 0)
  const avgdl = sections.length > 0 ? total / sections.length : 0
  if (avgdl === 0) return unfocused

  const idf = new Map<string, number>()
  const scoring: string[] = []
  for (const term of terms) {
    const df = bodies.filter((counts, index) =>
      counts.has(term) || headings[index]!.has(term)
    ).length
    // The page-stopword rule: a term in nearly every section carries no
    // information about WHICH section, so it does not get to vote.
    if (
      sections.length >= SATURATION_MIN_SECTIONS &&
      df / sections.length >= PAGE_STOPWORD_SHARE
    ) {
      continue
    }
    scoring.push(term)
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

  // Every term saturated: the query is the page's own topic and has nothing
  // left to say about its parts.
  if (scoring.length === 0) return unfocused

  const scores = sections.map((_section, index) => {
    const body = bodies[index]!
    const heading = headings[index]!
    const dl = lengths[index]!
    let score = 0
    for (const term of scoring) {
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
  return { scores, focused: true }
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
  maxChars: number,
  /** The page's own title. A query that merely restates it cannot rank its
   *  sections — see TITLE_MATCH_SHARE. */
  title = ''
): WikiSectionSelection {
  const usable = sections.filter(
    (section) =>
      section.text.length > 0 && !isApparatusHeading(section.heading)
  )
  if (usable.length === 0) {
    return { text: '', truncated: false, kept: [], skipped: 0, focused: false }
  }

  const { scores, focused } = scoreSections(usable, query, title)
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
  // Measured against what was READABLE, not against the apparatus we refuse
  // to spend the budget on — otherwise a page is reported as truncated for
  // dropping its bibliography.
  const wholeLength = usable.reduce((sum, section) => sum + section.text.length, 0)
  return {
    text,
    truncated: text.length < wholeLength,
    kept,
    skipped: usable.length - keptIndexes.length,
    focused
  }
}
