import { readFileSync, readdirSync, statSync } from 'node:fs'
import { extname, join } from 'node:path'
import type { SearchMatch, SearchResult } from '../shared/ipc-contract'

/**
 * Lexical vault search (M1/S11) — vault-core territory. A plain
 * case-insensitive scan over filenames, headings, and body lines: the
 * deliberate no-embeddings baseline (01/18). ripgrep or SQLite FTS5
 * replace the scan at M8 behind this same contract; retrieval relevance
 * never becomes epistemic support (04).
 */

const DENIED_SEGMENTS = new Set(['.git', '.atomik', 'node_modules'])
const MAX_QUERY = 200
const MAX_RESULTS = 100
const MAX_MATCHES_PER_FILE = 6
const MAX_FILE_BYTES = 10 * 1024 * 1024
const MAX_EXCERPT = 160

const HEADING_PATTERN = /^#{1,6}\s/

export function searchVault(vaultRoot: string, query: unknown): SearchResult[] {
  if (typeof query !== 'string') throw new Error('search: rejected query')
  const needle = query.trim().toLowerCase()
  if (needle.length === 0 || needle.length > MAX_QUERY) {
    throw new Error('search: rejected query')
  }

  const results: SearchResult[] = []

  const walk = (dir: string, relPath: string): void => {
    if (results.length >= MAX_RESULTS) return
    const entries = readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
      a.name.localeCompare(b.name)
    )
    for (const entry of entries) {
      if (results.length >= MAX_RESULTS) return
      if (entry.name.startsWith('.') || DENIED_SEGMENTS.has(entry.name)) continue
      const abs = join(dir, entry.name)
      const childRel = relPath === '' ? entry.name : `${relPath}/${entry.name}`
      if (entry.isDirectory()) {
        walk(abs, childRel)
        continue
      }
      if (!entry.isFile() || extname(entry.name).toLowerCase() !== '.md') continue

      const matches: SearchMatch[] = []
      if (entry.name.toLowerCase().includes(needle)) {
        matches.push({ kind: 'filename', line: 0, excerpt: entry.name })
      }
      try {
        if (statSync(abs).size <= MAX_FILE_BYTES) {
          const lines = readFileSync(abs, 'utf8').split('\n')
          for (let index = 0; index < lines.length; index += 1) {
            if (matches.length >= MAX_MATCHES_PER_FILE) break
            const line = lines[index] as string
            if (!line.toLowerCase().includes(needle)) continue
            matches.push({
              kind: HEADING_PATTERN.test(line) ? 'heading' : 'text',
              line: index + 1,
              excerpt: line.trim().slice(0, MAX_EXCERPT)
            })
          }
        }
      } catch {
        // unreadable file: filename match (if any) still counts
      }
      if (matches.length > 0) {
        results.push({ relPath: childRel, name: entry.name, matches })
      }
    }
  }

  walk(vaultRoot, '')
  return results
}
