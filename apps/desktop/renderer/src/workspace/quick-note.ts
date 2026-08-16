import type {
  RelocatePreview,
  VaultFolder,
  WorkspaceTab
} from '../../../shared/ipc-contract'
import type { PaneTreeScope } from './model'

const QUICK_NOTE_STEM = 'Untitled'
const MAX_TITLE_LENGTH = 80
const RESERVED_STEM = /^(?:index|log|con|prn|aux|nul|com[1-9]|lpt[1-9])$/i

export const QUICK_NOTE_PENDING = '1'

export type QuickNoteShortcut = {
  key: string
  ctrlKey: boolean
  metaKey: boolean
  altKey: boolean
  shiftKey: boolean
  repeat: boolean
}

/** Cross-platform Mod+N; modified/repeated chords stay available to their
 * normal host instead of producing a burst of files. */
export function isQuickNoteShortcut(event: QuickNoteShortcut): boolean {
  return (
    !event.repeat &&
    !event.altKey &&
    !event.shiftKey &&
    event.key.toLowerCase() === 'n' &&
    (event.ctrlKey || event.metaKey)
  )
}

const parentOf = (relPath: string): string => {
  const slash = relPath.lastIndexOf('/')
  return slash < 0 ? '' : relPath.slice(0, slash)
}

const joined = (parent: string, name: string): string =>
  parent.length > 0 ? `${parent}/${name}` : name

/**
 * Placement contract: beside the active ordinary note, otherwise at the
 * current project root, otherwise at the vault root. Source dossiers are
 * deliberately excluded: a quick thought must not enter a source bundle's
 * reserved file contract by accident.
 */
export function quickNoteParent(
  active: WorkspaceTab | undefined,
  scope: PaneTreeScope
): string {
  const activeNote =
    active?.view === 'vault' || active?.view === 'project'
      ? active.params?.['notePath']
      : undefined
  // `sources/` is the reserved home of imported evidence bundles. A dossier
  // can also be opened through an ordinary vault/project note tab, so checking
  // only the tab view would still let a quick thought land inside that bundle.
  if (activeNote && !/^sources\//i.test(activeNote)) return parentOf(activeNote)
  return scope.kind === 'project' ? scope.projectPath : ''
}

/** All Markdown paths in the current vault tree, compared case-insensitively
 * so a name that is safe on Linux remains safe when the vault moves to
 * Windows or macOS. */
export function vaultNotePaths(tree: VaultFolder): Set<string> {
  const paths = new Set<string>()
  const walk = (folder: VaultFolder): void => {
    for (const note of folder.notes) paths.add(note.relPath.toLowerCase())
    for (const child of folder.folders) walk(child)
  }
  walk(tree)
  return paths
}

function availablePath(
  parent: string,
  stem: string,
  occupied: ReadonlySet<string>
): string {
  for (let attempt = 1; attempt <= 10_000; attempt += 1) {
    const suffix = attempt === 1 ? '' : ` ${attempt}`
    const candidate = joined(parent, `${stem}${suffix}.md`)
    if (!occupied.has(candidate.toLowerCase())) return candidate
  }
  throw new Error('quick-note: no available filename')
}

/** `Untitled.md`, then `Untitled 2.md`, ... — the create verb remains
 * exclusive, this merely chooses the first currently free candidate. */
export function nextQuickNotePath(
  parent: string,
  occupied: ReadonlySet<string>
): string {
  return availablePath(parent, QUICK_NOTE_STEM, occupied)
}

export type QuickNoteIo = {
  listVaultFiles: () => Promise<VaultFolder>
  createNote: (relPath: string, content?: string) => Promise<unknown>
  relocatePreview: (from: string, to: string) => Promise<RelocatePreview>
  relocateApply: (from: string, to: string) => Promise<unknown>
}

/** Exclusive blank creation with a bounded collision retry for another
 * writer landing between the tree read and `wx`. */
export async function createQuickNoteFile(
  parent: string,
  io: Pick<QuickNoteIo, 'listVaultFiles' | 'createNote'>
): Promise<string> {
  let occupied = vaultNotePaths(await io.listVaultFiles())
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const candidate = nextQuickNotePath(parent, occupied)
    try {
      await io.createNote(candidate, '')
      return candidate
    } catch (reason) {
      if (!/exists|EEXIST/i.test(String(reason))) throw reason
      occupied = new Set(occupied)
      occupied.add(candidate.toLowerCase())
    }
  }
  throw new Error('quick-note: no available provisional filename')
}

/** First real level-one heading, outside fenced code. H2–H6 do not name a
 * quick note: waiting for an H1 is part of the explicit interaction. */
