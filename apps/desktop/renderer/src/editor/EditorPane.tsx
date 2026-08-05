import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete'
import { AutosaveIcon, ImageIcon, SaveIcon } from '../icons'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { cssLanguage } from '@codemirror/lang-css'
import { htmlLanguage } from '@codemirror/lang-html'
import {
  javascriptLanguage,
  jsxLanguage,
  tsxLanguage,
  typescriptLanguage
} from '@codemirror/lang-javascript'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import {
  bracketMatching,
  defaultHighlightStyle,
  foldGutter,
  foldKeymap,
  indentOnInput,
  syntaxHighlighting,
  type Language
} from '@codemirror/language'
import { highlightSelectionMatches, searchKeymap } from '@codemirror/search'
import { Compartment, Text, type Extension } from '@codemirror/state'
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
import type { VaultFolder, VaultNoteFile } from '../../../shared/ipc-contract'
import { resolveRelativePath } from '../dev-docs/markdown'
import {
  chatContextEntryForSelection,
  themeOf,
  type NoteViewMode,
  type SaveMode
} from '../workspace/model'
import { registerAiContext } from '../workspace/ai-context'
import { useWorkspace } from '../workspace/store'
import { HistoryNav } from '../HistoryNav'
import { selectionLinkReplacement, type BufferChange } from './ai-helpers'
import { prepareAiRun, type SentRequest } from './ai-run'
import { AiNotePreview } from './AiNotePreview'
import { AiSelectionMenu, type AiMenuRequest } from './AiSelectionMenu'
import { insertionChange } from './chat-file'
import { SELECTION_DRAG_MIME, serializeSelectionDrag } from './drag-context'
import {
  inlineAi,
  inlineAiField,
  setInlineAi,
  type InlineAiHandlers,
  type InlineAiState
} from './inline-ai'
import { loadBuiltinOverridesFor, loadPromptsFor } from './prompts'
import { wireSystemPlan } from './system-plan'
import {
  frontmatterEnd,
  livePreview,
  setVocabulary,
  setWikiCandidates,
  vocabularyField,
  wikiCandidatesField
} from './live-preview'
import { ModeSwitch } from './ModeSwitch'
import { quickActions } from './quick-actions'
import { vocabularyOf, wikiCandidatesFor } from '../../../shared/graph-core'
import { hasMediaResource, isMediaFilePath } from '../source/dossier'

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

const modeExtensions = (
  mode: 'live' | 'source',
  onFollowLink: (href: string) => void,
  onFollowRel: (relPath: string) => void,
  notePath: string
): Extension =>
  mode === 'live'
    ? livePreview({ onFollowLink, onFollowRel, notePath })
    : SOURCE_CHROME

/** Vault tree for the "@" menu (bundles + linkable notes), freshly
 *  listed per menu opening. */
const listVaultTree = (): Promise<VaultFolder> => window.atomik.listVaultFiles()

/** Fenced-code languages for the installed packs; anything else stays
 *  plain mono. A registry (language-data) is a later dependency call. */
