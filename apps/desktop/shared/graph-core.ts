import { parseEdges } from './edge-grammar'

/**
 * Graph core (CP-MVP-009 S06): the PURE heart of the nodes/edges
 * index — node kinds, wikilink resolution, H1 titles, and the full
 * index builder. Shared by the renderer surfaces AND the main-side
 * index seat so classification and resolution can never fork per
 * process (the edge-grammar precedent). Zero dependencies (15).
 *
 * The index is a REBUILDABLE PROJECTION of the vault files (04/33):
 * building twice from the same files yields byte-identical JSON, and
 * the read contract is a clean projection — consumers (backlinks,
 * retrieval, the future studio) read, never own.
 */

export type LinkKind =
  | 'note'
  | 'folder'
  | 'chat'
  | 'prompt'
  | 'pdf'
  | 'pdf-anchor'
  | 'web'
  | 'capture'
  | 'source'
  | 'media'

const MEDIA_EXT_RE = /\.(png|jpe?g|gif|webp|avif|mp3|wav|m4a|ogg|mp4|webm)$/

/** Node kind from a link target string (href or resolved vault path).
 *  Returns null for targets that are NOT graph edges and stay plain:
 *  same-document hashes, mailto, empty. */
export function classifyLinkKind(href: string): LinkKind | null {
  if (href === '' || href.startsWith('#') || /^mailto:/i.test(href)) return null
  const raw = href.toLowerCase()
  if (/^https?:/.test(raw)) return 'web'
  const [path = '', hash = ''] = raw.split('#')
  if (path.includes('sources/pdf/')) {
    return hash.includes('page=') ? 'pdf-anchor' : 'pdf'
  }
  if (path.includes('sources/web/')) return 'web'
  if (path.includes('sources/captures/')) return 'capture'
  if (path.endsWith('source.md')) return 'source'
  if (path.endsWith('.pdf')) return 'pdf'
  if (MEDIA_EXT_RE.test(path)) return 'media'
  if (path.endsWith('/index.md') || path === 'index.md') return 'folder'
  if (path.startsWith('chats/') || path.includes('/chats/')) return 'chat'
  if (path.startsWith('prompts/') || path.includes('/prompts/')) return 'prompt'
  return 'note'
}

/** A wikilink resolution candidate, proximity-ordered by the caller
 *  (nearest wins, the house rule). `title` = the note's H1 when the
 *  index provided it. */
export type WikiCandidate = { name: string; relPath: string; title?: string }

/** Resolve a `[[target]]` against proximity-ordered candidates:
 *  a target with `/` matches its vault-relative path (`.md` optional),
 *  a bare target matches the filename stem — both case-insensitive,
 *  first (= nearest) match wins. Null = broken (diagnostic). */
export function resolveWikiTarget(
  candidates: readonly WikiCandidate[],
  target: string
): string | null {
  const needle = target.trim().toLowerCase()
  if (needle.length === 0) return null
  if (needle.includes('/')) {
    const withMd = needle.endsWith('.md') ? needle : `${needle}.md`
    for (const c of candidates) {
      if (c.relPath.toLowerCase() === withMd) return c.relPath
    }
    return null
  }
  for (const c of candidates) {
    if (c.name.toLowerCase() === needle) return c.relPath
  }
  return null
}

/** The note's REAL name for graph sentences (S05e owner: "utiliser
 *  les titres 1 de note (#) plutôt que le nom de fichier"): the H1
 *  when the note has one, else its FIRST heading of any level (S06b:
 *  the owner's generated notes open on `## Title` — the intent is
 *  "the note's title", not the hash count), else null (caller falls
 *  back to the filename stem). Headings inside fenced code are not
 *  titles. */
export function firstHeadingOf(content: string): string | null {
  let inFence = false
  let firstAny: string | null = null
  for (const line of content.split('\n')) {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence
      continue
    }
    if (inFence) continue
    // Up to THREE leading spaces still open a heading (CommonMark) —
    // S07b: the owner's `ethos.md` starts with " # L'ethos", which
    // markdown-it renders as an H1 while a start-anchored rule saw
    // prose, so the note fell back to its filename everywhere titles
    // are shown. A closing hash run ("# Title #") is decoration.
    const match = /^ {0,3}(#{1,6})[ \t]+(.+?)(?:[ \t]+#+)?[ \t]*$/.exec(line)
    if (!match) continue
    if (match[1]!.length === 1) return match[2]!
    if (firstAny === null) firstAny = match[2]!
  }
  return firstAny
}

const stemOf = (path: string): string =>
  (path.split('/').pop() ?? path).replace(/\.md$/i, '')

const stripFrontmatter = (content: string): string => {
  if (!content.startsWith('---\n')) return content
  const end = content.indexOf('\n---', 4)
  return end === -1 ? content : content.slice(content.indexOf('\n', end + 1) + 1)
}

/** Bundle contract files never resolve as wikilink candidates (the @
 *  menu rule, S07e-e: the contract is protected, not the location). */
const BUNDLE_CONTRACT_FILES = new Set([
  'source.md',
  'index.md',
  'extracted.md',
  'transcript.md',
  'reader.md'
])

const sharedDepth = (a: string[], b: string[]): number => {
  let shared = 0
  while (shared < a.length && shared < b.length && a[shared] === b[shared]) {
    shared += 1
  }
  return shared
}

/** The wikilink candidates for edges authored in `subjectPath`,
 *  nearest-wins ordered exactly like the renderer's @ menu provider:
 *  current folder first, then up toward the root; shallower paths
 *  first within a level, then by name. */
