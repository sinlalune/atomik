import type { IndexChangedEvent, VaultIndexChange } from '../shared/ipc-contract'
import { invalidateGraphIndex, patchGraphIndexOnSave } from './graph-index'
import {
  invalidateRetrievalIndex,
  patchFor,
  patchRetrievalIndexFor
} from './retrieval'

/**
 * ONE door for "the vault changed" (CP-MVP-010 S03).
 *
 * Before this, nineteen handlers each remembered to call
 * `invalidateGraphIndex()` by hand, and a twentieth verb that forgot
 * would have left a stale graph with nothing to catch it. Adding a second
 * index made that shape untenable: every write verb now reports its
 * change here, and this module decides what each projection does with it
 * and tells the renderer.
 *
 * The policy, per index:
 *
 * ```text
 *              retrieval index            graph index
 * saved        patch that one document    patch (falls back to rebuild
 *                                         for bundle contract files)
 * created      patch (adds the document)  invalidate — the node set moved
 * deleted      patch (drops it)           invalidate
 * relocated    invalidate — the rename    invalidate
 *              refactor rewrote links
 *              in OTHER notes too
 * bulk         invalidate                 invalidate
 * ```
 *
 * Invalidation is always CORRECT, merely slower: it is the honest answer
 * whenever a change reaches further than the file that carried it.
 */
export function recordVaultChange(
  vaultRoot: string,
  change: VaultIndexChange,
  notify?: (event: IndexChangedEvent) => void
): void {
  switch (change.kind) {
    case 'saved': {
      const patch = patchFor(vaultRoot, change.path)
      patchRetrievalIndexFor(vaultRoot, [patch])
      if ('content' in patch && patch.content !== undefined) {
        patchGraphIndexOnSave(vaultRoot, change.path, patch.content)
      } else {
        invalidateGraphIndex()
      }
      break
    }
    case 'created': {
      patchRetrievalIndexFor(vaultRoot, [patchFor(vaultRoot, change.path)])
      invalidateGraphIndex()
      break
    }
    case 'deleted': {
      patchRetrievalIndexFor(vaultRoot, [{ path: change.path, removed: true }])
      invalidateGraphIndex()
      break
    }
    default: {
      invalidateRetrievalIndex(vaultRoot)
      invalidateGraphIndex()
    }
  }
  notify?.({ reason: change.kind, paths: pathsOf(change) })
}

function pathsOf(change: VaultIndexChange): string[] {
  if (change.kind === 'relocated') return [change.from, change.to]
  return change.kind === 'bulk' ? [] : [change.path]
}
