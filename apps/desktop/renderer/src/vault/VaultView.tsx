import { useCallback, useEffect, useState } from 'react'
import type { VaultFolder, VaultInfo } from '../../../shared/ipc-contract'
import { useVaultNote } from './useVaultNote'

export type VaultViewProps = {
  /** Note to show; identical values are ignored (no self-retry on failure). */
  notePath?: string
  /** Reports every successfully opened note (the tab persists it). */
  onNoteOpened?: (relPath: string) => void
  /** Tree panel visibility, persisted per tab by the workspace. */
  treeCollapsed?: boolean
  onTreeToggle?: () => void
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
            {note.name}
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
  onTreeToggle
}: VaultViewProps): React.JSX.Element {
  const [info, setInfo] = useState<VaultInfo | null | 'loading'>('loading')
  const [tree, setTree] = useState<VaultFolder | null>(null)
  const [draftName, setDraftName] = useState('')
  const { note, html, error, setError, openNote, lastRequested, onContentClick } =
    useVaultNote(onNoteOpened)

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
    <div className={`vault${treeCollapsed ? ' no-tree' : ''}`}>
      {!treeCollapsed && (
      <nav className="vault-tree" aria-label="Vault tree">
        <div className="tree-bar">
          <div className="vault-head" title={info.root}>
            {info.name}
          </div>
          {onTreeToggle && (
            <button
              type="button"
              className="tree-toggle"
              title="Collapse tree panel"
              onClick={onTreeToggle}
            >
              ⟨
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
        {tree && (
          <FolderView
            folder={tree}
            activePath={note?.relPath ?? null}
            onOpen={openNote}
          />
        )}
      </nav>
      )}
      <div
        className="vault-content"
        onClick={onContentClick}
        {...(note ? { 'data-vault-rendered': '1' } : {})}
      >
        {treeCollapsed && onTreeToggle && (
          <button
            type="button"
            className="tree-toggle tree-show"
            title="Expand tree panel"
            onClick={onTreeToggle}
          >
            ⟩
          </button>
        )}
        {error ? (
          <p className="error">{error}</p>
        ) : note ? (
          <article
            className="markdown-body"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : (
          <p className="pane-placeholder">
            select a note — editing arrives at S07
          </p>
        )}
      </div>
    </div>
  )
}
