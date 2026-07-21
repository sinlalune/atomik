import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  statSync,
  writeFileSync
} from 'node:fs'
import { basename, dirname, join, relative } from 'node:path'
import { assertInsideVault, resolveNotePath } from './vault'
import { resolveProjectDirPath } from './project'
import { parentRelOf, recordFileOp } from './folder-index'

/**
 * Tree file management verbs (CP-MVP-007 S03). Deletion of USER files
 * goes to the OS trash — recoverable outside the app (owner decision
 * 2026-07-16); hard `rmSync` stays reserved for derived files behind
 * their in-view verbs. The trash call is a SEAM (`TrashFn`) so the
 * logic tests without an OS trash; production passes
 * `shell.trashItem`. A failed trash surfaces honestly — it never
 * falls back to a silent hard delete.
 */

export type TrashFn = (absPath: string) => Promise<void>

const rel = (vaultRoot: string, abs: string): string =>
  relative(vaultRoot, abs).split(/[\\/]/).join('/')

/** S07k bookkeeping for a landed relocate: one renamed line in a shared
 * parent, or a departure + arrival line across two parents. */
function recordRelocate(
  vaultRoot: string,
  kind: 'note' | 'folder',
  from: string,
  to: string
): void {
  const suffix = kind === 'folder' ? '/' : ''
  const fromParent = parentRelOf(from)
  const toParent = parentRelOf(to)
  recordFileOp(
    vaultRoot,
    fromParent === toParent
      ? [
          {
            folderRel: fromParent,
            text: `renamed ${kind} ${basename(from)}${suffix} → ${basename(to)}${suffix}`
          }
        ]
      : [
          {
            folderRel: fromParent,
            text: `moved ${kind} ${basename(from)}${suffix} → ${to}${suffix}`
          },
          { folderRel: toParent, text: `moved ${kind} in ← ${from}${suffix}` }
        ]
  )
}

/**
 * Bundle-internal rule (S01 pin): a folder that directly contains
 * source.md is a bundle root. The rule protects the bundle's CONTRACT
 * files — the dossier, its human map, and the derived representations
 * (each owns a lifecycle verb that also restores dossier state): they
 * delete/move WITH the bundle, never individually. User/AI notes that
 * merely LIVE in a bundle folder are ordinary notes (S07e-e owner
 * report: an AI-generated note in sources/web/<slug>/ refused
 * deletion under the earlier folder-wide guard).
 */
function bundleRootOf(absNote: string): string | null {
  const dir = dirname(absNote)
  return existsSync(join(dir, 'source.md')) ? dir : null
}

const BUNDLE_CONTRACT_FILES = new Set([
  'source.md',
  'index.md',
  'transcript.md',
  'extracted.md',
  'reader.md'
])

const isBundleContractName = (absNote: string): boolean =>
  BUNDLE_CONTRACT_FILES.has(basename(absNote).toLowerCase())

function bundleContractRootOf(absNote: string): string | null {
  const root = bundleRootOf(absNote)
  return root && isBundleContractName(absNote) ? root : null
}

export async function deleteNote(
  vaultRoot: string,
  relPath: unknown,
  trash: TrashFn
): Promise<{ relPath: string }> {
  const abs = resolveNotePath(vaultRoot, relPath)
  if (!abs) throw new Error('file-manage: rejected path')
  if (!existsSync(abs)) throw new Error('file-manage: note not found')
  assertInsideVault(vaultRoot, abs)
  const bundleRoot = bundleContractRootOf(abs)
  if (bundleRoot) {
    throw new Error(
      `file-manage: bundle file — delete the bundle folder instead (${rel(vaultRoot, bundleRoot)})`
    )
  }
  await trash(abs)
  const trashedRel = rel(vaultRoot, abs)
  // S07k: the parent's conventions record the departure (in the verb —
  // every caller syncs)
  recordFileOp(vaultRoot, [
    {
      folderRel: parentRelOf(trashedRel),
      text: `deleted note ${basename(abs)} (OS trash)`
    }
  ])
  return { relPath: trashedRel }
}

/* ------------------------------------------------------------------ *
 * Relocate (rename AND move share one verb) — the 27-sanctioned
 * refactor: the note moves and every inbound markdown link updates in
 * the SAME atomic operation, behind a preview (20: the preview is the
 * acceptance gate — no silent auto-repair). Targeted replacement
 * only: nothing but matched link targets changes in touched notes.
 * ------------------------------------------------------------------ */

const DENIED_SEGMENTS = new Set(['.git', '.atomik', 'node_modules'])
const MAX_SCAN_DEPTH = 12

/** Vault-relative paths of every scannable .md file (symlinks skipped —
 *  the refactor never follows an escape hatch). */
