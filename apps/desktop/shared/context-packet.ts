import type { GraphIndex } from './graph-core'
import {
  commonTermsOf,
  extractMatches,
  parseQuery,
  searchIndex,
  SENSITIVITY_HOPS,
  type RetrievalIndex,
  type RetrievalSensitivity
} from './retrieval-core'
import { expandOverGraph, explainStep } from './retrieval-expand'

/**
 * The context packet (CP-MVP-010 S05) — bedrock 26's shape, with 06's
 * budget and one addition this path owes the owner: a COVERAGE verdict.
 *
 * A packet is the answer to "what should the model see, and what did it
 * not see". Both halves are the contract: bedrock 26 asks for entries
 * that say WHY they were selected and an `omitted` list that says why
 * material was left out, and 33 asks for the whole thing to be bounded
 * and inspectable. A packet that only listed what it kept would be a
 * prompt with extra steps.
 *
 * The ladder it walks is 33's, cheapest first:
 *
 * ```text
 * direct    what the user already has open, selected or pinned
 * lexical   BM25 over the vault (rung 1)
 * link      the typed neighbourhood of what lexical found (S04)
 * ```
 *
 * PURE: the caller injects a reader, so this file has no filesystem and
 * every rule is unit-testable.
 */

export type PacketStage = 'direct' | 'lexical' | 'link'

export type ContextScope = {
  /** Confine retrieval to one vault folder (a project bundle, 26). */
  folder?: string
  /** Rung 0: what the workspace already holds open, pinned or selected. */
  paths?: readonly string[]
}

export type ContextEntry = {
  path: string
  title: string
  stage: PacketStage
  /** Why this entry is here, in the packet's own words. */
  reason: string
  score: number
  excerpt: string
  /** Estimated, and named estimated (33: never manufacture precision). */
  tokens: number
}

export type OmissionReason =
  | 'budget'
  | 'threshold'
  | 'scope'
  | 'duplicate'
  /** A chat transcript: dialogue is a record of thinking, not knowledge
   *  to think WITH (CP-MVP-010 S07c, owner bench round 2). */
  | 'dialogue'
  /** A prompt file: instructions TO the model. Feeding them back as
   *  reference material is not merely noise — it is the model reading
   *  its own instructions as if they were the owner's knowledge
   *  (CP-MVP-010 S08e, owner bench round 7). */
  | 'machinery'

export type OmittedEntry = {
  path: string
  reason: OmissionReason
}

/**
 * "Do we already know this?" — the signal the owner named as the minimum
 * a harness must have (opening check 2026-08-16), and the branch point
 * CP-MVP-011's external half reads: `missingTerms` is exactly what a
 * wikisearch would have to go and find.
 *
 * Term coverage rather than a score threshold, deliberately: BM25 scores
 * are unbounded and corpus-dependent, so a numeric floor would mean
 * something different in every vault. "Which of the words you asked
 * about does the vault have material for" means the same thing
 * everywhere, and can be shown to a human without an explanation.
 */
export type PacketCoverage = {
  verdict: 'covered' | 'thin' | 'empty'
  matchedTerms: string[]
  missingTerms: string[]
}

export type ContextPacket = {
  id: string
  query: string
  scope: ContextScope
  strategy: 'selection-first' | 'lexical-first'
  retrieval: {
    stages: PacketStage[]
    candidates: number
    selected: number
    /** Estimated (chars / 4), the existing convention. */
    contextTokens: number
  }
  budget: { maxTokens: number; policy: string }
  coverage: PacketCoverage
  entries: ContextEntry[]
  omitted: OmittedEntry[]
}

/** The `search_vault` a model could call (CP-MVP-011 adds the loop, not
 *  a second contract; brainstorm session C reserved the same shape for
 *  `search_web`). */
export type PacketRequest = {
  query: string
  scope?: ContextScope
  /** Hard ceiling on the packet, in estimated tokens. */
  maxTokens?: number
  /** How far to walk the graph. 0 disables the link stage. */
  hops?: number
  /** Cap on entries, before the token budget bites. */
  limit?: number
  /** How far retrieval reaches: titles · linked · full (default
   *  `linked` — a title match plus the notes connected to it). An
   *  explicit `hops` overrides the reach's own walk. */
  sensitivity?: RetrievalSensitivity
}

