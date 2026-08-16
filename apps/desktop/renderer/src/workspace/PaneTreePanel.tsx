import { useCallback, useEffect, useState } from 'react'
import type {
  DevDocsGroup,
  VaultFolder,
  VaultInfo
} from '../../../shared/ipc-contract'
import {
  CollapseAllIcon,
  ExpandAllIcon,
  PlusIcon,
  SidebarToggleIcon,
  VaultSwitchIcon
} from '../icons'
import { BrokenLinksPanel } from '../search/BrokenLinksPanel'
import { SearchResultsList } from '../search/SearchResultsList'
import { useTreeSearch } from '../search/useTreeSearch'
import { TreeResizeHandle } from '../TreeResizeHandle'
import { NoteTree, parseTreeDrag } from '../vault/NoteTree'
import { findSubtree } from '../vault/scope'
import { allFolderPaths, serializeOpenFolders, toggledFolder } from '../vault/tree-fold'
import { TreeMenu } from '../vault/TreeMenu'
import {
  deleteConfirmText,
  dropMoveTarget,
  folderDeleteSummary,
  prunedOpenFolders,
  TREE_DRAG_MIME,
  type TreeDragSource,
  type TreeMenuTarget
} from '../vault/tree-menu'
import {
  paneTreeOpenFolders,
  paneTreeScopeOf,
  type PaneTree,
  type PaneTreeScope,
  type SaveMode
} from './model'

/**
 * The pane's ONE tree panel (S07d, owner directive): pane chrome typed
 * by the PANE — vault or project — never by the active tab. Tabs are
 * just views served from it: a note click routes to a note tab, a
 * source.md click to a source tab, and switching tabs (web included)
 * never changes this panel. Consolidates the tree that previously
 * lived inside VaultView / ProjectView / SourcesTree.
 */

export type PaneTreePanelProps = {
  tree: PaneTree
  /** Vault (or docs) path of the active tab's file, for the highlight. */
  activePath: string | null
  /** App-wide save policy — manual mode confirms before a dirty
   *  editor's pane navigates away (the guard the views used to own). */
  saveMode: SaveMode
  /** The active editor's dirty note (null when clean) — reported by
   *  the note views through the pane bridge. */
  dirtyPath: () => string | null
  /** Panel preferences: off / w / open. */
  onPatch: (patch: Record<string, string>) => void
  /** Retype the pane (project → vault escape hatch). */
  onScopeChange: (scope: PaneTreeScope) => void
  /** Route a note to a note tab (active one when it is a note view). */
  onOpenNote: (relPath: string) => void
  /** Route a dossier to a source tab. */
  onOpenSource: (dossierPath: string) => void
  /** Route a doc to a dev-docs tab (docs panes, S07e). */
  onOpenDoc: (relPath: string) => void
  /** A delete landed — the pane closes its tabs under this path. */
  onDeleted: (relPath: string) => void
}

const isDossierPath = (relPath: string): boolean =>
  relPath.split('/').pop() === 'source.md'

/** `.md` is implied in displayed doc names; other extensions stay. */
const docLabel = (label: string): string =>
  label.toLowerCase().endsWith('.md') ? label.slice(0, -3) : label

/**
 * The docs-typed pane's panel (S07e): the documentation tree, lifted
 * out of the DevDocs view — same grouped list, search, and fold state,
 * now pane chrome like its vault/project siblings.
 */
