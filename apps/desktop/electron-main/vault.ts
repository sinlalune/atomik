import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync
} from 'node:fs'
import {
  basename,
  dirname,
  extname,
  isAbsolute,
  join,
  normalize,
  relative,
  resolve
} from 'node:path'
import type { SourceAsset, VaultFolder, VaultNoteFile } from '../shared/ipc-contract'

/**
 * Vault IO — the incubating vault-core kernel (14): file tree, note
 * read/write/create against a user-chosen root. Pure functions over an
 * explicit vaultRoot; no Electron imports (the dialog lives in index.ts).
 *
 * Write discipline (27): atomic temp+rename, byte-exact content (no
 * normalization, no frontmatter touching, no newline "fixes"), writes only
 * through these explicit calls — opening a vault never mutates it.
 * Renderer-supplied paths cross the trust boundary: validated here (13).
 */

const MAX_NOTE_BYTES = 10 * 1024 * 1024
const MAX_PATH_LENGTH = 500
const MAX_TREE_DEPTH = 24

/** Top-level (and nested) directories never listed or addressable. */
const DENIED_SEGMENTS = new Set(['.git', '.atomik', 'node_modules'])

function hasDeniedSegment(relPath: string): boolean {
  // '.' is a harmless no-op segment (normalize resolves it); every other
  // dot-prefixed segment (hidden dirs, '..') and the denylist are rejected.
  return relPath
    .split('/')
    .some(
      (segment) =>
        DENIED_SEGMENTS.has(segment) ||
        (segment.startsWith('.') && segment !== '.')
    )
}

/**
 * Validates a renderer-supplied vault-relative Markdown path. Returns the
 * absolute path, or null when rejected.
 */
export function resolveNotePath(
  vaultRoot: string,
  relPath: unknown
): string | null {
  if (typeof relPath !== 'string') return null
  if (relPath.length === 0 || relPath.length > MAX_PATH_LENGTH) return null
  if (relPath.includes('\\') || relPath.includes('\0')) return null
  if (isAbsolute(relPath)) return null
  if (extname(relPath).toLowerCase() !== '.md') return null
  if (hasDeniedSegment(relPath)) return null
  const abs = resolve(vaultRoot, normalize(relPath))
  const rel = relative(vaultRoot, abs)
  if (rel.length === 0 || rel.startsWith('..') || isAbsolute(rel)) return null
  return abs
}

/** After symlink resolution, `abs` must still live inside the real root. */
export function assertInsideVault(vaultRoot: string, abs: string): void {
  const real = realpathSync(abs)
  const realRoot = realpathSync(vaultRoot)
  const rel = relative(realRoot, real)
  if (rel.startsWith('..') || isAbsolute(rel)) {
    throw new Error('vault: rejected path')
  }
}

export function listVaultFiles(vaultRoot: string): VaultFolder {
  const walk = (dir: string, relPath: string, depth: number): VaultFolder => {
    const folder: VaultFolder = {
      name: relPath === '' ? basename(dir) : basename(relPath),
      relPath,
      folders: [],
      notes: []
    }
    if (depth > MAX_TREE_DEPTH) return folder
    const entries = readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
      a.name.localeCompare(b.name)
    )
    for (const entry of entries) {
      if (entry.name.startsWith('.') || DENIED_SEGMENTS.has(entry.name)) continue
      const childAbs = join(dir, entry.name)
      const childRel = relPath === '' ? entry.name : `${relPath}/${entry.name}`
      if (entry.isDirectory()) {
        const child = walk(childAbs, childRel, depth + 1)
        // prune folders holding no Markdown anywhere
        if (child.folders.length > 0 || child.notes.length > 0) {
          folder.folders.push(child)
        }
      } else if (entry.isFile() && extname(entry.name).toLowerCase() === '.md') {
        folder.notes.push({ name: entry.name, relPath: childRel })
      }
    }
    return folder
  }
  return walk(vaultRoot, '', 0)
}

export function readNote(vaultRoot: string, relPath: unknown): VaultNoteFile {
  const abs = resolveNotePath(vaultRoot, relPath)
  if (!abs) throw new Error('vault: rejected path')
  // Before realpath containment (which throws raw ENOENT mid-walk): a
  // missing note is an ordinary situation — e.g. a tab restored against
  // a different vault — and deserves a human message.
  if (!existsSync(abs)) {
    throw new Error(`vault: note not found in this vault — ${relPath as string}`)
  }
  assertInsideVault(vaultRoot, abs)
  const stat = statSync(abs)
  if (stat.size > MAX_NOTE_BYTES) throw new Error('vault: note too large')
  return {
    relPath: relPath as string,
    content: readFileSync(abs, 'utf8'),
    mtimeMs: stat.mtimeMs
  }
}

/**
 * Read-only viewer access to a source ORIGINAL (07: the preserved
 * evidence object; S05 image tab). Everything about the .md discipline
 * holds — validated vault-relative path, containment, size cap — except
 * the extension: exactly the image types the capture allowlist can have
 * produced. Returned as base64 for one narrow reason: the sandboxed
 * renderer has no file access, and a data URL keeps it that way.
 */
