import { readdirSync, readFileSync, statSync } from 'node:fs'
import { extname, join } from 'node:path'
import {
  buildGraphIndex,
  patchGraphIndexForSave,
  type GraphIndex,
  type VaultFileInput
} from '../shared/graph-core'
import { atomicWrite } from './vault'

/**
 * The nodes/edges index seat (CP-MVP-009 S06): builds the vault's
 * graph projection through the PURE shared core and persists it as
 * `.atomik/graph.json` — the JSON sidecar decided at the opening
 * check. Rebuildable-only by construction (03/33): delete the file
 * and the next read rebuilds it byte-identical from the vault alone.
 *
 * Lifecycle: LAZY — nothing scans on app open (04: opening the app
 * never rewrites files; `.atomik/` writes are ordinary disposable
 * state). The first readGraphIndex call builds and caches. Since
 * CP-MVP-010 S03 a SAVE patches the cached index in place (the moment
 * S06 predicted: "per-file patching becomes worthwhile with M8
 * retrieval"); structure changes — create, delete, relocate — still
 * invalidate, because they move the node set and a wrong graph is
 * worse than a slow one.
 */

const MAX_INDEXED_BYTES = 2 * 1024 * 1024
const GRAPH_FILE = 'graph.json'

let cached: GraphIndex | null = null
let cachedVault: string | null = null
let dirty = false

/** Write verbs call this after a mutation the index cannot patch —
 *  create, delete, relocate, imports: the next read rebuilds. */
export function invalidateGraphIndex(): void {
  cached = null
  dirty = false
}

/**
 * A saved note folded into the cached index instead of throwing the whole
 * projection away (CP-MVP-010 S03, closing-ceremony deviation 3). Falls
 * back to invalidation whenever the pure patch refuses the change — a
 * bundle contract file, an unknown path, anything whose effect reaches
 * past the one file. Persistence waits for the next READ: a
 * keystroke-save is not a reason to touch the disk.
 */
export function patchGraphIndexOnSave(
  vaultRoot: string,
  relPath: string,
  content: string
): void {
  if (!cached || cachedVault !== vaultRoot) return // nothing cached to patch
  const patched = patchGraphIndexForSave(cached, relPath, content)
  if (patched === null) {
    invalidateGraphIndex()
    return
  }
  cached = patched
  dirty = true
}

/** The current index — cached, else rebuilt from the vault files and
 *  persisted to `<stateDir>/graph.json`. */
export function readGraphIndex(vaultRoot: string, stateDir: string): GraphIndex {
  if (cached && cachedVault === vaultRoot) {
    if (dirty) persist(cached, stateDir)
    return cached
  }
  const index = buildGraphIndex(collectVaultFiles(vaultRoot))
  cached = index
  cachedVault = vaultRoot
  dirty = false
  persist(index, stateDir)
  return index
}

function persist(index: GraphIndex, stateDir: string): void {
  try {
    atomicWrite(join(stateDir, GRAPH_FILE), `${JSON.stringify(index, null, 2)}\n`)
    dirty = false
  } catch {
    /* the file is a disposable projection — memory serves the read */
  }
}

/** Every markdown file in the vault (dotfiles and denied segments
 *  excluded, same walk rules as listVaultFiles), with contents. */
function collectVaultFiles(vaultRoot: string): VaultFileInput[] {
  const files: VaultFileInput[] = []
  const walk = (dir: string, relPath: string, depth: number): void => {
    if (depth > 24) return
    let entries
    try {
      entries = readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue
      const abs = join(dir, entry.name)
      const rel = relPath === '' ? entry.name : `${relPath}/${entry.name}`
      if (entry.isDirectory()) {
        walk(abs, rel, depth + 1)
      } else if (entry.isFile()) {
        // S07d: EVERY vault file is a node (a snapshot and an original
        // are forms of their source, and links reach them), but only
        // markdown is READ — the rest carry no edges, so their bytes
        // never enter the index.
        if (extname(entry.name).toLowerCase() !== '.md') {
          files.push({ path: rel })
          continue
        }
        try {
          if (statSync(abs).size > MAX_INDEXED_BYTES) continue
          files.push({ path: rel, content: readFileSync(abs, 'utf8') })
        } catch {
          /* unreadable file: skipped, not fatal — the projection stays honest */
        }
      }
    }
  }
  walk(vaultRoot, '', 0)
  return files
}