function DocsTreePanel({
  tree,
  activePath,
  onPatch,
  onOpenDoc
}: Pick<PaneTreePanelProps, 'tree' | 'activePath' | 'onPatch' | 'onOpenDoc'>):
  React.JSX.Element {
  const openFolders = paneTreeOpenFolders(tree)
  const [groups, setGroups] = useState<DevDocsGroup[]>([])
  const [error, setError] = useState<string | null>(null)
  const searchDocs = useCallback(
    (query: string) => window.atomik.searchDevDocs(query),
    []
  )
  const { query: searchQuery, setQuery: setSearchQuery, results: searchResults } =
    useTreeSearch(searchDocs)

  useEffect(() => {
    window.atomik
      .listDevDocs()
      .then(setGroups, (reason: unknown) => setError(String(reason)))
  }, [])

  const setOpenFolders = (next: ReadonlySet<string>): void =>
    onPatch({ open: serializeOpenFolders(next) })

  return (
    <nav className="vault-tree pane-tree" aria-label="Documentation tree">
      <TreeResizeHandle onResize={(px) => onPatch({ w: String(px) })} />
      <div className="tree-bar">
        <span className="tree-bar-label">documentation</span>
        <button
          type="button"
          className="tree-toggle"
          title="Expand all groups"
          onClick={() => setOpenFolders(new Set(groups.map((group) => group.id)))}
        >
          <ExpandAllIcon />
        </button>
        <button
          type="button"
          className="tree-toggle"
          title="Collapse all groups"
          onClick={() => setOpenFolders(new Set())}
        >
          <CollapseAllIcon />
        </button>
      </div>
      <div className="vault-search">
        <input
          placeholder="search docs…"
          aria-label="Search docs"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setSearchQuery('')
          }}
        />
      </div>
      {error && <p className="error">{error}</p>}
      <div className="pane-tree-scroll">
        {searchResults !== null ? (
          <SearchResultsList
            results={searchResults}
            activePath={activePath}
            onOpen={onOpenDoc}
          />
        ) : (
          groups.map((group) => (
            <details
              key={group.id}
              open={openFolders.has(group.id)}
              onToggle={(event) => {
                const next = toggledFolder(
                  openFolders,
                  group.id,
                  event.currentTarget.open
                )
                if (next !== openFolders) setOpenFolders(next)
              }}
            >
              <summary>{group.label}</summary>
              <ul>
                {group.entries.map((entry) => (
                  <li key={entry.relPath}>
                    <button
                      type="button"
                      className={activePath === entry.relPath ? 'active' : ''}
                      onClick={() => onOpenDoc(entry.relPath)}
                    >
                      {docLabel(entry.label)}
                    </button>
                  </li>
                ))}
              </ul>
            </details>
          ))
        )}
      </div>
      <button
        type="button"
        className="tree-toggle pane-tree-hide"
        title="Hide tree panel"
        onClick={() => onPatch({ off: '1' })}
      >
        <SidebarToggleIcon />
      </button>
    </nav>
  )
}

