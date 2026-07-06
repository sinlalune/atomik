import { markdown } from '@codemirror/lang-markdown'
import { oneDark } from '@codemirror/theme-one-dark'
import { EditorView, keymap } from '@codemirror/view'
import { basicSetup } from 'codemirror'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { VaultNoteFile } from '../../../shared/ipc-contract'
import { AiPanel, type BufferChange } from './AiPanel'

export type EditorPaneProps = {
  note: VaultNoteFile
  /** Reports every successful save so the read view stays in sync. */
  onSaved: (content: string, mtimeMs: number) => void
  /** Lets the host guard note navigation against unsaved changes. */
  onDirtyChange?: (dirty: boolean) => void
  /** Back to the rendered view (confirmed here when dirty). */
  onSwitchToRead?: () => void
  /** AI-created notes bubble up so the host refreshes/opens them. */
  onNoteCreated?: (relPath: string) => void
}

/**
 * CodeMirror 6 editor over one vault note (S07). Edits the RAW Markdown,
 * frontmatter included — no template, no normalization (11/27); the bytes
 * saved are exactly the bytes in the buffer. Saving is explicit (button or
 * Ctrl/Cmd-S) and optimistic: the mtime from the last read/save travels
 * with the write, and a mismatch surfaces as a conflict banner instead of
 * silently overwriting what changed on disk.
 */
export function EditorPane({
  note,
  onSaved,
  onDirtyChange,
  onSwitchToRead,
  onNoteCreated
}: EditorPaneProps): React.JSX.Element {
  const hostRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const mtimeRef = useRef(note.mtimeMs)
  const savedDocRef = useRef(note.content)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [conflict, setConflict] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAi, setShowAi] = useState(false)

  const markDirty = useCallback(
    (next: boolean) => {
      setDirty(next)
      onDirtyChange?.(next)
    },
    [onDirtyChange]
  )
  const markDirtyRef = useRef(markDirty)
  useEffect(() => {
    markDirtyRef.current = markDirty
  }, [markDirty])

  const save = useCallback(
    async (force = false) => {
      const view = viewRef.current
      if (!view) return
      const content = view.state.doc.toString()
      setSaving(true)
      setError(null)
      try {
        const result = await window.atomik.writeNote(
          note.relPath,
          content,
          force ? undefined : mtimeRef.current
        )
        mtimeRef.current = result.mtimeMs
        savedDocRef.current = content
        setConflict(false)
        markDirty(false)
        onSaved(content, result.mtimeMs)
      } catch (reason) {
        if (String(reason).includes('conflict')) setConflict(true)
        else setError(String(reason))
      } finally {
        setSaving(false)
      }
    },
    [markDirty, note.relPath, onSaved]
  )
  const saveRef = useRef(save)
  useEffect(() => {
    saveRef.current = save
  }, [save])

  const reloadFromDisk = useCallback(async () => {
    try {
      const fresh = await window.atomik.readNote(note.relPath)
      const view = viewRef.current
      if (!view) return
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: fresh.content }
      })
      mtimeRef.current = fresh.mtimeMs
      savedDocRef.current = fresh.content
      setConflict(false)
      markDirty(false)
      onSaved(fresh.content, fresh.mtimeMs)
    } catch (reason) {
      setError(String(reason))
    }
  }, [markDirty, note.relPath, onSaved])

  // One EditorView per mounted pane; the host keys this component by note
  // path, so a different note is a fresh mount. The view lives in a ref —
  // recreating it on re-render would lose selection, history, and scroll.
  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const view = new EditorView({
      doc: note.content,
      parent: host,
      extensions: [
        basicSetup,
        markdown(),
        ...(prefersDark ? [oneDark] : []),
        EditorView.lineWrapping,
        keymap.of([
          {
            key: 'Mod-s',
            preventDefault: true,
            run: () => {
              void saveRef.current()
              return true
            }
          }
        ]),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            markDirtyRef.current(
              update.state.doc.toString() !== savedDocRef.current
            )
          }
        })
      ]
    })
    viewRef.current = view
    view.focus()
    return () => {
      viewRef.current = null
      view.destroy()
    }
    // mount-only by design; fresh notes remount via the host's key
    // (refs carry the latest save/dirty closures)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const onReadClick = useCallback(() => {
    if (!onSwitchToRead) return
    if (dirty && !window.confirm('Unsaved changes will be lost. Continue?')) {
      return
    }
    onSwitchToRead()
  }, [dirty, onSwitchToRead])

  const getSelection = useCallback(() => {
    const view = viewRef.current
    if (!view) return { from: 0, to: 0, text: '' }
    const range = view.state.selection.main
    return {
      from: range.from,
      to: range.to,
      text: view.state.sliceDoc(range.from, range.to)
    }
  }, [])

  const getDoc = useCallback(
    () => viewRef.current?.state.doc.toString() ?? '',
    []
  )

  /** Selects and scrolls to a source anchor (S10: a mapped citation
   *  opens its local source anchor). */
  const revealRange = useCallback((range: { from: number; to: number }) => {
    const view = viewRef.current
    if (!view) return
    const docLength = view.state.doc.length
    const from = Math.max(0, Math.min(range.from, docLength))
    const to = Math.max(from, Math.min(range.to, docLength))
    view.dispatch({
      selection: { anchor: from, head: to },
      effects: EditorView.scrollIntoView(from, { y: 'center' })
    })
    view.focus()
  }, [])

  /** Accepted AI changes land in the BUFFER — visible, undoable; the
   *  explicit save stays the single moment a file diff is born (06). */
  const applyChange = useCallback((change: BufferChange) => {
    const view = viewRef.current
    if (!view) return
    const docLength = view.state.doc.length
    if (change.kind === 'replace-range') {
      const from = Math.max(0, Math.min(change.range.from, docLength))
      const to = Math.max(from, Math.min(change.range.to, docLength))
      view.dispatch({ changes: { from, to, insert: change.newText } })
    } else {
      view.dispatch({
        changes: { from: docLength, to: docLength, insert: change.newText }
      })
    }
    view.focus()
  }, [])

  return (
    <div className="editor" data-editor-ready="1">
      <div className="note-bar">
        <span className="note-bar-path" title={note.relPath}>
          {note.relPath}
          {dirty ? ' ●' : ''}
        </span>
        <span className="note-bar-actions">
          {error && <span className="error editor-msg">{error}</span>}
          <button
            type="button"
            className={showAi ? 'active' : ''}
            onClick={() => setShowAi((current) => !current)}
            title="Ask AI about the selection"
          >
            AI
          </button>
          <button
            type="button"
            disabled={saving || !dirty}
            onClick={() => void save()}
            title="Save (Ctrl+S)"
          >
            {saving ? 'saving…' : 'Save'}
          </button>
          {onSwitchToRead && (
            <button type="button" onClick={onReadClick}>
              Read
            </button>
          )}
        </span>
      </div>
      {conflict && (
        <div className="editor-conflict">
          <span>This note changed on disk since it was read.</span>
          <button type="button" onClick={() => void reloadFromDisk()}>
            Reload from disk
          </button>
          <button type="button" onClick={() => void save(true)}>
            Overwrite anyway
          </button>
        </div>
      )}
      <div ref={hostRef} className="editor-host" />
      {showAi && (
        <AiPanel
          note={note}
          getSelection={getSelection}
          getDoc={getDoc}
          applyChange={applyChange}
          requestSave={() => saveRef.current()}
          openAnchor={revealRange}
          onNoteCreated={onNoteCreated}
          onClose={() => setShowAi(false)}
        />
      )}
    </div>
  )
}