export type PacketDeps = {
  index: RetrievalIndex
  graph: GraphIndex
  /** Vault-relative read; undefined for anything unreadable. */
  read: (path: string) => string | undefined
  /** Injected so packets are reproducible in tests. */
  id?: string
}

/** Owner ruling, bench round 8: the default answer is the notes whose
 *  TITLE matches, plus the notes linked to them. Body-wide matching
 *  stays one click away. */
export const DEFAULT_SENSITIVITY: RetrievalSensitivity = 'linked'

export const DEFAULT_MAX_TOKENS = 4000
export const DEFAULT_ENTRY_LIMIT = 12
export const MAX_EXCERPT_CHARS = 800
/** Candidates considered before the budget: generous, since the whole
 *  point of `omitted` is to show what did not make it. */
const CANDIDATE_LIMIT = 40
/**
 * How relevant a LINKED note must be, relative to the best lexical hit,
 * to take a slot from one (CP-MVP-010 S07d, owner bench round 3).
 * Expansion scores are lexical scores times attenuation, so the two are
 * in the same unit and the comparison is honest. Below the floor the
 * neighbourhood is not an answer, it is a footnote — and it is reported
 * as `threshold`, never dropped silently.
 */
const LINK_SCORE_FLOOR = 0.15

const estimateTokens = (text: string): number => Math.ceil(text.length / 4)

