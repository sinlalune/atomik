import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import {
  bracketMatching,
  defaultHighlightStyle,
  foldGutter,
  foldKeymap,
  indentOnInput,
  syntaxHighlighting
} from '@codemirror/language'
import { highlightSelectionMatches, searchKeymap } from '@codemirror/search'
import { Compartment, type Extension } from '@codemirror/state'
import { oneDark } from '@codemirror/theme-one-dark'
import {
  drawSelection,
  dropCursor,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSpecialChars,
  keymap,
  lineNumbers
} from '@codemirror/view'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { VaultNoteFile } from '../../../shared/ipc-contract'
import type { NoteViewMode, SaveMode } from '../workspace/model'
import { AiPanel, type BufferChange } from './AiPanel'
import { livePreview } from './live-preview'
import { ModeSwitch } from './ModeSwitch'

/** Auto mode saves this long after the last keystroke. */
const AUTOSAVE_DELAY_MS = 800

/**
 * The editor chrome is composed explicitly (basicSetup retired on
 * MVP-001 follow-up feedback): both modes share the writing essentials;
 * the IDE trimmings — line numbers, fold gutter, active-line highlight —
 * belong to SOURCE mode only. Live is a clean writing surface.
 */
const SHARED_EXTENSIONS: Extension = [
  highlightSpecialChars(),
  history(),
  drawSelection(),
  dropCursor(),
  indentOnInput(),
  syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
  bracketMatching(),
  closeBrackets(),
  highlightSelectionMatches(),
  keymap.of([
    ...closeBracketsKeymap,
    ...defaultKeymap,
    ...searchKeymap,
    ...historyKeymap,
    ...foldKeymap
  ])
]

const SOURCE_CHROME: Extension = [
  lineNumbers(),
  highlightActiveLineGutter(),
  foldGutter(),
  highlightActiveLine()
]

const modeExtensions = (mode: 'live' | 'source'): Extension =>
  mode === 'live' ? livePreview() : SOURCE_CHROME

export type EditorPaneProps = {
  note: VaultNoteFile
  /** Reports every successful save so the read view stays in sync. */
  onSaved: (content: string, mtimeMs: number) => void
  /** Lets the host guard note navigation against unsaved changes. */
  onDirtyChange?: (dirty: boolean) => void
  /** 'live' (seamless, default) or 'source' (raw markdown). */
  mode?: Extract<NoteViewMode, 'live' | 'source'>
  /** Mode selection; 'read' unmounts this pane (auto mode saves first). */
  onModeChange?: (mode: NoteViewMode) => void
  /** AI-created notes bubble up so the host refreshes/opens them. */
  onNoteCreated?: (relPath: string) => void
  /** 'auto' (default): debounced saves + flush on leave; 'manual': S07. */
  saveMode?: SaveMode
  onSaveModeToggle?: () => void
}

/**
 * CodeMirror 6 editor over one vault note (S07). Edits the RAW Markdown,
 * frontmatter included — no template, no normalization (11/27); the bytes
 * saved are exactly the bytes in the buffer. Saves are optimistic: the
 * mtime from the last read/save travels with the write, and a mismatch
 * surfaces as a conflict banner instead of silently overwriting what
 * changed on disk.
 *
 * Save policy (owner feedback on MVP-001): AUTO by default — a debounced
 * save after typing pauses plus a flush when the editor unmounts; the
 * explicit button/Mod-s remain. MANUAL restores the strict S07 behavior.
 * Auto-save never forces: a conflict pauses it until the banner resolves,
 * so concurrency safety is identical in both modes.
 */
