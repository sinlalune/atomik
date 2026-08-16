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
/**
 * A term in more than this share of the vault discriminates nothing
 * (CP-MVP-010 S08b, owner bench round 4). "parle moi de l'éthos"
 * retrieved SVG, Sociologie and three daily notes, because `de`, `moi`
 * and `parle` are in half the vault and their small contributions
 * accumulate. Textbook BM25 lets IDF go negative for such terms; Atomik
 * drops them instead — clearer to explain, and identical in effect.
 *
 * Corpus-driven, not a French stopword list: the vault decides which of
 * ITS words are noise, in whatever language it is written.
 */
export const COMMON_TERM_SHARE = 0.5
/**
 * The subject of a question is what is RARE in it (CP-MVP-010 S08e,
 * owner bench round 7: "still a lot word noise, maybe use fast
 * principal subject ranking algo?").
 *
 * "Que peux tu me dire de platon (Plato) ?" is one question about one
 * subject. `platon` and `plato` appear in two notes; `peux`, `dire`,
 * `me`, `que` appear in dozens — not enough to be dropped as common,
 * but enough that a long note matching four of them outranks a short
 * note about Plato.
 *
 * The rule compares DOCUMENT FREQUENCIES rather than IDFs: a logarithm
 * compresses a 10× difference in rarity into a 2× difference in score,
 * which is exactly the compression that let filler compete. A term
 * appearing in more than this many times as many documents as the
 * query's RAREST term is context around the subject, not the subject.
 */
export const PRINCIPAL_DF_FACTOR = 4

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
const CHAT_FRONTMATTER_RE = /^type:[ \t]*Atomik Chat[ \t]*$/m

/** A chat transcript declares itself in its frontmatter (CP-MVP-008
 *  S06). Dialogue is a RECORD of thinking, not the thinking — which
 *  changes both how it is titled and whether it may ground an answer. */
export function isChatTranscript(content: string | undefined): boolean {
  if (content === undefined || !content.startsWith('---\n')) return false
  const end = content.indexOf('\n---', 4)
  return CHAT_FRONTMATTER_RE.test(content.slice(4, end === -1 ? undefined : end))
}
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
  // A chat transcript's first heading is a TURN (`## you`), which names
  // nobody. Its file name is the question that started it, which does.
  const title = isChatTranscript(content)
    ? stem
    : (frontmatterTitleOf(content) ?? firstHeadingOf(content) ?? stem)

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

/** One document's contribution to the index: its record and its postings,
 *  computed without knowing anything about the rest of the vault. That
 *  independence is what makes incremental patching possible at all. */
type DocumentEntry = {
  doc: RetrievalDoc
  postings: { term: string; field: RetrievalField; tf: number; pos: number[] }[]
}

function indexDocument(file: RetrievalDocInput): DocumentEntry {
  const parsed = documentFields(file.path, file.content)
  const lengths = emptyLengths()
  const postings: DocumentEntry['postings'] = []

  for (const field of RETRIEVAL_FIELDS) {
    const text = parsed.fields[field]
    if (text.length === 0) continue
    const tokens = tokenize(text)
    lengths[field] = tokens.length

    const byTerm = new Map<string, number[]>()
    for (const token of tokens) {
      const positions = byTerm.get(token.term)
      if (positions) positions.push(token.position)
      else byTerm.set(token.term, [token.position])
    }
    for (const [term, pos] of byTerm) postings.push({ term, field, tf: pos.length, pos })
  }

  return { doc: { path: file.path, title: parsed.title, lengths }, postings }
}

/** Assemble entries into an index: sort by path, number the docs, collect
 *  the postings. BUILD and PATCH both end here, which is why a patched
 *  index is indistinguishable from a rebuilt one (asserted by test). */
