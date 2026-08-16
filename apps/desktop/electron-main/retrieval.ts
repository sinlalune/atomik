import { mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { extname, join } from 'node:path'
import {
  buildRetrievalIndex,
  patchRetrievalIndex,
  serializeRetrievalIndex,
  type RetrievalDocInput,
  type RetrievalIndex,
  type RetrievalPatch
} from '../shared/retrieval-core'
import {
  compileContextPacket,
  type ContextPacket,
  type ContextScope,
  type PacketRequest
} from '../shared/context-packet'
import { readGraphIndex } from './graph-index'
import { atomicWrite } from './vault'

/**
 * The retrieval index seat (CP-MVP-010 S03) — the I/O half of ADR-013's
 * engine, the sibling of `graph-index.ts`. It owns collection, caching,
 * incremental maintenance and persistence; all the thinking lives in the
 * pure `retrieval-core`.
 *
 * Lifecycle, the same three rules the graph index obeys (03/04/33):
 *
 * ```text
 * LAZY         nothing scans on app open; the first query builds
 * REBUILDABLE  delete .atomik/index/retrieval.json and the next read
 *              reproduces it byte-identical from the vault alone
 * INCREMENTAL  a save patches ONE document instead of rescanning the
 *              vault — the closing-ceremony ruling that a retrieval
 *              index rebuilt wholesale on every keystroke-save is the
 *              wrong shape
 * ```
 *
 * Cached PER ROOT, because the same engine serves two perimeters: the
 * vault and the read-only docs bundle (dev docs), which have different
 * roots and different lifetimes.
 */

const MAX_INDEXED_BYTES = 2 * 1024 * 1024
const INDEX_DIR = 'index'
const INDEX_FILE = 'retrieval.json'
const DENIED_SEGMENTS = new Set(['.git', '.atomik', 'node_modules'])

type Entry = { index: RetrievalIndex; dirty: boolean }

const cache = new Map<string, Entry>()

/** Drops a root's index (or every root). The next read rebuilds. */
export function invalidateRetrievalIndex(root?: string): void {
  if (root === undefined) cache.clear()
  else cache.delete(root)
}

/**
 * The current index for a root — cached, else built from its files.
 * `stateDir` opts the root into persistence; the docs perimeter passes
 * nothing and stays in memory, since it is rebuilt from files that ship
 * with the app.
 */
export function readRetrievalIndex(root: string, stateDir?: string): RetrievalIndex {
  const cached = cache.get(root)
  if (cached) {
    if (cached.dirty && stateDir !== undefined) persist(cached.index, stateDir)
    return cached.index
  }
  const index = buildRetrievalIndex(collectDocs(root))
  cache.set(root, { index, dirty: false })
  if (stateDir !== undefined) persist(index, stateDir)
  return index
}

/**
 * Applies file changes to a cached index. Nothing to do when the root has
 * no index yet: an absent index is already correct, and building one here
 * would put a vault scan on the write path — exactly what this step
 * removes. The persist waits for the next read (a save is not a reason to
 * touch the disk twice).
 */
export function patchRetrievalIndexFor(
  root: string,
  patches: readonly RetrievalPatch[]
): void {
  const entry = cache.get(root)
  if (!entry || patches.length === 0) return
  cache.set(root, { index: patchRetrievalIndex(entry.index, patches), dirty: true })
}

/** The patch describing one vault file as it is on disk right now —
 *  read here so callers never carry file contents around. */
export function patchFor(root: string, relPath: string): RetrievalPatch {
  const abs = join(root, ...relPath.split('/'))
  try {
    const stats = statSync(abs)
    if (!stats.isFile()) return { path: relPath, removed: true }
    if (extname(relPath).toLowerCase() !== '.md' || stats.size > MAX_INDEXED_BYTES) {
      return { path: relPath }
    }
    return { path: relPath, content: readFileSync(abs, 'utf8') }
  } catch {
    return { path: relPath, removed: true }
  }
}

function persist(index: RetrievalIndex, stateDir: string): void {
  try {
    const dir = join(stateDir, INDEX_DIR)
    mkdirSync(dir, { recursive: true })
    atomicWrite(join(dir, INDEX_FILE), serializeRetrievalIndex(index))
    for (const entry of cache.values()) if (entry.index === index) entry.dirty = false
  } catch {
    /* the file is a disposable projection — memory serves the read */
  }
}

/**
 * Every file under the root, markdown read and the rest carried by path
 * alone — the same rule the graph index follows (S07d): a snapshot is a
 * real thing in the vault and deserves to be findable by name, even
 * though it carries no text to index.
 */
function collectDocs(root: string): RetrievalDocInput[] {
  const files: RetrievalDocInput[] = []
  const walk = (dir: string, relPath: string, depth: number): void => {
    if (depth > 24) return
    let entries
    try {
      entries = readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      if (entry.name.startsWith('.') || DENIED_SEGMENTS.has(entry.name)) continue
      const abs = join(dir, entry.name)
      const rel = relPath === '' ? entry.name : `${relPath}/${entry.name}`
      if (entry.isDirectory()) {
        walk(abs, rel, depth + 1)
        continue
      }
      if (!entry.isFile()) continue
      if (extname(entry.name).toLowerCase() !== '.md') {
        files.push({ path: rel })
        continue
      }
      try {
        if (statSync(abs).size > MAX_INDEXED_BYTES) continue
        files.push({ path: rel, content: readFileSync(abs, 'utf8') })
      } catch {
        files.push({ path: rel }) // unreadable: findable by path alone
      }
    }
  }
  walk(root, '', 0)
  return files
}

/**
 * The packet compiler as the app calls it (CP-MVP-010 S05): the two
 * cached projections plus a bounded vault reader, handed to the pure
 * compiler. Shaped as the `search_vault` tool contract from the start —
 * CP-MVP-011 adds the model-driven loop over THIS, not a second door.
 */
export function compileVaultContextPacket(
  vaultRoot: string,
  stateDir: string,
  request: PacketRequest
): ContextPacket {
  return compileContextPacket(request, {
    index: readRetrievalIndex(vaultRoot, stateDir),
    graph: readGraphIndex(vaultRoot, stateDir),
    read: (relPath) => {
      const abs = join(vaultRoot, ...relPath.split('/'))
      try {
        if (statSync(abs).size > MAX_INDEXED_BYTES) return undefined
        return readFileSync(abs, 'utf8')
      } catch {
        return undefined
      }
    }
  })
}

/**
 * Renderer input, validated in main (13). A packet request is
 * read-only, but "read-only" is not "unvalidated": the query is bounded,
 * the scope folder goes through the same lexical containment as search,
 * and rung-0 paths are filtered rather than trusted.
 */
export function toPacketRequest(raw: unknown): PacketRequest {
  if (typeof raw !== 'object' || raw === null) throw new Error('packet: rejected request')
  const value = raw as Record<string, unknown>
  if (typeof value['query'] !== 'string') throw new Error('packet: rejected query')
  const query = value['query'].trim()
  if (query.length === 0 || query.length > MAX_QUERY) {
    throw new Error('packet: rejected query')
  }

  const scopeValue = value['scope']
  let scope: ContextScope | undefined
  if (scopeValue !== undefined && scopeValue !== null) {
    if (typeof scopeValue !== 'object') throw new Error('packet: rejected scope')
    const raws = scopeValue as Record<string, unknown>
    // The same containment rule `resolveSearchScope` applies, spelled
    // out here rather than imported: search.ts already depends on this
    // module for the index, and a cycle between them would be a worse
    // trade than four lines.
    const rawFolder = raws['folder']
    let folder: string | undefined
    if (rawFolder !== undefined && rawFolder !== null) {
      if (typeof rawFolder !== 'string' || !isSafeRelPath(rawFolder)) {
        throw new Error('packet: rejected scope')
      }
      folder = rawFolder
    }
    const paths = Array.isArray(raws['paths'])
      ? raws['paths']
          .filter((path): path is string => typeof path === 'string')
          .slice(0, MAX_DIRECT_PATHS)
          .filter((path) => isSafeRelPath(path))
      : undefined
    scope = { ...(folder === undefined ? {} : { folder }), ...(paths ? { paths } : {}) }
  }

  const sensitivity = value['sensitivity']
  if (
    sensitivity !== undefined &&
    sensitivity !== 'titles' &&
    sensitivity !== 'linked' &&
    sensitivity !== 'full'
  ) {
    throw new Error('packet: rejected sensitivity')
  }

  return {
    query,
    ...(scope ? { scope } : {}),
    ...(sensitivity ? { sensitivity } : {}),
    ...(boundedNumber(value['maxTokens'], 1, 32_000) ?? {}),
    ...(boundedNumber(value['hops'], 0, 3, 'hops') ?? {}),
    ...(boundedNumber(value['limit'], 1, 50, 'limit') ?? {})
  }
}

const MAX_QUERY = 500
const MAX_DIRECT_PATHS = 20

/** Same containment rule the vault verbs use: relative, no traversal,
 *  no hidden or denied segment. */
function isSafeRelPath(path: string): boolean {
  if (path.length === 0 || path.length > 500) return false
  if (path.includes('\\') || path.includes('\0') || path.startsWith('/')) return false
  return path
    .split('/')
    .every(
      (segment) =>
        segment.length > 0 &&
        segment !== '.' &&
        segment !== '..' &&
        !segment.startsWith('.') &&
        !DENIED_SEGMENTS.has(segment)
    )
}

function boundedNumber(
  value: unknown,
  min: number,
  max: number,
  key: 'maxTokens' | 'hops' | 'limit' = 'maxTokens'
): Record<string, number> | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined
  return { [key]: Math.min(Math.max(Math.round(value), min), max) }
}
