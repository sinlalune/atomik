import { useCallback, useEffect, useState } from 'react'
import type { VaultFolder } from '../../../shared/ipc-contract'
import { CollapseAllIcon, ExpandAllIcon, SidebarToggleIcon } from '../icons'
import { TreeResizeHandle } from '../TreeResizeHandle'
import { NoteTree } from '../vault/NoteTree'
import { TreeMenu } from '../vault/TreeMenu'
import {
  deleteConfirmText,
  folderDeleteSummary,
  prunedOpenFolders,
  type TreeMenuTarget
} from '../vault/tree-menu'
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
  const [treeMenu, setTreeMenu] = useState<TreeMenuTarget | null>(null)

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
  // S05f: transcription lands files (transcript.md, scan.jpg) — refresh
  useEffect(() => window.atomik.onVaultFilesChanged(refresh), [refresh])

  return (
    <nav
      className="vault-tree"
      aria-label="Sources tree"
      onContextMenu={(event) => {
        if (!tree) return
        event.preventDefault()
        setTreeMenu({
          kind: 'folder',
          relPath: tree.relPath,
          x: event.clientX,
          y: event.clientY
        })
      }}
    >
      {onTreeResize && <TreeResizeHandle onResize={onTreeResize} />}
      <div className="tree-bar">
        <div className="vault-head">sources</div>
        <button
          type="button"
          className="tree-toggle"
          title="Import a PDF as a source bundle (original preserved as evidence)"
          onClick={() =>
            window.atomik.importPdfSource().then(
              (result) => {
                if (result) {
                  refresh()
                  onOpen(result.dossierPath)
                }
              },
              () => refresh()
            )
          }
        >
          ＋PDF
        </button>
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
          onFolderMenu={(relPath, x, y) =>
            setTreeMenu({ kind: 'folder', relPath, x, y })
          }
          onNoteMenu={(relPath, x, y) =>
            setTreeMenu({ kind: 'note', relPath, x, y })
          }
        />
      ) : (
        <p className="tree-empty-hint">no vault open</p>
      )}
      {treeMenu && (
        <TreeMenu
          target={treeMenu}
          scopeLabel="sources"
          onClose={() => setTreeMenu(null)}
          onNewNote={async (relPath) => {
            await window.atomik.createNote(relPath)
            refresh()
            onOpen(relPath)
          }}
          onNewFolder={async (relPath) => {
            const created = await window.atomik.createFolder(relPath)
            refresh()
            onOpenFoldersChange?.(new Set([...openFolders, created.relPath]))
            onOpen(created.indexRelPath)
          }}
          onRename={async (from, to) => {
            const preview = await window.atomik.relocatePreview(from, to)
            if (preview.totalLinks > 0) {
              const others = preview.edits.filter((edit) => edit.relPath !== from)
              const ok = window.confirm(
                `Renaming updates ${preview.totalLinks} link(s) in ${others.length} note(s). Apply the rename refactor?`
              )
              if (!ok) return
            }
            await window.atomik.relocateApply(from, to)
            refresh()
          }}
          onMove={async (target, to) => {
            const preview =
              target.kind === 'note'
                ? await window.atomik.relocatePreview(target.relPath, to)
                : await window.atomik.relocateFolderPreview(target.relPath, to)
            const links =
              preview.totalLinks > 0
                ? ` ${preview.totalLinks} link(s) update in ${preview.edits.length} note(s).`
                : ' No links need updating.'
            if (!window.confirm(`Move “${target.relPath}” → “${to}”?${links}`)) return
            await (target.kind === 'note'
              ? window.atomik.relocateApply(target.relPath, to)
              : window.atomik.relocateFolderApply(target.relPath, to))
            if (target.kind === 'folder') {
              onOpenFoldersChange?.(prunedOpenFolders(openFolders, target.relPath))
            }
            refresh()
          }}
          onDelete={async (target) => {
            const summary =
              target.kind === 'folder' && tree
                ? folderDeleteSummary(tree, target.relPath)
                : null
            if (!window.confirm(deleteConfirmText(target, summary))) return
            await (target.kind === 'note'
              ? window.atomik.deleteNote(target.relPath)
              : window.atomik.deleteFolder(target.relPath))
            if (target.kind === 'folder') {
              onOpenFoldersChange?.(prunedOpenFolders(openFolders, target.relPath))
            }
            refresh()
          }}
        />
      )}
    </nav>
  )
}