function assemble(entries: Iterable<DocumentEntry>): RetrievalIndex {
  const sorted = [...entries].sort((a, b) =>
    a.doc.path < b.doc.path ? -1 : a.doc.path > b.doc.path ? 1 : 0
  )
  const docs: RetrievalDoc[] = []
  const terms: Record<string, TermPosting[]> = {}
  const totals = emptyLengths()

  sorted.forEach((entry, doc) => {
    docs.push(entry.doc)
    for (const field of RETRIEVAL_FIELDS) totals[field] += entry.doc.lengths[field]
    for (const posting of entry.postings) {
      const list = terms[posting.term] ?? (terms[posting.term] = [])
      list.push({ doc, field: posting.field, tf: posting.tf, pos: posting.pos })
    }
  })

  return { version: 1, docs, terms, totals }
}

export function buildRetrievalIndex(
  files: readonly RetrievalDocInput[]
): RetrievalIndex {
  return assemble(files.map(indexDocument))
}

export type RetrievalPatch =
  | { path: string; content?: string }
  | { path: string; removed: true }

/**
 * The index after a handful of files changed (CP-MVP-010 S03). The write
 * verbs call this instead of rebuilding the vault on every save — the
 * closing-ceremony ruling that a retrieval index rebuilt wholesale on
 * every keystroke-save is the wrong shape.
 *
 * Only the changed documents are re-tokenized; the rest are carried over.
 * Reassembly is O(postings) because doc ids are positions in a sorted
 * array — cheap at note scale, and the point where a tombstone scheme
 * would earn its complexity if ADR-013's thresholds are ever crossed.
 */
