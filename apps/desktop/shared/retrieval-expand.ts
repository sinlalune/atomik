import type { GraphIndex } from './graph-core'

/**
 * Link expansion (CP-MVP-010 S04) — rung 1 of bedrock 33's ladder that
 * only Atomik can climb: the vault's own typed edges. Lexical retrieval
 * finds the notes that CONTAIN the words; expansion finds the notes the
 * author already said were related, which is the whole point of having
 * spent CP-MVP-009 making those edges real.
 *
 * PURE: it reads a `GraphIndex` and returns paths with reasons. No
 * filesystem, no scoring of text, no opinions about what the packet does
 * with the result — S05 decides that, the studio may reuse this later
 * (brainstorm 2026-08-04: the canvas projects the same tables).
 */

export type ExpansionSeed = {
  path: string
  /** The seed's own relevance — a lexical score, usually. */
  score: number
}

export type ExpansionOptions = {
  /** How far to walk. 1 = direct neighbours only (the default). */
  hops?: number
  /** Maximum expanded paths returned. */
  limit?: number
  /** Per-hop attenuation: a neighbour of a neighbour matters less. */
  decay?: number
  /** Per-label multipliers — the owner's vocabulary is the owner's, so
   *  this stays data, never a built-in ontology (ADR-011). */
  labelWeights?: Readonly<Record<string, number>>
  /** Weight of an UNTYPED link. A typed edge is a stronger statement of
   *  relatedness than a bare mention, so it defaults lower. */
  untypedWeight?: number
}

/** One traversable edge end, as the walk sees it. */
export type AdjacencyEntry = {
  /** The node on the other end. */
  to: string
  label: string | null
  direction: 'outbound' | 'inbound'
}

export type ExpansionStep = {
  /** The node this one was reached FROM. */
  from: string
  /** The edge's label, null for an untyped link. */
  label: string | null
  /** Direction TRAVELLED, seen from `from`: an edge is stored once,
   *  directed, but relatedness reads both ways (CP-MVP-009's direction
   *  doctrine — `{^label}` flips the reading, not the storage). */
  direction: 'outbound' | 'inbound'
}

export type ExpandedNode = {
  path: string
  /** Summed contributions: a note reached from several seeds is more
   *  relevant than one reached from a single seed. */
  score: number
  /** Distance from the nearest seed that reached it. */
  hop: number
  /** The single strongest way it was reached — what the packet shows as
   *  "why this entry". */
  via: ExpansionStep
}

export const DEFAULT_HOPS = 1
export const DEFAULT_LIMIT = 12
export const DEFAULT_DECAY = 0.4
export const DEFAULT_UNTYPED_WEIGHT = 0.8

type Adjacency = Map<string, AdjacencyEntry[]>

/**
 * Both directions of every RESOLVED internal edge. External targets
 * (http(s)) and unresolved ones are left out: expansion exists to find
 * more vault material to read, and neither of those is a file.
 */
export function adjacencyOf(index: GraphIndex): Adjacency {
  const adjacency: Adjacency = new Map()
  const push = (node: string, entry: AdjacencyEntry): void => {
    const list = adjacency.get(node)
    if (list) list.push(entry)
    else adjacency.set(node, [entry])
  }
  for (const edge of index.edges) {
    if (edge.object === null || edge.external) continue
    // From the subject the edge points OUT; from the object it comes IN.
    push(edge.subject, { to: edge.object, label: edge.label, direction: 'outbound' })
    push(edge.object, { to: edge.subject, label: edge.label, direction: 'inbound' })
  }
  return adjacency
}

/**
 * The neighbourhood of a set of seeds, ordered by relevance.
 *
 * Seeds themselves never come back — the caller already has them — and
 * the walk is breadth-first so `hop` is a real distance rather than the
 * order the edges happened to be stored in.
 *
 * KNOWN LIMIT, for the S10 evaluation set rather than for a guess now:
 * summing contributions rewards a note connected to several seeds, and
 * also rewards a hub that links everything (a folder's `index.md`). If
 * the evaluation shows hubs crowding out real answers, the fix is a
 * degree penalty here, measured — not a threshold invented today.
 */
export function expandOverGraph(
  index: GraphIndex,
  seeds: readonly ExpansionSeed[],
  options: ExpansionOptions = {}
): ExpandedNode[] {
  const hops = options.hops ?? DEFAULT_HOPS
  const decay = options.decay ?? DEFAULT_DECAY
  const untyped = options.untypedWeight ?? DEFAULT_UNTYPED_WEIGHT
  const labelWeights = options.labelWeights ?? {}
  if (hops < 1 || seeds.length === 0) return []

  const adjacency = adjacencyOf(index)
  const seedPaths = new Set(seeds.map((seed) => seed.path))
  const found = new Map<string, ExpandedNode>()
  /** Best SINGLE contribution per node — the one worth explaining, kept
   *  apart from the accumulated score. */
  const best = new Map<string, number>()

  // (node, its score at this hop) — BFS, one hop at a time.
  let frontier = seeds.map((seed) => ({ path: seed.path, score: seed.score }))
  const visited = new Set(seedPaths)

  for (let hop = 1; hop <= hops && frontier.length > 0; hop += 1) {
    const next = new Map<string, number>()

    for (const node of frontier) {
      for (const entry of adjacency.get(node.path) ?? []) {
        const neighbour = entry.to
        if (seedPaths.has(neighbour)) continue
        const weight =
          entry.label === null ? untyped : (labelWeights[entry.label] ?? 1)
        const contribution = node.score * decay ** (hop - 1) * weight
        if (contribution <= 0) continue
        const via = { from: node.path, label: entry.label, direction: entry.direction }

        const existing = found.get(neighbour)
        if (existing) {
          existing.score += contribution
          if (contribution > (best.get(neighbour) ?? 0)) existing.via = via
        } else {
          found.set(neighbour, { path: neighbour, score: contribution, hop, via })
        }
        best.set(neighbour, Math.max(best.get(neighbour) ?? 0, contribution))
        if (!visited.has(neighbour)) {
          next.set(neighbour, Math.max(next.get(neighbour) ?? 0, contribution))
        }
      }
    }

    for (const path of next.keys()) visited.add(path)
    frontier = [...next].map(([path, score]) => ({ path, score }))
  }

  return [...found.values()]
    .sort((a, b) => b.score - a.score || (a.path < b.path ? -1 : 1))
    .slice(0, options.limit ?? DEFAULT_LIMIT)
}

/** How the packet phrases an expansion in one line: "linked from X". */
export function explainStep(step: ExpansionStep, title: string): string {
  if (step.label === null) {
    return step.direction === 'outbound' ? `linked from ${title}` : `links to ${title}`
  }
  return step.direction === 'outbound'
    ? `${title} · ${step.label}`
    : `${step.label} · ${title}`
}
