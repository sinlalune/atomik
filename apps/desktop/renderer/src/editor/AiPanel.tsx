import MarkdownIt from 'markdown-it'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  AiDestination,
  AiResponseBundle,
  AiSelection,
  ClaimRecord,
  ProposedFileChange,
  TraceSummary,
  VaultNoteFile
} from '../../../shared/ipc-contract'
import {
  CheckIcon,
  CloseIcon,
  DockBottomIcon,
  DockRightIcon,
  ExternalLinkIcon,
  PlayIcon
} from '../icons'
import {
  composeSystemPrompt,
  composeUserMessage,
  requestAsText,
  type DestinationKind
} from '../../../shared/prompt-composition'
import { defaultNewNotePath, ensureMdExtension } from './ai-helpers'
import {
  atPromptToken,
  composeSystemStack,
  expandInstruction,
  filterPrompts,
  insertDirectiveAt,
  layerDirectiveFor,
  loadPromptsFor,
  reorderStack,
  scopeLabel,
  stackFileContent,
  type PromptFile
} from './prompts'

export type BufferChange =
  | { kind: 'replace-range'; range: { from: number; to: number }; newText: string }
  | { kind: 'append'; newText: string }

/** A request handed in from the selection menu (S04): prefills the
 *  panel and optionally runs immediately. `id` dedupes re-renders. */
export type AiPanelRequest = {
  id: string
  instruction: string
  preset?: string
  stack: string[]
  /** The menu's destination choice (S04e); the panel default holds
   *  when absent. */
  destination?: AiDestination['kind']
  autoRun?: boolean
}

export type AiPanelProps = {
  note: VaultNoteFile
  /** Latest selection-menu request; the panel applies each id once. */
  request?: AiPanelRequest | null
  /** Current editor selection (offsets + text) at call time. */
  getSelection: () => { from: number; to: number; text: string }
  /** Full buffer text at call time. */
  getDoc: () => string
  /** Applies an accepted change into the editor buffer (undoable). */
  applyChange: (change: BufferChange) => void
  /** Saves the buffer (the editor's save: mtime handshake, conflicts). */
  requestSave: () => Promise<void>
  /** Reveals a source anchor range in the editor (S10 citations). */
  openAnchor: (range: { from: number; to: number }) => void
  /** Opens a URL in a web tab (S06: evidence from a web reader carries
   *  URL provenance — the live page is one click away). */
  onOpenWebUrl?: (url: string) => void
  /** Fired after a new-note patch is created on disk (refresh + open). */
  onNoteCreated?: (relPath: string) => void
  onClose: () => void
  /** Where the panel is docked; the host owns layout and resize. */
  dock: 'bottom' | 'right'
  onToggleDock: () => void
  style?: React.CSSProperties
}

type Phase = 'compose' | 'running' | 'review'

export const PRESETS: Array<{ id: string; label: string; instruction: string }> = [
  { id: 'explain', label: 'explain', instruction: 'Explain this simply.' },
  { id: 'summarize', label: 'summarize', instruction: 'Summarize the selection.' },
  { id: 'rewrite', label: 'rewrite', instruction: 'Rewrite this more clearly.' }
]

/**
 * The S08 loop, docked inside the editor: selection → mocked operation →
 * response bundle → editable patch preview → accept (into the BUFFER,
 * undoable; the explicit save remains the moment a diff is born) or
 * reject. A dedicated ai-panel tab kind may replace this docking when
 * context assembly grows beyond selection-first (26).
 */