function walkNotes(vaultRoot: string): string[] {
  const out: string[] = []
  const walk = (dir: string, relPrefix: string, depth: number): void => {
    if (depth > MAX_SCAN_DEPTH) return
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isSymbolicLink()) continue
      if (entry.name.startsWith('.') || DENIED_SEGMENTS.has(entry.name)) continue
      const rel = relPrefix.length > 0 ? `${relPrefix}/${entry.name}` : entry.name
      if (entry.isDirectory()) walk(join(dir, entry.name), rel, depth + 1)
      else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
        out.push(rel)
      }
    }
  }
  walk(vaultRoot, '', 0)
  return out
}

/** Mirror of the renderer's link resolver (dev-docs/markdown.ts):
 *  '/'-separated vault-relative result, null when the href escapes. */
function resolveRelative(fromRelPath: string, href: string): string | null {
  if (href.length === 0 || href.startsWith('/')) return null
  const segments = fromRelPath.split('/').slice(0, -1)
  for (const part of href.split('/')) {
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

/** '/'-separated relative href from one vault file to another. */
function relativeLinkBetween(fromRelPath: string, toRelPath: string): string {
  const fromDirs = fromRelPath.split('/').slice(0, -1)
  const toParts = toRelPath.split('/')
  let common = 0
  while (
    common < fromDirs.length &&
    common < toParts.length - 1 &&
    fromDirs[common] === toParts[common]
  ) {
    common += 1
  }
  const ups = fromDirs.slice(common).map(() => '..')
  return [...ups, ...toParts.slice(common)].join('/') || toRelPath
}

/** Markdown inline links: [text](target) and [text](<target>). */
const LINK_RE = /\]\((<([^>\n]+)>|([^)\s]+))\)/g
const SCHEME_RE = /^[a-z][a-z0-9+.-]*:/i

/** Rewrites matched link targets in one note. `mapTarget` returns the
 *  new vault-relative target (path only) or null to leave it alone. */
function rewriteLinks(
  content: string,
  noteRelForResolve: string,
  noteRelForEmit: string,
  mapTarget: (resolvedRel: string) => string | null
): { after: string; count: number } {
  let count = 0
  const after = content.replace(
    LINK_RE,
    (whole, _raw: string, angled: string | undefined, bare: string | undefined) => {
      const target = angled ?? bare ?? ''
      if (target.length === 0 || target.startsWith('#') || SCHEME_RE.test(target)) {
        return whole
      }
      const hashIndex = target.indexOf('#')
      const pathPart = hashIndex === -1 ? target : target.slice(0, hashIndex)
      const hash = hashIndex === -1 ? '' : target.slice(hashIndex)
      let decoded: string
      try {
        decoded = decodeURIComponent(pathPart)
      } catch {
        return whole
      }
      const resolved = resolveRelative(noteRelForResolve, decoded)
      if (!resolved) return whole
      const mapped = mapTarget(resolved)
      if (mapped === null) return whole
      count += 1
      const href = relativeLinkBetween(noteRelForEmit, mapped) + hash
      return /\s/.test(href) || angled !== undefined ? `](<${href}>)` : `](${href})`
    }
  )
  return { after, count }
}

export type RelocateEdit = { relPath: string; count: number }
export type RelocatePreview = {
  from: string
  to: string
  /** Notes whose links change — the moved note itself included when
   *  its own outgoing links must re-point. */
  edits: RelocateEdit[]
  totalLinks: number
}

type ComputedRelocate = {
  fromAbs: string
  toAbs: string
  edits: Array<RelocateEdit & { abs: string; before: string; after: string }>
}