export function patchRetrievalIndex(
  index: RetrievalIndex,
  patches: readonly RetrievalPatch[]
): RetrievalIndex {
  const entries = new Map<string, DocumentEntry>()

  // Carry the untouched documents over, postings and all.
  const kept = index.docs.map((doc) => ({ doc, postings: [] as DocumentEntry['postings'] }))
  for (const [term, postings] of Object.entries(index.terms)) {
    for (const posting of postings) {
      kept[posting.doc]?.postings.push({
        term,
        field: posting.field,
        tf: posting.tf,
        pos: posting.pos
      })
    }
  }
  for (const entry of kept) entries.set(entry.doc.path, entry)

  for (const patch of patches) {
    if ('removed' in patch && patch.removed) {
      entries.delete(patch.path)
      continue
    }
    entries.set(patch.path, indexDocument(patch))
  }

  return assemble(entries.values())
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

/**
 * How far retrieval reaches (CP-MVP-010 S08g, owner: "from title only to
 * title + link pages to etc" — corrected at S08h, where the owner made
 * the axis explicit: *"links for me was the fact that a note is linked
 * to a found note with title match"*).
 *
 * The ladder is 33's, not a set of index fields: first WHAT MATCHED,
 * then HOW FAR the graph is walked from what matched.
 *
 * ```text
 * titles   title · path match, no expansion
 * linked   the same match, plus the notes LINKED to it   (default)
 * full     every field — headings, frontmatter, links, bodies — plus
 *          expansion
 * ```
 *
 * TITLE and HEADING are different things (S08j, owner: "you are not
 * isolating # h1 heading for title search. What the difference between
 * heading and title?"). The TITLE is what a note is CALLED — its
 * frontmatter title, else its first heading, else its file name: one
 * string per note. HEADINGS are its internal structure, every `##` in
 * its body. A title reach that matched every section heading found
 * notes through boilerplate like "What is inside" — a heading the app
 * writes into every folder index — which is how `bibi` answered a
 * question about Plato.
 *
 * `linked` is not about the link-TEXT field: a note earns its place by
 * being connected to a note whose title answered, which is the whole
 * argument for having built the graph.
 */
export type RetrievalSensitivity = 'titles' | 'linked' | 'full'

export const SENSITIVITY_FIELDS: Record<
  RetrievalSensitivity,
  readonly RetrievalField[]
> = {
  titles: ['title', 'path'],
  linked: ['title', 'path'],
  full: RETRIEVAL_FIELDS
}

/** How far the graph is walked at each reach. */
export const SENSITIVITY_HOPS: Record<RetrievalSensitivity, number> = {
  titles: 0,
  linked: 1,
  full: 1
}

export type SearchOptions = {
  limit?: number
  /** Which fields may match at all. Absent = every field. */
  sensitivity?: RetrievalSensitivity
  /** Every RANKING term must appear in the document — the phrasing
   *  around the subject was never scored, so it is not required
   *  either (S08i). */
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
  const fields = new Set(
    SENSITIVITY_FIELDS[options.sensitivity ?? 'full'] as readonly RetrievalField[]
  )

  const docCount = index.docs.length
  const average = emptyLengths()
  for (const field of RETRIEVAL_FIELDS) average[field] = index.totals[field] / docCount

  // The query's own terms, by how rare each one is in THIS vault — and
  // by whether the vault has a NOTE NAMED after it.
  const informative = terms
    .map((term) => {
      const postings = index.terms[term]
      if (!postings) return null
      const df = new Set(postings.map((posting) => posting.doc)).size
      // S08f: the vault's own titles are its entity list. A query word
      // that NAMES a note is the subject of the question, whatever the
      // statistics say — the case a frequency rule alone gets wrong is
      // a vault ABOUT notes, asked "what is a note?", where the subject
      // is also the commonest word in the corpus. This is the cheap,
      // dependency-free half of what a POS tagger buys: Atomik knows
      // its own nouns because the owner titled them.
      const named = postings.some(
        (posting) => posting.field === 'title' && fields.has('title')
      )
      if (!named && df / docCount > COMMON_TERM_SHARE) return null
      return { term, df, named }
    })
    .filter(
      (entry): entry is { term: string; df: number; named: boolean } => entry !== null
    )
  // S08i (owner bench round 9: "I don't understand the two last hit
  // with bibi" — a note whose HEADING contained "what", plus its
  // neighbours behind it). When the vault has notes NAMED after some of
  // the query's words, those words ARE the question's subject and the
  // rest is phrasing: `what`, `to`, `brought` name nothing. Comparing
  // frequencies alone could not see that, because in a bilingual vault
  // `what` is uncommon enough to look like a subject.
  const pool = informative.some((entry) => entry.named)
    ? informative.filter((entry) => entry.named)
    : informative
  const rarest = Math.min(...pool.map((entry) => entry.df))
  const principal = new Set(
    pool
      // Even among named terms the rarest wins: a note titled "What is
      // an ethos?" must not make `what` a subject forever.
      .filter((entry) => entry.df <= rarest * PRINCIPAL_DF_FACTOR)
      .map((entry) => entry.term)
  )

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
    // The principal set already applied both rules — everywhere =
    // nowhere, and filler around the subject ranks nothing — with the
    // one exception that a word naming a note is never either. When
    // NOTHING qualified, the common ceiling still holds on its own:
    // answering with the whole vault is worse than answering nothing.
    if (principal.size > 0) {
      if (!principal.has(term)) continue
    } else if (documents.size / docCount > COMMON_TERM_SHARE) {
      continue
    }
    const idf = Math.log(1 + (docCount - documents.size + 0.5) / (documents.size + 0.5))

    for (const posting of postings) {
      if (!fields.has(posting.field)) continue
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
    if (options.requireAll && accumulator.matched.size < principal.size) continue
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

/**
 * The query's terms the vault has ANY material for (CP-MVP-010 S08i).
 * Deliberately independent of ranking: "does the vault know about this
 * word" and "should this word decide which notes to send" are different
 * questions, and answering the first with the second told the owner the
 * vault had nothing on `emotions` while a note discussed them.
 */
export function presentTermsOf(index: RetrievalIndex, query: string): string[] {
  return parseQuery(query).terms.filter((term) => index.terms[term] !== undefined)
}

/**
 * The query's terms that are too common to discriminate. They are NOT
 * missing — the vault is full of them — so coverage counts them as
 * present while ranking ignores them (S08b).
 */
export function commonTermsOf(index: RetrievalIndex, query: string): string[] {
  const docCount = index.docs.length
  if (docCount === 0) return []
  return parseQuery(query).terms.filter((term) => {
    const postings = index.terms[term]
    if (!postings) return false
    const documents = new Set(postings.map((posting) => posting.doc))
    return documents.size / docCount > COMMON_TERM_SHARE
  })
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
