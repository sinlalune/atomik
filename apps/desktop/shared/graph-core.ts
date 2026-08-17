import { parseEdges } from './edge-grammar'
import type {
  WikidataEntity,
  WikimediaSource
} from './wikimedia'

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
  | 'web-source'
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
  if (path.includes('sources/web/')) return 'web-source'
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
    // A heading may carry an HTML comment the app writes for itself —
    // a chat turn heading is `## you <!-- sent: system=1042|… -->`.
    // That is machine bookkeeping, not part of anyone's title
    // (CP-MVP-010 S07c: it was reaching the packet, the pills and the
    // relations strip as if it were one).
    const heading = (match[2] as string).replace(/<!--[\s\S]*?-->/g, '').trim()
    if (heading.length === 0) continue
    if (match[1]!.length === 1) return heading
    if (firstAny === null) firstAny = heading
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
      // S07d: the index now holds non-markdown files too (a snapshot
      // and an original ARE nodes of the graph) — but a `[[link]]`
      // still resolves to NOTES only (the S03 rule).
      if (!/\.md$/i.test(node.path)) return false
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
  /** H1 when present, filename stem otherwise. Inside a source
   *  BUNDLE this is the SOURCE's name (S07d owner bench: "display
   *  more information about the source name and the different
   *  forms") — every form of one source shares it. */
  title: string
  /** Which FORM of a source bundle this file is — 'dossier',
   *  'snapshot', 'reader text', 'media' … Absent for ordinary notes,
   *  which are not a form of anything. */
  form?: string
}

