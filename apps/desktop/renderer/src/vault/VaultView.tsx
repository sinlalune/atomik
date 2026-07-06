import { useCallback, useEffect, useState } from 'react'
import type {
  SearchResult,
  VaultFolder,
  VaultInfo
} from '../../../shared/ipc-contract'
import { EditorPane } from '../editor/EditorPane'
import { SidebarToggleIcon } from '../icons'
import { TreeResizeHandle } from '../TreeResizeHandle'
import type { SaveMode } from '../workspace/model'
import { noteDisplayName } from './scope'
import { useVaultNote } from './useVaultNote'

export type NoteViewMode = 'read' | 'edit'

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
  /** Read (rendered) or edit (CodeMirror), persisted per tab. */
  mode?: NoteViewMode
  onModeChange?: (mode: NoteViewMode) => void
  /** App-wide save policy; auto skips discard prompts (flush-on-leave). */
  saveMode?: SaveMode
  onSaveModeToggle?: () => void
}

function FolderView({
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
            <FolderView folder={child} activePath={activePath} onOpen={onOpen} />
          </details>
        </li>
      ))}
      {folder.notes.map((note) => (
        <li key={note.relPath}>
          <button
            type="button"
            className={note.relPath === activePath ? 'active' : ''}
            title={note.relPath}
            onClick={() => onOpen(note.relPath)}
          >
            {noteDisplayName(note.name)}
          </button>
        </li>
      ))}
    </ul>
  )
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
  mode = 'read',
  onModeChange,
  saveMode = 'auto',
  onSaveModeToggle
}: VaultViewProps): React.JSX.Element {
  const [info, setInfo] = useState<VaultInfo | null | 'loading'>('loading')
  const [tree, setTree] = useState<VaultFolder | null>(null)
  const [draftName, setDraftName] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null)
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

  useEffect(() => {
    if (info === 'loading' || info === null) return
    if (!notePath || lastRequested.current === notePath) return
    openNote(notePath)
  }, [notePath, info, openNote, lastRequested])

  // Debounced lexical search; empty query returns to the tree.
  useEffect(() => {
    const trimmed = searchQuery.trim()
    if (trimmed.length === 0) {
      setSearchResults(null)
      return
    }
    const timer = window.setTimeout(() => {
      window.atomik
        .searchVault(trimmed)
        .then(setSearchResults, () => setSearchResults([]))
    }, 250)
    return () => window.clearTimeout(timer)
  }, [searchQuery])

  const onOpenVault = useCallback(async () => {
    const vault = await window.atomik.openVault()
    if (vault) {
      setInfo(vault)
      await refreshTree()
    }
  }, [refreshTree])

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
          <div className="search-results">
            {searchResults.length === 0 && (
              <p className="search-empty">no matches</p>
            )}
            {searchResults.map((result) => (
              <div key={result.relPath} className="search-result">
                <button
                  type="button"
                  className={result.relPath === note?.relPath ? 'active' : ''}
                  title={result.relPath}
                  onClick={() => guardedOpen(result.relPath)}
                >
                  {noteDisplayName(result.name)}
                </button>
                <ul>
                  {result.matches.map((match, index) => (
                    <li key={index}>
                      <span className={`match-kind kind-${match.kind}`}>
                        {match.kind === 'filename'
                          ? 'file'
                          : match.kind === 'heading'
                            ? 'h'
                            : '¶'}
                      </span>
                      <span className="match-excerpt" title={match.excerpt}>
                        {match.kind === 'filename'
                          ? noteDisplayName(match.excerpt)
                          : match.excerpt}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          tree && (
            <FolderView
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
        onClick={mode === 'edit' ? undefined : onContentClick}
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
              void refreshTree()
              guardedOpen(relPath)
            }}
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
