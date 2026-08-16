import { firstHeadingOf, frontmatterTitleOf } from './graph-core'
import { parseEdges } from './edge-grammar'

/**
 * The lexical retrieval core (CP-MVP-010 S02, ADR-013) — rung 1 of
 * bedrock 33's ladder: paths, filenames, titles, headings, frontmatter,
 * link text and bodies, ranked by BM25. No embeddings, no vector store,
 * and no database: ADR-013 chose a pure core over SQLite FTS5 for a
 * note-scale vault, with dated thresholds recorded there for when that
 * stops being true.
 *
 * PURE, like `graph-core` beside it: no filesystem, no Electron, no DOM.
 * The main-side seat owns collection, caching and persistence; this file
 * owns tokenization, the index and the scoring, so retrieval behaviour is
 * pinned by fast unit tests instead of by running the app.
 *
 * The index is a rebuildable projection of the vault (04/33): delete it
 * and `buildRetrievalIndex` reproduces it from the files alone.
 */

/* ------------------------------------------------------------------ */
/* Fields and constants (CP-MVP-010 S01 pins)                          */
/* ------------------------------------------------------------------ */

export type RetrievalField =
  | 'title'
  | 'heading'
  | 'path'
  | 'frontmatter'
  | 'link'
  | 'body'

export const RETRIEVAL_FIELDS: readonly RetrievalField[] = [
  'title',
  'heading',
  'path',
  'frontmatter',
  'link',
  'body'
]

/** S01 pins. A starting point held by tests, not a truth: they move only
 *  on evidence from the S10 evaluation set, and every move is recorded
 *  there. A title match means far more than a body match in a vault whose
 *  notes ARE concepts (bedrock 20). */
export const FIELD_WEIGHTS: Readonly<Record<RetrievalField, number>> = {
  title: 3,
  heading: 2,
  path: 2,
  frontmatter: 1.8,
  link: 1.5,
  body: 1
}

/** The standard BM25 defaults; the evaluation set is what may move them. */
export const BM25_K1 = 1.2
export const BM25_B = 0.75

const MAX_TERM_LENGTH = 64
const DEFAULT_LIMIT = 20

/* ------------------------------------------------------------------ */
/* Tokenizer                                                           */
/* ------------------------------------------------------------------ */

export type Token = {
  term: string
  /** Offset of the token in the text it came from. */
  start: number
  end: number
  /** Ordinal within the field, so phrases can check adjacency. */
  position: number
}

/**
 * Lowercase + Unicode diacritic folding. The owner's vault is French, and
 * CP-MVP-009 S07b already paid for pretending otherwise: `ethos` must find
 * `éthos`, and `Éthos` must find both. NFD splits the accent off as a
 * combining mark, which the range below then drops.
 */
