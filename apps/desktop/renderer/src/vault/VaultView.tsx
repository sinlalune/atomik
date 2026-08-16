import { useCallback, useEffect, useRef, useState } from 'react'
import type { VaultInfo } from '../../../shared/ipc-contract'
import { EditorPane } from '../editor/EditorPane'
import { HistoryNav } from '../HistoryNav'
import { ModeSwitch } from '../editor/ModeSwitch'
import type { NoteViewMode, PaneNoteGuard, SaveMode } from '../workspace/model'
import { registerAiContext } from '../workspace/ai-context'
import { hasMediaResource } from '../source/dossier'
import { noteFollowTarget } from './note-follow'
import { useNavHistory } from './nav-history'
import { useVaultNote } from './useVaultNote'
import { RelationsStrip } from './RelationsStrip'

export type VaultViewProps = {
  /** Note to show; identical values are ignored (no self-retry on failure). */
  notePath?: string
  /** Reports every successfully opened note (the tab persists it). */
  onNoteOpened?: (relPath: string) => void
  /** Successful editor saves, used by the provisional quick-note naming
   *  lifecycle. Ordinary notes omit it. */
  onNoteSaved?: (relPath: string, content: string) => void
  /** Registers this view's dirty editor with the pane (S07d): the pane
   *  tree guards navigation and the refactor verbs with it. */
  registerGuard?: (guard: PaneNoteGuard | null) => void
  /** read / live (default) / source, persisted per tab. */
  mode?: NoteViewMode
  onModeChange?: (mode: NoteViewMode) => void
  /** App-wide save policy; auto skips discard prompts (flush-on-leave). */
  saveMode?: SaveMode
  onSaveModeToggle?: () => void
  /** Opens a dossier's original in an image source tab (S05); shown in
   *  the read-mode note-bar when the note declares an image resource. */
  onOpenSourceImage?: (dossierPath: string) => void
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

/**
 * Vault tab (04/M1 slice; S07d): ONE note, read or edit. The tree left
 * of it is the PANE's panel (workspace/PaneTreePanel) — this view only
 * follows its notePath tab param and renders the note surface.
 */
export function VaultView({
  notePath,
  onNoteOpened,
  onNoteSaved,
  registerGuard,
  mode = 'live',
  onModeChange,
  saveMode = 'auto',
  onSaveModeToggle,
  onOpenSourceImage,
  onOpenWebUrl,
  historyKey,
  onOpenChat,
  onAddChatContext,
  relationsOpen = false,
  onRelationsToggle,
  relationsHidden,
  onRelationsKindToggle
}: VaultViewProps): React.JSX.Element {
  const [info, setInfo] = useState<VaultInfo | null | 'loading'>('loading')
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
  } = useVaultNote(onNoteOpened, onOpenSourceImage, onOpenWebUrl)

  const applyEditorSave = useCallback(
    (content: string, mtimeMs: number) => {
      applySaved(content, mtimeMs)
      if (note) onNoteSaved?.(note.relPath, content)
    },
    [applySaved, note, onNoteSaved]
  )

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
  // ‹ › replay through the SAME guarded door as any user navigation
  const nav = useNavHistory(historyKey, note?.relPath, guardedOpen)

  useEffect(() => {
    window.atomik.getVault().then(
      (vault) => setInfo(vault),
      (reason: unknown) => {
        setInfo(null)
        setError(String(reason))
      }
    )
  }, [setError])

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
    })
  }, [lastRequested, reset])

  // S07a (owner: creation flashed other notes): follow the tab param
  // only on a REAL transition — a stale prop re-render must never
  // re-open the previous note while the param catches up.
  const followState = useRef<{ prevProp: string | undefined }>({
    prevProp: undefined
  })
  useEffect(() => {
    if (info === 'loading' || info === null) return
    const target = noteFollowTarget(
      followState.current,
      notePath,
      lastRequested.current
    )
    if (target) openNote(target)
  }, [notePath, info, openNote, lastRequested])

  if (info === 'loading') return <p className="pane-placeholder">loading vault…</p>

  if (info === null) {
    return (
      <div className="vault-empty">
        <h2>No vault open</h2>
        <p>
          A vault is a normal folder of Markdown files — your durable
          knowledge, readable with or without atomik.
        </p>
        <button
          type="button"
          className="vault-open-button"
          onClick={() => void window.atomik.openVault()}
        >
          Open vault folder…
        </button>
      </div>
    )
  }

  return (
    <div className="vault no-tree">
      <div
        className="vault-content"
        onClick={mode === 'read' ? onContentClick : undefined}
        {...(note ? { 'data-vault-rendered': '1' } : {})}
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
            onOpenSourceImage={onOpenSourceImage}
            onOpenChat={onOpenChat}
            onAddChatContext={onAddChatContext}
            onSaved={applyEditorSave}
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
                {onOpenSourceImage && hasMediaResource(note.content) && (
                  <button
                    type="button"
                    className="note-bar-button"
                    title="View the original beside this dossier"
                    onClick={() => onOpenSourceImage(note.relPath)}
                  >
                    View original
                  </button>
                )}
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
        {/* S07: the note seen from the other end of its edges — one
            strip under BOTH surfaces (read and live), because the
            graph is a property of the note, not of a view mode. */}
        {note && onRelationsToggle && (
          <RelationsStrip
            notePath={note.relPath}
            revision={note.content.length}
            open={relationsOpen}
            onToggle={onRelationsToggle}
            onOpenNote={guardedOpen}
            {...(onOpenWebUrl ? { onOpenUrl: onOpenWebUrl } : {})}
            {...(onOpenSourceImage ? { onOpenSource: onOpenSourceImage } : {})}
            hiddenKinds={relationsHidden}
            onToggleKind={onRelationsKindToggle}
          />
        )}
      </div>
    </div>
  )
}
