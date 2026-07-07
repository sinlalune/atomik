import { useCallback, useEffect, useState } from 'react'
import type { VaultFolder } from '../../../shared/ipc-contract'
import { CollapseAllIcon, ExpandAllIcon, SidebarToggleIcon } from '../icons'
import { TreeResizeHandle } from '../TreeResizeHandle'
import { NoteTree } from '../vault/NoteTree'
import { findSubtree } from '../vault/scope'
import { allFolderPaths, toggledFolder } from '../vault/tree-fold'

/**
 * The sources tree (owner request: capture and source tabs felt awkward
 * without navigation). One panel, scoped to the vault's `sources/`
 * subtree when it exists — the whole vault otherwise — reusing the
 * vault-tab tree mechanics wholesale: NoteTree, per-tab fold state,
 * resize, collapse. What a click OPENS is the host view's decision.
 */

/** `sources/` when present, the whole vault otherwise. Pure. */
export function sourcesSubtreeOf(tree: VaultFolder): VaultFolder {
  return findSubtree(tree, 'sources') ?? tree
}

export function SourcesTreePanel({
  activePath,
  onOpen,
  onTreeToggle,
  onTreeResize,
  openFolders,
  onOpenFoldersChange
}: {
  activePath: string | null
  onOpen: (relPath: string) => void
  onTreeToggle?: (() => void) | undefined
  onTreeResize?: ((px: number) => void) | undefined
  openFolders: ReadonlySet<string>
  onOpenFoldersChange?: ((next: ReadonlySet<string>) => void) | undefined
}): React.JSX.Element {
  const [tree, setTree] = useState<VaultFolder | null>(null)

  const refresh = useCallback(() => {
    window.atomik.getVault().then(
      async (vault) => {
        if (!vault) {
          setTree(null)
          return
        }
        setTree(sourcesSubtreeOf(await window.atomik.listVaultFiles()))
      },
      () => setTree(null)
    )
  }, [])

  useEffect(refresh, [refresh])
  useEffect(() => window.atomik.onVaultChanged(refresh), [refresh])

  return (
    <nav className="vault-tree" aria-label="Sources tree">
      {onTreeResize && <TreeResizeHandle onResize={onTreeResize} />}
      <div className="tree-bar">
        <div className="vault-head">sources</div>
        <button
          type="button"
          className="tree-toggle"
          title="Expand all folders"
          onClick={() =>
            tree && onOpenFoldersChange?.(new Set(allFolderPaths(tree)))
          }
        >
          <ExpandAllIcon />
        </button>
        <button
          type="button"
          className="tree-toggle"
          title="Collapse all folders"
          onClick={() => onOpenFoldersChange?.(new Set())}
        >
          <CollapseAllIcon />
        </button>
        {onTreeToggle && (
          <button
            type="button"
            className="tree-toggle"
            title="Hide tree panel"
            onClick={onTreeToggle}
          >
            <SidebarToggleIcon />
          </button>
        )}
      </div>
      {tree ? (
        <NoteTree
          folder={tree}
          activePath={activePath}
          onOpen={onOpen}
          openFolders={openFolders}
          onFolderToggle={(relPath, open) => {
            const next = toggledFolder(openFolders, relPath, open)
            if (next !== openFolders) onOpenFoldersChange?.(next)
          }}
        />
      ) : (
        <p className="tree-empty-hint">no vault open</p>
      )}
    </nav>
  )
}