export function quickNoteTitle(content: string): string | null {
  let fence: '`' | '~' | null = null
  for (const line of content.split(/\r?\n/)) {
    const fenceLine = /^ {0,3}(`{3,}|~{3,})/.exec(line)
    if (fenceLine) {
      const marker = fenceLine[1]![0] as '`' | '~'
      if (fence === null) fence = marker
      else if (fence === marker) fence = null
      continue
    }
    if (fence !== null) continue
    const heading = /^ {0,3}#[ \t]+(.+?)(?:[ \t]+#+)?[ \t]*$/.exec(line)
    if (heading) return heading[1]!.trim() || null
  }
  return null
}

function titleStem(title: string): string | null {
  let stem = title
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[\\/:*?"<>|#^[\]{}\n\r\t]/g, ' ')
    .replace(/[*_`~]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_TITLE_LENGTH)
    .replace(/^[. ]+/, '')
    .replace(/[. ]+$/, '')
  if (stem.length === 0) return null
  if (RESERVED_STEM.test(stem)) stem = `${stem} note`
  return stem
}

export type QuickNoteRenameDecision =
  | { kind: 'waiting' }
  | { kind: 'settled' }
  | { kind: 'rename'; to: string }

/** Link changes beyond the one managed parent-index entry. That link is born
 * automatically with every note and should not turn the normal first-title
 * gesture into a confirmation dialog; duplicate/user links in index.md and
 * every link elsewhere still deserve the existing preview gate. */
export function quickNoteReviewLinkCount(
  currentRelPath: string,
  edits: ReadonlyArray<{ relPath: string; count: number }>
): number {
  const parent = parentOf(currentRelPath)
  const managedIndex = joined(parent, 'index.md').toLowerCase()
  return edits.reduce(
    (total, edit) =>
      total +
      (edit.relPath.toLowerCase() === managedIndex
        ? Math.max(0, edit.count - 1)
        : edit.count),
    0
  )
}

/**
 * The provisional tab flag calls this after each successful save. No H1 means
 * keep waiting. The first usable H1 either settles the current name or yields
 * one collision-safe rename; clearing the flag afterwards makes later H1 edits
 * ordinary content edits rather than a rename loop.
 */
export function quickNoteRenameDecision(
  currentRelPath: string,
  content: string,
  occupied: ReadonlySet<string>
): QuickNoteRenameDecision {
  const title = quickNoteTitle(content)
  if (title === null) return { kind: 'waiting' }
  const stem = titleStem(title)
  if (stem === null) return { kind: 'settled' }
  const parent = parentOf(currentRelPath)
  const direct = joined(parent, `${stem}.md`)
  if (direct.toLowerCase() === currentRelPath.toLowerCase()) {
    return { kind: 'settled' }
  }
  const withoutCurrent = new Set(occupied)
  withoutCurrent.delete(currentRelPath.toLowerCase())
  return {
    kind: 'rename',
    to: availablePath(parent, stem, withoutCurrent)
  }
}

export type QuickNoteFinalizeResult =
  | 'waiting'
  | 'settled'
  | 'renamed'
  | 'declined'

/** Full save-time lifecycle over the existing preview/apply verbs. The caller
 * owns UI state and supplies the rare genuine-backlink confirmation. */
export async function finalizeQuickNoteName(
  currentRelPath: string,
  content: string,
  io: Pick<
    QuickNoteIo,
    'listVaultFiles' | 'relocatePreview' | 'relocateApply'
  >,
  confirmBacklinks: (to: string, count: number) => boolean
): Promise<QuickNoteFinalizeResult> {
  if (quickNoteTitle(content) === null) return 'waiting'
  let occupied = vaultNotePaths(await io.listVaultFiles())
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const decision = quickNoteRenameDecision(currentRelPath, content, occupied)
    if (decision.kind === 'waiting') return 'waiting'
    if (decision.kind === 'settled') return 'settled'
    try {
      const preview = await io.relocatePreview(currentRelPath, decision.to)
      const reviewLinks = quickNoteReviewLinkCount(
        currentRelPath,
        preview.edits
      )
      if (reviewLinks > 0 && !confirmBacklinks(decision.to, reviewLinks)) {
        return 'declined'
      }
      await io.relocateApply(currentRelPath, decision.to)
      return 'renamed'
    } catch (reason) {
      if (!String(reason).includes('target already exists')) throw reason
      occupied = new Set(occupied)
      occupied.add(decision.to.toLowerCase())
    }
  }
  throw new Error('quick-note: no available title filename')
}
