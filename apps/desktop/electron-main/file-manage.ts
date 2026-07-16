import { existsSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { assertInsideVault, resolveNotePath } from './vault'
import { resolveProjectDirPath } from './project'

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

/**
 * Bundle-internal rule (S01 pin): a folder that directly contains
 * source.md is a bundle root — its files (source.md itself included)
 * delete WITH the bundle, never individually. Derived files keep
 * their in-view verbs, which also restore dossier state.
 */
function bundleRootOf(absNote: string): string | null {
  const dir = dirname(absNote)
  return existsSync(join(dir, 'source.md')) ? dir : null
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
  const bundleRoot = bundleRootOf(abs)
  if (bundleRoot) {
    throw new Error(
      `file-manage: bundle file — delete the bundle folder instead (${rel(vaultRoot, bundleRoot)})`
    )
  }
  await trash(abs)
  return { relPath: rel(vaultRoot, abs) }
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
  return { relPath: rel(vaultRoot, abs) }
}