export function AiPanel({
  note,
  request,
  getSelection,
  getDoc,
  applyChange,
  requestSave,
  openAnchor,
  onOpenWebUrl,
  onNoteCreated,
  onClose,
  dock,
  onToggleDock,
  style
}: AiPanelProps): React.JSX.Element {
  const [instruction, setInstruction] = useState('')
  const [preset, setPreset] = useState<string | undefined>(undefined)
  const [destination, setDestination] = useState<AiDestination['kind']>('append')
  // Prefilled and fully visible: the destination path is never a surprise.
  const [newNotePath, setNewNotePath] = useState(() =>
    defaultNewNotePath(note.relPath)
  )
  const [phase, setPhase] = useState<Phase>('compose')
  const [bundle, setBundle] = useState<AiResponseBundle | null>(null)
  const [editedText, setEditedText] = useState('')
  const [proposedText, setProposedText] = useState('')
  const [trace, setTrace] = useState<TraceSummary | null>(null)
  const [ranSelection, setRanSelection] = useState<AiSelection | null>(null)
  const [docAtRun, setDocAtRun] = useState('')
  const [applied, setApplied] = useState<string | null>(null)
  const [challengedIds, setChallengedIds] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const runningOperationId = useRef<string | null>(null)
  // Scoped prompt files (S03): resolved nearest-first for THIS note,
  // reloaded when vault files land — a prompt edit is a note edit.
  const [vaultPrompts, setVaultPrompts] = useState<PromptFile[]>([])
  // Honest identity in the header (28; the "MOCK PROVIDER" label had
  // outlived the S02 engine swap — owner capture 2026-07-22).
  const [engineLabel, setEngineLabel] = useState('…')
  useEffect(() => {
    window.atomik.getAiSettings().then(
      (settings) => setEngineLabel(settings.generationEngine),
      () => setEngineLabel('mock')
    )
  }, [])
  /** The COMPOSED request of the last run — inspectable (26): what
   *  actually traveled to main, layers expanded, stack composed. */
  const [sentRequest, setSentRequest] = useState<{
    instruction: string
    systemPrompt: string | null
    preset: string | null
    selection: {
      relPath: string
      from: number
      to: number
      chars: number
      wholeNote: boolean
      /** What was actually captured — seeing beats trusting offsets. */
      excerpt: string
      /** Full captured text, for the faithful copy (memory only). */
      content: string
    }
    destination: DestinationKind
  } | null>(null)
  const [requestCopied, setRequestCopied] = useState(false)
  // System STACK (S03f): ordered block relPaths — personality > tone >
  // objectives — composed into ONE system prompt at run.
  const [systemStack, setSystemStack] = useState<string[]>([])
  const [stackAddOpen, setStackAddOpen] = useState(false)
  const [stackSaveName, setStackSaveName] = useState<string | null>(null)
  const dragIndex = useRef<number | null>(null)

  const appendToStack = useCallback((relPath: string) => {
    setSystemStack((current) =>
      current.includes(relPath) ? current : [...current, relPath]
    )
  }, [])

  const saveStack = useCallback(async () => {
    const name = stackSaveName?.trim().replace(/\.md$/i, '')
    if (!name || systemStack.length === 0) return
    const byPath = new Map(vaultPrompts.map((prompt) => [prompt.relPath, prompt]))
    const blockNames = systemStack
      .map((relPath) => byPath.get(relPath)?.name)
      .filter((blockName): blockName is string => blockName !== undefined)
    try {
      await window.atomik.createNote(
        `prompts/${name}.md`,
        stackFileContent(name, blockNames)
      )
      setStackSaveName(null)
    } catch (reason) {
      setError(String(reason))
    }
  }, [stackSaveName, systemStack, vaultPrompts])
  // @ quick-action menu in the instruction field (S03c): token state +
  // keyboard highlight; items derive from the token's query.
  const [atMenu, setAtMenu] = useState<{ start: number; query: string; index: number } | null>(null)
  const instructionRef = useRef<HTMLTextAreaElement | null>(null)

  const atItems = atMenu ? filterPrompts(vaultPrompts, atMenu.query) : []

  const syncAtMenu = useCallback((element: HTMLTextAreaElement) => {
    const token =
      element.selectionStart === element.selectionEnd
        ? atPromptToken(element.value, element.selectionStart)
        : null
    setAtMenu((current) =>
      token
        ? { ...token, index: current?.start === token.start ? current.index : 0 }
        : null
    )
  }, [])

  const pickAtPrompt = useCallback(
    (prompt: PromptFile) => {
      const element = instructionRef.current
      if (!element || !atMenu) return
      // system → the selector; message → its LAYER DIRECTIVE in place
      // (S03d: the instruction stays buildable; composition happens
      // at run time through the same scoped resolution)
      const next =
        prompt.kind === 'system'
          ? {
              text:
                element.value.slice(0, atMenu.start) +
                element.value.slice(element.selectionStart),
              caret: atMenu.start
            }
          : insertDirectiveAt(
              element.value,
              atMenu.start,
              element.selectionStart,
              prompt.name
            )
      if (prompt.kind === 'system') appendToStack(prompt.relPath)
      setInstruction(next.text)
      setAtMenu(null)
      requestAnimationFrame(() => {
        element.focus()
        element.setSelectionRange(next.caret, next.caret)
      })
    },
    [atMenu, appendToStack]
  )

  // The latest load as a PROMISE: run() awaits this instead of the
  // state snapshot — an auto-run right after mount must not compose
  // against a not-yet-loaded prompt list (the directive would travel
  // LITERALLY to the model; owner bug report 2026-07-21).
  const promptsReady = useRef<Promise<PromptFile[]>>(Promise.resolve([]))
  useEffect(() => {
    let live = true
    const reload = (): void => {
      const loading = loadPromptsFor(note.relPath, window.atomik).catch(
        () => [] as PromptFile[]
      )
      promptsReady.current = loading
      void loading.then((prompts) => {
        if (live) setVaultPrompts(prompts)
      })
    }
    reload()
    const unsubscribe = window.atomik.onVaultFilesChanged(reload)
    return () => {
      live = false
      unsubscribe()
    }
  }, [note.relPath])

  // Selection-menu handoff (S04): apply each request exactly once —
  // prefill, then run on the NEXT render so state has landed.
  const appliedRequestId = useRef<string | null>(null)
  const [pendingRun, setPendingRun] = useState(false)
  useEffect(() => {
    if (!request || request.id === appliedRequestId.current) return
    appliedRequestId.current = request.id
    setInstruction(request.instruction)
    setPreset(request.preset)
    setSystemStack(request.stack)
    if (request.destination) setDestination(request.destination)
    if (request.autoRun) setPendingRun(true)
  }, [request])

  const md = useMemo(
    () => new MarkdownIt({ html: false, linkify: false, breaks: true }),
    []
  )

  const pickPreset = useCallback(
    (id: string) => {
      setPreset(id)
      const spec = PRESETS.find((candidate) => candidate.id === id)
      if (spec && instruction.trim().length === 0) {
        setInstruction(spec.instruction)
      }
    },
    [instruction]
  )

  const run = useCallback(async () => {
    // S03d: the instruction is a buildable prompt — its layer
    // directives compose HERE, against this note's resolved scopes.
    // AWAIT the load, never the state snapshot: an auto-run straight
    // from the selection menu must compose against real prompts.
    const prompts = await promptsReady.current
    const text = expandInstruction(instruction, prompts).trim()
    if (text.length === 0) return
    const raw = getSelection()
    const doc = getDoc()
    // no selection -> the whole note is the selection (05: scope shrinks
    // to the note; replace-selection is disabled below in that case)
    const selection: AiSelection = {
      relPath: note.relPath,
      kind: 'text',
      content: raw.text.length > 0 ? raw.text : doc,
      range:
        raw.text.length > 0
          ? { from: raw.from, to: raw.to }
          : { from: 0, to: doc.length }
    }
    const target =
      destination === 'new-note'
        ? {
            relPath: note.relPath,
            destination: {
              kind: 'new-note' as const,
              newNotePath: ensureMdExtension(
                newNotePath.trim().length > 0
                  ? newNotePath.trim()
                  : defaultNewNotePath(note.relPath)
              )
            }
          }
        : { relPath: note.relPath, destination: { kind: destination } }

    setPhase('running')
    setError(null)
    setApplied(null)
    const operationId = crypto.randomUUID()
    runningOperationId.current = operationId
    const systemPrompt = composeSystemStack(systemStack, prompts)
    // The inspectable request (26): EXACTLY what travels to main —
    // composed, not the layered editing form. Set before the await so
    // a failed run stays inspectable.
    setSentRequest({
      instruction: text,
      systemPrompt: systemPrompt.length > 0 ? systemPrompt : null,
      preset: preset ?? null,
      selection: {
        relPath: selection.relPath,
        from: selection.range.from,
        to: selection.range.to,
        chars: selection.content.length,
        wholeNote: raw.text.length === 0,
        excerpt:
          selection.content.length <= 200
            ? selection.content
            : `${selection.content.slice(0, 200)}…`,
        content: selection.content
      },
      destination: target.destination.kind
    })
    try {
      const result = await window.atomik.runAiOperation({
        id: operationId,
        input: [selection],
        instruction: text,
        ...(preset ? { preset } : {}),
        ...(systemPrompt ? { systemPrompt } : {}),
        target
      })
      setBundle(result)
      setRanSelection(selection)
      setDocAtRun(doc)
      const proposal = result.patchProposals[0]?.files[0]?.newText ?? ''
      setEditedText(proposal)
      setProposedText(proposal)
      setPhase('review')
      // badge data; telemetry must never break the loop
      window.atomik.getAiTraceSummary(result.id).then(
        (summary) => setTrace(summary),
        () => setTrace(null)
      )
    } catch (reason) {
      setError(String(reason))
      setPhase('compose')
    } finally {
      runningOperationId.current = null
    }
  }, [destination, getDoc, getSelection, instruction, newNotePath, note.relPath, preset, systemStack])

  // The deferred half of the S04 handoff: run fires once the prefilled
  // instruction is in state (never with the stale pre-request value).
  useEffect(() => {
    if (!pendingRun || instruction.trim().length === 0) return
    setPendingRun(false)
    void run()
  }, [pendingRun, instruction, run])

  // Cancel rides the operation id (S02): main aborts the provider call
  // mid-flight; the run above rejects with ai(cancelled).
  const cancelRun = useCallback(() => {
    const id = runningOperationId.current
    if (id) window.atomik.cancelAiOperation(id).catch(() => undefined)
  }, [])

  const proposalFile: ProposedFileChange | undefined =
    bundle?.patchProposals[0]?.files[0]

  const reportDecision = useCallback(
    (decision: 'accepted' | 'edited' | 'rejected') => {
      if (!bundle) return
      // fire-and-forget: the ledger line must never block or break the UX
      window.atomik.resolveAiTrace(bundle.id, decision).catch(() => undefined)
    },
    [bundle]
  )

  const accept = useCallback(async () => {
    if (!bundle || !proposalFile || !ranSelection) return
    setError(null)
    const decision = editedText === proposedText ? 'accepted' : 'edited'
    try {
      if (proposalFile.kind === 'create') {
        await window.atomik.createNote(proposalFile.relPath, editedText)
        setApplied(`created ${proposalFile.relPath}`)
        reportDecision(decision)
        onNoteCreated?.(proposalFile.relPath)
      } else {
        if (
          getDoc() !== docAtRun &&
          !window.confirm(
            'The buffer changed since this operation ran — apply anyway?'
          )
        ) {
          return
        }
        if (proposalFile.kind === 'replace-range') {
          applyChange({
            kind: 'replace-range',
            range: proposalFile.range,
            newText: editedText
          })
        } else {
          applyChange({ kind: 'append', newText: editedText })
        }
        // Accepting IS the decision: the reviewed patch is saved right
        // away (one accepted operation = one clear diff). Ctrl+Z + save
        // reverts; a stale file surfaces the editor's conflict banner.
        await requestSave()
        setApplied('applied and saved — Ctrl+Z then save to revert')
        reportDecision(decision)
      }
    } catch (reason) {
      setError(String(reason))
    }
  }, [applyChange, bundle, docAtRun, editedText, getDoc, proposalFile, proposedText, ranSelection, requestSave, onNoteCreated, reportDecision])

  const reject = useCallback(() => {
    if (!applied) reportDecision('rejected')
    setBundle(null)
    setRanSelection(null)
    setApplied(null)
    setTrace(null)
    setChallengedIds([])
    setPhase('compose')
  }, [applied, reportDecision])

  /** S10 challenge → repair patch preview: the claim is qualified inside
   *  the (editable) proposal — a mechanical repair the user reviews and
   *  accepts through the normal patch path. */
  const challenge = useCallback((claim: ClaimRecord) => {
    const marker = ' **[⚠ challenged — needs a source]**'
    setEditedText((current) =>
      current.includes(claim.text)
        ? current.replace(claim.text, `${claim.text}${marker}`)
        : `${current}\n\n> ⚠ Challenged claim (${claim.label}): "${claim.text}" — do not trust this patch until it is sourced.\n`
    )
    setChallengedIds((current) => [...current, claim.id])
  }, [])

  const openEvidence = useCallback(
    (claim: ClaimRecord) => {
      const record = bundle?.evidence.find(
        (candidate) => candidate.id === claim.evidenceIds[0]
      )
      if (record) openAnchor(record.source.range)
    },
    [bundle, openAnchor]
  )

  /** URL provenance of a claim's first evidence record, when its
   *  selection came from a web reader (S06). */
  const evidenceUrl = useCallback(
    (claim: ClaimRecord): string | undefined =>
      bundle?.evidence.find(
        (candidate) => candidate.id === claim.evidenceIds[0]
      )?.source.url,
    [bundle]
  )

  const selectionEmpty = getSelection().text.length === 0

  return (
    <section className="ai-panel" aria-label="AI operation panel" style={style}>
      <header className="ai-panel-bar">
        <span className="ai-panel-title">AI · {engineLabel}</span>
        <span className="ai-panel-controls">
          <button
            type="button"
            className="icon-button"
            title={dock === 'bottom' ? 'Dock right' : 'Dock bottom'}
            aria-label={dock === 'bottom' ? 'Dock right' : 'Dock bottom'}
            onClick={onToggleDock}
          >
            {dock === 'bottom' ? <DockRightIcon /> : <DockBottomIcon />}
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label="Close AI panel"
            title="Close AI panel"
            onClick={onClose}
          >
            <CloseIcon />
          </button>
        </span>
      </header>
      <div className="ai-panel-body">
        {phase !== 'review' && (
          <div className="ai-compose">
            <div className="ai-presets">
              {PRESETS.map((spec) => (
                <button
                  key={spec.id}
                  type="button"
                  className={preset === spec.id ? 'active' : ''}
                  title="built-in"
                  onClick={() => pickPreset(spec.id)}
                >
                  {spec.label}
                </button>
              ))}
              {vaultPrompts
                .filter((prompt) => prompt.kind === 'message')
                .map((prompt) => (
                  <button
                    key={prompt.relPath}
                    type="button"
                    className={`ai-preset-file${preset === `file:${prompt.name}` ? ' active' : ''}`}
                    title={`prompt · ${scopeLabel(prompt.scopeFolder, note.relPath)} — ${prompt.description ?? prompt.relPath}`}
                    onClick={() => {
                      // a pill click ADDS the layer (S03d), never
                      // overwrites what you typed
                      setPreset(`file:${prompt.name}`)
                      setInstruction((current) =>
                        current.trim().length === 0
                          ? layerDirectiveFor(prompt.name)
                          : `${current.replace(/\n?$/, '\n')}${layerDirectiveFor(prompt.name)}`
                      )
                    }}
                  >
                    {prompt.title}
                  </button>
                ))}
            </div>
            {vaultPrompts.some((prompt) => prompt.kind === 'system') && (
              <div className="ai-system">
                <span>system</span>
                {systemStack.length === 0 && (
                  <span className="ai-system-hint">built-in — add blocks to compose</span>
                )}
                {systemStack.map((relPath, index) => {
                  const block = vaultPrompts.find(
                    (candidate) => candidate.relPath === relPath
                  )
                  if (!block) return null
                  return (
                    <span
                      key={relPath}
                      className="ai-system-block"
                      draggable
                      title={`${block.description ?? block.title} · ${scopeLabel(block.scopeFolder, note.relPath)} — drag to reorder`}
                      onDragStart={(event) => {
                        dragIndex.current = index
                        event.dataTransfer.effectAllowed = 'move'
                      }}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => {
                        event.preventDefault()
                        const from = dragIndex.current
                        dragIndex.current = null
                        if (from !== null && from !== index) {
                          setSystemStack((current) => reorderStack(current, from, index))
                        }
                      }}
                    >
                      {index > 0 && <span className="ai-system-sep">›</span>}
                      {block.title}
                      <button
                        type="button"
                        title={`Remove ${block.title} from the stack`}
                        aria-label={`Remove ${block.title}`}
                        onClick={() =>
                          setSystemStack((current) =>
                            current.filter((candidate) => candidate !== relPath)
                          )
                        }
                      >
                        ×
                      </button>
                    </span>
                  )
                })}
                <span className="ai-system-tools">
                  <button
                    type="button"
                    title="Add a system block"
                    aria-label="Add a system block"
                    aria-expanded={stackAddOpen}
                    onClick={() => setStackAddOpen((open) => !open)}
                  >
                    @
                  </button>
                  {systemStack.length > 0 && stackSaveName === null && (
                    <button
                      type="button"
                      title="Save this stack as a prompt file in prompts/"
                      aria-label="Save stack as prompt"
                      onClick={() => setStackSaveName('')}
                    >
                      save
                    </button>
                  )}
                  {stackAddOpen && (
                    <div className="ai-at-menu ai-system-add" role="listbox" aria-label="System blocks">
                      {vaultPrompts
                        .filter(
                          (prompt) =>
                            prompt.kind === 'system' &&
                            !systemStack.includes(prompt.relPath)
                        )
                        .map((prompt) => (
                          <button
                            key={prompt.relPath}
                            type="button"
                            role="option"
                            aria-selected={false}
                            title={prompt.description ?? prompt.relPath}
                            onClick={() => {
                              appendToStack(prompt.relPath)
                              setStackAddOpen(false)
                            }}
                          >
                            {prompt.title}
                            <span className="ai-at-scope">
                              {scopeLabel(prompt.scopeFolder, note.relPath)}
                            </span>
                          </button>
                        ))}
                    </div>
                  )}
                </span>
                {stackSaveName !== null && (
                  <span className="ai-system-save">
                    <input
                      value={stackSaveName}
                      placeholder="stack name…"
                      aria-label="Stack name"
                      onChange={(event) => setStackSaveName(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') void saveStack()
                        if (event.key === 'Escape') setStackSaveName(null)
                      }}
                    />
                    <button
                      type="button"
                      title="Create the prompt file"
                      aria-label="Create the prompt file"
                      onClick={() => void saveStack()}
                    >
                      <CheckIcon />
                    </button>
                  </span>
                )}
              </div>
            )}
            <div className="ai-instruction">
              <textarea
                ref={instructionRef}
                rows={2}
                placeholder="Ask about the selection (or the whole note)… @ inserts a prompt layer"
                aria-label="AI instruction"
                value={instruction}
                onChange={(event) => {
                  setInstruction(event.target.value)
                  syncAtMenu(event.target)
                }}
                onClick={(event) => syncAtMenu(event.currentTarget)}
                onBlur={() => setAtMenu(null)}
                onKeyDown={(event) => {
                  if (!atMenu || atItems.length === 0) return
                  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                    event.preventDefault()
                    const delta = event.key === 'ArrowDown' ? 1 : -1
                    setAtMenu({
                      ...atMenu,
                      index:
                        (atMenu.index + delta + atItems.length) % atItems.length
                    })
                  } else if (event.key === 'Enter' || event.key === 'Tab') {
                    event.preventDefault()
                    pickAtPrompt(atItems[atMenu.index] ?? atItems[0]!)
                  } else if (event.key === 'Escape') {
                    event.stopPropagation()
                    setAtMenu(null)
                  }
                }}
              />
              {atMenu && atItems.length > 0 && (
                <div className="ai-at-menu" role="listbox" aria-label="Prompts">
                  {atItems.map((prompt, index) => (
                    <button
                      key={prompt.relPath}
                      type="button"
                      role="option"
                      aria-selected={index === atMenu.index}
                      className={index === atMenu.index ? 'active' : ''}
                      title={prompt.description ?? prompt.relPath}
                      // mousedown: fire before the textarea blur closes us
                      onMouseDown={(event) => {
                        event.preventDefault()
                        pickAtPrompt(prompt)
                      }}
                    >
                      <span className="ai-at-kind">{prompt.kind}</span>
                      {prompt.title}
                      <span className="ai-at-scope">
                        {scopeLabel(prompt.scopeFolder, note.relPath)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="ai-destination">
              <label>
                <input
                  type="radio"
                  name="ai-dest"
                  checked={destination === 'replace-selection'}
                  disabled={selectionEmpty}
                  onChange={() => setDestination('replace-selection')}
                />
                replace selection
              </label>
              <label>
                <input
                  type="radio"
                  name="ai-dest"
                  checked={destination === 'append'}
                  onChange={() => setDestination('append')}
                />
                append to note
              </label>
              <label>
                <input
                  type="radio"
                  name="ai-dest"
                  checked={destination === 'new-note'}
                  onChange={() => setDestination('new-note')}
                />
                new note
              </label>
              {destination === 'new-note' && (
                <input
                  className="ai-newnote"
                  title="Path from the vault root — prefilled beside this note"
                  value={newNotePath}
                  onChange={(event) => setNewNotePath(event.target.value)}
                />
              )}
            </div>
            <div className="ai-actions">
              {error && <span className="error editor-msg">{error}</span>}
              {phase === 'running' && (
                <button
                  type="button"
                  className="icon-button"
                  title="Cancel this request"
                  aria-label="Cancel"
                  onClick={cancelRun}
                >
                  Cancel
                </button>
              )}
              <button
                type="button"
                className="icon-button"
                disabled={phase === 'running' || instruction.trim().length === 0}
                title={phase === 'running' ? 'Running…' : 'Run'}
                aria-label="Run"
                onClick={() => void run()}
              >
                <PlayIcon /> {phase === 'running' ? 'running…' : 'Run'}
              </button>
            </div>
          </div>
        )}
        {phase === 'review' && bundle && proposalFile && (
          <div className="ai-review">
            {trace && (
              <span
                className="ai-trace-badge"
                title={`trace ${trace.traceId} — one line in .atomik/usage/private/actions.jsonl on decision; contentRecorded=false`}
              >
                {trace.location} · {trace.estimatedExternalCost.currency === 'EUR' ? '€' : ''}
                {trace.estimatedExternalCost.amount} external · {trace.wallMs} ms ·
                ~{trace.estimatedInputTokens}→{trace.estimatedOutputTokens} tok (est)
              </span>
            )}
            {bundle.blocks.map((block) => (
              <article
                key={block.id}
                className={`ai-block markdown-body role-${block.role ?? 'text'}`}
                dangerouslySetInnerHTML={{ __html: md.render(block.content) }}
              />
            ))}
            {bundle.claims.length > 0 && (
              <div className="ai-claims">
                {bundle.claims.map((claim) => (
                  <div
                    key={claim.id}
                    className={`ai-claim${challengedIds.includes(claim.id) ? ' challenged' : ''}`}
                  >
                    <span className={`truth-chip label-${claim.label}`}>
                      {claim.label}
                    </span>
                    <span className="ai-claim-text" title={claim.text}>
                      {claim.text}
                    </span>
                    <span className="ai-claim-actions">
                      {claim.label === 'source-backed' &&
                        claim.evidenceIds.length > 0 && (
                          <button
                            type="button"
                            title="Open the source anchor in the editor"
                            onClick={() => openEvidence(claim)}
                          >
                            source
                          </button>
                        )}
                      {claim.label === 'source-backed' &&
                        onOpenWebUrl &&
                        evidenceUrl(claim) && (
                          <button
                            type="button"
                            title={`Open the live page — ${evidenceUrl(claim)}`}
                            onClick={() => onOpenWebUrl(evidenceUrl(claim)!)}
                          >
                            page <ExternalLinkIcon />
                          </button>
                        )}
                      {!applied && !challengedIds.includes(claim.id) && (
                        <button
                          type="button"
                          title="Challenge: qualify this claim in the patch preview"
                          onClick={() => challenge(claim)}
                        >
                          challenge
                        </button>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <div className="ai-proposal">
              <div className="ai-proposal-head">
                patch → {proposalFile.kind === 'create'
                  ? `create ${proposalFile.relPath}`
                  : proposalFile.kind === 'replace-range'
                    ? 'replace the selection'
                    : 'append to this note'}
                <span className="ai-proposal-hint">
                  {challengedIds.length > 0
                    ? '(repair patch preview — challenged claims qualified below)'
                    : '(editable before accepting)'}
                </span>
              </div>
              <textarea
                rows={6}
                aria-label="Proposed patch (editable)"
                value={editedText}
                onChange={(event) => setEditedText(event.target.value)}
              />
            </div>
            <div className="ai-actions">
              {error && <span className="error editor-msg">{error}</span>}
              {applied && <span className="ai-applied">{applied}</span>}
              <button
                type="button"
                className="icon-button"
                onClick={() => void accept()}
                disabled={!!applied}
                title="Accept — the one moment the note changes"
                aria-label="Accept"
              >
                <CheckIcon /> Accept
              </button>
              <button
                type="button"
                className="icon-button"
                onClick={reject}
                title={applied ? 'Start a new operation' : 'Reject the proposal'}
                aria-label={applied ? 'New operation' : 'Reject'}
              >
                {applied ? 'New operation' : (
                  <>
                    <CloseIcon /> Reject
                  </>
                )}
              </button>
            </div>
          </div>
        )}
        {sentRequest && phase !== 'running' && (
          // Stored per run, shown on HOVER or keyboard focus (owner
          // directive 2026-07-22) — the popover carries the composed
          // request exactly as sent (26).
          <div className="ai-req">
            <span className="ai-req-chip" tabIndex={0}>
              sent request — {sentRequest.destination}
              {sentRequest.selection.wholeNote
                ? ' · whole note'
                : ` · ${sentRequest.selection.from}–${sentRequest.selection.to}`}
              {` · ${sentRequest.selection.chars} chars`}
            </span>
            <div className="ai-req-pop" role="tooltip">
              <button
                type="button"
                className="ai-req-copy"
                title="Copy the full request (system + user) for testing elsewhere"
                onClick={() => {
                  const text = requestAsText(
                    composeSystemPrompt(
                      sentRequest.systemPrompt,
                      sentRequest.destination
                    ),
                    composeUserMessage(sentRequest.instruction, [
                      {
                        content: sentRequest.selection.content,
                        relPath: sentRequest.selection.relPath
                      }
                    ])
                  )
                  navigator.clipboard.writeText(text).then(
                    () => {
                      setRequestCopied(true)
                      setTimeout(() => setRequestCopied(false), 1500)
                    },
                    () => undefined
                  )
                }}
              >
                {requestCopied ? 'copied ✓' : 'copy full request'}
              </button>
              <div className="ai-sent-block">
                <span className="ai-sent-label">
                  system — final, {sentRequest.systemPrompt === null ? 'built-in' : 'stack'}{' '}
                  + grounding rules + destination brief
                </span>
                <pre>
                  {composeSystemPrompt(
                    sentRequest.systemPrompt,
                    sentRequest.destination
                  )}
                </pre>
              </div>
              <div className="ai-sent-block">
                <span className="ai-sent-label">
                  instruction{sentRequest.preset ? ` (${sentRequest.preset})` : ''}
                </span>
                <pre>{sentRequest.instruction}</pre>
              </div>
              <div className="ai-sent-block">
                <span className="ai-sent-label">
                  selection sent{sentRequest.selection.wholeNote ? ' (whole note)' : ''}
                </span>
                <pre>{sentRequest.selection.excerpt}</pre>
              </div>
              <p className="ai-sent-note">
                Composed exactly as sent — layers expanded, stack joined. Main
                adds the grounding rules and the destination brief on top.
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
