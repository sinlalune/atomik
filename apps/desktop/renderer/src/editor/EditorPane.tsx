import { markdown } from '@codemirror/lang-markdown'
import { oneDark } from '@codemirror/theme-one-dark'
import { EditorView, keymap } from '@codemirror/view'
import { basicSetup } from 'codemirror'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { VaultNoteFile } from '../../../shared/ipc-contract'

export type EditorPaneProps = {
  note: VaultNoteFile
  /** Reports every successful save so the read view stays in sync. */
  onSaved: (content: string, mtimeMs: number) => void
  /** Lets the host guard note navigation against unsaved changes. */
  onDirtyChange?: (dirty: boolean) => void
  /** Back to the rendered view (confirmed here when dirty). */
  onSwitchToRead?: () => void
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
  onSwitchToRead
}: EditorPaneProps): React.JSX.Element {
  const hostRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const mtimeRef = useRef(note.mtimeMs)
  const savedDocRef = useRef(note.content)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [conflict, setConflict] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
    </div>
  )
}
