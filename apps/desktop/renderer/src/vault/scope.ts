import type { VaultFolder } from '../../../shared/ipc-contract'

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
