import { useCallback, useEffect, useRef, useState } from 'react'
import type { ProjectInfo, VaultInfo } from '../../../shared/ipc-contract'
import { EditorPane } from '../editor/EditorPane'
import { HistoryNav } from '../HistoryNav'
import { ModeSwitch } from '../editor/ModeSwitch'
import { noteFollowTarget } from '../vault/note-follow'
import { useNavHistory } from '../vault/nav-history'
import { useVaultNote } from '../vault/useVaultNote'
import { RelationsStrip } from '../vault/RelationsStrip'
import type { NoteViewMode, PaneNoteGuard, SaveMode } from '../workspace/model'
import { registerAiContext } from '../workspace/ai-context'

export type ProjectViewProps = {
  /** Vault-relative folder of the opened bundle. */
  projectPath?: string
  /** Note currently shown inside the project. */
  notePath?: string
  onProjectOpened?: (project: ProjectInfo) => void
  onNoteOpened?: (relPath: string) => void
  /** Escape hatch on the picker screens (a mistakenly opened tab). */
  onCloseTab?: () => void
  /** Registers this view's dirty editor with the pane (S07d): the pane
   *  tree guards navigation and the refactor verbs with it. */
  registerGuard?: (guard: PaneNoteGuard | null) => void
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
  /** Opens (or focuses) the chat pane (S06c — the AI selection menu). */
  onOpenChat?: () => void
  /** Adds a context entry to the chat pane (S06c5b). */
  onAddChatContext?: (entry: string) => void
  /** Relations strip disclosure, persisted per tab (S07). */
  relationsOpen?: boolean
  onRelationsToggle?: () => void
  /** Node kinds the strip hides, persisted per tab (S07b). */
  relationsHidden?: readonly string[]
  onRelationsKindToggle?: (kind: string) => void
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
 * Project bundle tab (04, 03's project-overview; S07d): pick or
 * create/adopt a bundle, then work on ONE note inside it. Opening a
 * project TYPES the pane — the tree left of this view is the pane's
 * panel scoped to the project folder (workspace/PaneTreePanel).
 */
export function ProjectView({
  projectPath,
  notePath,
  onProjectOpened,
  onNoteOpened,
  onCloseTab,
  registerGuard,
  mode = 'live',
  onModeChange,
  saveMode = 'auto',
  onSaveModeToggle,
  onOpenWebUrl,
  historyKey,
  onOpenChat,
  onAddChatContext,
  relationsOpen = false,
  onRelationsToggle,
  relationsHidden,
  onRelationsKindToggle
}: ProjectViewProps): React.JSX.Element {
  const [vault, setVault] = useState<VaultInfo | null | 'loading'>('loading')
  const [projects, setProjects] = useState<ProjectInfo[]>([])
  const [projectsLoaded, setProjectsLoaded] = useState(false)
  const [draftTitle, setDraftTitle] = useState('')
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

  // The pane bridge (S07d): the pane tree reads the dirty note's path
  // at decision time — refs keep the closure current without re-runs.
  const dirtyRef = useRef(false)
  dirtyRef.current = editorDirty
  const openRef = useRef<string | null>(null)
  openRef.current = note?.relPath ?? null
  useEffect(() => {
    registerGuard?.({
      dirtyPath: () => (dirtyRef.current ? openRef.current : null)
    })
    return () => registerGuard?.(null)
  }, [registerGuard])

  // S06c: a READ-mode note is still a chat context — registered
  // read-only (whole-note content; insert needs the editor, which
  // registers itself in live/source mode).
  const readCtxId = useRef<string>(crypto.randomUUID())
  useEffect(() => {
    if (mode !== 'read' || !note) return
    const content = note.content
    return registerAiContext({
      id: readCtxId.current,
      notePath: note.relPath,
      editable: false,
      getSelection: () => ({ from: 0, to: 0, text: '' }),
      getDoc: () => content
    })
  }, [mode, note])

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

  // S07b: every main-side landing may create/adopt a bundle — keep the
  // picker's project list current, whichever view initiated.
  useEffect(
    () => window.atomik.onVaultFilesChanged(() => void refresh()),
    [refresh]
  )

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
      setProjects([])
      setProjectsLoaded(false)
      if (info) void refresh()
    })
  }, [lastRequested, refresh, reset])

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
            aria-label="New project title"
            onChange={(event) => setDraftTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') void onCreateProject()
            }}
          />
          <button type="button" onClick={() => void onCreateProject()}>
            Create
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

  return (
    <div className="vault project no-tree">
      <div
        className="vault-content"
        onClick={mode === 'read' ? onContentClick : undefined}
        {...(note ? { 'data-project-rendered': '1' } : {})}
      >
        {error && !note ? (
          <p className="error note-scroll">{error}</p>
        ) : !note ? (
          <p className="pane-placeholder">select a note to read or edit</p>
        ) : mode !== 'read' ? (
          <EditorPane
            nav={{
              backOk: nav.backOk,
              forwardOk: nav.forwardOk,
              onBack: nav.back,
              onForward: nav.forward
            }}
            key={note.relPath}
            note={note}
            onOpenChat={onOpenChat}
            onAddChatContext={onAddChatContext}
            onSaved={applySaved}
            onDirtyChange={onDirtyChange}
            mode={mode}
            onModeChange={onModeChange}
            onNoteCreated={guardedOpen}
            onFollowLink={guardedOpen}
            onOpenWebUrl={onOpenWebUrl}
            saveMode={saveMode}
            onSaveModeToggle={onSaveModeToggle}
          />
        ) : (
          <>
            <div className="note-bar">
              <HistoryNav
                backOk={nav.backOk}
                forwardOk={nav.forwardOk}
                onBack={nav.back}
                onForward={nav.forward}
              />
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
        {/* S07: same strip as the vault surface — a project note is a
            graph node like any other. */}
        {note && onRelationsToggle && (
          <RelationsStrip
            notePath={note.relPath}
            revision={note.content.length}
            open={relationsOpen}
            onToggle={onRelationsToggle}
            onOpenNote={guardedOpen}
            {...(onOpenWebUrl ? { onOpenUrl: onOpenWebUrl } : {})}
            hiddenKinds={relationsHidden}
            onToggleKind={onRelationsKindToggle}
          />
        )}
      </div>
    </div>
  )
}
