/**
 * Pure helpers for the tree context menu (CP-MVP-007 S02). The menu
 * component stays thin; everything decidable without the DOM lives
 * here, testable in node.
 */

import type { VaultFolder } from '../../../shared/ipc-contract'
import { findSubtree } from './scope'

/** Menu target: a tree node (''-rooted relPath) + screen position. */
export type TreeMenuTarget = {
  kind: 'folder' | 'note'
  relPath: string
  x: number
  y: number
}

const MAX_NAME = 120

/**
 * Child path for a name typed into the menu. Names are SEGMENTS —
 * one level, no separators, no hidden files; the main-side validator
 * re-checks everything (13: the renderer never gets to be the only
 * gate). Returns null on a name the UI should refuse.
 */
export function childRelPath(
  parentRelPath: string,
  name: string,
  kind: 'note' | 'folder'
): string | null {
  const clean = name.trim()
  if (clean.length === 0 || clean.length > MAX_NAME) return null
  if (/[/\\\0]/.test(clean)) return null
  if (clean.startsWith('.')) return null
  const base = parentRelPath.length > 0 ? `${parentRelPath}/` : ''
  if (kind === 'folder') return `${base}${clean}`
  return `${base}${clean.toLowerCase().endsWith('.md') ? clean : `${clean}.md`}`
}

/** What a folder deletion takes with it — drives the confirm text. */
export type DeleteSummary = {
  name: string
  noteCount: number
  /** Source bundles inside (folders directly holding a source.md):
   *  evidence leaves with them — the warning escalates. */
  bundleCount: number
}

const isBundleRoot = (folder: VaultFolder): boolean =>
  folder.notes.some((note) => note.name === 'source.md')

export function folderDeleteSummary(
  scope: VaultFolder,
  relPath: string
): DeleteSummary | null {
  // findSubtree walks from the scope root by name — relativize the
  // vault-relative target first (project/sources trees are subtrees).
  const scopeRel = scope.relPath
  const within =
    relPath === scopeRel
      ? ''
      : scopeRel === ''
        ? relPath
        : relPath.startsWith(`${scopeRel}/`)
          ? relPath.slice(scopeRel.length + 1)
          : null
  if (within === null) return null
  const target = findSubtree(scope, within)
  if (!target) return null
  let noteCount = 0
  let bundleCount = 0
  const walk = (folder: VaultFolder): void => {
    noteCount += folder.notes.length
    if (isBundleRoot(folder)) bundleCount += 1
    folder.folders.forEach(walk)
  }
  walk(target)
  return { name: target.name, noteCount, bundleCount }
}

/** The confirm line for a delete — names the target, counts what
 *  rides along, escalates on evidence (bundles). */
export function deleteConfirmText(
  target: TreeMenuTarget,
  summary: DeleteSummary | null
): string {
  if (target.kind === 'note') {
    const name = target.relPath.split('/').pop() ?? target.relPath
    return `Delete “${name}”?\n\nIt goes to the system trash.`
  }
  const name = summary?.name ?? (target.relPath.split('/').pop() ?? target.relPath)
  const notes = summary ? `${summary.noteCount} note${summary.noteCount === 1 ? '' : 's'}` : 'its contents'
  const bundleLine =
    summary && summary.bundleCount > 0
      ? `\n\n⚠ ${summary.bundleCount} SOURCE BUNDLE${summary.bundleCount === 1 ? '' : 'S'} inside — original evidence leaves with the folder.`
      : ''
  return `Delete the folder “${name}” and ${notes}?\n\nEverything goes to the system trash.${bundleLine}`
}

/** Fold state after a folder vanished: the folder and its whole
 *  subtree leave the open set (identity-stable when untouched). */
export function prunedOpenFolders(
  openFolders: ReadonlySet<string>,
  deletedRelPath: string
): ReadonlySet<string> {
  const prefix = `${deletedRelPath}/`
  const kept = [...openFolders].filter(
    (path) => path !== deletedRelPath && !path.startsWith(prefix)
  )
  return kept.length === openFolders.size ? openFolders : new Set(kept)
}
