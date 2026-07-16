import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  ProjectInfo,
  VaultFolder,
  VaultInfo
} from '../../../shared/ipc-contract'
import { EditorPane } from '../editor/EditorPane'
import { ModeSwitch } from '../editor/ModeSwitch'
import { CollapseAllIcon, ExpandAllIcon, SidebarToggleIcon } from '../icons'
import { SearchResultsList } from '../search/SearchResultsList'
import { useTreeSearch } from '../search/useTreeSearch'
import { TreeResizeHandle } from '../TreeResizeHandle'
import { NoteTree, parseTreeDrag } from '../vault/NoteTree'
import { noteFollowTarget } from '../vault/note-follow'
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
import { useNavHistory } from '../vault/nav-history'
import { findSubtree } from '../vault/scope'
import { allFolderPaths, toggledFolder } from '../vault/tree-fold'
import { useVaultNote } from '../vault/useVaultNote'
import type { NoteViewMode, SaveMode } from '../workspace/model'

export type ProjectViewProps = {
  /** Vault-relative folder of the opened bundle. */
  projectPath?: string
  /** Note currently shown inside the project. */
  notePath?: string
  onProjectOpened?: (project: ProjectInfo) => void
  onNoteOpened?: (relPath: string) => void
  /** Escape hatch on the picker screens (a mistakenly opened tab). */
  onCloseTab?: () => void
  /** Tree panel visibility, persisted per tab by the workspace. */
  treeCollapsed?: boolean
  onTreeToggle?: () => void
  /** Tree panel width (px), persisted per tab; undefined = CSS default. */
  treeWidth?: number
  onTreeResize?: (px: number) => void
  /** read / live (default) / source, persisted per tab. */
  mode?: NoteViewMode
  onModeChange?: (mode: NoteViewMode) => void
  /** App-wide save policy; auto skips discard prompts (flush-on-leave). */
  saveMode?: SaveMode
  onSaveModeToggle?: () => void
  /** Opens an external http(s) link in a web tab (S04b). */
  onOpenWebUrl?: (url: string) => void
  /** Keys this tab's ‹ › navigation trail (the tab id). */
  historyKey?: string
  /** Controlled fold state: open folders, persisted per tab (collapsed
   *  by default — owner request). */
  openFolders?: ReadonlySet<string>
  onOpenFoldersChange?: (next: ReadonlySet<string>) => void
}

const NO_OPEN_FOLDERS: ReadonlySet<string> = new Set()

function slugifyLite(title: string): string {
  const slug = title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug.length > 0 ? slug : 'project'
}

/**
 * Project bundle tab (04, 03's project-overview): pick or create/adopt a
 * bundle, then work inside it — index.md/log.md shortcuts, a tree scoped
 * to the project folder, and note creation rooted there. Reads go through
 * the existing vault channels; only list/create-project are new.
 */