export function compileContextPacket(
  request: PacketRequest,
  deps: PacketDeps
): ContextPacket {
  const maxTokens = request.maxTokens ?? DEFAULT_MAX_TOKENS
  const entryLimit = request.limit ?? DEFAULT_ENTRY_LIMIT
  const sensitivity = request.sensitivity ?? DEFAULT_SENSITIVITY
  // The reach decides how far the graph is walked; an explicit `hops`
  // still wins, because a caller who asked for a number meant it.
  const hops = request.hops ?? SENSITIVITY_HOPS[sensitivity]
  const scope = request.scope ?? {}
  const folder = scope.folder ?? ''
  const inScope = (path: string): boolean =>
    folder === '' || path === folder || path.startsWith(`${folder}/`)

  /**
   * What is APP MACHINERY rather than knowledge. Kept as a path rule,
   * not a node-kind rule, because the graph legitimately calls
   * `chats/2026-08-03/index.md` a FOLDER — it is one — and that let a
   * chat index through the S07c filter (owner bench round 7). The
   * question "may this ground an answer?" is about the family a file
   * belongs to, not about the icon it wears.
   */
  const machineryOf = (path: string): OmissionReason | null => {
    if (/(^|\/)chats\//.test(path)) return 'dialogue'
    if (/(^|\/)prompts\//.test(path)) return 'machinery'
    return deps.graph.nodes.some(
      (node) => node.path === path && node.kind === 'chat'
    )
      ? 'dialogue'
      : null
  }
  const titles = new Map(deps.graph.nodes.map((node) => [node.path, node.title]))
  const titleOf = (path: string): string =>
    titles.get(path) ?? (path.split('/').pop() ?? path).replace(/\.[^./]+$/, '')

  const candidates: ContextEntry[] = []
  const omitted: OmittedEntry[] = []
  /** Everything the compiler looked at, kept or not — 26's `candidates`. */
  let considered = 0
  const stages: PacketStage[] = []
  const seen = new Set<string>()

  // ---- rung 0: what the user already has ------------------------------
  // 33 is explicit that a selected paragraph must not trigger a
  // vault-wide search; open and pinned material is free and certain.
  for (const path of scope.paths ?? []) {
    considered += 1
    if (seen.has(path)) {
      omitted.push({ path, reason: 'duplicate' })
      continue
    }
    if (!inScope(path)) {
      omitted.push({ path, reason: 'scope' })
      continue
    }
    const content = deps.read(path)
    if (content === undefined) continue
    seen.add(path)
    if (!stages.includes('direct')) stages.push('direct')
    const excerpt = leadOf(content)
    candidates.push({
      path,
      title: titleOf(path),
      stage: 'direct',
      reason: 'open in the workspace',
      // Rung 0 outranks anything found by searching — expressed by the
      // stage, not by a giant number: the packet crosses IPC as JSON,
      // where Infinity would arrive as null.
      score: 1,
      excerpt,
      tokens: estimateTokens(excerpt)
    })
  }

  // ---- rung 1: lexical ------------------------------------------------
  const parsed = parseQuery(request.query)
  const hits = searchIndex(deps.index, request.query, {
    limit: CANDIDATE_LIMIT,
    sensitivity
  })
  // Words the vault is full of are not gaps: they are everywhere, they
  // simply cannot rank anything (S08b).
  const matchedTerms = new Set<string>(commonTermsOf(deps.index, request.query))
  const lexicalSeeds: { path: string; score: number }[] = []

  if (hits.length > 0) stages.push('lexical')
  for (const hit of hits) {
    considered += 1
    for (const term of hit.terms) matchedTerms.add(term)
    // A chat grounded in old chats compounds its own output: the
    // model's past answers would come back as if they were vault
    // knowledge. Transcripts stay searchable (the search panel finds
    // them); they simply do not GROUND (owner bench round 2).
    const machinery = machineryOf(hit.path)
    if (machinery) {
      omitted.push({ path: hit.path, reason: machinery })
      continue
    }
    if (!inScope(hit.path)) {
      omitted.push({ path: hit.path, reason: 'scope' })
      continue
    }
    if (seen.has(hit.path)) {
      omitted.push({ path: hit.path, reason: 'duplicate' })
      continue
    }
    const content = deps.read(hit.path)
    if (content === undefined) continue
    seen.add(hit.path)
    lexicalSeeds.push({ path: hit.path, score: hit.score })
    const excerpt = matchExcerpt(content, hit.terms)
    candidates.push({
      path: hit.path,
      title: titleOf(hit.path),
      stage: 'lexical',
      // S08b (owner bench round 4: "we don't know what content of the
      // request has matched"): the WORDS first, then where they were.
      reason: `${hit.terms.map((term) => `“${term}”`).join(' ')} in ${hit.fields
        .map((field) => field.field)
        .join(', ')}`,
      score: hit.score,
      excerpt,
      tokens: estimateTokens(excerpt)
    })
  }

  // ---- rung 2: the typed neighbourhood --------------------------------
  const seeds = [
    ...lexicalSeeds.slice(0, 5),
    ...(scope.paths ?? []).filter(inScope).map((path) => ({ path, score: 1 }))
  ]
  if (hops > 0 && seeds.length > 0) {
    const expanded = expandOverGraph(deps.graph, seeds, { hops, limit: entryLimit })
    if (expanded.length > 0) stages.push('link')
    const bestLexical = lexicalSeeds[0]?.score ?? 0
    for (const node of expanded) {
      considered += 1
      const machinery = machineryOf(node.path)
      if (machinery) {
        omitted.push({ path: node.path, reason: machinery })
        continue
      }
      if (bestLexical > 0 && node.score < bestLexical * LINK_SCORE_FLOOR) {
        omitted.push({ path: node.path, reason: 'threshold' })
        continue
      }
      if (!inScope(node.path)) {
        omitted.push({ path: node.path, reason: 'scope' })
        continue
      }
      if (seen.has(node.path)) {
        omitted.push({ path: node.path, reason: 'duplicate' })
        continue
      }
      const content = deps.read(node.path)
      if (content === undefined) continue
      seen.add(node.path)
      const excerpt = leadOf(content)
      candidates.push({
        path: node.path,
        title: titleOf(node.path),
        stage: 'link',
        reason: explainStep(node.via, titleOf(node.via.from)),
        score: node.score,
        excerpt,
        tokens: estimateTokens(excerpt)
      })
    }
  }

  // ---- the budget bites last, and says so -----------------------------
  const ordered = [...candidates].sort((a, b) => stageRank(a) - stageRank(b) || b.score - a.score)
  const entries: ContextEntry[] = []
  let contextTokens = 0
  for (const entry of ordered) {
    if (entries.length >= entryLimit) {
      omitted.push({ path: entry.path, reason: 'threshold' })
      continue
    }
    if (contextTokens + entry.tokens > maxTokens) {
      omitted.push({ path: entry.path, reason: 'budget' })
      continue
    }
    entries.push(entry)
    contextTokens += entry.tokens
  }

  // `qu'est-ce` is indexed BOTH as the welded form `qu-est-ce` and as
  // its parts. Reporting the welded form as "not in the vault" when
  // every part matched shows the user a tokenizer artifact and calls it
  // a gap (owner bench round 2).
  const missingTerms = parsed.terms.filter(
    (term) =>
      !matchedTerms.has(term) &&
      !(
        term.includes('-') &&
        term.split('-').every((part) => part.length < 2 || matchedTerms.has(part))
      )
  )
  return {
    id: deps.id ?? `packet-${Date.now()}`,
    query: request.query,
    scope,
    strategy: (scope.paths?.length ?? 0) > 0 ? 'selection-first' : 'lexical-first',
    retrieval: {
      stages,
      candidates: considered,
      selected: entries.length,
      contextTokens
    },
    budget: {
      maxTokens,
      policy: `cheapest-sufficient (33 ladder) · ${sensitivity}`
    },
    coverage: {
      verdict:
        matchedTerms.size === 0 ? 'empty' : missingTerms.length === 0 ? 'covered' : 'thin',
      matchedTerms: [...matchedTerms].sort(),
      missingTerms
    },
    entries,
    omitted
  }
}

/**
 * The packet as READ-ONLY reference selections for an AI operation
 * (CP-MVP-010 S07). Direct entries are dropped: what the user already
 * had open is already in the operation's own selections, and sending it
 * twice would pay twice for it.
 *
 * The excerpt is what travels, not the whole note — the budget was
 * decided when the packet was compiled, and re-reading files here would
 * quietly undo it.
 */
export function referenceSelectionsOf(packet: ContextPacket): {
  relPath: string
  kind: 'text'
  content: string
  range: { from: number; to: number }
}[] {
  return packet.entries
    .filter((entry) => entry.stage !== 'direct')
    .map((entry) => ({
      relPath: entry.path,
      kind: 'text' as const,
      content: entry.excerpt,
      range: { from: 0, to: entry.excerpt.length }
    }))
}

/**
 * `lexical:notes/a.md|link:notes/b.md` — the packet's SHAPE, small
 * enough to live on a transcript heading (S08d). Excerpts and scores
 * stay session-only: figures persist, prompts never do, and a
 * transcript should not become a second copy of the vault.
 */
export function serializePacketMeta(packet: ContextPacket): string | null {
  if (packet.entries.length === 0) return null
  return packet.entries
    .map((entry) => `${entry.stage}:${entry.path.replace(/[|<>]/g, '')}`)
    .join('|')
}

export function parsePacketMeta(raw: string): { stage: string; path: string }[] | null {
  const parsed: { stage: string; path: string }[] = []
  for (const piece of raw.split('|')) {
    const match = /^\s*(direct|lexical|link):(.+?)\s*$/.exec(piece)
    if (!match) return null
    parsed.push({ stage: match[1] as string, path: match[2] as string })
  }
  return parsed.length > 0 ? parsed : null
}

/** Direct entries first, then whatever scored highest. */
function stageRank(entry: ContextEntry): number {
  return entry.stage === 'direct' ? 0 : entry.stage === 'lexical' ? 1 : 2
}

/** The note's opening — what a human would read first. */
function leadOf(content: string): string {
  const body = content.startsWith('---\n')
    ? content.slice(Math.max(content.indexOf('\n---', 4), 0) + 4)
    : content
  const lines = body
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'))
  return lines.join('\n').slice(0, MAX_EXCERPT_CHARS)
}

/** The matching lines, which is what makes a lexical entry inspectable:
 *  the reader can see the words that earned it. */
function matchExcerpt(content: string, terms: readonly string[]): string {
  const matches = extractMatches(content, terms, { maxMatches: 4, maxExcerpt: 200 })
  if (matches.length === 0) return leadOf(content)
  return matches
    .map((match) => match.excerpt)
    .join('\n')
    .slice(0, MAX_EXCERPT_CHARS)
}
