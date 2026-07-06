import { useCallback, useEffect, useState } from 'react'
import type {
  ProjectInfo,
  VaultFolder,
  VaultInfo
} from '../../../shared/ipc-contract'
import { findSubtree } from '../vault/scope'
import { useVaultNote } from '../vault/useVaultNote'

export type ProjectViewProps = {
  /** Vault-relative folder of the opened bundle. */
  projectPath?: string
  /** Note currently shown inside the project. */
  notePath?: string
  onProjectOpened?: (project: ProjectInfo) => void
  onNoteOpened?: (relPath: string) => void
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
  onNoteOpened
}: ProjectViewProps): React.JSX.Element {
  const [vault, setVault] = useState<VaultInfo | null | 'loading'>('loading')
  const [projects, setProjects] = useState<ProjectInfo[]>([])
  const [tree, setTree] = useState<VaultFolder | null>(null)
  const [draftTitle, setDraftTitle] = useState('')
  const [draftNoteName, setDraftNoteName] = useState('')
  const { note, html, error, setError, openNote, lastRequested, onContentClick } =
    useVaultNote(onNoteOpened)

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
    <div className="vault project">
      <nav className="vault-tree" aria-label="Project tree">
        <div className="vault-head" title={projectPath}>
          {projectTitle}
        </div>
        <div className="project-shortcuts">
          <button type="button" onClick={() => openNote(`${projectPath}/index.md`)}>
            index
          </button>
          <button type="button" onClick={() => openNote(`${projectPath}/log.md`)}>
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
            onOpen={openNote}
          />
        )}
      </nav>
      <div
        className="vault-content"
        onClick={onContentClick}
        {...(note ? { 'data-project-rendered': '1' } : {})}
      >
        {error ? (
          <p className="error">{error}</p>
        ) : note ? (
          <article
            className="markdown-body"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : (
          <p className="pane-placeholder">loading…</p>
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
            {noteRef.name}
          </button>
        </li>
      ))}
    </ul>
  )
}