export type GraphEdge = {
  /** Vault-relative path of the authoring note. */
  subject: string
  /** Resolved node id: vault-relative in the canonical index, canonical URL
   *  in a transient external projection; null = unresolved/external leaf. */
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

/**
 * A live graph layer (CP-MVP-011 S03). It reuses GraphIndex shapes so graph
 * consumers do not fork, but carries provenance separately and is never the
 * value persisted by graph-index.ts. URLs are node ids; no fake vault paths.
 */
export type ExternalGraphProjection = {
  graph: GraphIndex
  provenance: Array<{ node: string; source: WikimediaSource }>
}

const wikidataNodeUrl = (id: string): string =>
  `https://www.wikidata.org/wiki/${encodeURIComponent(id)}`

export function wikidataGraphProjectionOf(
  entities: readonly WikidataEntity[]
): ExternalGraphProjection {
  const nodes = new Map<string, GraphNode>()
  const edges: GraphEdge[] = []
  const provenance: Array<{ node: string; source: WikimediaSource }> = []

  for (const entity of entities) {
    const subject = wikidataNodeUrl(entity.id)
    nodes.set(subject, { path: subject, kind: 'web', title: entity.label })
    provenance.push({ node: subject, source: entity.source })
    for (const statement of entity.statements) {
      if (statement.value.kind !== 'entity') continue
      const object = wikidataNodeUrl(statement.value.id)
      nodes.set(object, {
        path: object,
        kind: 'web',
        title: statement.value.label ?? statement.value.id
      })
      edges.push({
        subject,
        object,
        targetRaw: object,
        external: true,
        label: statement.propertyLabel,
        reverse: false,
        line: 0,
        col: edges.length
      })
    }
  }

  const labels: Record<string, number> = {}
  for (const edge of edges) {
    if (edge.label !== null) labels[edge.label] = (labels[edge.label] ?? 0) + 1
  }
  const orderedLabels: Record<string, number> = {}
  for (const label of Object.keys(labels).sort()) orderedLabels[label] = labels[label]!
  return {
    graph: {
      version: 1,
      nodes: [...nodes.values()].sort((a, b) => a.path.localeCompare(b.path)),
      edges: edges.sort(
        (a, b) =>
          a.subject.localeCompare(b.subject) ||
          (a.label ?? '').localeCompare(b.label ?? '') ||
          a.targetRaw.localeCompare(b.targetRaw)
      ),
      labels: orderedLabels,
      broken: []
    },
    provenance: provenance.sort((a, b) => a.node.localeCompare(b.node))
  }
}

/** Pure, session-only view merge. Neither input is mutated or persisted. */
export function withExternalGraphProjection(
  base: GraphIndex,
  projection: ExternalGraphProjection
): GraphIndex {
  const nodes = new Map(base.nodes.map((node) => [node.path, node]))
  for (const node of projection.graph.nodes) nodes.set(node.path, node)
  const edges = [...base.edges, ...projection.graph.edges]
  const labels: Record<string, number> = {}
  for (const edge of edges) {
    if (edge.label !== null) labels[edge.label] = (labels[edge.label] ?? 0) + 1
  }
  const orderedLabels: Record<string, number> = {}
  for (const label of Object.keys(labels).sort()) orderedLabels[label] = labels[label]!
  return {
    version: 1,
    nodes: [...nodes.values()],
    edges,
    labels: orderedLabels,
    broken: [...base.broken]
  }
}

/** A vault file. NON-markdown files are nodes too (S07d: a snapshot
 *  and an original are forms of a source, and a link to them is a
 *  real edge) — they simply arrive without content, since only
 *  markdown carries edges. */
export type VaultFileInput = { path: string; content?: string }

/** The frontmatter `title:` — a source bundle's real name lives there
 *  ("Curlew sandpiper - Wikipedia") while its body H1 is the generic
 *  contract heading ("Source dossier"). Quoted or bare, first match. */
export function frontmatterTitleOf(content: string): string | null {
  if (!content.startsWith('---\n')) return null
  const end = content.indexOf('\n---', 4)
  const block = end === -1 ? content : content.slice(4, end)
  const match = /^title:[ \t]*(.+?)[ \t]*$/m.exec(block)
  if (!match) return null
  const raw = match[1]!
  const unquoted = /^(["'])(.*)\1$/.exec(raw)
  const title = (unquoted ? unquoted[2]! : raw).trim()
  return title.length > 0 ? title : null
}

/** What FORM of its bundle a file is: the contract files by name, a
 *  subfolder by its own name (media/…), anything else by its stem. */
function formOf(relPathInBundle: string): string {
  const segments = relPathInBundle.split('/')
  if (segments.length > 1) return segments[0]!
  const name = segments[0]!.toLowerCase()
  if (name === 'source.md') return 'dossier'
  if (name === 'index.md') return 'index'
  if (name === 'reader.md') return 'reader text'
  if (name === 'extracted.md') return 'extracted text'
  if (name === 'transcript.md') return 'transcript'
  if (name.endsWith('.mhtml')) return 'snapshot'
  // any other file: its name WITHOUT the extension ("original.pdf" is
  // the form "original", not "original.pdf")
  return segments[0]!.replace(/\.[^./]+$/, '')
}

/** Build the whole index from vault files — PURE and deterministic:
 *  the same files yield byte-identical JSON (the delete→rebuild
 *  round-trip test relies on it, 03). */
export function buildGraphIndex(files: readonly VaultFileInput[]): GraphIndex {
  const sorted = [...files].sort((a, b) => a.path.localeCompare(b.path))
  // A BUNDLE is a folder holding a source.md; its name comes from that
  // dossier's frontmatter (the source's real name), else its index.md
  // heading, else the folder itself. Every file under it is a FORM of
  // that one source and wears its name (S07d).
  const bundleNames = new Map<string, string>()
  for (const file of sorted) {
    const name = file.path.split('/').pop() ?? ''
    if (name !== 'source.md' && name !== 'index.md') continue
    const dir = file.path.split('/').slice(0, -1).join('/')
    if (dir === '') continue
    const isDossier = name === 'source.md'
    if (!isDossier && bundleNames.has(dir)) continue
    const content = file.content ?? ''
    const named =
      frontmatterTitleOf(content) ??
      firstHeadingOf(stripFrontmatter(content)) ??
      (dir.split('/').pop() ?? dir)
    // source.md wins over index.md; index.md alone names a plain folder
    if (isDossier || !bundleNames.has(dir)) bundleNames.set(dir, named)
  }
  const bundleDirs = new Set(
    sorted
      .filter((file) => (file.path.split('/').pop() ?? '') === 'source.md')
      .map((file) => file.path.split('/').slice(0, -1).join('/'))
  )
  /** The bundle a file belongs to: its own folder, or the nearest
   *  ancestor holding a source.md (so media/ rides its dossier). */
  const bundleOf = (path: string): string | null => {
    const segments = path.split('/').slice(0, -1)
    while (segments.length > 0) {
      const dir = segments.join('/')
      if (bundleDirs.has(dir)) return dir
      segments.pop()
    }
    return null
  }

  const nodes: GraphNode[] = sorted.map((file) => {
    const bundle = bundleOf(file.path)
    if (bundle !== null) {
      return {
        path: file.path,
        kind: classifyLinkKind(file.path) ?? 'note',
        title: bundleNames.get(bundle) ?? (bundle.split('/').pop() ?? bundle),
        form: formOf(file.path.slice(bundle.length + 1))
      }
    }
    const kind = classifyLinkKind(file.path) ?? 'note'
    return {
      path: file.path,
      kind,
      title:
        // A chat transcript's first heading is a TURN (`## you`), which
        // names nobody; its file name is the question that started it,
        // which does (CP-MVP-010 S07c, owner bench round 2 — the strip
        // and the pills were showing `you` for every conversation).
        kind === 'chat'
          ? stemOf(file.path)
          : (firstHeadingOf(stripFrontmatter(file.content ?? '')) ?? stemOf(file.path))
    }
  })
  const edges: GraphEdge[] = []
  for (const file of sorted) {
    // Only markdown carries edges; a snapshot or an image is a node
    // with no outgoing links of its own.
    if (file.content === undefined) continue
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
  // Null prototype: `constructor` is a valid kebab label, and a plain
  // object would count it against Object's own member (S10).
  const labels: Record<string, number> = Object.create(null)
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

/**
 * The index after ONE existing markdown file was saved (CP-MVP-010 S03).
 * Returns null when the change cannot be patched safely — the caller then
 * rebuilds, which is always correct and merely slower.
 *
 * A content save is patchable because the NODE SET does not move: the
 * file's own edges are re-parsed against the same candidates, and its
 * title is recomputed. Everything that would ripple beyond one file is
 * refused instead of approximated:
 *
 * ```text
 * unknown path            a create — the node set changes, rebuild
 * a bundle contract file  source.md / index.md name their whole bundle,
 *                         so every sibling's title could move, rebuild
 * ```
 *
 * Structure changes (create, delete, relocate) keep invalidating the
 * whole index: they are rare, and a wrong graph is worse than a slow one.
 */
export function patchGraphIndexForSave(
  index: GraphIndex,
  path: string,
  content: string
): GraphIndex | null {
  const name = path.split('/').pop() ?? ''
  if (name === 'source.md' || name === 'index.md') return null
  if (!path.toLowerCase().endsWith('.md')) return null
  const nodeIndex = index.nodes.findIndex((node) => node.path === path)
  if (nodeIndex === -1) return null

  const previous = index.nodes[nodeIndex] as GraphNode
  const nodes = [...index.nodes]
  // Inside a bundle the title belongs to the SOURCE, not to this file
  // (S07d), so only a free-standing note retitles itself on save.
  nodes[nodeIndex] =
    previous.form === undefined
      ? { ...previous, title: firstHeadingOf(stripFrontmatter(content)) ?? stemOf(path) }
      : previous

  const candidates = wikiCandidatesFor(path, nodes)
  const rewritten: GraphEdge[] = []
  for (const parsed of parseEdges(stripFrontmatter(content))) {
    const external = /^https?:/i.test(parsed.target)
    let object: string | null = null
    if (parsed.kind === 'wikilink') {
      object = resolveWikiTarget(candidates, parsed.target)
    } else if (!external && !/^mailto:/i.test(parsed.target)) {
      object = resolveRelativeTarget(path, parsed.target)
    }
    rewritten.push({
      subject: path,
      object,
      targetRaw: parsed.target,
      external,
      label: parsed.decoration?.label ?? null,
      reverse: parsed.decoration?.reverse ?? false,
      line: parsed.line,
      col: parsed.col
    })
  }

  // Edges stay in whole-build order — by subject path, then by position —
  // so a patched index is byte-identical to a rebuilt one.
  const edges = [...index.edges.filter((edge) => edge.subject !== path), ...rewritten].sort(
    (a, b) =>
      a.subject.localeCompare(b.subject) || a.line - b.line || a.col - b.col
  )

  const labels: Record<string, number> = Object.create(null)
  for (const edge of edges) {
    if (edge.label !== null) labels[edge.label] = (labels[edge.label] ?? 0) + 1
  }
  const orderedLabels: Record<string, number> = {}
  for (const key of Object.keys(labels).sort()) orderedLabels[key] = labels[key] as number

  const broken = edges
    .filter(
      (edge) =>
        edge.object === null &&
        !edge.external &&
        !edge.targetRaw.startsWith('#') &&
        !/^mailto:/i.test(edge.targetRaw)
    )
    .map((edge) => ({
      subject: edge.subject,
      targetRaw: edge.targetRaw,
      line: edge.line
    }))

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
