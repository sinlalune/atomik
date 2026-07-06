import { useCallback, useEffect, useState } from 'react'
import type {
  ProjectInfo,
  VaultFolder,
  VaultInfo
} from '../../../shared/ipc-contract'
import { EditorPane } from '../editor/EditorPane'
import { SidebarToggleIcon } from '../icons'
import { findSubtree, noteDisplayName } from '../vault/scope'
import { useVaultNote } from '../vault/useVaultNote'
import type { NoteViewMode } from '../vault/VaultView'

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
  /** Read (rendered) or edit (CodeMirror), persisted per tab. */
  mode?: NoteViewMode
  onModeChange?: (mode: NoteViewMode) => void
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
  mode = 'read',
  onModeChange
}: ProjectViewProps): React.JSX.Element {
  const [vault, setVault] = useState<VaultInfo | null | 'loading'>('loading')
  const [projects, setProjects] = useState<ProjectInfo[]>([])
  const [tree, setTree] = useState<VaultFolder | null>(null)
  const [draftTitle, setDraftTitle] = useState('')
  const [draftNoteName, setDraftNoteName] = useState('')
  const [editorDirty, setEditorDirty] = useState(false)
  const {
    note,
    html,
    error,
    setError,
    openNote,
    applySaved,
    lastRequested,
    onContentClick
  } = useVaultNote(onNoteOpened)

  const onDirtyChange = useCallback((dirty: boolean) => {
    setEditorDirty(dirty)
  }, [])

  /** Note navigation in edit mode must not silently discard a buffer. */
  const guardedOpen = useCallback(
    (relPath: string) => {
      if (
        editorDirty &&
        !window.confirm('Unsaved changes will be lost. Continue?')
      ) {
        return
      }
      setEditorDirty(false)
      openNote(relPath)
    },
    [editorDirty, openNote]
  )

  const refresh = useCallback(async () => {
    try {
      setProjects(await window.atomik.listProjects())
      setTree(await window.atomik.listVaultFiles())
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

  // Restore / follow the tab's note; default to the bundle's index.md.
  useEffect(() => {
    if (vault === 'loading' || vault === null || !projectPath) return
    const target = notePath ?? `${projectPath}/index.md`
    if (lastRequested.current === target) return
    openNote(target)
  }, [vault, projectPath, notePath, openNote, lastRequested])

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

  if (!projectPath) {
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
    <div className={`vault project${treeCollapsed ? ' no-tree' : ''}`}>
      {!treeCollapsed && (
      <nav className="vault-tree" aria-label="Project tree">
        <div className="tree-bar">
          <div className="vault-head" title={projectPath}>
            {projectTitle}
          </div>
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
        <div className="project-shortcuts">
          <button type="button" onClick={() => guardedOpen(`${projectPath}/index.md`)}>
            index
          </button>
          <button type="button" onClick={() => guardedOpen(`${projectPath}/log.md`)}>
            log
          </button>
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
        {scoped && (
          <ProjectTree
            folder={scoped}
            activePath={note?.relPath ?? null}
            onOpen={guardedOpen}
          />
        )}
      </nav>
      )}
      <div
        className="vault-content"
        onClick={mode === 'edit' ? undefined : onContentClick}
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
          <p className="pane-placeholder">loading…</p>
        ) : mode === 'edit' ? (
          <EditorPane
            key={note.relPath}
            note={note}
            onSaved={applySaved}
            onDirtyChange={onDirtyChange}
            onSwitchToRead={
              onModeChange ? () => onModeChange('read') : undefined
            }
            onNoteCreated={(relPath) => {
              void refresh()
              guardedOpen(relPath)
            }}
          />
        ) : (
          <>
            <div className="note-bar">
              <span className="note-bar-path" title={note.relPath}>
                {note.relPath}
              </span>
              <span className="note-bar-actions">
                {onModeChange && (
                  <button type="button" onClick={() => onModeChange('edit')}>
                    Edit
                  </button>
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

function ProjectTree({
  folder,
  activePath,
  onOpen
}: {
  folder: VaultFolder
  activePath: string | null
  onOpen: (relPath: string) => void
}): React.JSX.Element {
  return (
    <ul>
      {folder.folders.map((child) => (
        <li key={child.relPath}>
          <details open>
            <summary>{child.name}</summary>
            <ProjectTree folder={child} activePath={activePath} onOpen={onOpen} />
          </details>
        </li>
      ))}
      {folder.notes.map((noteRef) => (
        <li key={noteRef.relPath}>
          <button
            type="button"
            className={noteRef.relPath === activePath ? 'active' : ''}
            title={noteRef.relPath}
            onClick={() => onOpen(noteRef.relPath)}
          >
            {noteDisplayName(noteRef.name)}
          </button>
        </li>
      ))}
    </ul>
  )
}