export function EditorPane({
  note,
  onSaved,
  onDirtyChange,
  mode = 'live',
  onModeChange,
  onNoteCreated,
  saveMode = 'auto',
  onSaveModeToggle
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
  const [aiDock, setAiDock] = useState<'bottom' | 'right'>('bottom')
  const [aiSize, setAiSize] = useState(0.44)
  const bodyRef = useRef<HTMLDivElement>(null)

  const dirtyRef = useRef(false)
  const conflictRef = useRef(false)
  const saveModeRef = useRef(saveMode)
  useEffect(() => {
    saveModeRef.current = saveMode
  }, [saveMode])
  const autoTimerRef = useRef<number | undefined>(undefined)

  const markDirty = useCallback(
    (next: boolean) => {
      dirtyRef.current = next
      setDirty(next)
      onDirtyChange?.(next)
    },
    [onDirtyChange]
  )
  const markDirtyRef = useRef(markDirty)
  useEffect(() => {
    markDirtyRef.current = markDirty
  }, [markDirty])

  const applyConflict = useCallback((next: boolean) => {
    conflictRef.current = next
    setConflict(next)
  }, [])

  const save = useCallback(
    async (force = false): Promise<boolean> => {
      const view = viewRef.current
      if (!view) return false
      window.clearTimeout(autoTimerRef.current)
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
        applyConflict(false)
        // The buffer may have moved on during the await; stay dirty then.
        markDirty(view.state.doc.toString() !== content)
        onSaved(content, result.mtimeMs)
        return true
      } catch (reason) {
        if (String(reason).includes('conflict')) applyConflict(true)
        else setError(String(reason))
        return false
      } finally {
        setSaving(false)
      }
    },
    [applyConflict, markDirty, note.relPath, onSaved]
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
      applyConflict(false)
      markDirty(false)
      onSaved(fresh.content, fresh.mtimeMs)
    } catch (reason) {
      setError(String(reason))
    }
  }, [applyConflict, markDirty, note.relPath, onSaved])

  // Live preview toggles through a compartment: switching live <-> source
  // reconfigures the SAME view, so buffer, undo history, and selection
  // survive the mode change (the raw bytes are identical in both).
  const previewCompartment = useRef(new Compartment()).current
  const modeRef = useRef(mode)
  useEffect(() => {
    if (modeRef.current === mode) return
    modeRef.current = mode
    viewRef.current?.dispatch({
      effects: previewCompartment.reconfigure(modeExtensions(mode))
    })
  }, [mode, previewCompartment])

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
        SHARED_EXTENSIONS,
        // GFM base: strikethrough/tables/task lists parse like they render.
        markdown({ base: markdownLanguage }),
        previewCompartment.of(modeExtensions(modeRef.current)),
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
            const changed = update.state.doc.toString() !== savedDocRef.current
            markDirtyRef.current(changed)
            // Auto mode: save shortly after typing pauses. Never while a
            // conflict banner is up — resolution stays a human decision.
            window.clearTimeout(autoTimerRef.current)
            if (changed && saveModeRef.current === 'auto' && !conflictRef.current) {
              autoTimerRef.current = window.setTimeout(() => {
                void saveRef.current()
              }, AUTOSAVE_DELAY_MS)
            }
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

  // Auto mode flushes a dirty buffer when the editor leaves the screen
  // (note switch, tab close). Runs before the mount effect's cleanup —
  // effects clean up in reverse declaration order — so the view is alive.
  // Optimistic like every save: a conflicting flush is dropped, never
  // forced over someone else's bytes.
  useEffect(() => {
    return () => {
      window.clearTimeout(autoTimerRef.current)
      const view = viewRef.current
      if (
        view &&
        saveModeRef.current === 'auto' &&
        dirtyRef.current &&
        !conflictRef.current
      ) {
        void window.atomik
          .writeNote(note.relPath, view.state.doc.toString(), mtimeRef.current)
          .catch(() => undefined)
      }
    }
  }, [note.relPath])

  const selectMode = useCallback(
    (next: NoteViewMode) => {
      if (!onModeChange) return
      // live <-> source reconfigures in place; only 'read' leaves the
      // editor, so only 'read' needs the save/confirm gate.
      if (next !== 'read') {
        onModeChange(next)
        return
      }
      if (dirty && saveMode === 'auto' && !conflict) {
        // Seamless: leaving the editor saves; stay put if the save fails.
        void (async () => {
          if (await saveRef.current()) onModeChange('read')
        })()
        return
      }
      if (dirty && !window.confirm('Unsaved changes will be lost. Continue?')) {
        return
      }
      onModeChange('read')
    },
    [conflict, dirty, onModeChange, saveMode]
  )

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

  /** Drag the divider between editor and AI panel (both docks). */
  const onAiDividerPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault()
      const body = bodyRef.current
      if (!body) return
      const divider = event.currentTarget
      divider.setPointerCapture(event.pointerId)
      const dock = aiDock
      const onMove = (move: PointerEvent): void => {
        const rect = body.getBoundingClientRect()
        const fraction =
          dock === 'bottom'
            ? (rect.bottom - move.clientY) / rect.height
            : (rect.right - move.clientX) / rect.width
        setAiSize(Math.min(0.75, Math.max(0.15, fraction)))
      }
      const onUp = (): void => {
        divider.removeEventListener('pointermove', onMove)
        divider.removeEventListener('pointerup', onUp)
      }
      divider.addEventListener('pointermove', onMove)
      divider.addEventListener('pointerup', onUp)
    },
    [aiDock]
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
          {onSaveModeToggle && (
            <button
              type="button"
              className="save-mode"
              title={
                saveMode === 'auto'
                  ? 'Auto-save is on — switch to manual save'
                  : 'Manual save — switch to auto-save'
              }
              onClick={onSaveModeToggle}
            >
              {saveMode === 'auto' ? 'auto' : 'manual'}
            </button>
          )}
          <button
            type="button"
            disabled={saving || !dirty}
            onClick={() => void save()}
            title="Save now (Ctrl+S)"
          >
            {saving ? 'saving…' : saveMode === 'auto' && !dirty ? 'Saved' : 'Save'}
          </button>
          {onModeChange && <ModeSwitch mode={mode} onSelect={selectMode} />}
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
      <div ref={bodyRef} className={`editor-body dock-${aiDock}`}>
        <div
          ref={hostRef}
          className={`editor-host${mode === 'live' ? ' live' : ''}`}
        />
        {showAi && (
          <>
            <div
              className="ai-divider"
              role="separator"
              aria-orientation={aiDock === 'bottom' ? 'horizontal' : 'vertical'}
              onPointerDown={onAiDividerPointerDown}
            />
            <AiPanel
              note={note}
              getSelection={getSelection}
              getDoc={getDoc}
              applyChange={applyChange}
              requestSave={async () => {
                await saveRef.current()
              }}
              openAnchor={revealRange}
              onNoteCreated={onNoteCreated}
              onClose={() => setShowAi(false)}
              dock={aiDock}
              onToggleDock={() =>
                setAiDock((current) => (current === 'bottom' ? 'right' : 'bottom'))
              }
              style={{ flexBasis: `${aiSize * 100}%` }}
            />
          </>
        )}
      </div>
    </div>
  )
}