function computeRelocate(
  vaultRoot: string,
  fromRel: unknown,
  toRel: unknown
): ComputedRelocate & { from: string; to: string } {
  const fromAbs = resolveNotePath(vaultRoot, fromRel)
  const toAbs = resolveNotePath(vaultRoot, toRel)
  if (!fromAbs || !toAbs) throw new Error('file-manage: rejected path')
  const from = rel(vaultRoot, fromAbs)
  const to = rel(vaultRoot, toAbs)
  if (from === to) throw new Error('file-manage: same path')
  if (!existsSync(fromAbs)) throw new Error('file-manage: note not found')
  if (existsSync(toAbs)) throw new Error(`file-manage: target already exists — ${to}`)
  assertInsideVault(vaultRoot, fromAbs)
  for (const name of [basename(fromAbs), basename(toAbs)]) {
    if (name === 'index.md' || name === 'log.md') {
      throw new Error('file-manage: convention file (index/log) — it stays with its folder')
    }
  }
  const fromBundle = bundleContractRootOf(fromAbs)
  if (fromBundle) {
    throw new Error(
      `file-manage: bundle file — the bundle folder moves as a unit (${rel(vaultRoot, fromBundle)})`
    )
  }
  // Inside a bundle, the contract NAMES stay reserved — a note renamed
  // to reader.md would shadow the derived file's lifecycle verbs.
  if (
    existsSync(join(dirname(toAbs), 'source.md')) &&
    isBundleContractName(toAbs)
  ) {
    throw new Error('file-manage: target name is a bundle contract file')
  }

  // A same-folder rename leaves the moved note's resolution basis
  // untouched — rewriting its outgoing links would be a cosmetic byte
  // change (27: targeted replacement ONLY).
  const sameDir = dirname(fromAbs) === dirname(toAbs)
  const edits: ComputedRelocate['edits'] = []
  for (const noteRel of walkNotes(vaultRoot)) {
    const abs = join(vaultRoot, noteRel)
    const before = readFileSync(abs, 'utf8')
    const isMovedNote = noteRel === from
    if (isMovedNote && sameDir) continue
    const { after, count } = isMovedNote
      ? // the moved note's own outgoing links re-point FROM its new home
        rewriteLinks(before, from, to, (resolved) =>
          resolved === from ? null : resolved
        )
      : // everyone else's inbound links follow the note
        rewriteLinks(before, noteRel, noteRel, (resolved) =>
          resolved === from ? to : null
        )
    if (count > 0 && after !== before) {
      edits.push({ relPath: noteRel, count, abs, before, after })
    }
  }
  return { from, to, fromAbs, toAbs, edits }
}

/** The preview IS the acceptance gate (20/27): what would change,
 *  computed exactly like apply, writing nothing. */
export function relocatePreview(
  vaultRoot: string,
  fromRel: unknown,
  toRel: unknown
): RelocatePreview {
  const { from, to, edits } = computeRelocate(vaultRoot, fromRel, toRel)
  return {
    from,
    to,
    edits: edits.map(({ relPath, count }) => ({ relPath, count })),
    totalLinks: edits.reduce((sum, edit) => sum + edit.count, 0)
  }
}

/** One deliberate, atomic, labeled refactor (27): move + link updates
 *  land together or not at all (rollback on partial failure). */
export function relocateApply(
  vaultRoot: string,
  fromRel: unknown,
  toRel: unknown
): { from: string; to: string; filesChanged: number } {
  const { from, to, fromAbs, toAbs, edits } = computeRelocate(vaultRoot, fromRel, toRel)
  mkdirSync(dirname(toAbs), { recursive: true })
  assertInsideVault(vaultRoot, dirname(toAbs))
  if (existsSync(toAbs)) throw new Error(`file-manage: target already exists — ${to}`)
  renameSync(fromAbs, toAbs)
  const applied: Array<{ abs: string; before: string }> = []
  try {
    for (const edit of edits) {
      const targetAbs = edit.relPath === from ? toAbs : edit.abs
      writeFileSync(targetAbs, edit.after, 'utf8')
      applied.push({ abs: targetAbs, before: edit.before })
    }
  } catch (error) {
    for (const undo of applied) writeFileSync(undo.abs, undo.before, 'utf8')
    renameSync(toAbs, fromAbs)
    throw error
  }
  // S07k: both parents' conventions record the refactor (post-success —
  // a rolled-back apply leaves zero bookkeeping)
  recordRelocate(vaultRoot, 'note', from, to)
  return { from, to, filesChanged: edits.length + 1 }
}

/* Folder relocate (S05): the same refactor, prefix-wide. A bundle
 * root MOVES AS A UNIT here — that is the sanctioned way to move a
 * bundle; folders inside a bundle stay put (internal contract). */

function insideBundle(vaultRoot: string, absDir: string): string | null {
  let dir = absDir
  while (true) {
    const parent = dirname(dir)
    if (parent === dir) return null
    const parentRel = relative(vaultRoot, parent)
    if (parentRel.length === 0 || parentRel.startsWith('..')) return null
    if (existsSync(join(parent, 'source.md'))) return parent
    dir = parent
  }
}