export function ProjectView({
  projectPath,
  notePath,
  onProjectOpened,
  onNoteOpened,
  onCloseTab,
  treeCollapsed,
  onTreeToggle,
  treeWidth,
  onTreeResize,
  mode = 'live',
  onModeChange,
  saveMode = 'auto',
  onSaveModeToggle,
  onOpenWebUrl,
  historyKey,
  openFolders = NO_OPEN_FOLDERS,
  onOpenFoldersChange
}: ProjectViewProps): React.JSX.Element {
  const [vault, setVault] = useState<VaultInfo | null | 'loading'>('loading')
  const [projects, setProjects] = useState<ProjectInfo[]>([])
  const [projectsLoaded, setProjectsLoaded] = useState(false)
  const [tree, setTree] = useState<VaultFolder | null>(null)
  const [draftTitle, setDraftTitle] = useState('')
  const [draftNoteName, setDraftNoteName] = useState('')
  const [treeMenu, setTreeMenu] = useState<TreeMenuTarget | null>(null)
  // Project-scoped search perimeter (owner feedback on MVP-001).
  const searchProject = useCallback(
    (query: string) =>
      projectPath
        ? window.atomik.searchVault(query, projectPath)
        : Promise.resolve([]),
    [projectPath]
  )
  const { query: searchQuery, setQuery: setSearchQuery, results: searchResults } =
    useTreeSearch(searchProject)
  const [editorDirty, setEditorDirty] = useState(false)
  const {
    note,
    html,
    error,
    setError,
    openNote,
    applySaved,
    reset,
    lastRequested,
    onContentClick
  } = useVaultNote(onNoteOpened, undefined, onOpenWebUrl)

  const onDirtyChange = useCallback((dirty: boolean) => {
    setEditorDirty(dirty)
  }, [])

  /** Note navigation in edit mode must not silently discard a buffer.
   *  Auto-save mode navigates freely: the unmounting editor flushes. */
  const guardedOpen = useCallback(
    (relPath: string) => {
      if (
        editorDirty &&
        saveMode === 'manual' &&
        !window.confirm('Unsaved changes will be lost. Continue?')
      ) {
        return
      }
      setEditorDirty(false)
      openNote(relPath)
    },
    [editorDirty, openNote, saveMode]
  )
  const nav = useNavHistory(historyKey, note?.relPath, guardedOpen)

  const refresh = useCallback(async () => {
    try {
      setProjects(await window.atomik.listProjects())
      setTree(await window.atomik.listVaultFiles())
      setProjectsLoaded(true)
    } catch (reason) {
      setError(String(reason))
    }
  }, [setError])

  useEffect(() => {
    window.atomik.getVault().then(
      async (info) => {
        setVault(info)
        if (info) await refresh()
      },
      (reason: unknown) => {
        setVault(null)
        setError(String(reason))
      }
    )
  }, [refresh, setError])

  // Vault switch: drop previous-vault state and re-list; a projectPath
  // that does not exist in the new vault falls back to the picker below.
  // The restore guard is POISONED with the stale target so the old
  // vault's note is never re-requested against the new root.
  const staleTargetRef = useRef<string | null>(null)
  useEffect(() => {
    staleTargetRef.current =
      notePath ?? (projectPath ? `${projectPath}/index.md` : null)
  }, [notePath, projectPath])
  useEffect(() => {
    return window.atomik.onVaultChanged((info) => {
      setVault(info)
      reset()
      lastRequested.current = staleTargetRef.current
      setEditorDirty(false)
      setSearchQuery('')
      setProjects([])
      setProjectsLoaded(false)
      setTree(null)
      if (info) void refresh()
    })
  }, [lastRequested, refresh, reset, setSearchQuery])

  /** The tab's bundle, only while it exists in the OPEN vault. */
  const projectExists =
    projectPath !== undefined &&
    (!projectsLoaded ||
      projects.some((project) => project.relPath === projectPath))

  // Restore / follow the tab's note; default to the bundle's index.md.
  // S07a: follow only on a REAL param transition (stale re-renders
  // must never flash the previous note back).
  const followState = useRef<{ prevProp: string | undefined }>({
    prevProp: undefined
  })
  useEffect(() => {
    if (vault === 'loading' || vault === null || !projectPath) return
    if (!projectExists) return
    const target = noteFollowTarget(
      followState.current,
      notePath ?? `${projectPath}/index.md`,
      lastRequested.current
    )
    if (target) openNote(target)
  }, [vault, projectPath, projectExists, notePath, openNote, lastRequested])

  const onCreateProject = useCallback(async () => {
    const title = draftTitle.trim()
    if (!title) return
    try {
      const project = await window.atomik.createProject(
        `projects/${slugifyLite(title)}`,
        title
      )
      setDraftTitle('')
      await refresh()
      onProjectOpened?.(project)
    } catch (reason) {
      setError(String(reason))
    }
  }, [draftTitle, onProjectOpened, refresh, setError])

  const onCreateNote = useCallback(async () => {
    if (!projectPath) return
    const name = draftNoteName.trim()
    if (!name) return
    const relPath = `${projectPath}/${name.toLowerCase().endsWith('.md') ? name : `${name}.md`}`
    try {
      await window.atomik.createNote(relPath)
      setDraftNoteName('')
      await refresh()
      openNote(relPath)
    } catch (reason) {
      setError(String(reason))
    }
  }, [draftNoteName, openNote, projectPath, refresh, setError])

  // CP-MVP-007 S02: context-menu creation, scoped to the project subtree.
  const menuNewNote = useCallback(
    async (relPath: string) => {
      await window.atomik.createNote(relPath)
      guardedOpen(relPath)
    },
    [guardedOpen]
  )
  const menuNewFolder = useCallback(
    async (relPath: string) => {
      const created = await window.atomik.createFolder(relPath)
      onOpenFoldersChange?.(new Set([...openFolders, created.relPath]))
      guardedOpen(created.indexRelPath)
    },
    [guardedOpen, onOpenFoldersChange, openFolders]
  )
  const menuRename = useCallback(
    async (from: string, to: string) => {
      if (editorDirty && note?.relPath === from) {
        throw new Error('save or discard the open changes first')
      }
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
      if (note?.relPath === from) openNote(to)
      await refresh()
    },
    [editorDirty, note, openNote, refresh]
  )
  const menuMove = useCallback(
    async (target: TreeMenuTarget, to: string) => {
      if (
        editorDirty &&
        note &&
        (note.relPath === target.relPath ||
          note.relPath.startsWith(`${target.relPath}/`))
      ) {
        throw new Error('save or discard the open changes first')
      }
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
        if (note?.relPath === target.relPath) openNote(to)
      } else {
        await window.atomik.relocateFolderApply(target.relPath, to)
        onOpenFoldersChange?.(prunedOpenFolders(openFolders, target.relPath))
      }
      await refresh()
    },
    [editorDirty, note, onOpenFoldersChange, openFolders, openNote, refresh]
  )
  const dropNode = useCallback(
    (source: TreeDragSource, destFolder: string) => {
      const to = dropMoveTarget(source, destFolder)
      if (!to) return
      void menuMove({ ...source, x: 0, y: 0 }, to).catch((reason) =>
        setError(String(reason))
      )
    },
    [menuMove, setError]
  )
  const menuDelete = useCallback(
    async (target: TreeMenuTarget) => {
      const scoped = tree && projectPath ? findSubtree(tree, projectPath) : null
      const summary =
        target.kind === 'folder' && scoped
          ? folderDeleteSummary(scoped, target.relPath)
          : null
      if (!window.confirm(deleteConfirmText(target, summary))) return
      if (target.kind === 'note') {
        await window.atomik.deleteNote(target.relPath)
        if (note?.relPath === target.relPath) reset()
      } else {
        await window.atomik.deleteFolder(target.relPath)
        if (
          note &&
          (note.relPath === target.relPath ||
            note.relPath.startsWith(`${target.relPath}/`))
        ) {
          reset()
        }
        onOpenFoldersChange?.(prunedOpenFolders(openFolders, target.relPath))
      }
      await refresh()
    },
    [note, onOpenFoldersChange, openFolders, projectPath, refresh, reset, tree]
  )

  if (vault === 'loading') {
    return <p className="pane-placeholder">loading…</p>
  }

  if (vault === null) {
    return (
      <div className="vault-empty">
        <h2>No vault open</h2>
        <p>Projects live inside a vault — open one in a Vault tab first.</p>
      </div>
    )
  }

  if (!projectPath || !projectExists) {
    return (
      <div className="vault-empty">
        <h2>Projects</h2>
        {projects.length > 0 ? (
          <ul className="project-list">
            {projects.map((project) => (
              <li key={project.relPath}>
                <button
                  type="button"
                  title={project.relPath}
                  onClick={() => onProjectOpened?.(project)}
                >
                  {project.title}
                  <span className="project-path">{project.relPath}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p>No project bundles in this vault yet.</p>
        )}
        <div className="vault-new project-create">
          <input
            value={draftTitle}
            placeholder="new project title…"
            onChange={(event) => setDraftTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') void onCreateProject()
            }}
          />
          <button type="button" onClick={() => void onCreateProject()}>
            create
          </button>
        </div>
        {error && <p className="error">{error}</p>}
        {onCloseTab && (
          <button type="button" className="chooser-close" onClick={onCloseTab}>
            Close tab
          </button>
        )}
      </div>
    )
  }

  const scoped = tree ? findSubtree(tree, projectPath) : null
  const projectTitle =
    projects.find((project) => project.relPath === projectPath)?.title ??
    projectPath

  return (
    <div
      className={`vault project${treeCollapsed ? ' no-tree' : ''}`}
      style={
        !treeCollapsed && treeWidth !== undefined
          ? { gridTemplateColumns: `${treeWidth}px 1fr` }
          : undefined
      }
    >
      {!treeCollapsed && (
      <nav
        className="vault-tree"
        aria-label="Project tree"
        onContextMenu={(event) => {
          if (!projectPath) return
          event.preventDefault()
          setTreeMenu({
            kind: 'folder',
            relPath: projectPath,
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
          if (!projectPath) return
          event.preventDefault()
          const source = parseTreeDrag(event.dataTransfer.getData(TREE_DRAG_MIME))
          if (source) dropNode(source, projectPath)
        }}
      >
        {onTreeResize && <TreeResizeHandle onResize={onTreeResize} />}
        <div className="tree-bar">
          <div className="vault-head" title={projectPath}>
            {projectTitle}
          </div>
          <button
            type="button"
            className="tree-toggle"
            title="Expand all folders"
            onClick={() =>
              scoped && onOpenFoldersChange?.(new Set(allFolderPaths(scoped)))
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
        <div className="vault-new">
          <input
            value={draftNoteName}
            placeholder="new note in project…"
            onChange={(event) => setDraftNoteName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') void onCreateNote()
            }}
          />
          <button type="button" onClick={() => void onCreateNote()}>
            +
          </button>
        </div>
        <div className="vault-search">
          <input
            placeholder="search project…"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') setSearchQuery('')
            }}
          />
        </div>
        {searchResults !== null ? (
          <SearchResultsList
            results={searchResults}
            activePath={note?.relPath ?? null}
            onOpen={guardedOpen}
          />
        ) : (
          scoped && (
            <NoteTree
              folder={scoped}
              activePath={note?.relPath ?? null}
              onOpen={guardedOpen}
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
              onDropNode={dropNode}
            />
          )
        )}
        {treeMenu && (
          <TreeMenu
            target={treeMenu}
            scopeLabel={projectTitle ?? 'project'}
            onClose={() => setTreeMenu(null)}
            onNewNote={menuNewNote}
            onNewFolder={menuNewFolder}
            onDelete={menuDelete}
            onRename={menuRename}
            onMove={menuMove}
          />
        )}
      </nav>
      )}
      <div
        className="vault-content"
        onClick={mode === 'read' ? onContentClick : undefined}
        {...(note ? { 'data-project-rendered': '1' } : {})}
      >
        {treeCollapsed && onTreeToggle && (
          <button
            type="button"
            className="tree-toggle tree-show"
            title="Show tree panel"
            onClick={onTreeToggle}
          >
            <SidebarToggleIcon />
          </button>
        )}
        {error && !note ? (
          <p className="error note-scroll">{error}</p>
        ) : !note ? (
          <p className="pane-placeholder">select a note to read or edit</p>
        ) : mode !== 'read' ? (
          <EditorPane
            key={note.relPath}
            note={note}
            onOpenWebUrl={onOpenWebUrl}
            onSaved={applySaved}
            onDirtyChange={onDirtyChange}
            mode={mode}
            onModeChange={onModeChange}
            onNoteCreated={(relPath) => {
              void refresh()
              guardedOpen(relPath)
            }}
            onFollowLink={guardedOpen}
            saveMode={saveMode}
            onSaveModeToggle={onSaveModeToggle}
          />
        ) : (
          <>
            <div className="note-bar">
              <span className="note-bar-nav">
                <button
                  type="button"
                  className="note-bar-button"
                  disabled={!nav.backOk}
                  title="Back to the previously viewed note"
                  onClick={nav.back}
                >
                  ‹
                </button>
                <button
                  type="button"
                  className="note-bar-button"
                  disabled={!nav.forwardOk}
                  title="Forward"
                  onClick={nav.forward}
                >
                  ›
                </button>
              </span>
              <span className="note-bar-path" title={note.relPath}>
                {note.relPath}
              </span>
              <span className="note-bar-actions">
                {onModeChange && (
                  <ModeSwitch mode={mode} onSelect={onModeChange} />
                )}
              </span>
            </div>
            <div className="note-scroll">
              {error && <p className="error">{error}</p>}
              <article
                className="markdown-body"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