function fencedCodeLanguage(info: string): Language | null {
  switch (info.toLowerCase()) {
    case 'js':
    case 'javascript':
    case 'mjs':
    case 'cjs':
      return javascriptLanguage
    case 'jsx':
      return jsxLanguage
    case 'ts':
    case 'typescript':
      return typescriptLanguage
    case 'tsx':
      return tsxLanguage
    case 'html':
      return htmlLanguage
    case 'css':
      return cssLanguage
    default:
      return null
  }
}

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
  /** Ctrl/Cmd+click on an internal link in live mode opens it here. */
  onFollowLink?: (relPath: string) => void
  /** How EXTERNAL http(s) links open (S04d: live pills follow like
   *  read — the web is one tab away). Absent → the click stays inert. */
  onOpenWebUrl?: (url: string) => void
  /** 'auto' (default): debounced saves + flush on leave; 'manual': S07. */
  saveMode?: SaveMode
  onSaveModeToggle?: () => void
  /** History navigation (S05h: the ‹ › buttons live in EVERY mode's
   *  bar, not just read) — routed through the guarded open pipeline. */
  nav?: {
    backOk: boolean
    forwardOk: boolean
    onBack: () => void
    onForward: () => void
  }
  /** Shown when the note declares an image resource (dossier or
   *  transcript): the original stays one click away while editing. */
  onOpenSourceImage?: (dossierPath: string) => void
  /** Opens (or focuses) the CHAT PANE (S06c) — the selection menu's
   *  "Open chat" retired the docked panel. */
  onOpenChat?: () => void
  /** Adds a context ENTRY (path or path#from-to) to the chat pane
   *  (S06c5b — the selection menu's visible door). */
  onAddChatContext?: (entry: string) => void
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
  onFollowLink,
  onOpenWebUrl,
  saveMode = 'auto',
  onSaveModeToggle,
  nav,
  onOpenSourceImage,
  onOpenChat,
  onAddChatContext
}: EditorPaneProps): React.JSX.Element {
  const hostRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const mtimeRef = useRef(note.mtimeMs)
  /** The saved document as a CM Text: `doc.eq` compares via structure
   *  sharing, where the old string compare materialized the WHOLE
   *  document on every keystroke (perf audit 2026-07-15 — pure GC
   *  pressure at MB-note scale). Set from the view's real doc at mount. */
  const savedDocRef = useRef<Text>(Text.empty)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [conflict, setConflict] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // S04: the AI entry point is the SELECTION — right-click/Shift+F10
  // opens the menu at the click location; the note-bar stays editing-only.
  const [aiMenu, setAiMenu] = useState<{ x: number; y: number } | null>(null)
  // S05c: new-note runs preview as a SIMULATED TAB (owner directive)
  // instead of an in-note widget; nothing exists until "Create note".
  const [notePreview, setNotePreview] = useState<{
    phase: 'running' | 'review' | 'error'
    path: string
    proposal: string
    claims: import('../../../shared/ipc-contract').ClaimRecord[]
    trace: import('../../../shared/ipc-contract').TraceSummary | null
    sent: SentRequest | null
    error?: string
  } | null>(null)
  const notePreviewRef = useRef<typeof notePreview>(null)
  useEffect(() => {
    notePreviewRef.current = notePreview
  }, [notePreview])
  const previewMetaRef = useRef<{
    operationId: string | null
    bundleId: string | null
    filePath: string | null
    range: { from: number; to: number }
    selectedText: string
    docAtRun: string
  } | null>(null)
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
      const docAtSave = view.state.doc
      const content = docAtSave.toString()
      setSaving(true)
      setError(null)
      try {
        const result = await window.atomik.writeNote(
          note.relPath,
          content,
          force ? undefined : mtimeRef.current
        )
        mtimeRef.current = result.mtimeMs
        savedDocRef.current = docAtSave
        applyConflict(false)
        // The buffer may have moved on during the await; stay dirty then.
        markDirty(!view.state.doc.eq(docAtSave))
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
      savedDocRef.current = view.state.doc
      applyConflict(false)
      markDirty(false)
      onSaved(fresh.content, fresh.mtimeMs)
    } catch (reason) {
      setError(String(reason))
    }
  }, [applyConflict, markDirty, note.relPath, onSaved])

  // Link follow (Ctrl+click AND pill left-click, S04c/d): the raw href
  // resolves against this note and routes like READ's click router —
  // externals to the web tab, pdf/media originals to their dossier,
  // notes to the host. The S04c version silently dropped everything
  // but .md AFTER consuming the click ("nothing happens", owner bench
  // round 3) — every pill target now either navigates or falls back.
  const onFollowLinkRef = useRef(onFollowLink)
  useEffect(() => {
    onFollowLinkRef.current = onFollowLink
  }, [onFollowLink])
  const onOpenWebUrlRef = useRef(onOpenWebUrl)
  useEffect(() => {
    onOpenWebUrlRef.current = onOpenWebUrl
  }, [onOpenWebUrl])
  const onOpenSourceImageRef = useRef(onOpenSourceImage)
  useEffect(() => {
    onOpenSourceImageRef.current = onOpenSourceImage
  }, [onOpenSourceImage])
  const followHref = useCallback(
    (href: string) => {
      if (/^https?:/i.test(href)) {
        onOpenWebUrlRef.current?.(href)
        return
      }
      if (/^(mailto:|#)/.test(href)) return
      const pathPart = decodeURIComponent(href.split('#')[0] ?? '')
      const rel = resolveRelativePath(note.relPath, pathPart)
      if (!rel) return
      const lower = rel.toLowerCase()
      if (lower.endsWith('.pdf') || isMediaFilePath(rel)) {
        const dossierRel = rel.replace(/[^/]+$/, 'source.md')
        if (onOpenSourceImageRef.current) onOpenSourceImageRef.current(dossierRel)
        else onFollowLinkRef.current?.(dossierRel)
        return
      }
      if (lower.endsWith('/source.md') && onOpenSourceImageRef.current) {
        onOpenSourceImageRef.current(rel)
        return
      }
      if (lower.endsWith('.md')) onFollowLinkRef.current?.(rel)
    },
    [note.relPath]
  )
  const followHrefRef = useRef(followHref)
  useEffect(() => {
    followHrefRef.current = followHref
  }, [followHref])
  // Stable across compartment reconfigures; always calls the fresh closure.
  const followHandler = useRef((href: string) => followHrefRef.current(href))
    .current
  // Wiki pills hand over an ALREADY-RESOLVED vault path (S04c) — no
  // note-relative resolution, straight to the host.
  const followRelHandler = useRef((relPath: string) => {
    if (relPath.toLowerCase().endsWith('.md')) onFollowLinkRef.current?.(relPath)
  }).current

  // The editor's dark theme follows the app theme (round-2 feedback:
  // explicit dark + pastels), not the mount-time OS query alone.
  const appTheme = useWorkspace((store) => themeOf(store.state))
  const editorDark =
    appTheme === 'dark' ||
    (appTheme === 'system' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches)
  const editorDarkRef = useRef(editorDark)
  const darkCompartment = useRef(new Compartment()).current
  useEffect(() => {
    if (editorDarkRef.current === editorDark) return
    editorDarkRef.current = editorDark
    viewRef.current?.dispatch({
      effects: darkCompartment.reconfigure(editorDark ? [oneDark] : [])
    })
  }, [darkCompartment, editorDark])

  // Live preview toggles through a compartment: switching live <-> source
  // reconfigures the SAME view, so buffer, undo history, and selection
  // survive the mode change (the raw bytes are identical in both).
  const previewCompartment = useRef(new Compartment()).current
  const modeRef = useRef(mode)
  useEffect(() => {
    if (modeRef.current === mode) return
    modeRef.current = mode
    viewRef.current?.dispatch({
      effects: previewCompartment.reconfigure(
        modeExtensions(mode, followHandler, followRelHandler, note.relPath)
      )
    })
  }, [followHandler, mode, note.relPath, previewCompartment])

  // One EditorView per mounted pane; the host keys this component by note
  // path, so a different note is a fresh mount. The view lives in a ref —
  // recreating it on re-render would lose selection, history, and scroll.
  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const view = new EditorView({
      doc: note.content,
      parent: host,
      extensions: [
        SHARED_EXTENSIONS,
        // GFM base: strikethrough/tables/task lists parse like they
        // render; fenced code nests real language highlighting.
        markdown({
          base: markdownLanguage,
          codeLanguages: fencedCodeLanguage
        }),
        // Wikilink resolution candidates + the vault label vocabulary
        // for live pills (S04b read parity, S06 index) — OUTSIDE the
        // mode compartment so a live⇄source switch keeps the values.
        wikiCandidatesField,
        vocabularyField,
        previewCompartment.of(
          modeExtensions(modeRef.current, followHandler, followRelHandler, note.relPath)
        ),
        darkCompartment.of(editorDarkRef.current ? [oneDark] : []),
        // "@" quick actions + edge autocompletes ([[ titles, { labels)
        // — ONE autocompletion config composes both sources (S04).
        quickActions(note.relPath, listVaultTree),
        // S05b: the inline AI preview field (quick requests render
        // their proposal in the note; buffer untouched until accept).
        inlineAi(),
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
            const changed = !update.state.doc.eq(savedDocRef.current)
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
    // the saved baseline IS the view's initial doc (identical splitting)
    savedDocRef.current = view.state.doc
    // Live opens ON THE CONTENT: the default cursor position (0) sits
    // inside the frontmatter and would reveal it — the fold only holds
    // while the selection is elsewhere.
    if (modeRef.current === 'live') {
      const fmEnd = frontmatterEnd(view.state)
      if (fmEnd > 0) {
        view.dispatch({
          selection: { anchor: Math.min(fmEnd + 1, view.state.doc.length) }
        })
      }
    }
    view.focus()
    // Feed the wikilink resolution candidates (S04b; S06: from the
    // nodes/edges INDEX — titles included, so live sentences read the
    // target's H1).
    void window.atomik
      .readGraphIndex()
      .then((index) => {
        if (viewRef.current !== view) return
        view.dispatch({
          effects: [
            setWikiCandidates.of(wikiCandidatesFor(note.relPath, index.nodes)),
            setVocabulary.of(vocabularyOf(index))
          ]
        })
      })
      .catch(() => {})
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

  // S06c: this editor registers as a workspace-wide AI CONTEXT while
  // mounted — the chat pane's picklist offers it, reads selection/doc
  // at send time, and inserts answers at the cursor through the SAME
  // applyChange + save path as any accepted patch (06).
  const aiContextId = useRef(crypto.randomUUID())
  useEffect(() => {
    return registerAiContext({
      id: aiContextId.current,
      notePath: note.relPath,
      editable: true,
      getSelection,
      getDoc,
      insert: async (text: string) => {
        const view = viewRef.current
        if (!view) return
        const at = view.state.selection.main.to
        applyChange(insertionChange(view.state.doc.toString(), at, text))
        await saveRef.current()
      }
    })
  }, [applyChange, getDoc, getSelection, note.relPath])

  /**
   * S05b: a menu run previews INLINE — the proposal renders in the
   * note over the target range; the buffer changes only on accept,
   * through the same applyChange + save path the panel uses. The
   * shared pipeline (ai-run) prepares the request; the widget's
   * handlers close over an inflight record.
   */
  /** S05c: the new-note run drives the TAB SIMULATION — proposal
   *  rendered as the note will look; created only on accept. */
  const startNotePreviewRun = useCallback(
    async (menuRequest: AiMenuRequest) => {
      const view = viewRef.current
      if (!view) return
      const sel = view.state.selection.main
      const selectedText = view.state.sliceDoc(sel.from, sel.to)
      const doc = view.state.doc.toString()
      previewMetaRef.current = {
        operationId: null,
        bundleId: null,
        filePath: null,
        range: { from: sel.from, to: sel.to },
        selectedText,
        docAtRun: doc
      }
      setNotePreview({
        phase: 'running',
        path: '…',
        proposal: '',
        claims: [],
        trace: null,
        sent: null
      })
      try {
        const prompts = await loadPromptsFor(note.relPath, window.atomik).catch(
          () => []
        )
        const builtins = await loadBuiltinOverridesFor(
          note.relPath,
          window.atomik
        ).catch(() => ({}))
        const prepared = await prepareAiRun(
          {
            noteRelPath: note.relPath,
            doc,
            selection: { from: sel.from, to: sel.to, text: selectedText },
            instruction: menuRequest.instruction,
            ...(menuRequest.preset ? { preset: menuRequest.preset } : {}),
            systemStack: [],
            systemPlan: wireSystemPlan(menuRequest.systemPlan, prompts),
            prompts,
            builtins,
            destination: 'new-note',
            newNotePath: '',
            ...(menuRequest.params ? { params: menuRequest.params } : {})
          },
          window.atomik.readNote
        )
        if (!prepared) {
          setNotePreview(null)
          return
        }
        const meta = previewMetaRef.current
        meta.operationId = prepared.operation.id
        const plannedPath =
          prepared.operation.target.destination.kind === 'new-note'
            ? prepared.operation.target.destination.newNotePath
            : ''
        setNotePreview((current) =>
          current ? { ...current, path: plannedPath, sent: prepared.sent } : current
        )
        const result = await window.atomik.runAiOperation(prepared.operation)
        meta.bundleId = result.id
        const file = result.patchProposals[0]?.files[0] ?? null
        meta.filePath = file?.relPath ?? plannedPath
        const trace = await window.atomik
          .getAiTraceSummary(result.id)
          .catch(() => null)
        setNotePreview({
          phase: 'review',
          path: meta.filePath,
          proposal: file?.newText ?? '',
          claims: result.claims,
          trace,
          sent: prepared.sent
        })
      } catch (reason) {
        setNotePreview((current) =>
          current ? { ...current, phase: 'error', error: String(reason) } : null
        )
      }
    },
    [note.relPath]
  )

  const previewAccept = useCallback(
    async (edited: string) => {
      const meta = previewMetaRef.current
      const data = notePreviewRef.current
      if (!meta?.filePath || !data) return
      const decision = edited === data.proposal ? 'accepted' : 'edited'
      try {
        await window.atomik.createNote(meta.filePath, edited)
        // S05 auto-link — drift-guarded: no CM mapping outside the
        // widget, so the link applies only on an unchanged buffer.
        if (meta.selectedText.trim().length > 0 && getDoc() === meta.docAtRun) {
          applyChange({
            kind: 'replace-range',
            range: meta.range,
            newText: selectionLinkReplacement(
              note.relPath,
              meta.selectedText,
              meta.filePath
            )
          })
          await saveRef.current()
        }
        if (meta.bundleId) {
          window.atomik.resolveAiTrace(meta.bundleId, decision).catch(() => undefined)
        }
        onNoteCreated?.(meta.filePath)
        setNotePreview(null)
      } catch (reason) {
        setNotePreview((current) =>
          current ? { ...current, phase: 'error', error: String(reason) } : null
        )
      }
    },
    [applyChange, getDoc, note.relPath, onNoteCreated]
  )

  const previewReject = useCallback(() => {
    const meta = previewMetaRef.current
    if (meta?.bundleId) {
      window.atomik.resolveAiTrace(meta.bundleId, 'rejected').catch(() => undefined)
    }
    setNotePreview(null)
  }, [])

  const previewCancel = useCallback(() => {
    const meta = previewMetaRef.current
    if (meta?.operationId) {
      void window.atomik.cancelAiOperation(meta.operationId).catch(() => undefined)
    }
  }, [])

  const startInlineRun = useCallback(
    async (menuRequest: AiMenuRequest) => {
      // new-note previews as a simulated tab, not an in-note widget
      if (menuRequest.destination === 'new-note') {
        return startNotePreviewRun(menuRequest)
      }
      const view = viewRef.current
      if (!view) return
      const sel = view.state.selection.main
      const selectedText = view.state.sliceDoc(sel.from, sel.to)
      const docLength = view.state.doc.length
      const anchor =
        menuRequest.destination === 'append'
          ? { from: docLength, to: docLength }
          : { from: sel.from, to: sel.to }
      const inflight: {
        operationId: string | null
        bundleId: string | null
        proposalFile: { kind: string; relPath: string; newText: string } | null
      } = { operationId: null, bundleId: null, proposalFile: null }
      let version = 0
      const base: InlineAiState = {
        phase: 'running',
        anchor,
        destination: menuRequest.destination,
        proposal: '',
        claims: [],
        trace: null,
        selectedText,
        bundleId: null,
        sent: null,
        version: 0
      }
      const push = (patch: Partial<InlineAiState>): void => {
        const current = view.state.field(inlineAiField, false)
        const nextState = {
          ...(current?.state ?? base),
          ...patch,
          version: ++version
        }
        view.dispatch({
          effects: setInlineAi.of({ state: nextState, handlers })
        })
      }
      const clear = (): void => {
        view.dispatch({ effects: setInlineAi.of(null) })
      }
      const acceptInline = async (edited: string): Promise<void> => {
        const current = view.state.field(inlineAiField, false)
        const file = inflight.proposalFile
        if (!current || !file) return
        const decision = edited === current.state.proposal ? 'accepted' : 'edited'
        const anchorNow = current.state.anchor
        try {
          if (file.kind === 'create') {
            await window.atomik.createNote(file.relPath, edited)
            // S05 auto-link: the selection becomes a link to the
            // created note (anchor mapped through any edits since)
            if (current.state.selectedText.trim().length > 0) {
              applyChange({
                kind: 'replace-range',
                range: anchorNow,
                newText: selectionLinkReplacement(
                  note.relPath,
                  current.state.selectedText,
                  file.relPath
                )
              })
              await saveRef.current()
            }
            onNoteCreated?.(file.relPath)
          } else if (file.kind === 'replace-range') {
            applyChange({
              kind: 'replace-range',
              range: anchorNow,
              newText: edited
            })
            await saveRef.current()
          } else {
            applyChange({ kind: 'append', newText: edited })
            await saveRef.current()
          }
          if (inflight.bundleId) {
            window.atomik
              .resolveAiTrace(inflight.bundleId, decision)
              .catch(() => undefined)
          }
          clear()
        } catch (reason) {
          push({ phase: 'error', error: String(reason) })
        }
      }
      const handlers: InlineAiHandlers = {
        onCancel: () => {
          if (inflight.operationId) {
            void window.atomik
              .cancelAiOperation(inflight.operationId)
              .catch(() => undefined)
          }
        },
        onReject: () => {
          if (inflight.bundleId) {
            window.atomik
              .resolveAiTrace(inflight.bundleId, 'rejected')
              .catch(() => undefined)
          }
          clear()
        },
        onAccept: (edited) => {
          void acceptInline(edited)
        }
      }
      push({})
      try {
        const prompts = await loadPromptsFor(note.relPath, window.atomik).catch(
          () => []
        )
        const builtins = await loadBuiltinOverridesFor(
          note.relPath,
          window.atomik
        ).catch(() => ({}))
        const prepared = await prepareAiRun(
          {
            noteRelPath: note.relPath,
            doc: view.state.doc.toString(),
            selection: { from: sel.from, to: sel.to, text: selectedText },
            instruction: menuRequest.instruction,
            ...(menuRequest.preset ? { preset: menuRequest.preset } : {}),
            systemStack: [],
            systemPlan: wireSystemPlan(menuRequest.systemPlan, prompts),
            prompts,
            builtins,
            destination: menuRequest.destination,
            newNotePath: '',
            ...(menuRequest.params ? { params: menuRequest.params } : {})
          },
          window.atomik.readNote
        )
        if (!prepared) {
          clear()
          return
        }
        inflight.operationId = prepared.operation.id
        const result = await window.atomik.runAiOperation(prepared.operation)
        inflight.bundleId = result.id
        inflight.proposalFile = result.patchProposals[0]?.files[0] ?? null
        const trace = await window.atomik
          .getAiTraceSummary(result.id)
          .catch(() => null)
        push({
          phase: 'review',
          proposal: inflight.proposalFile?.newText ?? '',
          claims: result.claims,
          trace,
          bundleId: result.id,
          sent: prepared.sent,
          ...(inflight.proposalFile?.kind === 'create'
            ? { newNotePath: inflight.proposalFile.relPath }
            : {})
        })
      } catch (reason) {
        push({ phase: 'error', error: String(reason) })
      }
    },
    [applyChange, note.relPath, onNoteCreated, startNotePreviewRun]
  )

  /** S04→S05b: a quick action or custom run previews INLINE (the DoD:
   *  quick requests do NOT open the panel); "Open chat" opens the
   *  pane's chat column (S06 — the docked panel retired). */
  const runFromMenu = useCallback(
    (menuRequest: AiMenuRequest) => {
      setAiMenu(null)
      void startInlineRun(menuRequest)
    },
    [startInlineRun]
  )

  const openChatFromMenu = useCallback(() => {
    setAiMenu(null)
    onOpenChat?.()
  }, [onOpenChat])

  const addContextFromMenu = useCallback(() => {
    setAiMenu(null)
    const view = viewRef.current
    if (!view || !onAddChatContext) return
    const range = view.state.selection.main
    if (range.empty) return
    onAddChatContext(
      chatContextEntryForSelection(note.relPath, range.from, range.to)
    )
  }, [note.relPath, onAddChatContext])

  const openAiMenu = useCallback((x: number, y: number) => {
    setAiMenu({ x, y })
  }, [])

  return (
    <div className="editor" data-editor-ready="1">
      <div className="note-bar">
        {nav && (
          <HistoryNav
            backOk={nav.backOk}
            forwardOk={nav.forwardOk}
            onBack={nav.onBack}
            onForward={nav.onForward}
          />
        )}
        <span className="note-bar-path" title={note.relPath}>
          {note.relPath}
          {dirty && (
            <span className="dirty-dot" title="Unsaved changes" aria-label="Unsaved changes">
              ●
            </span>
          )}
        </span>
        <span className="note-bar-actions">
          {error && <span className="error editor-msg">{error}</span>}
          {onSaveModeToggle && (
            <button
              type="button"
              className={`icon-button save-mode${saveMode === 'auto' ? ' active' : ''}`}
              title={
                saveMode === 'auto'
                  ? 'Auto-save is on — switch to manual save'
                  : 'Manual save — switch to auto-save'
              }
              aria-label="Toggle auto-save"
              aria-pressed={saveMode === 'auto'}
              onClick={onSaveModeToggle}
            >
              <AutosaveIcon />
            </button>
          )}
          <button
            type="button"
            className="icon-button"
            disabled={saving || !dirty}
            onClick={() => void save()}
            title={
              saving
                ? 'Saving…'
                : saveMode === 'auto' && !dirty
                  ? 'Saved'
                  : 'Save now (Ctrl+S)'
            }
            aria-label="Save"
          >
            <SaveIcon />
          </button>
          {onOpenSourceImage && hasMediaResource(note.content) && (
            <button
              type="button"
              className="note-bar-button icon-button"
              title="View the original beside the dossier"
              aria-label="View original"
              onClick={() => onOpenSourceImage(note.relPath)}
            >
              <ImageIcon />
            </button>
          )}
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
      <div className="editor-body">
        <div
          ref={hostRef}
          className={`editor-host${mode === 'live' ? ' live' : ''}`}
          // S06c5: a DRAGGED selection carries its note + range beside
          // CodeMirror's own text payload — dropped on the chat pane it
          // becomes a ranged context pill (the chat answers 'copy', so
          // CM never deletes the source text).
          onDragStartCapture={(event) => {
            const view = viewRef.current
            if (!view) return
            const range = view.state.selection.main
            if (range.empty) return
            event.dataTransfer.setData(
              SELECTION_DRAG_MIME,
              serializeSelectionDrag({
                relPath: note.relPath,
                from: range.from,
                to: range.to
              })
            )
          }}
          // S04: the selection is the AI entry point — right-click (or
          // Shift+F10 at the caret) opens the contextual AI menu.
          onContextMenu={(event) => {
            event.preventDefault()
            openAiMenu(event.clientX, event.clientY)
          }}
          onKeyDown={(event) => {
            if (event.key === 'F10' && event.shiftKey) {
              event.preventDefault()
              const view = viewRef.current
              const coords = view
                ? view.coordsAtPos(view.state.selection.main.head)
                : null
              openAiMenu(coords?.left ?? 80, coords?.bottom ?? 80)
            }
          }}
        />
        {notePreview && (
          <AiNotePreview
            path={notePreview.path}
            phase={notePreview.phase}
            proposal={notePreview.proposal}
            claims={notePreview.claims}
            trace={notePreview.trace}
            sent={notePreview.sent}
            {...(notePreview.error ? { error: notePreview.error } : {})}
            onAccept={(edited) => void previewAccept(edited)}
            onReject={previewReject}
            onCancel={previewCancel}
          />
        )}
        {aiMenu && (
          <AiSelectionMenu
            x={aiMenu.x}
            y={aiMenu.y}
            notePath={note.relPath}
            selectionText={getSelection().text}
            onClose={() => setAiMenu(null)}
            onRun={runFromMenu}
            onOpenChat={openChatFromMenu}
            onAddContext={onAddChatContext ? addContextFromMenu : undefined}
          />
        )}
      </div>
    </div>
  )
}
