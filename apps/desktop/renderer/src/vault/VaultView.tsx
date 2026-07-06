import { useCallback, useEffect, useRef, useState } from 'react'
import type { VaultFolder, VaultInfo } from '../../../shared/ipc-contract'
import { EditorPane } from '../editor/EditorPane'
import { ModeSwitch } from '../editor/ModeSwitch'
import { SidebarToggleIcon, VaultSwitchIcon } from '../icons'
import { SearchResultsList } from '../search/SearchResultsList'
import { useTreeSearch } from '../search/useTreeSearch'
import { TreeResizeHandle } from '../TreeResizeHandle'
import type { NoteViewMode, SaveMode } from '../workspace/model'
import { NoteTree } from './NoteTree'
import { useVaultNote } from './useVaultNote'

export type VaultViewProps = {
  /** Note to show; identical values are ignored (no self-retry on failure). */
  notePath?: string
  /** Reports every successfully opened note (the tab persists it). */
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

/**
 * Vault tab (04/M1 slice): tree of the user's Markdown knowledge, rendered
 * read view, note creation. Editing arrives with CodeMirror at S07 — this
 * view proves the read/write plumbing without pretending to be the editor.
 */
export function VaultView({
  notePath,
  onNoteOpened,
  treeCollapsed,
  onTreeToggle,
  treeWidth,
  onTreeResize,
  mode = 'live',
  onModeChange,
  saveMode = 'auto',
  onSaveModeToggle
}: VaultViewProps): React.JSX.Element {
  const [info, setInfo] = useState<VaultInfo | null | 'loading'>('loading')
  const [tree, setTree] = useState<VaultFolder | null>(null)
  const [draftName, setDraftName] = useState('')
  const searchVault = useCallback(
    (query: string) => window.atomik.searchVault(query),
    []
  )
  const { query: searchQuery, setQuery: setSearchQuery, results: searchResults } =
    useTreeSearch(searchVault)
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

  const refreshTree = useCallback(async () => {
    try {
      setTree(await window.atomik.listVaultFiles())
    } catch (reason) {
      setError(String(reason))
    }
  }, [setError])

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
  }, [refreshTree, setError])

  // Vault switch (this view or any other): drop everything held from the
  // previous vault, and POISON the restore guard with the stale tab
  // param — the note the tab remembers belongs to the old vault and
  // must not be re-requested against the new one (a same-named path
  // would be a coincidence, not the same note).
  const notePathRef = useRef(notePath)
  useEffect(() => {
    notePathRef.current = notePath
  }, [notePath])
  useEffect(() => {
    return window.atomik.onVaultChanged((vault) => {
      setInfo(vault)
      reset()
      lastRequested.current = notePathRef.current ?? null
      setEditorDirty(false)
      setSearchQuery('')
      setTree(null)
      if (vault) void refreshTree()
    })
  }, [lastRequested, refreshTree, reset, setSearchQuery])

  useEffect(() => {
    if (info === 'loading' || info === null) return
    if (!notePath || lastRequested.current === notePath) return
    openNote(notePath)
  }, [notePath, info, openNote, lastRequested])

  /** The picker; on success the vault-changed push refreshes every view. */
  const onOpenVault = useCallback(async () => {
    await window.atomik.openVault()
  }, [])

  const onCreate = useCallback(async () => {
    const name = draftName.trim()
    if (!name) return
    const relPath = name.toLowerCase().endsWith('.md') ? name : `${name}.md`
    try {
      await window.atomik.createNote(relPath)
      setDraftName('')
      await refreshTree()
      openNote(relPath)
    } catch (reason) {
      setError(String(reason))
    }
  }, [draftName, openNote, refreshTree, setError])

  if (info === 'loading') return <p className="pane-placeholder">loading vault…</p>

  if (info === null) {
    return (
      <div className="vault-empty">
        <h2>No vault open</h2>
        <p>
          A vault is a normal folder of Markdown files — your durable
          knowledge, readable with or without atomik.
        </p>
        <button type="button" className="vault-open-button" onClick={onOpenVault}>
          Open vault folder…
        </button>
      </div>
    )
  }

  return (
    <div
      className={`vault${treeCollapsed ? ' no-tree' : ''}`}
      style={
        !treeCollapsed && treeWidth !== undefined
          ? { gridTemplateColumns: `${treeWidth}px 1fr` }
          : undefined
      }
    >
      {!treeCollapsed && (
      <nav className="vault-tree" aria-label="Vault tree">
        {onTreeResize && <TreeResizeHandle onResize={onTreeResize} />}
        <div className="tree-bar">
          <div className="vault-head" title={info.root}>
            {info.name}
          </div>
          <button
            type="button"
            className="tree-toggle"
            title="Change vault folder…"
            onClick={() => void onOpenVault()}
          >
            <VaultSwitchIcon />
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
            value={draftName}
            placeholder="new note name…"
            onChange={(event) => setDraftName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') void onCreate()
            }}
          />
          <button type="button" onClick={() => void onCreate()}>
            +
          </button>
        </div>
        <div className="vault-search">
          <input
            placeholder="search vault…"
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
          tree && (
            <NoteTree
              folder={tree}
              activePath={note?.relPath ?? null}
              onOpen={guardedOpen}
            />
          )
        )}
      </nav>
      )}
      <div
        className="vault-content"
        onClick={mode === 'read' ? onContentClick : undefined}
        {...(note ? { 'data-vault-rendered': '1' } : {})}
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
              void refreshTree()
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
