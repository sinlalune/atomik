import type { VaultFolder } from '../../../shared/ipc-contract'

/**
 * Tree fold state (owner request): every tree opens COLLAPSED by default,
 * and what the user expands is remembered per tab — the open-folder set
 * lives in the tab's `treeOpen` param (recoverable UI state, 03), JSON
 * array of folder relPaths (group ids for dev docs).
 */

/** Stay under the workspace-state per-param value cap (4096). */
const MAX_PARAM_CHARS = 4000

export function parseOpenFolders(param: string | undefined): ReadonlySet<string> {
  if (!param) return new Set()
  try {
    const parsed: unknown = JSON.parse(param)
    if (!Array.isArray(parsed)) return new Set()
    return new Set(parsed.filter((entry): entry is string => typeof entry === 'string'))
  } catch {
    return new Set()
  }
}

/** Sorted and clamped: deepest paths drop first when over the cap (their
 *  parents stay open, so the loss is the least surprising one). */
export function serializeOpenFolders(open: ReadonlySet<string>): string {
  const sorted = [...open].sort()
  while (sorted.length > 0 && JSON.stringify(sorted).length > MAX_PARAM_CHARS) {
    sorted.pop()
  }
  return JSON.stringify(sorted)
}

/** The set with one folder toggled; identity-stable when nothing changes
 *  (details fires a toggle event on mount for already-open folders). */
export function toggledFolder(
  open: ReadonlySet<string>,
  relPath: string,
  isOpen: boolean
): ReadonlySet<string> {
  if (open.has(relPath) === isOpen) return open
  const next = new Set(open)
  if (isOpen) next.add(relPath)
  else next.delete(relPath)
  return next
}

/** Every folder path in the tree — the expand-all set. */
export function allFolderPaths(folder: VaultFolder): string[] {
  const paths: string[] = []
  const walk = (node: VaultFolder): void => {
    for (const child of node.folders) {
      paths.push(child.relPath)
      walk(child)
    }
  }
  walk(folder)
  return paths
}
