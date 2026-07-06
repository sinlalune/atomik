import type { VaultFolder, VaultNoteRef } from '../../../shared/ipc-contract'

/**
 * Pure helper: the subtree of the vault tree rooted at `relPath`
 * (''-rooted, '/'-separated), or null when absent. Lets scoped views
 * (projects) reuse the one listVaultFiles channel instead of growing a
 * new scoped-listing channel.
 */
export function findSubtree(
  root: VaultFolder,
  relPath: string
): VaultFolder | null {
  if (relPath === '') return root
  let current: VaultFolder = root
  for (const segment of relPath.split('/')) {
    const next = current.folders.find((folder) => folder.name === segment)
    if (!next) return null
    current = next
  }
  return current
}

/**
 * Display name of a note: the `.md` suffix is implied everywhere in the
 * UI (owner feedback on MVP-001). Display-only — relPaths and file bytes
 * keep the extension; a non-.md name passes through untouched.
 */
export function noteDisplayName(nameOrPath: string): string {
  const base = nameOrPath.slice(nameOrPath.lastIndexOf('/') + 1)
  return base.toLowerCase().endsWith('.md') ? base.slice(0, -3) : base
}

/**
 * The bundle-convention files (04: index.md/log.md) surface as PILLS at
 * the top of any folder that holds them (owner feedback on MVP-001) and
 * leave the note list — `rest` — unless the folder's eye toggle reveals
 * them. Pure split; index always precedes log.
 */
export function splitPillNotes(notes: VaultNoteRef[]): {
  pills: VaultNoteRef[]
  rest: VaultNoteRef[]
} {
  const pills: VaultNoteRef[] = []
  const rest: VaultNoteRef[] = []
  for (const note of notes) {
    const lower = note.name.toLowerCase()
    if (lower === 'index.md' || lower === 'log.md') pills.push(note)
    else rest.push(note)
  }
  pills.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()))
  return { pills, rest }
}