export function wikiCandidatesFor(
  subjectPath: string,
  nodes: readonly GraphNode[]
): WikiCandidate[] {
  const subjectDir = subjectPath.split('/').slice(0, -1)
  const bundleDirs = new Set(
    nodes
      .filter((node) => (node.path.split('/').pop() ?? '') === 'source.md')
      .map((node) => node.path.split('/').slice(0, -1).join('/'))
  )
  return nodes
    .filter((node) => {
      if (node.path === subjectPath) return false
      const dir = node.path.split('/').slice(0, -1).join('/')
      const name = node.path.split('/').pop() ?? ''
      if (bundleDirs.has(dir) && BUNDLE_CONTRACT_FILES.has(name)) return false
      return true
    })
    .map((node) => ({
      name: stemOf(node.path),
      relPath: node.path,
      ...(node.title !== stemOf(node.path) ? { title: node.title } : {})
    }))
    .sort((a, b) => {
      const proximity =
        sharedDepth(b.relPath.split('/').slice(0, -1), subjectDir) -
        sharedDepth(a.relPath.split('/').slice(0, -1), subjectDir)
      if (proximity !== 0) return proximity
      const depth = a.relPath.split('/').length - b.relPath.split('/').length
      if (depth !== 0) return depth
      return a.name.localeCompare(b.name)
    })
}

/* ------------------------------------------------------------------ */
/* The index                                                           */
/* ------------------------------------------------------------------ */

export type GraphNode = {
  /** Vault-relative path. */
  path: string
  kind: LinkKind
  /** H1 when present, filename stem otherwise. */
  title: string
}

export type GraphEdge = {
  /** Vault-relative path of the authoring note. */
  subject: string
  /** Resolved vault-relative path; null = unresolved or external. */
  object: string | null
  /** The raw target as written (wiki stem or href). */
  targetRaw: string
  /** http(s) targets — never counted as broken. */
  external: boolean
  /** null = untyped edge. */
  label: string | null
  reverse: boolean
  line: number
  col: number
}

export type GraphIndex = {
  version: 1
  nodes: GraphNode[]
  edges: GraphEdge[]
  /** Label registry with usage counts — the owner's vocabulary. */
  labels: Record<string, number>
  /** Unresolved wikilinks: diagnostics, never auto-repair (20). */
  broken: { subject: string; targetRaw: string; line: number }[]
}

export type VaultFileInput = { path: string; content: string }

/** Build the whole index from vault files — PURE and deterministic:
 *  the same files yield byte-identical JSON (the delete→rebuild
 *  round-trip test relies on it, 03). */
export function buildGraphIndex(files: readonly VaultFileInput[]): GraphIndex {
  const sorted = [...files].sort((a, b) => a.path.localeCompare(b.path))
  const nodes: GraphNode[] = sorted.map((file) => ({
    path: file.path,
    kind: classifyLinkKind(file.path) ?? 'note',
    title: firstHeadingOf(stripFrontmatter(file.content)) ?? stemOf(file.path)
  }))
  const edges: GraphEdge[] = []
  for (const file of sorted) {
    const candidates = wikiCandidatesFor(file.path, nodes)
    for (const parsed of parseEdges(stripFrontmatter(file.content))) {
      const external = /^https?:/i.test(parsed.target)
      let object: string | null = null
      if (parsed.kind === 'wikilink') {
        object = resolveWikiTarget(candidates, parsed.target)
      } else if (!external && !/^mailto:/i.test(parsed.target)) {
        object = resolveRelativeTarget(file.path, parsed.target)
      }
      edges.push({
        subject: file.path,
        object,
        targetRaw: parsed.target,
        external,
        label: parsed.decoration?.label ?? null,
        reverse: parsed.decoration?.reverse ?? false,
        line: parsed.line,
        col: parsed.col
      })
    }
  }
  const labels: Record<string, number> = {}
  for (const edge of edges) {
    if (edge.label !== null) labels[edge.label] = (labels[edge.label] ?? 0) + 1
  }
  const broken = edges
    .filter((edge) => edge.object === null && !edge.external && !edge.targetRaw.startsWith('#') && !/^mailto:/i.test(edge.targetRaw))
    .map((edge) => ({
      subject: edge.subject,
      targetRaw: edge.targetRaw,
      line: edge.line
    }))
  const orderedLabels: Record<string, number> = {}
  for (const key of Object.keys(labels).sort()) orderedLabels[key] = labels[key]!
  return { version: 1, nodes, edges, labels: orderedLabels, broken }
}

/** Vault-relative resolution of an md-link href against its note —
 *  the read pipeline's rules: relative only, `..` never escapes.
 *  Exported since S06b: graph sentences resolve md-link targets to
 *  their node title the same way the index does. */
export function resolveRelativeTarget(
  notePath: string,
  href: string
): string | null {
  const pathPart = href.split('#')[0] ?? ''
  let decoded = pathPart
  try {
    decoded = decodeURIComponent(pathPart)
  } catch {
    /* keep raw */
  }
  if (decoded.length === 0 || decoded.startsWith('/')) return null
  const segments = notePath.split('/').slice(0, -1)
  for (const part of decoded.split('/')) {
    if (part === '' || part === '.') continue
    if (part === '..') {
      if (segments.length === 0) return null
      segments.pop()
      continue
    }
    segments.push(part)
  }
  return segments.length > 0 ? segments.join('/') : null
}

/** Vault-wide label vocabulary, most-used first (ties alphabetical) —
 *  the autocomplete source S06 upgrades from document-local. */
export function vocabularyOf(index: GraphIndex): string[] {
  return Object.entries(index.labels)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([label]) => label)
}