export function PaneTreePanel({
  tree,
  activePath,
  saveMode,
  dirtyPath,
  onPatch,
  onScopeChange,
  onOpenNote,
  onOpenSource,
  onOpenDoc,
  onDeleted
}: PaneTreePanelProps): React.JSX.Element {
  const scope = paneTreeScopeOf(tree)
  const openFolders = paneTreeOpenFolders(tree)
  const [info, setInfo] = useState<VaultInfo | null | 'loading'>('loading')
  const [fullTree, setFullTree] = useState<VaultFolder | null>(null)
  const [draftName, setDraftName] = useState('')
  const [treeMenu, setTreeMenu] = useState<TreeMenuTarget | null>(null)
  const [error, setError] = useState<string | null>(null)

  const searchScoped = useCallback(
    (query: string) =>
      window.atomik.searchVault(
        query,
        scope.kind === 'project' ? scope.projectPath : undefined
      ),
    [scope.kind, scope.kind === 'project' ? scope.projectPath : '']
  )
  const { query: searchQuery, setQuery: setSearchQuery, results: searchResults } =
    useTreeSearch(searchScoped)

  const refreshTree = useCallback(async () => {
    try {
      setFullTree(await window.atomik.listVaultFiles())
    } catch (reason) {
      setError(String(reason))
    }
  }, [])

  useEffect(() => {
    window.atomik.getVault().then(
      async (vault) => {
        setInfo(vault)
        if (vault) await refreshTree()
      },
      (reason: unknown) => {
        setInfo(null)
        setError(String(reason))
      }
    )
  }, [refreshTree])

  // Vault switch: drop everything held from the previous vault.
  useEffect(
    () =>
      window.atomik.onVaultChanged((vault) => {
        setInfo(vault)
        setFullTree(null)
        setSearchQuery('')
        setError(null)
        if (vault) void refreshTree()
      }),
    [refreshTree, setSearchQuery]
  )
  // Every main-side landing refreshes this tree, whichever view initiated.
  useEffect(
    () => window.atomik.onVaultFilesChanged(() => void refreshTree()),
    [refreshTree]
  )

  /** Tree navigation respects a dirty manual-mode editor — the same
   *  confirm the views used to run, now at the pane door. */
  const guardedOpen = useCallback(
    (relPath: string) => {
      if (
        saveMode === 'manual' &&
        dirtyPath() !== null &&
        !window.confirm('Unsaved changes will be lost. Continue?')
      ) {
        return
      }
      if (isDossierPath(relPath)) onOpenSource(relPath)
      else onOpenNote(relPath)
    },
    [dirtyPath, onOpenNote, onOpenSource, saveMode]
  )

  /** Rename/move/delete refuse while the touched note sits dirty in
   *  this pane's editor (the message renders inside the menu popup). */
  const assertClean = useCallback(
    (relPath: string) => {
      const dirty = dirtyPath()
      if (dirty && (dirty === relPath || dirty.startsWith(`${relPath}/`))) {
        throw new Error('save or discard the open changes first')
      }
    },
    [dirtyPath]
  )

  const setOpenFolders = useCallback(
    (next: ReadonlySet<string>) => onPatch({ open: serializeOpenFolders(next) }),
    [onPatch]
  )

  const menuNewNote = useCallback(
    async (relPath: string) => {
      await window.atomik.createNote(relPath)
      guardedOpen(relPath)
    },
    [guardedOpen]
  )
  // S03b: same create verb, content autofilled from the menu's choices.
  const menuNewPrompt = useCallback(
    async (relPath: string, content: string) => {
      await window.atomik.createNote(relPath, content)
      guardedOpen(relPath)
    },
    [guardedOpen]
  )
  const menuNewFolder = useCallback(
    async (relPath: string) => {
      const created = await window.atomik.createFolder(relPath)
      onPatch({
        open: serializeOpenFolders(new Set([...openFolders, created.relPath]))
      })
      guardedOpen(created.indexRelPath)
    },
    [guardedOpen, onPatch, openFolders]
  )
  // S04: rename = the previewed refactor; the preview IS the gate (20/27).
  // Tab params and the pane tree follow via the note-relocated push.
  const menuRename = useCallback(
    async (from: string, to: string) => {
      assertClean(from)
      const preview = await window.atomik.relocatePreview(from, to)
      if (preview.totalLinks > 0) {
        const others = preview.edits.filter((edit) => edit.relPath !== from)
        const lines = others
          .slice(0, 8)
          .map((edit) => `  ${edit.relPath} (${edit.count})`)
        const more = others.length > 8 ? `\n  … +${others.length - 8} more` : ''
        const ok = window.confirm(
          `Renaming updates ${preview.totalLinks} link${preview.totalLinks === 1 ? '' : 's'} in ${others.length} note${others.length === 1 ? '' : 's'}:\n\n${lines.join('\n')}${more}\n\nApply the rename refactor?`
        )
        if (!ok) return
      }
      await window.atomik.relocateApply(from, to)
    },
    [assertClean]
  )
  // S05: Move to… — always confirmed (a bigger gesture than a rename).
  const menuMove = useCallback(
    async (target: TreeMenuTarget, to: string) => {
      assertClean(target.relPath)
      const preview =
        target.kind === 'note'
          ? await window.atomik.relocatePreview(target.relPath, to)
          : await window.atomik.relocateFolderPreview(target.relPath, to)
      const links =
        preview.totalLinks > 0
          ? `\n\n${preview.totalLinks} link${preview.totalLinks === 1 ? '' : 's'} update in ${preview.edits.length} note${preview.edits.length === 1 ? '' : 's'}.`
          : '\n\nNo links need updating.'
      if (!window.confirm(`Move “${target.relPath}” → “${to}”?${links}`)) return
      if (target.kind === 'note') {
        await window.atomik.relocateApply(target.relPath, to)
      } else {
        await window.atomik.relocateFolderApply(target.relPath, to)
      }
    },
    [assertClean]
  )
  // S06: DnD is an INPUT BINDING over the proven Move flow.
  const dropNode = useCallback(
    (source: TreeDragSource, destFolder: string) => {
      const to = dropMoveTarget(source, destFolder)
      if (!to) return
      void menuMove({ ...source, x: 0, y: 0 }, to).catch((reason) =>
        setError(String(reason))
      )
    },
    [menuMove]
  )
  // S03: confirm names the target; the pane closes its tabs under it.
  const menuDelete = useCallback(
    async (target: TreeMenuTarget) => {
      assertClean(target.relPath)
      const scoped =
        fullTree && scope.kind === 'project'
          ? findSubtree(fullTree, scope.projectPath)
          : fullTree
      const summary =
        target.kind === 'folder' && scoped
          ? folderDeleteSummary(scoped, target.relPath)
          : null
      if (!window.confirm(deleteConfirmText(target, summary))) return
      if (target.kind === 'note') {
        await window.atomik.deleteNote(target.relPath)
      } else {
        await window.atomik.deleteFolder(target.relPath)
        onPatch({
          open: serializeOpenFolders(
            prunedOpenFolders(openFolders, target.relPath)
          )
        })
      }
      onDeleted(target.relPath)
    },
    [assertClean, fullTree, onDeleted, onPatch, openFolders, scope]
  )

  const onCreate = useCallback(async () => {
    const name = draftName.trim()
    if (!name) return
    const child = name.toLowerCase().endsWith('.md') ? name : `${name}.md`
    const relPath =
      scope.kind === 'project' ? `${scope.projectPath}/${child}` : child
    try {
      await window.atomik.createNote(relPath)
      setDraftName('')
      setError(null)
      guardedOpen(relPath)
    } catch (reason) {
      setError(String(reason))
    }
  }, [draftName, guardedOpen, scope])

  const onOpenVault = useCallback(async () => {
    await window.atomik.openVault()
  }, [])

  // Docs panes delegate to the documentation panel — same chrome, the
  // docs corpus instead of the vault. (After every hook: a pane that
  // retypes must keep this component's hook order stable.)
  if (scope.kind === 'docs') {
    return (
      <DocsTreePanel
        tree={tree}
        activePath={activePath}
        onPatch={onPatch}
        onOpenDoc={onOpenDoc}
      />
    )
  }

  // Project scope: the subtree while it exists; the deleted-project
  // fallback is the whole vault (a tree panel never goes blank).
  const scopedTree = ((): VaultFolder | null => {
    if (!fullTree) return null
    if (scope.kind === 'project') {
      return findSubtree(fullTree, scope.projectPath) ?? fullTree
    }
    return fullTree
  })()
  const projectMissing =
    scope.kind === 'project' &&
    fullTree !== null &&
    findSubtree(fullTree, scope.projectPath) === null
  const scopeRoot =
    scope.kind === 'project' && !projectMissing ? scope.projectPath : ''
  const headLabel =
    scope.kind === 'project' && !projectMissing
      ? (scope.projectTitle ?? scope.projectPath)
      : info !== 'loading' && info !== null
        ? info.name
        : '…'

  return (
    <nav
      className="vault-tree pane-tree"
      aria-label={scope.kind === 'project' ? 'Project tree' : 'Vault tree'}
      onContextMenu={(event) => {
        // background right-click = the scope root (node menus stop
        // propagation before reaching here)
        event.preventDefault()
        setTreeMenu({
          kind: 'folder',
          relPath: scopeRoot,
          x: event.clientX,
          y: event.clientY
        })
      }}
      onDragOver={(event) => {
        if (!event.dataTransfer.types.includes(TREE_DRAG_MIME)) return
        event.preventDefault()
        event.dataTransfer.dropEffect = 'move'
      }}
      onDrop={(event) => {
        // background drop = the scope root (folder targets stop propagation)
        event.preventDefault()
        const source = parseTreeDrag(event.dataTransfer.getData(TREE_DRAG_MIME))
        if (source) dropNode(source, scopeRoot)
      }}
    >
      <TreeResizeHandle onResize={(px) => onPatch({ w: String(px) })} />
      <div className="tree-bar">
        <div
          className="vault-head"
          title={
            scope.kind === 'project'
              ? scope.projectPath
              : info !== 'loading' && info !== null
                ? info.root
                : undefined
          }
        >
          {headLabel}
        </div>
        <button
          type="button"
          className="tree-toggle"
          title="Expand all folders"
          onClick={() =>
            scopedTree && setOpenFolders(new Set(allFolderPaths(scopedTree)))
          }
        >
          <ExpandAllIcon />
        </button>
        <button
          type="button"
          className="tree-toggle"
          title="Collapse all folders"
          onClick={() => setOpenFolders(new Set())}
        >
          <CollapseAllIcon />
        </button>
        {scope.kind === 'project' ? (
          <button
            type="button"
            className="tree-toggle"
            title="Show the whole vault tree in this pane"
            onClick={() => onScopeChange({ kind: 'vault' })}
          >
            <VaultSwitchIcon />
          </button>
        ) : (
          <button
            type="button"
            className="tree-toggle"
            title="Change vault folder…"
            onClick={() => void onOpenVault()}
          >
            <VaultSwitchIcon />
          </button>
        )}
      </div>
      {projectMissing && (
        <p className="tree-empty-hint">
          project folder missing — showing the vault
        </p>
      )}
      {info === null ? (
        <div className="pane-tree-empty">
          <p className="tree-empty-hint">no vault open</p>
          <button
            type="button"
            className="vault-open-button"
            onClick={() => void onOpenVault()}
          >
            Open vault folder…
          </button>
        </div>
      ) : (
        <>
          <div className="vault-new">
            <input
              value={draftName}
              placeholder={
                scope.kind === 'project' ? 'new note in project…' : 'new note name…'
              }
              aria-label="New note name"
              onChange={(event) => setDraftName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void onCreate()
              }}
            />
            <button
              type="button"
              title="Create note"
              aria-label="Create note"
              onClick={() => void onCreate()}
            >
              <PlusIcon />
            </button>
          </div>
          <div className="vault-search">
            <input
              placeholder={
                scope.kind === 'project' ? 'search project…' : 'search vault…'
              }
              aria-label={
                scope.kind === 'project' ? 'Search project' : 'Search vault'
              }
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') setSearchQuery('')
              }}
            />
          </div>
          {error && <p className="error">{error}</p>}
          <BrokenLinksPanel
            scope={scope.kind === 'project' ? scope.projectPath : undefined}
            onOpen={guardedOpen}
          />
          <div className="pane-tree-scroll">
            {searchResults !== null ? (
              <SearchResultsList
                results={searchResults}
                activePath={activePath}
                onOpen={guardedOpen}
              />
            ) : (
              scopedTree && (
                <NoteTree
                  folder={scopedTree}
                  activePath={activePath}
                  onOpen={guardedOpen}
                  openFolders={openFolders}
                  onFolderToggle={(relPath, open) => {
                    const next = toggledFolder(openFolders, relPath, open)
                    if (next !== openFolders) setOpenFolders(next)
                  }}
                  onFolderMenu={(relPath, x, y) =>
                    setTreeMenu({ kind: 'folder', relPath, x, y })
                  }
                  onNoteMenu={(relPath, x, y) =>
                    setTreeMenu({ kind: 'note', relPath, x, y })
                  }
                  onDropNode={dropNode}
                />
              )
            )}
          </div>
        </>
      )}
      {treeMenu && (
        <TreeMenu
          target={treeMenu}
          scopeLabel={headLabel}
          onClose={() => setTreeMenu(null)}
          onNewNote={menuNewNote}
          onNewFolder={menuNewFolder}
          onNewPrompt={menuNewPrompt}
          onDelete={menuDelete}
          onRename={menuRename}
          onMove={menuMove}
        />
      )}
      <button
        type="button"
        className="tree-toggle pane-tree-hide"
        title="Hide tree panel"
        onClick={() => onPatch({ off: '1' })}
      >
        <SidebarToggleIcon />
      </button>
    </nav>
  )
}
