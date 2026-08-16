import { readFileSync, statSync } from 'node:fs'
import { extname, join } from 'node:path'
import type { SearchMatch, SearchResult } from '../shared/ipc-contract'
import {
  extractMatches,
  foldTerm,
  searchIndex,
  type RetrievalHit
} from '../shared/retrieval-core'
import { readRetrievalIndex } from './retrieval'

/**
 * Lexical search — the vault-core seat (14). Since CP-MVP-010 S02 this is
 * the I/O half only: it walks the perimeter, hands the files to the PURE
 * `retrieval-core` (BM25, ADR-013), and maps ranked hits back onto the
 * `SearchResult` contract the renderer already speaks. The M1 substring
 * scan it replaces is gone, not doubled — 33's rung 1 is now the engine
 * behind every perimeter: the whole vault, one project bundle (`scope` =
 * validated root-relative folder), and the docs bundle (the dev-docs
 * channel binds it to docsRoot).
 *
 * Results are ordered by SCORE now, not by walk order, and a hit knows
 * which fields earned it. Retrieval relevance is still never truth (04).
 *
 * The index is rebuilt per call here; S03 gives it a cached, incrementally
 * patched seat. That is a performance change, not a contract change.
 */

const DENIED_SEGMENTS = new Set(['.git', '.atomik', 'node_modules'])
const MAX_QUERY = 200
const MAX_SCOPE = 500
const MAX_RESULTS = 100
const MAX_MATCHES_PER_FILE = 6
const MAX_FILE_BYTES = 10 * 1024 * 1024
const MAX_EXCERPT = 160

/**
 * Validates a renderer-supplied scope folder (13: IPC input). Returns the
 * ''-rooted relative folder, or throws. Purely lexical containment: no
 * absolute paths, no backslash/NUL, no '.'/'..' segments, no denied or
 * hidden segments — the walk then starts at root/<scope>.
 */
export function resolveSearchScope(scope: unknown): string {
  if (typeof scope !== 'string' || scope.length === 0 || scope.length > MAX_SCOPE) {
    throw new Error('search: rejected scope')
  }
  if (scope.includes('\\') || scope.includes('\0') || scope.startsWith('/')) {
    throw new Error('search: rejected scope')
  }
  for (const segment of scope.split('/')) {
    if (
      segment.length === 0 ||
      segment === '.' ||
      segment === '..' ||
      segment.startsWith('.') ||
      DENIED_SEGMENTS.has(segment)
    ) {
      throw new Error('search: rejected scope')
    }
  }
  return scope
}

export function searchVault(
  vaultRoot: string,
  query: unknown,
  scope?: unknown,
  stateDir?: string
): SearchResult[] {
  if (typeof query !== 'string') throw new Error('search: rejected query')
  const needle = query.trim()
  if (needle.length === 0 || needle.length > MAX_QUERY) {
    throw new Error('search: rejected query')
  }
  const scopeRel =
    scope === undefined || scope === null ? '' : resolveSearchScope(scope)
  const prefix = scopeRel === '' ? '' : `${scopeRel}/`

  const hits = searchIndex(readRetrievalIndex(vaultRoot, stateDir), needle, {
    limit: MAX_RESULTS,
    // The index holds every vault file (a snapshot is findable by name),
    // but THIS contract opens notes: a non-markdown hit here would be a
    // dead click, the class CP-MVP-009 S04b spent a step killing.
    accept: (path) =>
      extname(path).toLowerCase() === '.md' && path.startsWith(prefix)
  })

  return hits.map((hit) => ({
    relPath: hit.path,
    name: hit.path.split('/').pop() ?? hit.path,
    matches: matchesOf(hit, contentOf(vaultRoot, hit.path))
  }))
}

/** The matched file's text, for snippets only — read on demand for the
 *  few files a query returned, which is why the index never stores it. */
function contentOf(root: string, relPath: string): string | undefined {
  const abs = join(root, ...relPath.split('/'))
  try {
    if (statSync(abs).size > MAX_FILE_BYTES) return undefined
    return readFileSync(abs, 'utf8')
  } catch {
    return undefined
  }
}

/**
 * The contract's three match kinds, in the order the UI reads them: the
 * filename first (it is why the file is a candidate at all for a name
 * query), then headings and text by line.
 */
function matchesOf(hit: RetrievalHit, content: string | undefined): SearchMatch[] {
  const matches: SearchMatch[] = []
  const name = hit.path.split('/').pop() ?? hit.path
  const foldedName = foldTerm(name)
  if (hit.terms.some((term) => foldedName.includes(term))) {
    matches.push({ kind: 'filename', line: 0, excerpt: name })
  }
  if (content !== undefined) {
    for (const match of extractMatches(content, hit.terms, {
      maxMatches: MAX_MATCHES_PER_FILE - matches.length,
      maxExcerpt: MAX_EXCERPT
    })) {
      matches.push({ kind: match.kind, line: match.line, excerpt: match.excerpt })
    }
  }
  return matches
}
