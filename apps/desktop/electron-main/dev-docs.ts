import { readFileSync, readdirSync, realpathSync } from 'node:fs'
import {
  extname,
  isAbsolute,
  join,
  normalize,
  relative,
  resolve,
  sep
} from 'node:path'
import type {
  DevDocEntry,
  DevDocFile,
  DevDocKind,
  DevDocsGroup
} from '../shared/ipc-contract'

/**
 * Read-only access to the documentation bundle for the Dev Docs tab (16).
 * Pure functions, no Electron imports — this is the seam where a future
 * dev-docs-core kernel splits off (14 incubation rule).
 */

export const DOC_EXTENSIONS: Readonly<Record<string, DevDocKind>> = {
  '.md': 'markdown',
  '.svg': 'svg',
  '.json': 'json'
}

/** Generated Dev Docs artifacts; the tab reads the real files instead. */
const EXCLUDED_ROOT_FILES = new Set(['docs_source.json', 'index.html'])

/** Known top-level groups, in display order. Unknown folders are appended —
 *  a new docs area must show up rather than silently disappear. */
const GROUP_ORDER: ReadonlyArray<{ id: string; label: string }> = [
  { id: '.', label: 'docs' },
  { id: 'learning', label: 'learning' },
  { id: 'bedrock', label: 'bedrock' },
  { id: 'adr', label: 'ADRs' },
  { id: 'modules', label: 'modules' },
  { id: 'agents', label: 'agents' },
  { id: 'contracts', label: 'contracts' },
  { id: 'fixtures', label: 'fixtures' },
  { id: 'diagrams', label: 'diagrams' }
]

/** apps/desktop -> repository root -> docs/. Packaged builds will need a
 *  bundled docs path instead; see the module note. */
export function resolveDocsRoot(appPath: string): string {
  return resolve(appPath, '..', '..', 'docs')
}

/**
 * Validates a renderer-supplied path (13: IPC inputs are validated in the
 * trusted layer). Returns the absolute path inside docsRoot, or null.
 */
export function resolveDevDocPath(
  docsRoot: string,
  relPath: unknown
): string | null {
  if (typeof relPath !== 'string') return null
  if (relPath.length === 0 || relPath.length > 500) return null
  if (relPath.includes('\\') || relPath.includes('\0')) return null
  if (isAbsolute(relPath)) return null
  if (!DOC_EXTENSIONS[extname(relPath).toLowerCase()]) return null
  const abs = resolve(docsRoot, normalize(relPath))
  const rel = relative(docsRoot, abs)
  if (rel.length === 0 || rel.startsWith('..') || isAbsolute(rel)) return null
  return abs
}

export function readDevDoc(docsRoot: string, relPath: unknown): DevDocFile {
  const abs = resolveDevDocPath(docsRoot, relPath)
  if (!abs) throw new Error(`dev-docs: rejected path`)
  // Defense in depth: after symlink resolution the target must still live
  // inside the real docs root.
  const real = realpathSync(abs)
  const realRoot = realpathSync(docsRoot)
  const realRel = relative(realRoot, real)
  if (realRel.startsWith('..') || isAbsolute(realRel)) {
    throw new Error(`dev-docs: rejected path`)
  }
  const kind = DOC_EXTENSIONS[extname(abs).toLowerCase()] as DevDocKind
  return {
    relPath: relPath as string,
    kind,
    content: readFileSync(real, 'utf8')
  }
}

export function listDevDocs(docsRoot: string): DevDocsGroup[] {
  const byGroup = new Map<string, DevDocEntry[]>()

  const walk = (dir: string): void => {
    const entries = readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
      a.name.localeCompare(b.name)
    )
    for (const entry of entries) {
      const abs = join(dir, entry.name)
      if (entry.isDirectory()) {
        walk(abs)
        continue
      }
      const rel = relative(docsRoot, abs).split(sep).join('/')
      const top = rel.includes('/') ? rel.slice(0, rel.indexOf('/')) : '.'
      if (top === '.' && EXCLUDED_ROOT_FILES.has(entry.name)) continue
      const kind = DOC_EXTENSIONS[extname(entry.name).toLowerCase()]
      if (!kind) continue
      // Diagram SVGs are assets inlined into pages, not tree entries; the
      // diagrams register (diagrams/index.md) stays listed.
      if (top === 'diagrams' && kind === 'svg') continue
      const list = byGroup.get(top) ?? []
      list.push({
        relPath: rel,
        label: top === '.' ? rel : rel.slice(top.length + 1)
      })
      byGroup.set(top, list)
    }
  }

  walk(docsRoot)

  const groups: DevDocsGroup[] = []
  for (const spec of GROUP_ORDER) {
    const entries = byGroup.get(spec.id)
    if (entries && entries.length > 0) {
      groups.push({ id: spec.id, label: spec.label, entries })
    }
  }
  for (const [id, entries] of byGroup) {
    if (!GROUP_ORDER.some((spec) => spec.id === id)) {
      groups.push({ id, label: id, entries })
    }
  }
  return groups
}