export function foldTerm(raw: string): string {
  return raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

/**
 * A run is a word possibly welded by hyphens or apostrophes: `part-of`,
 * `l'ethos`, `qu'est-ce`. Splitting on every non-letter would lose the
 * kebab labels the graph is built from (ADR-011 labels are `[a-z0-9-]+`),
 * so a run yields BOTH its parts and — when it was welded — the whole
 * hyphenated form, which is what makes searching `part-of` work.
 *
 * French elision is handled by the same rule: `l'ethos` yields `ethos`
 * (and `l`, which is one character and therefore dropped as noise).
 * No stemming: a real French stemmer is a dependency and a quality
 * question the S10 evaluation set has to ask before it is answered.
 */
const RUN_RE = /[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu

/**
 * The parts of a run that are worth indexing. A one-letter part is noise
 * ONLY in the elision position — the `l` of `l'éthos` — because that is
 * grammar, not vocabulary. The same letter after a hyphen is vocabulary:
 * `oppose-a` is a real ADR-011 edge label, and losing its `a` would lose
 * the label's whole form with it.
 */
function keptParts(folded: string): string[] {
  const pieces = folded.split(/(['’-])/)
  const parts: string[] = []
  for (let index = 0; index < pieces.length; index += 2) {
    const part = pieces[index] as string
    const nextSeparator = pieces[index + 1]
    const isClitic =
      part.length === 1 && (nextSeparator === "'" || nextSeparator === '’')
    if (part.length > 0 && !isClitic) parts.push(part)
  }
  return parts
}

export function tokenize(text: string): Token[] {
  const tokens: Token[] = []
  let position = 0
  for (const match of text.matchAll(RUN_RE)) {
    const raw = match[0]
    const start = match.index ?? 0
    const folded = foldTerm(raw)
    const parts = keptParts(folded)
    const welded = folded.replace(/['’]/g, '').replace(/-+/g, '-')

    // The whole form first, so its position is the run's position and a
    // phrase query crossing a hyphen still lines up.
    if (parts.length > 1 && welded.length <= MAX_TERM_LENGTH) {
      tokens.push({ term: welded, start, end: start + raw.length, position })
    }
    for (const part of parts) {
      if (part.length > MAX_TERM_LENGTH) continue
      tokens.push({ term: part, start, end: start + raw.length, position })
      position += 1
    }
    // A run that was nothing but a clitic (`l'`) leaves no part behind:
    // it carried no vocabulary, so it contributes no token and no ordinal.
  }
  return tokens
}

/* ------------------------------------------------------------------ */
/* Field extraction                                                    */
/* ------------------------------------------------------------------ */

export type RetrievalDocInput = { path: string; content?: string }

export type DocumentFields = {
  title: string
  fields: Record<RetrievalField, string>
}

const HEADING_RE = /^ {0,3}(#{1,6})\s+(.*)$/
const STEM_RE = /\.[^./]+$/

const stemOf = (path: string): string =>
  (path.split('/').pop() ?? path).replace(STEM_RE, '')

/** Frontmatter block and body, split on the `---` fence (11). */
function splitFrontmatter(content: string): { front: string; body: string } {
  if (!content.startsWith('---\n')) return { front: '', body: content }
  const end = content.indexOf('\n---', 4)
  if (end === -1) return { front: '', body: content }
  const after = content.indexOf('\n', end + 1)
  return {
    front: content.slice(4, end),
    body: after === -1 ? '' : content.slice(after + 1)
  }
}

/**
 * The six searchable views of one file. Every field is plain text: the
 * tokenizer is the only thing that decides what a word is, so a field is
 * just "which text counts, and how much" (the weights above).
 *
 * A non-markdown file arrives without content (same rule as the graph
 * index, S07d): it is still a document, findable by path and title, with
 * no body to read.
 */
export function documentFields(path: string, content?: string): DocumentFields {
  const stem = stemOf(path)
  const pathText = path.replace(/[/\-_.]+/g, ' ')

  if (content === undefined) {
    return {
      title: stem,
      fields: { title: stem, heading: '', path: pathText, frontmatter: '', link: '', body: '' }
    }
  }

  const { front, body } = splitFrontmatter(content)
  const title = frontmatterTitleOf(content) ?? firstHeadingOf(content) ?? stem

  const headings: string[] = []
  const bodyLines: string[] = []
  for (const line of body.split('\n')) {
    const heading = HEADING_RE.exec(line)
    if (heading) headings.push(heading[2] ?? '')
    else bodyLines.push(line)
  }

  // Frontmatter VALUES only: the keys are schema, not knowledge, and
  // indexing them would make every note match "title" and "tags".
  const frontValues = front
    .split('\n')
    .map((line) => {
      const colon = line.indexOf(':')
      return colon === -1 ? line : line.slice(colon + 1)
    })
    .join(' ')

  // Link text, edge labels and targets, through the SAME parser the
  // rendering and the graph index use — the grammar never forks (ADR-011).
  const linkParts: string[] = []
  for (const edge of parseEdges(content)) {
    linkParts.push(edge.text)
    if (edge.text !== edge.target) linkParts.push(stemOf(edge.target))
    if (edge.decoration) linkParts.push(edge.decoration.label)
  }

  return {
    title,
    fields: {
      title,
      heading: headings.join('\n'),
      path: pathText,
      frontmatter: frontValues,
      link: linkParts.join(' '),
      body: bodyLines.join('\n')
    }
  }
}

/* ------------------------------------------------------------------ */
/* The index                                                           */
/* ------------------------------------------------------------------ */

export type RetrievalDoc = {
  path: string
  title: string
  /** Token count per field — BM25's length normalization needs it. */
  lengths: Record<RetrievalField, number>
}

export type TermPosting = {
  /** Index into `RetrievalIndex.docs`. */
  doc: number
  field: RetrievalField
  /** Term frequency in that field. */
  tf: number
  /** Ordinals within the field, for phrase adjacency. */
  pos: number[]
}

export type RetrievalIndex = {
  version: 1
  /** Sorted by path, so a rebuild is byte-identical (03 lifecycle). */
  docs: RetrievalDoc[]
  /** term -> postings, term keys sorted on serialization. */
  terms: Record<string, TermPosting[]>
  /** Summed field lengths, for the average BM25 normalizes against. */
  totals: Record<RetrievalField, number>
}

const emptyLengths = (): Record<RetrievalField, number> => ({
  title: 0,
  heading: 0,
  path: 0,
  frontmatter: 0,
  link: 0,
  body: 0
})

export function buildRetrievalIndex(
  files: readonly RetrievalDocInput[]
): RetrievalIndex {
  const sorted = [...files].sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
  const docs: RetrievalDoc[] = []
  const terms: Record<string, TermPosting[]> = {}
  const totals = emptyLengths()

  sorted.forEach((file, doc) => {
    const parsed = documentFields(file.path, file.content)
    const lengths = emptyLengths()

    for (const field of RETRIEVAL_FIELDS) {
      const text = parsed.fields[field]
      if (text.length === 0) continue
      const tokens = tokenize(text)
      lengths[field] = tokens.length
      totals[field] += tokens.length

      const byTerm = new Map<string, number[]>()
      for (const token of tokens) {
        const positions = byTerm.get(token.term)
        if (positions) positions.push(token.position)
        else byTerm.set(token.term, [token.position])
      }
      for (const [term, pos] of byTerm) {
        const postings = terms[term] ?? (terms[term] = [])
        postings.push({ doc, field, tf: pos.length, pos })
      }
    }

    docs.push({ path: file.path, title: parsed.title, lengths })
  })

  return { version: 1, docs, terms, totals }
}

/** Deterministic JSON — sorted term keys, so the persisted projection is
 *  byte-identical on every rebuild (03 §derived artifacts, 33). */
export function serializeRetrievalIndex(index: RetrievalIndex): string {
  const terms: Record<string, TermPosting[]> = {}
  for (const term of Object.keys(index.terms).sort()) {
    terms[term] = index.terms[term] as TermPosting[]
  }
  return `${JSON.stringify({ ...index, terms }, null, 2)}\n`
}

/* ------------------------------------------------------------------ */
/* Query                                                               */
/* ------------------------------------------------------------------ */

export type ParsedQuery = {
  /** Every term the query mentions, phrases included. */
  terms: string[]
  /** Quoted runs, as term sequences: adjacency is required. */
  phrases: string[][]
}

/** `attention "key vector" transformer` → three loose terms and one
 *  phrase whose words must be adjacent in some field. */
export function parseQuery(text: string): ParsedQuery {
  const phrases: string[][] = []
  const loose: string[] = []
  const rest = text.replace(/"([^"]*)"/g, (_all, inner: string) => {
    const words = tokenize(inner).map((token) => token.term)
    if (words.length > 1) phrases.push(words)
    else if (words.length === 1) loose.push(words[0] as string)
    return ' '
  })
  for (const token of tokenize(rest)) loose.push(token.term)

  const terms = [...new Set([...loose, ...phrases.flat()])]
  return { terms, phrases }
}

export type FieldScore = { field: RetrievalField; score: number }

export type RetrievalHit = {
  path: string
  title: string
  score: number
  /** Per-field contributions, best first — the honest answer to "why
   *  this result", computed rather than narrated. */
  fields: FieldScore[]
  /** Query terms this document actually matched. */
  terms: string[]
}

export type SearchOptions = {
  limit?: number
  /** Every query term must appear somewhere in the document. */
  requireAll?: boolean
  /** Perimeter filter, applied before scoring (scope, 26). */
  accept?: (path: string) => boolean
}

/**
 * BM25 over the field-weighted index (BM25F-style: per-field saturation
 * and length normalization, summed with the field weights).
 *
 * A quoted phrase is a FILTER, not a bonus: a document that does not carry
 * the words next to each other in one field is not what was asked for.
 */
export function searchIndex(
  index: RetrievalIndex,
  query: string,
  options: SearchOptions = {}
): RetrievalHit[] {
  const { terms, phrases } = parseQuery(query)
  if (terms.length === 0 || index.docs.length === 0) return []

  const docCount = index.docs.length
  const average = emptyLengths()
  for (const field of RETRIEVAL_FIELDS) average[field] = index.totals[field] / docCount

  type Accumulator = {
    score: number
    fields: Map<RetrievalField, number>
    matched: Set<string>
    positions: Map<string, Map<RetrievalField, number[]>>
  }
  const accumulators = new Map<number, Accumulator>()

  for (const term of terms) {
    const postings = index.terms[term]
    if (!postings) continue

    const documents = new Set(postings.map((posting) => posting.doc))
    const idf = Math.log(1 + (docCount - documents.size + 0.5) / (documents.size + 0.5))

    for (const posting of postings) {
      const doc = index.docs[posting.doc]
      if (!doc) continue
      if (options.accept && !options.accept(doc.path)) continue

      let accumulator = accumulators.get(posting.doc)
      if (!accumulator) {
        accumulator = { score: 0, fields: new Map(), matched: new Set(), positions: new Map() }
        accumulators.set(posting.doc, accumulator)
      }

      const avg = average[posting.field]
      const length = doc.lengths[posting.field]
      const normalized =
        avg > 0 ? 1 - BM25_B + BM25_B * (length / avg) : 1
      const contribution =
        idf *
        FIELD_WEIGHTS[posting.field] *
        ((posting.tf * (BM25_K1 + 1)) / (posting.tf + BM25_K1 * normalized))

      accumulator.score += contribution
      accumulator.fields.set(
        posting.field,
        (accumulator.fields.get(posting.field) ?? 0) + contribution
      )
      accumulator.matched.add(term)

      const byField = accumulator.positions.get(term) ?? new Map<RetrievalField, number[]>()
      byField.set(posting.field, posting.pos)
      accumulator.positions.set(term, byField)
    }
  }

  const hits: RetrievalHit[] = []
  for (const [docIndex, accumulator] of accumulators) {
    const doc = index.docs[docIndex]
    if (!doc) continue
    if (options.requireAll && accumulator.matched.size < terms.length) continue
    if (!phrases.every((phrase) => hasPhrase(phrase, accumulator.positions))) continue

    hits.push({
      path: doc.path,
      title: doc.title,
      score: accumulator.score,
      fields: [...accumulator.fields]
        .map(([field, score]) => ({ field, score }))
        .sort((a, b) => b.score - a.score),
      terms: [...accumulator.matched].sort()
    })
  }

  hits.sort((a, b) => b.score - a.score || (a.path < b.path ? -1 : 1))
  return hits.slice(0, options.limit ?? DEFAULT_LIMIT)
}

/** Do the phrase's words sit at consecutive ordinals inside ONE field? */
function hasPhrase(
  phrase: string[],
  positions: Map<string, Map<RetrievalField, number[]>>
): boolean {
  const first = positions.get(phrase[0] as string)
  if (!first) return false
  for (const [field, starts] of first) {
    for (const start of starts) {
      let ok = true
      for (let step = 1; step < phrase.length; step += 1) {
        const next = positions.get(phrase[step] as string)?.get(field)
        if (!next || !next.includes(start + step)) {
          ok = false
          break
        }
      }
      if (ok) return true
    }
  }
  return false
}

/* ------------------------------------------------------------------ */
/* Snippets                                                            */
/* ------------------------------------------------------------------ */

export type ExtractedMatch = {
  kind: 'heading' | 'text'
  /** 1-based line in the file. */
  line: number
  excerpt: string
  /** Offsets of the matched term INSIDE the excerpt, for highlighting. */
  span: [number, number]
}

export type ExtractOptions = { maxMatches?: number; maxExcerpt?: number }

/**
 * Where the terms actually are, for excerpts and highlighting. Kept out of
 * the index on purpose: postings carry ordinals, not text, so the index
 * stays small and honest, and the few files a query actually returns are
 * cheap for the caller to read (33 §cost is multidimensional).
 */
export function extractMatches(
  content: string,
  terms: readonly string[],
  options: ExtractOptions = {}
): ExtractedMatch[] {
  const maxMatches = options.maxMatches ?? 6
  const maxExcerpt = options.maxExcerpt ?? 160
  const wanted = new Set(terms)
  if (wanted.size === 0) return []

  const matches: ExtractedMatch[] = []
  const lines = content.split('\n')
  for (let index = 0; index < lines.length && matches.length < maxMatches; index += 1) {
    const line = lines[index] as string
    const token = tokenize(line).find((candidate) => wanted.has(candidate.term))
    if (!token) continue
    const trimmedStart = line.length - line.trimStart().length
    const excerpt = line.trim().slice(0, maxExcerpt)
    const start = Math.max(0, Math.min(token.start - trimmedStart, excerpt.length))
    matches.push({
      kind: HEADING_RE.test(line) ? 'heading' : 'text',
      line: index + 1,
      excerpt,
      span: [start, Math.min(start + (token.end - token.start), excerpt.length)]
    })
  }
  return matches
}
