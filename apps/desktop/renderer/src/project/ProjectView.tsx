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
import { NoteTree } from '../vault/NoteTree'
import { findSubtree } from '../vault/scope'
import { useVaultNote } from '../vault/useVaultNote'
import type { NoteViewMode, SaveMode } from '../workspace/model'

export type ProjectViewProps = {
  /** Vault-relative folder of the opened bundle. */
  projectPath?: string
  /** Note currently shown inside the project. */
  notePath?: string
  onProjectOpened?: (project: ProjectInfo) => void
  onNoteOpened?: (relPath: string) => void
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
}

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
  treeCollapsed,
  onTreeToggle,
  treeWidth,
  onTreeResize,
  mode = 'live',
  onModeChange,
  saveMode = 'auto',
  onSaveModeToggle
}: ProjectViewProps): React.JSX.Element {
  const [vault, setVault] = useState<VaultInfo | null | 'loading'>('loading')
  const [projects, setProjects] = useState<ProjectInfo[]>([])
  const [projectsLoaded, setProjectsLoaded] = useState(false)
  const [tree, setTree] = useState<VaultFolder | null>(null)
  const [fold, setFold] = useState({ open: true, epoch: 0 })
  const [draftTitle, setDraftTitle] = useState('')
  const [draftNoteName, setDraftNoteName] = useState('')
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
  } = useVaultNote(onNoteOpened)

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
  useEffect(() => {
    if (vault === 'loading' || vault === null || !projectPath) return
    if (!projectExists) return
    const target = notePath ?? `${projectPath}/index.md`
    if (lastRequested.current === target) return
    openNote(target)
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
      <nav className="vault-tree" aria-label="Project tree">
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
              setFold((current) => ({ open: true, epoch: current.epoch + 1 }))
            }
          >
            <ExpandAllIcon />
          </button>
          <button
            type="button"
            className="tree-toggle"
            title="Collapse all folders"
            onClick={() =>
              setFold((current) => ({ open: false, epoch: current.epoch + 1 }))
            }
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
              defaultOpen={fold.open}
              foldEpoch={fold.epoch}
            />
          )
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