const SOURCE_ASSET_EXTENSIONS: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.heic': 'image/heic',
  '.heif': 'image/heif'
}

const MAX_ASSET_BYTES = 50 * 1024 * 1024

export function readSourceAsset(vaultRoot: string, relPath: unknown): SourceAsset {
  if (typeof relPath !== 'string') throw new Error('vault: rejected path')
  if (relPath.length === 0 || relPath.length > MAX_PATH_LENGTH) {
    throw new Error('vault: rejected path')
  }
  if (relPath.includes('\\') || relPath.includes('\0')) {
    throw new Error('vault: rejected path')
  }
  if (isAbsolute(relPath) || hasDeniedSegment(relPath)) {
    throw new Error('vault: rejected path')
  }
  const mimeType = SOURCE_ASSET_EXTENSIONS[extname(relPath).toLowerCase()]
  if (!mimeType) throw new Error('vault: rejected asset type')
  const abs = resolve(vaultRoot, normalize(relPath))
  const rel = relative(vaultRoot, abs)
  if (rel.length === 0 || rel.startsWith('..') || isAbsolute(rel)) {
    throw new Error('vault: rejected path')
  }
  if (!existsSync(abs)) {
    throw new Error(`vault: asset not found in this vault — ${relPath}`)
  }
  assertInsideVault(vaultRoot, abs)
  const stat = statSync(abs)
  if (stat.size > MAX_ASSET_BYTES) throw new Error('vault: asset too large')
  return {
    relPath,
    mimeType,
    base64: readFileSync(abs).toString('base64')
  }
}

function atomicWrite(abs: string, content: string): void {
  const temp = `${abs}.tmp-${process.pid}`
  writeFileSync(temp, content, 'utf8')
  try {
    renameSync(temp, abs)
  } catch (error) {
    rmSync(temp, { force: true })
    throw error
  }
}

function checkedContent(content: unknown): string {
  if (typeof content !== 'string') throw new Error('vault: rejected content')
  if (Buffer.byteLength(content, 'utf8') > MAX_NOTE_BYTES) {
    throw new Error('vault: note too large')
  }
  return content
}

/**
 * Overwrites an existing note atomically. Edit semantics: the target must
 * already exist (creation is a distinct, exclusive operation). When
 * `expectedMtimeMs` is given, the write is refused if the file changed on
 * disk since that read (optimistic concurrency; S07 editor saves).
 */
export function writeNote(
  vaultRoot: string,
  relPath: unknown,
  content: unknown,
  expectedMtimeMs?: unknown
): { mtimeMs: number } {
  const abs = resolveNotePath(vaultRoot, relPath)
  if (!abs) throw new Error('vault: rejected path')
  const body = checkedContent(content)
  if (!existsSync(abs)) throw new Error('vault: note does not exist')
  assertInsideVault(vaultRoot, abs)
  if (expectedMtimeMs !== undefined) {
    if (typeof expectedMtimeMs !== 'number') {
      throw new Error('vault: rejected mtime')
    }
    if (statSync(abs).mtimeMs !== expectedMtimeMs) {
      throw new Error('vault: conflict — note changed on disk since it was read')
    }
  }
  atomicWrite(abs, body)
  return { mtimeMs: statSync(abs).mtimeMs }
}

/** Creates a new note; parents are made, existing files never clobbered. */
export function createNote(
  vaultRoot: string,
  relPath: unknown,
  content?: unknown
): void {
  const abs = resolveNotePath(vaultRoot, relPath)
  if (!abs) throw new Error('vault: rejected path')
  const body = checkedContent(
    content === undefined
      ? `# ${basename(abs, '.md').replace(/[-_]/g, ' ')}\n`
      : content
  )
  mkdirSync(dirname(abs), { recursive: true })
  assertInsideVault(vaultRoot, dirname(abs))
  writeFileSync(abs, body, { encoding: 'utf8', flag: 'wx' })
}

/* ------------------------------------------------------------------ */
/* Last-vault memory (.atomik/local-settings.json, written by main     */
/* only — no renderer channel touches this file)                       */
/* ------------------------------------------------------------------ */

const SETTINGS_FILE = 'local-settings.json'

export function readLastVaultRoot(stateDir: string): string | null {
  try {
    const raw = readFileSync(join(stateDir, SETTINGS_FILE), 'utf8')
    const parsed: unknown = JSON.parse(raw)
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      (parsed as Record<string, unknown>)['version'] === 1 &&
      typeof (parsed as Record<string, unknown>)['lastVaultRoot'] === 'string'
    ) {
      const root = (parsed as Record<string, unknown>)['lastVaultRoot'] as string
      return statSync(root).isDirectory() ? root : null
    }
    return null
  } catch {
    return null
  }
}

export function persistLastVaultRoot(stateDir: string, root: string): void {
  mkdirSync(stateDir, { recursive: true })
  atomicWrite(
    join(stateDir, SETTINGS_FILE),
    `${JSON.stringify({ version: 1, lastVaultRoot: root }, null, 2)}\n`
  )
}