function computeFolderRelocate(
  vaultRoot: string,
  fromRel: unknown,
  toRel: unknown
): ComputedRelocate & { from: string; to: string } {
  const fromAbs = resolveProjectDirPath(vaultRoot, fromRel)
  const toAbs = resolveProjectDirPath(vaultRoot, toRel)
  if (!fromAbs || !toAbs) throw new Error('file-manage: rejected path')
  const from = rel(vaultRoot, fromAbs)
  const to = rel(vaultRoot, toAbs)
  if (from === to) throw new Error('file-manage: same path')
  if (!existsSync(fromAbs) || !statSync(fromAbs).isDirectory()) {
    throw new Error('file-manage: folder not found')
  }
  if (existsSync(toAbs)) throw new Error(`file-manage: target already exists — ${to}`)
  if (to === from || to.startsWith(`${from}/`)) {
    throw new Error('file-manage: cannot move a folder into itself')
  }
  assertInsideVault(vaultRoot, fromAbs)
  const enclosing = insideBundle(vaultRoot, fromAbs)
  if (enclosing) {
    throw new Error(
      `file-manage: folder is inside a source bundle (${rel(vaultRoot, enclosing)}) — the bundle moves as a unit`
    )
  }
  const toParent = dirname(toAbs)
  if (existsSync(join(toParent, 'source.md')) || insideBundle(vaultRoot, toParent)) {
    throw new Error('file-manage: target is inside a source bundle')
  }

  const mapPath = (resolved: string): string | null =>
    resolved === from
      ? to
      : resolved.startsWith(`${from}/`)
        ? `${to}${resolved.slice(from.length)}`
        : null

  const edits: ComputedRelocate['edits'] = []
  for (const noteRel of walkNotes(vaultRoot)) {
    const abs = join(vaultRoot, noteRel)
    const before = readFileSync(abs, 'utf8')
    const inside = noteRel === from || noteRel.startsWith(`${from}/`)
    const newNoteRel = inside ? `${to}${noteRel.slice(from.length)}` : noteRel
    const { after, count } = inside
      ? // a note riding the move: every outgoing target keeps pointing
        // at the same file — moved siblings via mapPath, outsiders as
        // they were — but re-emitted from the note's NEW home
        rewriteLinks(before, noteRel, newNoteRel, (resolved) =>
          mapPath(resolved) ?? resolved
        )
      : // outside notes: inbound targets under the moved folder follow
        rewriteLinks(before, noteRel, noteRel, mapPath)
    if (count > 0 && after !== before) {
      edits.push({ relPath: noteRel, count, abs, before, after })
    }
  }
  return { from, to, fromAbs, toAbs, edits }
}

export function relocateFolderPreview(
  vaultRoot: string,
  fromRel: unknown,
  toRel: unknown
): RelocatePreview {
  const { from, to, edits } = computeFolderRelocate(vaultRoot, fromRel, toRel)
  return {
    from,
    to,
    edits: edits.map(({ relPath, count }) => ({ relPath, count })),
    totalLinks: edits.reduce((sum, edit) => sum + edit.count, 0)
  }
}

export function relocateFolderApply(
  vaultRoot: string,
  fromRel: unknown,
  toRel: unknown
): { from: string; to: string; filesChanged: number } {
  const { from, to, fromAbs, toAbs, edits } = computeFolderRelocate(
    vaultRoot,
    fromRel,
    toRel
  )
  mkdirSync(dirname(toAbs), { recursive: true })
  assertInsideVault(vaultRoot, dirname(toAbs))
  if (existsSync(toAbs)) throw new Error(`file-manage: target already exists — ${to}`)
  renameSync(fromAbs, toAbs)
  const applied: Array<{ abs: string; before: string }> = []
  try {
    for (const edit of edits) {
      const inside = edit.relPath === from || edit.relPath.startsWith(`${from}/`)
      const targetAbs = inside
        ? join(toAbs, relative(fromAbs, edit.abs))
        : edit.abs
      writeFileSync(targetAbs, edit.after, 'utf8')
      applied.push({ abs: targetAbs, before: edit.before })
    }
  } catch (error) {
    for (const undo of applied) writeFileSync(undo.abs, undo.before, 'utf8')
    renameSync(toAbs, fromAbs)
    throw error
  }
  recordRelocate(vaultRoot, 'folder', from, to)
  return { from, to, filesChanged: edits.length + 1 }
}

export async function deleteFolder(
  vaultRoot: string,
  relPath: unknown,
  trash: TrashFn
): Promise<{ relPath: string }> {
  const abs = resolveProjectDirPath(vaultRoot, relPath)
  if (!abs) throw new Error('file-manage: rejected path')
  if (!existsSync(abs) || !statSync(abs).isDirectory()) {
    throw new Error('file-manage: folder not found')
  }
  assertInsideVault(vaultRoot, abs)
  await trash(abs)
  const trashedRel = rel(vaultRoot, abs)
  recordFileOp(vaultRoot, [
    {
      folderRel: parentRelOf(trashedRel),
      text: `deleted folder ${basename(abs)}/ (OS trash)`
    }
  ])
  return { relPath: trashedRel }
}
