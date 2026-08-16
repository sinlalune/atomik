import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  ClaimRecord,
  ContextPacket,
  EvidenceRecord,
  VaultFolder,
  WorkspaceState,
  WorkspaceTab
} from '../../../shared/ipc-contract'
import { applyChatAtPick, chatAtItems, type ChatAtItem } from '../editor/chat-at'
import { parseTreeDrag } from '../vault/NoteTree'
import { TREE_DRAG_MIME } from '../vault/tree-menu'
import {
  compatibleDropEffect,
  parseSelectionDrag,
  SELECTION_DRAG_MIME
} from '../editor/drag-context'
import {
  appendChatTurn,
  chatNotePathForMessage,
  chatRelPath,
  newChatFileContent,
  parseChatTurns,
  serializeRunMeta,
  serializeSentMeta,
  threadFromTurns,
  withSentMetaOnLastYou,
  type ChatTurn
} from '../editor/chat-file'
import {
  composeGenerationParams,
  defaultGenOptionDrafts
} from '../editor/gen-params'
import { GenOptionFieldRows } from '../editor/gen-options'
import { DEFAULT_GENERATION_MODEL } from '../../../shared/generation-params'
import { prepareAiRun } from '../editor/ai-run'
import { copyText } from '../editor/clipboard'
import {
  PART_DESCRIPTIONS,
  requestBreakdown,
  type RequestBreakdown,
  type RequestPartKind
} from '../editor/request-breakdown'
import { SystemPlanSection } from '../editor/SystemPlanSection'
import {
  isDefaultSystemPlan,
  parseSystemPlan,
  serializeSystemPlan,
  systemPlanEntryBody,
  wireSystemPlan
} from '../editor/system-plan'
import type { BuiltinOverrides } from '../../../shared/prompt-composition'
import {
  applyClaimMarks,
  claimTitle,
  findClaimRanges
} from '../editor/claim-highlight'
import {
  atPromptToken,
  loadBuiltinOverridesFor,
  loadPromptsFor,
  type PromptFile
} from '../editor/prompts'
import { linkableNotesOf, sourceBundlesOf } from '../editor/quick-actions'
import { noteMarkdown } from '../editor/note-markdown'
import {
  BookIcon,
  BrainIcon,
  InsertIcon,
  NoteAddIcon,
  PlusIcon,
  PromptIcon,
  SendIcon
} from '../icons'
import {
  resolveAiContext,
  useAiContexts,
  type AiContextEntry
} from './ai-context'
import {
  addChatTotals,
  CHAT_CONTEXTS_MAX,
  chatContextEntryForSelection,
  chatContextsExplicitNone,
  chatContextsOf,
  chatFileOf,
  chatTotalsOf,
  openNoteInNewPane,
  openNoteTabPaths,
  parseChatContextEntry,
  revealNote,
  serializeChatContexts,
  updateTabParams
} from './model'
import { useWorkspace } from './store'
import {
  chatDraftFor,
  chatRunFor,
  registerChatRun,
  setChatDraft,
  type ChatRun
} from './chat-run'
import { CHAT_LOG_A11Y } from './chat-presentation'

/**
 * The chat PANE (CP-MVP-008 S06c, owner redirect: "it should live in
 * its own pane and spawn when needed but survive after the origin pane
 * disappears"). A first-class tab view: its transcript pointer and
 * context pick ride ordinary TAB PARAMS (validated, persisted,
 * relocated like every other view's), so closing any other pane
 * cannot touch it. The CONTEXT is chosen from a picklist of the open
 * note surfaces (the workspace-wide ai-context registry) instead of
 * binding to a pane-mate. Everything else carries over from the
 * column era: multi-turn as `thread` on the operation contract,
 * transcripts as chats/ vault notes born at the first message,
 * insert through the picked editor's buffer + save path, promote to
 * a note opening beside this pane, `@` quoting, shared generation
 * options, and the history menu.
 */

type Dispatch = (operation: (state: WorkspaceState) => WorkspaceState) => void

/** "3 by budget, 1 already open" — the omissions as one readable line
 *  (26 asks for them by reason, not as a dump). */
function summarizeOmissions(
  omitted: readonly { reason: string }[]
): string {
  const counts = new Map<string, number>()
  for (const entry of omitted) {
    counts.set(entry.reason, (counts.get(entry.reason) ?? 0) + 1)
  }
  return [...counts]
    .map(([reason, count]) => `${count} · ${reason}`)
    .join(', ')
}

export type ChatViewProps = {
  tab: WorkspaceTab
  paneId: string
  dispatch: Dispatch
}

/** Session-only metadata of a freshly answered turn (trace decision +
 *  inline claim marks + run metrics); restored transcripts are plain
 *  text again. */
type TurnMeta = {
  bundleId: string
  claims: ClaimRecord[]
  /** S06c17: sourced claims link to their evidence source. */
  evidence: EvidenceRecord[]
  /** S06c16 (owner): tokens in/out + latency, per exchange. */
  usage?: { inputTokens: number; outputTokens: number; basis: string }
  durationMs?: number
  /** S06c19 (owner): the exchange's estimated cost. */
  costUsd?: number
}

/**
 * S06c17 (owner: "generated text highlighted in different color code
 * for the different epistemological status, label status on hover,
 * sourced claims clickable"): the answer renders as markdown, then
 * every located claim wraps in a labeled <mark> — colors carry the
 * label, hover spells it out, source-backed marks open their source.
 */
function ClaimBody({
  text,
  meta,
  onOpenSource
}: {
  text: string
  meta: TurnMeta | undefined
  onOpenSource: (relPath: string) => void
}): React.JSX.Element {
  const ref = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const container = ref.current
    if (!container) return
    container.innerHTML = md.render(text)
    if (!meta || meta.claims.length === 0) return
    const sourceOf = (claim: ClaimRecord): string | null =>
      meta.evidence.find((record) => claim.evidenceIds.includes(record.id))
        ?.source.relPath ?? null
    applyClaimMarks(
      container,
      findClaimRanges(container.textContent ?? '', meta.claims),
      (claim) => claimTitle(claim, sourceOf(claim))
    )
  }, [text, meta])
  return (
    <div
      ref={ref}
      className="markdown-body chat-turn-body"
      onClick={(event) => {
        const mark = (event.target as HTMLElement).closest<HTMLElement>(
          'mark[data-claim-id]'
        )
        if (!mark || !meta) return
        const claim = meta.claims.find(
          (candidate) => candidate.id === mark.dataset['claimId']
        )
        if (!claim || claim.label !== 'source-backed') return
        const source = meta.evidence.find((record) =>
          claim.evidenceIds.includes(record.id)
        )
        if (source) onOpenSource(source.source.relPath)
      }}
    />
  )
}

const md = noteMarkdown()

/** What a send reads: a mounted surface (editable editors first) or a
 *  read-only note loaded on demand — the picklist covers every open
 *  note-bearing TAB, mounted or not (S06c2: only active tabs mount). */
type ChatTarget = {
  notePath: string
  editable: boolean
  getSelection: () => { from: number; to: number; text: string }
  getDoc: () => string
  insert?: ((text: string) => Promise<void>) | undefined
}

export function ChatView({
  tab,
  paneId,
  dispatch
}: ChatViewProps): React.JSX.Element {
  const file = chatFileOf(tab.params)
  // S06c3: MULTIPLE picked contexts — ordered pills, the FIRST is the
  // primary (insert/append target); empty = auto (best open note).
  const ctxList = chatContextsOf(tab.params)
  const contexts = useAiContexts()
  const workspaceState = useWorkspace((store) => store.state)
  // ALL open note-bearing tabs (notes + sources), mounted or not; a
  // mounted editable entry upgrades its path to full capability.
  const openTabs = workspaceState ? openNoteTabPaths(workspaceState) : []
  const optionPaths = [
    ...new Set([
      ...contexts.map((entry) => entry.notePath),
      ...openTabs.map((entry) => entry.notePath)
    ])
  ]
  const autoContext = resolveAiContext(contexts, null)
  // S06c14: '[]' is the explicit NO-CONTEXT pick — auto stays off and
  // the chat answers from the conversation alone
  const noContext = chatContextsExplicitNone(tab.params)
  /** The primary entry a send targets (S06c5: possibly RANGED): the
   *  first pill, else the best mounted entry, else the first open tab
   *  — or nothing at all when the owner dismissed the context. */
  const primary = ctxList[0] ? parseChatContextEntry(ctxList[0]) : null
  const targetPath = noContext
    ? null
    : (primary?.path ?? autoContext?.notePath ?? optionPaths[0] ?? null)
  const primaryRange =
    primary && primary.from !== undefined && primary.to !== undefined
      ? { from: primary.from, to: primary.to }
      : null
  /** Additional context entries (pills past the first, ranges kept). */
  const extraPaths = ctxList.slice(1)
  const targetEditable = contexts.some(
    (entry) => entry.notePath === targetPath && entry.editable
  )

  const [turns, setTurns] = useState<ChatTurn[]>([])
  // the DRAFT survives remounts (S06c6): tab switches must not eat
  // a half-typed question
  const [input, setInputState] = useState(() => chatDraftFor(tab.id))
  const setInput = useCallback(
    (value: string): void => {
      setChatDraft(tab.id, value)
      setInputState(value)
    },
    [tab.id]
  )
  const [error, setError] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const [engine, setEngine] = useState('…')
  const [genDrafts, setGenDrafts] = useState(defaultGenOptionDrafts)
  // CP-MVP-010 S07: vault grounding. Session state like the model
  // drafts beside it — a preference for the next sends, never
  // knowledge (03). `packet` holds what the LAST send actually stood
  // on, or a preview of what the next one would.
  const [grounding, setGrounding] = useState(false)
  const [packet, setPacket] = useState<ContextPacket | null>(null)
  const [packetIsPreview, setPacketIsPreview] = useState(false)
  const [packetOpen, setPacketOpen] = useState(false)
  const [tree, setTree] = useState<VaultFolder | null>(null)
  const [atMenu, setAtMenu] = useState<{
    start: number
    query: string
    index: number
  } | null>(null)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  const promptsRef = useRef<PromptFile[] | null>(null)
  const runningOperationId = useRef<string | null>(null)
  const metaByTurn = useRef(new Map<number, TurnMeta>())
  /** S07b4: sent-request breakdown per YOU-turn (session meta). */
  const breakdownByTurn = useRef(new Map<number, RequestBreakdown>())
  const scrollRef = useRef<HTMLDivElement | null>(null)

  // S07b8: the conversation's arranged SYSTEM — a tab param, so it
  // stays armed for every next message and survives remounts and
  // restarts. Default plan = absent param = the pre-plan bytes.
  const sysPlan = parseSystemPlan(tab.params?.['sys'], 'chat')
  const sysPlanRef = useRef(sysPlan)
  sysPlanRef.current = sysPlan
  /** S07b8c: ONE dynamic panel above the card at a time — each footer
   *  pill (context / system / model) toggles its own. */
  const [openPanel, setOpenPanel] = useState<
    'context' | 'system' | 'model' | null
  >(null)
  const [sysPrompts, setSysPrompts] = useState<PromptFile[] | null>(null)
  const [sysBuiltins, setSysBuiltins] = useState<BuiltinOverrides>({})
  /** S07b8c: live context sizes (chars) per path — mounted surfaces
   *  read free, unmounted notes read once and cache; the chips and
   *  the intent preview both consume this, so context counts like
   *  every other part. */
  const [ctxSizes, setCtxSizes] = useState<Record<string, number>>({})
  // S07b8b: the section AND the pre-send preview need the live bodies —
  // loaded once at mount (the @ menu's lazy tree covers reloads).
  useEffect(() => {
    let live = true
    loadPromptsFor(targetPathRef.current ?? '', window.atomik).then(
      (loaded) => {
        if (live) setSysPrompts(loaded)
      },
      () => {
        if (live) setSysPrompts([])
      }
    )
    loadBuiltinOverridesFor(targetPathRef.current ?? '', window.atomik).then(
      (loaded) => {
        if (live) setSysBuiltins(loaded)
      },
      () => undefined
    )
    return () => {
      live = false
    }
  }, [])

  // Context sizes: mounted surfaces measure free every render;
  // unmounted paths read once (cached until the path set changes).
  const ctxPaths = [
    ...new Set(
      [
        ...(targetPath !== null ? [targetPath] : []),
        ...ctxList.map((entry) => parseChatContextEntry(entry).path)
      ].filter(Boolean)
    )
  ]
  const ctxPathsKey = ctxPaths.join('\n')
  useEffect(() => {
    let live = true
    for (const path of ctxPathsKey.split('\n').filter(Boolean)) {
      const mounted = contextsRef.current
        .filter((candidate) => candidate.notePath === path)
        .at(-1)
      if (mounted) {
        const size = mounted.getDoc().length
        setCtxSizes((current) =>
          current[path] === size ? current : { ...current, [path]: size }
        )
      } else {
        window.atomik.readNote(path).then(
          (note) => {
            if (live)
              setCtxSizes((current) =>
                current[path] === note.content.length
                  ? current
                  : { ...current, [path]: note.content.length }
              )
          },
          () => undefined
        )
      }
    }
    return () => {
      live = false
    }
  }, [ctxPathsKey])

  const patchParams = useCallback(
    (patch: Record<string, string>) =>
      dispatch((state) => updateTabParams(state, tab.id, patch)),
    [dispatch, tab.id]
  )

  // The live file path: the answer's append must see the file the
  // question just created — the prop only catches up on re-render.
  const fileRef = useRef<string | null>(file)
  useEffect(() => {
    fileRef.current = file
  }, [file])

  useEffect(() => {
    window.atomik.getAiSettings().then(
      (settings) => setEngine(settings.generationEngine),
      () => setEngine('mock')
    )
  }, [])

  // One vault tree for the history menu and the @ providers; prompts
  // re-resolve on vault changes too (edit → use).
  useEffect(() => {
    let live = true
    const reload = (): void => {
      window.atomik.listVaultFiles().then(
        (loaded) => {
          if (live) setTree(loaded)
        },
        () => undefined
      )
      promptsRef.current = null
    }
    reload()
    const unsubscribe = window.atomik.onVaultFilesChanged(reload)
    return () => {
      live = false
      unsubscribe()
    }
  }, [])

  // The transcript is a NOTE: (re)opening the pane loads whatever the
  // file says now — hand edits included. A file THIS session just
  // created is already in local state — the guard keeps the prop echo
  // from racing the in-flight answer (persistTurn claims loadedRef
  // BEFORE patching the param, and that run early-returns here without
  // arming a cleanup, so the claim sticks). A failed read KEEPS the
  // pointer (S06b: a transient failure must not wipe the chat) and
  // says so.
  const loadedRef = useRef<string | null>(null)
  useEffect(() => {
    if (file === loadedRef.current) return
    loadedRef.current = file
    metaByTurn.current.clear()
    breakdownByTurn.current.clear()
    if (!file) {
      setTurns([])
      return
    }
    let live = true
    window.atomik.readNote(file).then(
      (note) => {
        if (live) {
          setTurns(parseChatTurns(note.content))
          setError(null)
        }
      },
      () => {
        if (live) {
          setTurns([])
          setError(
            `couldn't read ${file} — it may have been moved or deleted; + starts a new chat`
          )
        }
      }
    )
    return () => {
      live = false
      // S06c10: dev StrictMode runs setup→cleanup→setup on every
      // mount. Cleanup killed this read via `live`, and the ref then
      // told setup #2 the file was already loaded — so NO read ever
      // landed and every tab switch remounted into an empty chat
      // (dev-only: production ran setup once and never saw it).
      // Surrendering the claim makes the next setup read again.
      loadedRef.current = null
    }
    // reload on file change only — sends update local state themselves
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file])

  // S06c6: ADOPT an in-flight run on mount — with real provider
  // latency a tab switch used to orphan it (answer landing invisibly
  // in the file: no indicator, no refresh, no error surfaced).
  useEffect(() => {
    const inflight = chatRunFor(tab.id)
    if (!inflight) return
    setRunning(true)
    runningOperationId.current = inflight.operationId
    let live = true
    void inflight.done.then(() => {
      if (!live) return
      setRunning(false)
      runningOperationId.current = null
      if (inflight.error) setError(inflight.error)
      const current = fileRef.current
      if (current) {
        window.atomik.readNote(current).then(
          (note) => {
            if (live) setTurns(parseChatTurns(note.content))
          },
          () => undefined
        )
      }
    })
    return () => {
      live = false
    }
  }, [tab.id])

  // keep the latest exchange in view
  useEffect(() => {
    const scroller = scrollRef.current
    if (scroller) scroller.scrollTop = scroller.scrollHeight
  }, [turns, running])

  /** Appends one turn to the transcript through the ordinary note
   *  verbs (fresh read → write with the mtime handshake); returns the
   *  file path, creating `chats/…` at the FIRST message. */
  const persistTurn = useCallback(
    async (
      role: 'you' | 'atomik',
      text: string,
      youMeta?: string,
      ownMeta?: string
    ): Promise<string> => {
      const existing = fileRef.current
      if (existing) {
        const note = await window.atomik.readNote(existing)
        // S07b10: the answer's write also stamps the you-turn's sent
        // breakdown onto its heading — one write persists both;
        // S07b16: the answer's OWN metrics ride its own heading
        const base = youMeta
          ? withSentMetaOnLastYou(note.content, youMeta)
          : note.content
        await window.atomik.writeNote(
          existing,
          appendChatTurn(base, role, text, ownMeta),
          note.mtimeMs
        )
        return existing
      }
      const now = new Date()
      let lastError: unknown = null
      for (let attempt = 1; attempt <= 9; attempt += 1) {
        const relPath = chatRelPath(now, text, attempt)
        try {
          await window.atomik.createNote(
            relPath,
            newChatFileContent(engine, now, text)
          )
          fileRef.current = relPath
          loadedRef.current = relPath
          patchParams({ file: relPath })
          return relPath
        } catch (reason) {
          lastError = reason // taken name — try the next suffix
        }
      }
      throw lastError
    },
    [engine, patchParams]
  )

  /** Live snapshots for the async send path (render values go stale
   *  inside awaited closures). */
  const contextsRef = useRef<readonly AiContextEntry[]>(contexts)
  contextsRef.current = contexts
  const targetPathRef = useRef<string | null>(targetPath)
  targetPathRef.current = targetPath
  const primaryRangeRef = useRef<{ from: number; to: number } | null>(primaryRange)
  primaryRangeRef.current = primaryRange
  const extraPathsRef = useRef<string[]>(extraPaths)
  extraPathsRef.current = extraPaths
  const ctxListRef = useRef<string[]>(ctxList)
  ctxListRef.current = ctxList

  /** Resolves the send target NOW: a mounted surface for the picked
   *  path (editable mount wins), else the note read from disk as a
   *  read-only whole-note context. */
  const resolveTarget = useCallback(async (): Promise<ChatTarget | null> => {
    const path = targetPathRef.current
    if (!path) return null
    // a RANGED primary (dragged selection) pins the selection to its
    // slice of the doc — range-anchored, source-backed checkable
    const rangedSelection = (
      getDoc: () => string
    ): (() => { from: number; to: number; text: string }) | null => {
      const range = primaryRangeRef.current
      if (!range) return null
      return () => {
        const doc = getDoc()
        const from = Math.min(range.from, doc.length)
        const to = Math.min(range.to, doc.length)
        return { from, to, text: doc.slice(from, to) }
      }
    }
    const mounted = contextsRef.current.filter(
      (entry) => entry.notePath === path
    )
    const best = mounted.filter((entry) => entry.editable).at(-1) ?? mounted.at(-1)
    if (best) {
      return {
        notePath: best.notePath,
        editable: best.editable,
        getSelection: rangedSelection(best.getDoc) ?? best.getSelection,
        getDoc: best.getDoc,
        insert: best.insert
      }
    }
    try {
      const note = await window.atomik.readNote(path)
      const getDoc = (): string => note.content
      return {
        notePath: path,
        editable: false,
        getSelection:
          rangedSelection(getDoc) ?? (() => ({ from: 0, to: 0, text: '' })),
        getDoc
      }
    } catch {
      return null
    }
  }, [])

  /** The context note's resolved prompts, cached until the vault
   *  changes — the @ menu and every send expand against the same
   *  scopes. */
  const loadPrompts = useCallback(async (): Promise<PromptFile[]> => {
    if (promptsRef.current) return promptsRef.current
    const notePath = targetPathRef.current ?? ''
    const loaded = await loadPromptsFor(notePath, window.atomik).catch(
      () => [] as PromptFile[]
    )
    promptsRef.current = loaded
    return loaded
  }, [])

  /** One exchange, registered in the session run map so a remounting
   *  view can ADOPT it (S06c6). `alreadyPersisted` = retry of a
   *  you-turn that is already in the transcript (503 and friends —
   *  the question is never retyped, never re-appended). */
  const runExchange = useCallback(
    async (text: string, alreadyPersisted: boolean): Promise<void> => {
      if (text.length === 0 || running) return
      setError(null)
      try {
        // S06c14: no picked/auto context = a CONTEXTLESS chat — the
        // transcript note anchors the operation (it exists by send
        // time: the you-turn persists before the call) and the thread
        // alone carries the conversation. A PICKED context that fails
        // to resolve still errors instead of silently dropping.
        const wantsContext = targetPathRef.current !== null
        const target = await resolveTarget()
        if (wantsContext && !target) {
          setError('The picked context could not be read — it may have been moved or deleted.')
          return
        }
        let persisted = alreadyPersisted
        if (!target && !persisted) {
          await persistTurn('you', text)
          setTurns((current) => [...current, { role: 'you', text }])
          setInput('')
          setAtMenu(null)
          persisted = true
        }
        const anchorPath = target?.notePath ?? fileRef.current
        if (!anchorPath) return
        const prompts = await loadPrompts()
        const builtins = await loadBuiltinOverridesFor(
          anchorPath,
          window.atomik
        ).catch(() => ({}))
        const params = composeGenerationParams(genDrafts)
        const prepared = await prepareAiRun(
          {
            noteRelPath: anchorPath,
            doc: target ? target.getDoc() : '',
            selection: target
              ? target.getSelection()
              : { from: 0, to: 0, text: '' },
            instruction: text,
            systemStack: [],
            // S07b8: the conversation's arranged system rides every send
            systemPlan: wireSystemPlan(sysPlanRef.current, prompts),
            // S07b12: a chat composes the CONVERSATION contract
            mode: 'chat',
            prompts,
            builtins,
            destination: 'append',
            newNotePath: '',
            ...(params ? { params } : {})
          },
          window.atomik.readNote
        )
        if (!prepared) return
        // extra context pills ride as additional selections (S06c3) —
        // quotable by the checker like linked notes; the operation's
        // 8-selection cap holds
        const EXTRA_CAP = 6000
        const extraSelections = []
        for (const entry of extraPathsRef.current) {
          try {
            const parsed = parseChatContextEntry(entry)
            const mounted = contextsRef.current
              .filter((candidate) => candidate.notePath === parsed.path)
              .at(-1)
            const doc = mounted
              ? mounted.getDoc()
              : (await window.atomik.readNote(parsed.path)).content
            // ranged entries quote their slice; plain ones the note head
            const start =
              parsed.from !== undefined ? Math.min(parsed.from, doc.length) : 0
            const end =
              parsed.to !== undefined ? Math.min(parsed.to, doc.length) : doc.length
            const content = doc.slice(start, end).slice(0, EXTRA_CAP)
            extraSelections.push({
              relPath: parsed.path,
              kind: 'text' as const,
              content,
              range: { from: start, to: start + content.length }
            })
          } catch {
            /* a stale pill must not block the send */
          }
        }
        const input = [...prepared.operation.input, ...extraSelections].slice(0, 8)
        // a retry replays the trailing you-turn as the LIVE turn, not history
        const priorTurns = alreadyPersisted ? turns.slice(0, -1) : turns
        const thread = threadFromTurns(priorTurns)
        const operation = {
          ...prepared.operation,
          input,
          ...(thread.length > 0 ? { thread } : {}),
          // The renderer ASKS; main decides what the packet contains
          // and returns it on the bundle (S07).
          ...(grounding ? { grounding: {} } : {})
        }
        // S07b4 (owner): the sent request, RETRACED — per-part pills
        // with token estimates ride the you-turn (session meta, like
        // claims; a restored transcript is plain text again)
        breakdownByTurn.current.set(priorTurns.length, requestBreakdown(operation))

        if (!persisted) {
          // The user's turn lands in the file BEFORE the call — a
          // cancelled or failed run keeps what was asked.
          await persistTurn('you', text)
          setTurns((current) => [...current, { role: 'you', text }])
          setInput('')
          setAtMenu(null)
        }

        setRunning(true)
        runningOperationId.current = operation.id
        // the exchange itself is a REGISTERED run: it finishes into the
        // transcript whether or not this view stays mounted
        const run: ChatRun = {
          operationId: operation.id,
          error: null,
          done: Promise.resolve()
        }
        run.done = (async () => {
          try {
            const result = await window.atomik.runAiOperation(operation)
            if (result.contextPacket) {
              setPacket(result.contextPacket)
              setPacketIsPreview(false)
            }
            const answer =
              result.blocks.find((block) => block.role === 'answer')?.content ??
              result.blocks[0]?.content ??
              ''
            // S07b10: the you-turn's breakdown persists with the answer;
            // S07b16: so do the answer's own measured metrics
            const sentParts = breakdownByTurn.current.get(priorTurns.length)?.parts
            const runMeta = serializeRunMeta({
              ...(result.usage
                ? {
                    inputTokens: result.usage.inputTokens,
                    outputTokens: result.usage.outputTokens,
                    basis: result.usage.basis
                  }
                : {}),
              ...(result.durationMs !== undefined
                ? { durationMs: result.durationMs }
                : {}),
              ...(result.billing
                ? { costUsd: result.billing.estimatedAmount }
                : {})
            })
            await persistTurn(
              'atomik',
              answer,
              sentParts ? serializeSentMeta(sentParts) : undefined,
              runMeta ?? undefined
            )
            setTurns((current) => {
              metaByTurn.current.set(current.length, {
                bundleId: result.id,
                claims: result.claims,
                evidence: result.evidence,
                ...(result.usage ? { usage: result.usage } : {}),
                ...(result.durationMs !== undefined
                  ? { durationMs: result.durationMs }
                  : {}),
                ...(result.billing
                  ? { costUsd: result.billing.estimatedAmount }
                  : {})
              })
              return [...current, { role: 'atomik', text: answer }]
            })
            // S06c19: the conversation's RUNNING totals ride the tab
            // params — incremented per exchange, persisted with it
            if (result.usage || result.billing) {
              dispatch((state) =>
                addChatTotals(state, tab.id, {
                  inputTokens: result.usage?.inputTokens ?? 0,
                  outputTokens: result.usage?.outputTokens ?? 0,
                  costUsd: result.billing?.estimatedAmount ?? 0
                })
              )
            }
          } catch (reason) {
            run.error = String(reason)
            setError(String(reason))
          }
        })()
        registerChatRun(tab.id, run)
        await run.done
      } catch (reason) {
        setError(String(reason))
      } finally {
        setRunning(false)
        runningOperationId.current = null
      }
    },
    [
      genDrafts,
      grounding,
      loadPrompts,
      persistTurn,
      resolveTarget,
      running,
      setInput,
      tab.id,
      turns
    ]
  )

  const send = useCallback(
    (): Promise<void> => runExchange(input.trim(), false),
    [input, runExchange]
  )

  /** 503 and friends: the question is already in the transcript — one
   *  click asks again, nothing retyped, nothing duplicated. */
  const lastTurnIsYou = turns.at(-1)?.role === 'you'
  const retry = useCallback((): Promise<void> => {
    const last = turns.at(-1)
    if (!last || last.role !== 'you') return Promise.resolve()
    return runExchange(last.text, true)
  }, [runExchange, turns])

  const cancel = useCallback(() => {
    const id = runningOperationId.current
    if (id) void window.atomik.cancelAiOperation(id).catch(() => undefined)
  }, [])

  /** Into the picked context's note through the SAME patch flow (06):
   *  its editor applies + saves; inserting IS the accept decision. */
  const insert = useCallback(
    async (index: number, text: string): Promise<void> => {
      const target = await resolveTarget()
      if (!target?.insert) {
        setError('The picked context is not an open editor — switch it to live or source mode to insert.')
        return
      }
      setError(null)
      try {
        await target.insert(text)
        const meta = metaByTurn.current.get(index)
        if (meta) {
          window.atomik
            .resolveAiTrace(meta.bundleId, 'accepted')
            .catch(() => undefined)
        }
      } catch (reason) {
        setError(String(reason))
      }
    },
    [resolveTarget]
  )

  /** S06b: an answer becomes its OWN note and opens BESIDE this pane. */
  const createNote = useCallback(
    async (index: number, text: string): Promise<void> => {
      const basePath = targetPathRef.current ?? 'note.md'
      setError(null)
      try {
        const relPath = chatNotePathForMessage(basePath, text)
        await window.atomik.createNote(relPath, `${text.trim()}\n`)
        const meta = metaByTurn.current.get(index)
        if (meta) {
          window.atomik
            .resolveAiTrace(meta.bundleId, 'accepted')
            .catch(() => undefined)
        }
        dispatch((state) =>
          openNoteInNewPane(state, paneId, relPath, { kind: 'vault' })
        )
      } catch (reason) {
        setError(String(reason))
      }
    },
    [dispatch, paneId]
  )

  /** Adds paths as context pills (dedup, capped) — the "+" button and
   *  tree drops share this door. */
  const addContexts = useCallback(
    (paths: string[]): void => {
      const current = ctxListRef.current
      const fresh = paths.filter(
        (path) => path.length > 0 && !current.includes(path)
      )
      if (fresh.length === 0) return
      const next = [...current, ...fresh]
      if (next.length > CHAT_CONTEXTS_MAX) {
        setError(`context is capped at ${CHAT_CONTEXTS_MAX} notes — remove one first`)
      }
      patchParams({ ctx: serializeChatContexts(next) })
    },
    [patchParams]
  )

  const removeContext = useCallback(
    (path: string): void => {
      patchParams({
        ctx: serializeChatContexts(
          ctxListRef.current.filter((candidate) => candidate !== path)
        )
      })
    },
    [patchParams]
  )

  // S06c3: the tree's existing drag payload drops INTO the chat as
  // context — a note/source/prompt adds itself, a folder adds its
  // notes (recursive, up to the cap).
  const [dropHover, setDropHover] = useState(false)
  const onTreeDrop = useCallback(
    (event: React.DragEvent): void => {
      const types = event.dataTransfer.types
      if (
        !types.includes(TREE_DRAG_MIME) &&
        !types.includes(SELECTION_DRAG_MIME)
      ) {
        return
      }
      event.preventDefault()
      setDropHover(false)
      // a dragged EDITOR SELECTION lands as a RANGED pill (S06c5)
      const selection = parseSelectionDrag(
        event.dataTransfer.getData(SELECTION_DRAG_MIME)
      )
      if (selection) {
        addContexts([
          chatContextEntryForSelection(
            selection.relPath,
            selection.from,
            selection.to
          )
        ])
        return
      }
      const source = parseTreeDrag(event.dataTransfer.getData(TREE_DRAG_MIME))
      if (!source) return
      if (source.kind === 'note') {
        addContexts([source.relPath])
        return
      }
      // folder: every note under it, tree order
      const collected: string[] = []
      const walk = (folder: VaultFolder): void => {
        for (const note of folder.notes) collected.push(note.relPath)
        for (const child of folder.folders) walk(child)
      }
      const find = (folder: VaultFolder): VaultFolder | null => {
        if (folder.relPath === source.relPath) return folder
        for (const child of folder.folders) {
          const found = find(child)
          if (found) return found
        }
        return null
      }
      const folder = tree ? find(tree) : null
      if (folder) {
        walk(folder)
        addContexts(collected)
      }
    },
    [addContexts, tree]
  )

  /** Open notes not yet in the context — the context sheet's rows. */
  const candidatePaths = optionPaths.filter((path) => !ctxList.includes(path))

  // ----- @ quick actions in the input ---------------------------------

  const [atPrompts, setAtPrompts] = useState<PromptFile[]>([])
  const syncAtMenu = useCallback(
    (element: HTMLTextAreaElement) => {
      const token =
        element.selectionStart === element.selectionEnd
          ? atPromptToken(element.value, element.selectionStart)
          : null
      setAtMenu((current) =>
        token
          ? { ...token, index: current?.start === token.start ? current.index : 0 }
          : null
      )
      if (token && promptsRef.current === null) {
        void loadPrompts().then(setAtPrompts)
      } else if (token && promptsRef.current) {
        setAtPrompts(promptsRef.current)
      }
    },
    [loadPrompts]
  )

  const contextNotePath = targetPath
  const atItems: ChatAtItem[] = atMenu
    ? chatAtItems(
        atPrompts,
        tree ? linkableNotesOf(tree, contextNotePath ?? '') : [],
        tree ? sourceBundlesOf(tree) : [],
        atMenu.query
      )
    : []

  const pickAtItem = useCallback(
    (item: ChatAtItem) => {
      const element = inputRef.current
      if (!element || !atMenu) return
      const next = applyChatAtPick(
        element.value,
        atMenu.start,
        element.selectionStart,
        item,
        contextNotePath
      )
      setInput(next.text)
      setAtMenu(null)
      requestAnimationFrame(() => {
        element.focus()
        element.setSelectionRange(next.caret, next.caret)
      })
    },
    [atMenu, contextNotePath]
  )

  // S06c19: the conversation's running totals (persisted tab params)
  const totals = chatTotalsOf(tab.params)
  const hasTotals =
    totals.inputTokens > 0 || totals.outputTokens > 0 || totals.costUsd > 0

  const title = file
    ? (file.split('/').pop() ?? file).replace(/\.md$/i, '')
    : 'New chat'

  return (
    <div
      className={`chat-view${dropHover ? ' drop-target' : ''}`}
      aria-label="Chat pane"
      onDragOver={(event) => {
        const types = event.dataTransfer.types
        if (
          types.includes(TREE_DRAG_MIME) ||
          types.includes(SELECTION_DRAG_MIME)
        ) {
          event.preventDefault()
          // the S06c5 land fix: the answered dropEffect must be one
          // the SOURCE allows (tree = 'move', tabs = 'copy', CM
          // selections = 'copyMove') or Chromium refuses the drop
          event.dataTransfer.dropEffect = compatibleDropEffect(
            event.dataTransfer.effectAllowed
          )
          setDropHover(true)
        }
      }}
      onDragLeave={(event) => {
        if (event.currentTarget === event.target) setDropHover(false)
      }}
      onDrop={onTreeDrop}
    >
      {/* S07b8c: the bar carries only CONVERSATION-level chrome —
          history and running totals; everything about the NEXT
          message lives in the composer card below. */}
      {hasTotals && (
        <div className="tree-bar chat-bar">
          <span
            className="chat-totals"
            title={`this conversation so far: input ${totals.inputTokens} tokens · output ${totals.outputTokens} tokens · estimated $${totals.costUsd.toFixed(6)}`}
          >
            Σ ↑{totals.inputTokens} ↓{totals.outputTokens} · ~$
            {totals.costUsd.toFixed(4)}
          </span>
        </div>
      )}
      <div
        className="chat-scroll"
        ref={scrollRef}
        {...CHAT_LOG_A11Y}
        aria-busy={running}
      >
        <p className="chat-title" title={file ?? undefined}>
          {title}
        </p>
        {turns.length === 0 && !running && !error && (
          <p className="chat-hint">
            Ask about the picked context note — @ quotes prompts, notes,
            and sources. The transcript becomes an ordinary note in
            chats/ at your first message.
          </p>
        )}
        {turns.map((turn, index) => {
          const meta = metaByTurn.current.get(index)
          // S07b10: this session's send has the LIVE record (incl. the
          // copyable request text); a restored transcript rebuilds the
          // pills from the heading's persisted figures.
          const live =
            turn.role === 'you' ? breakdownByTurn.current.get(index) : undefined
          const est = (chars: number): number =>
            chars === 0 ? 0 : Math.max(1, Math.ceil(chars / 4))
          const sentParts =
            live?.parts ??
            (turn.role === 'you' && turn.sent
              ? turn.sent
                  .filter((part) => part.chars > 0)
                  .map((part) => ({ ...part, tokensEst: est(part.chars) }))
              : undefined)
          const sentTotal =
            live?.totalTokensEst ??
            sentParts?.reduce((sum, part) => sum + part.tokensEst, 0)
          return (
            <article key={index} className={`chat-turn role-${turn.role}`}>
              <header className="chat-turn-head">
                <span className="chat-turn-role">{turn.role}</span>
                {sentTotal !== undefined && (
                  <span
                    className="chat-turn-metrics"
                    title="what this exchange sent, estimated at chars/4 — the pills below retrace it"
                  >
                    ↑~{sentTotal} tok sent
                  </span>
                )}
                {(() => {
                  // S07b16: live meta first, else the transcript's
                  // persisted run figures — reloads keep the counters
                  const run = meta
                    ? {
                        inputTokens: meta.usage?.inputTokens,
                        outputTokens: meta.usage?.outputTokens,
                        basis: meta.usage?.basis,
                        durationMs: meta.durationMs,
                        costUsd: meta.costUsd
                      }
                    : turn.run
                  if (
                    !run ||
                    (run.durationMs === undefined &&
                      run.inputTokens === undefined)
                  ) {
                    return null
                  }
                  const hasTok = run.inputTokens !== undefined
                  return (
                    <span
                      className="chat-turn-metrics"
                      title={
                        hasTok
                          ? `input ${run.inputTokens} tokens · output ${run.outputTokens} tokens (${run.basis ?? 'reported'}) · ${((run.durationMs ?? 0) / 1000).toFixed(1)}s wall time${run.costUsd !== undefined ? ` · estimated $${run.costUsd.toFixed(6)}` : ''}`
                          : `${((run.durationMs ?? 0) / 1000).toFixed(1)}s wall time — this engine reports no token usage`
                      }
                    >
                      {run.durationMs !== undefined
                        ? `${(run.durationMs / 1000).toFixed(1)}s`
                        : ''}
                      {hasTok
                        ? ` · ↑${run.inputTokens} ↓${run.outputTokens} tok${run.basis === 'estimated' ? '~' : ''}`
                        : ''}
                      {run.costUsd !== undefined
                        ? ` · ~$${run.costUsd.toFixed(4)}`
                        : ''}
                    </span>
                  )
                })()}
                {turn.role === 'atomik' && (
                  <span className="chat-turn-actions">
                    <button
                      type="button"
                      className="icon-button chat-insert"
                      title="Insert this answer into the context note at the cursor"
                      aria-label="Insert into note"
                      onClick={() => void insert(index, turn.text)}
                    >
                      <InsertIcon />
                    </button>
                    <button
                      type="button"
                      className="icon-button chat-note"
                      title="Create a note from this answer — opens beside this pane"
                      aria-label="Create a note from this answer"
                      onClick={() => void createNote(index, turn.text)}
                    >
                      <NoteAddIcon />
                    </button>
                  </span>
                )}
              </header>
              <ClaimBody
                text={turn.text}
                meta={meta}
                onOpenSource={(relPath) =>
                  dispatch((state) => revealNote(state, paneId, relPath))
                }
              />
              {sentParts && (
                <div className="chat-request-pills">
                  {sentParts.map((part, partIndex) => (
                    <span
                      key={partIndex}
                      className={`chat-request-pill kind-${part.kind}`}
                      title={`${PART_DESCRIPTIONS[part.kind as RequestPartKind] ?? part.kind} · ${part.chars} chars · ~${part.tokensEst} tokens (estimated)`}
                    >
                      {part.label} <b>~{part.tokensEst}</b>
                    </span>
                  ))}
                  {live && (
                    // the full text exists only for THIS session's
                    // sends — figures persist, prompts never do
                    <button
                      type="button"
                      className="chat-request-copy"
                      title="Copy the full request (system + user) exactly as sent"
                      aria-label="Copy the full request"
                      onClick={() => {
                        void copyText(live.requestText)
                      }}
                    >
                      copy request
                    </button>
                  )}
                </div>
              )}
            </article>
          )
        })}
        {running && (
          <article
            className="chat-turn role-atomik chat-running"
            aria-label="Atomik is thinking"
          >
            <span>thinking…</span>
            <button
              type="button"
              className="icon-button"
              title="Cancel this request"
              aria-label="Cancel"
              onClick={cancel}
            >
              Cancel
            </button>
          </article>
        )}
      </div>
      <div className="chat-compose">
        {error && (
          <p className="error chat-error">
            {error}
            {lastTurnIsYou && !running && (
              <button
                type="button"
                className="chat-retry"
                title="Ask again — the question is already in the transcript"
                onClick={() => void retry()}
              >
                retry
              </button>
            )}
          </p>
        )}
        {openPanel === 'context' && (
          <div className="chat-sheet" role="group" aria-label="Context of the next message">
            <button
              type="button"
              className="chat-sheet-close"
              title="Close"
              aria-label="Close this panel"
              onClick={() => setOpenPanel(null)}
            >
              ×
            </button>
            {candidatePaths.length === 0 && (
              <p className="chat-pop-empty">
                {optionPaths.length === 0
                  ? 'no open note to add — open one from the tree'
                  : 'every open note is already in the context'}
              </p>
            )}
            {candidatePaths.map((notePath) => (
              <button
                key={notePath}
                type="button"
                className="chat-sheet-row"
                title={`Add ${notePath} to the context`}
                onClick={() => addContexts([notePath])}
              >
                <PlusIcon /> {notePath}
                {contexts.some(
                  (entry) => entry.notePath === notePath && entry.editable
                )
                  ? ''
                  : ' — read-only'}
              </button>
            ))}
            {!noContext && (
              <button
                type="button"
                className="chat-sheet-row"
                title="Chat without context — the conversation alone carries the exchange"
                onClick={() => patchParams({ ctx: serializeChatContexts([]) })}
              >
                × no context
              </button>
            )}
            {(noContext || ctxList.length > 0) && (
              <button
                type="button"
                className="chat-sheet-row"
                title="Back to auto — the best open note serves as context"
                onClick={() => patchParams({ ctx: '' })}
              >
                ↺ auto context
              </button>
            )}
          </div>
        )}
        {openPanel === 'system' && (
          <div className="chat-sheet">
            <button
              type="button"
              className="chat-sheet-close"
              title="Close"
              aria-label="Close this panel"
              onClick={() => setOpenPanel(null)}
            >
              ×
            </button>
            <SystemPlanSection
              plan={sysPlan}
              onChange={(next) =>
                patchParams({
                  sys: isDefaultSystemPlan(next, 'chat')
                    ? ''
                    : serializeSystemPlan(next)
                })
              }
              destination="append"
              builtins={sysBuiltins}
              prompts={sysPrompts ?? []}
              variant="chat"
              onOpenFile={(relPath) =>
                dispatch((state) => revealNote(state, paneId, relPath))
              }
            />
          </div>
        )}
        {openPanel === 'model' && (
          <div className="chat-sheet" role="group" aria-label="Model and sampling options">
            <button
              type="button"
              className="chat-sheet-close"
              title="Close"
              aria-label="Close this panel"
              onClick={() => setOpenPanel(null)}
            >
              ×
            </button>
            <GenOptionFieldRows drafts={genDrafts} onChange={setGenDrafts} />
          </div>
        )}
        <div className="chat-card">
          <div className="chat-card-chips">
            {ctxList.length === 0 && !noContext && targetPath !== null && (
              <span
                className="chat-context-pill auto"
                title={`No pick — the best open note serves as context: ${targetPath}${targetEditable ? '' : ' (read-only)'}${ctxSizes[targetPath] !== undefined ? ` · ~${Math.ceil(ctxSizes[targetPath]! / 4)} tok` : ''}`}
              >
                auto · {targetPath.split('/').pop()?.replace(/\.md$/i, '')}
                {ctxSizes[targetPath] !== undefined && (
                  <b>~{Math.ceil(ctxSizes[targetPath]! / 4)}</b>
                )}
                <button
                  type="button"
                  title="Chat without context — keep the workspace, drop the auto-loaded note"
                  aria-label="Remove the auto context"
                  onClick={() => patchParams({ ctx: serializeChatContexts([]) })}
                >
                  ×
                </button>
              </span>
            )}
            {noContext && (
              <span
                className="chat-context-pill auto"
                title="No context — the chat answers from the conversation alone"
              >
                no context
                <button
                  type="button"
                  title="Back to auto — the best open note serves as context again"
                  aria-label="Restore the auto context"
                  onClick={() => patchParams({ ctx: '' })}
                >
                  ↺
                </button>
              </span>
            )}
            {ctxList.map((entry, index) => {
              const parsed = parseChatContextEntry(entry)
              const name =
                parsed.path.split('/').pop()?.replace(/\.md$/i, '') ?? parsed.path
              const chars =
                parsed.from !== undefined && parsed.to !== undefined
                  ? parsed.to - parsed.from
                  : ctxSizes[parsed.path]
              return (
                <span
                  key={entry}
                  className="chat-context-pill"
                  title={`${index === 0 ? `${entry} — primary (insert/append target)` : entry}${chars !== undefined ? ` · ~${Math.ceil(chars / 4)} tok` : ''}`}
                >
                  {index === 0 ? '◉ ' : ''}
                  {name}
                  {parsed.from !== undefined ? ` · ${parsed.from}–${parsed.to}` : ''}
                  {chars !== undefined && <b>~{Math.ceil(chars / 4)}</b>}
                  <button
                    type="button"
                    title={`Remove ${entry} from the context`}
                    aria-label={`Remove ${entry} from the context`}
                    onClick={() => removeContext(entry)}
                  >
                    ×
                  </button>
                </span>
              )
            })}
            <button
              type="button"
              className="chat-tool chat-ctx-add"
              title="Add open notes to the context of the next message"
              aria-label="Add context"
              aria-expanded={openPanel === 'context'}
              onClick={() =>
                setOpenPanel((open) => (open === 'context' ? null : 'context'))
              }
            >
              + context
            </button>
            {targetPath !== null && !targetEditable && ctxList.length > 0 && (
              <span className="chat-context-hint">
                primary read-only — insert needs an editor
              </span>
            )}
          </div>
          <span className="chat-input-host">
            <textarea
              ref={inputRef}
              rows={4}
              value={input}
              placeholder="Ask about the context note… @ quotes, Enter sends, Shift+Enter breaks"
              aria-label="Chat message"
              onChange={(event) => {
                setInput(event.target.value)
                syncAtMenu(event.target)
              }}
              onClick={(event) => syncAtMenu(event.currentTarget)}
              onBlur={() => setAtMenu(null)}
              onKeyDown={(event) => {
                if (atMenu && atItems.length > 0) {
                  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                    event.preventDefault()
                    const delta = event.key === 'ArrowDown' ? 1 : -1
                    setAtMenu({
                      ...atMenu,
                      index:
                        (atMenu.index + delta + atItems.length) % atItems.length
                    })
                    return
                  }
                  if (event.key === 'Enter' || event.key === 'Tab') {
                    event.preventDefault()
                    pickAtItem(atItems[atMenu.index] ?? atItems[0]!)
                    return
                  }
                  if (event.key === 'Escape') {
                    event.stopPropagation()
                    setAtMenu(null)
                    return
                  }
                }
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  void send()
                }
              }}
            />
            {atMenu && atItems.length > 0 && (
              <div className="chat-pop chat-at" role="listbox" aria-label="Quote">
                {atItems.map((item, index) => (
                  <button
                    key={`${item.kind}:${item.relPath}`}
                    type="button"
                    role="option"
                    aria-selected={index === atMenu.index}
                    className={index === atMenu.index ? 'active' : ''}
                    title={item.relPath}
                    // mousedown: fire before the textarea blur closes us
                    onMouseDown={(event) => {
                      event.preventDefault()
                      pickAtItem(item)
                    }}
                  >
                    <span className="chat-at-kind">{item.kind}</span>
                    {item.title}
                  </button>
                ))}
              </div>
            )}
          </span>
          {grounding && (
            <div className="chat-packet">
              {/* CP-MVP-010 S07: what retrieval put in front of the
                  model — before the send as a PREVIEW, after it as
                  what the answer actually stood on. 26/33: a packet
                  that could not be inspected would be a prompt with
                  extra steps. */}
              <div className="chat-packet-head">
                <button
                  type="button"
                  className="chat-tool"
                  aria-expanded={packetOpen}
                  disabled={packet === null}
                  onClick={() => setPacketOpen((open) => !open)}
                  title={
                    packet === null
                      ? 'Nothing retrieved yet — preview, or send a message'
                      : 'What the vault contributed'
                  }
                >
                  {packet === null
                    ? 'no packet yet'
                    : `${packetIsPreview ? 'preview' : 'grounded'} · ${
                        packet.entries.length
                      } notes · ~${packet.retrieval.contextTokens} tok`}
                </button>
                {packet !== null && packet.coverage.missingTerms.length > 0 && (
                  <span
                    className="chat-packet-gap"
                    title="The vault has no material for these words — a future path can go and look them up"
                  >
                    not in the vault: {packet.coverage.missingTerms.join(', ')}
                  </span>
                )}
                <button
                  type="button"
                  className="chat-tool"
                  disabled={input.trim().length === 0 || running}
                  title="Compile the packet for the current draft, without sending"
                  onClick={() => {
                    void window.atomik
                      .compileContextPacket({ query: input.trim() })
                      .then((next) => {
                        setPacket(next)
                        setPacketIsPreview(true)
                        setPacketOpen(true)
                      })
                      .catch(() => {
                        /* a failed preview must never block the send */
                      })
                  }}
                >
                  preview
                </button>
              </div>
              {packetOpen && packet !== null && (
                <ul className="chat-packet-list">
                  {packet.entries.map((entry) => (
                    <li key={entry.path}>
                      <span className={`chat-packet-stage stage-${entry.stage}`}>
                        {entry.stage}
                      </span>
                      <button
                        type="button"
                        className="chat-packet-note"
                        title={entry.path}
                        onClick={() =>
                          dispatch((state) => revealNote(state, paneId, entry.path))
                        }
                      >
                        {entry.title}
                      </button>
                      <span className="chat-packet-why">{entry.reason}</span>
                    </li>
                  ))}
                  {packet.omitted.length > 0 && (
                    <li className="chat-packet-omitted">
                      left out: {summarizeOmissions(packet.omitted)}
                    </li>
                  )}
                </ul>
              )}
            </div>
          )}
          <div className="chat-card-foot">
            <button
              type="button"
              className="chat-tool"
              title="What rides as the SYSTEM message of every next send — arrange, remove, add"
              aria-expanded={openPanel === 'system'}
              aria-label="System message composition"
              onClick={() =>
                setOpenPanel((open) => (open === 'system' ? null : 'system'))
              }
            >
              <PromptIcon /> system
              {!isDefaultSystemPlan(sysPlan, 'chat') && (
                <span className="chat-sys-badge">custom · {sysPlan.length}</span>
              )}
            </button>
            <button
              type="button"
              className="chat-tool"
              title={
                grounding
                  ? 'Vault grounding ON — every send retrieves notes first; the packet is shown below'
                  : 'Ground the next sends in the vault: retrieve related notes before answering'
              }
              aria-pressed={grounding}
              aria-label="Vault grounding"
              onClick={() => {
                setGrounding((on) => !on)
                setPacketOpen(false)
              }}
            >
              <BookIcon /> vault
              {grounding && <span className="chat-sys-badge">on</span>}
            </button>
            <button
              type="button"
              className="chat-tool chat-tool-model"
              title="Model and sampling of the next sends — click to change"
              aria-expanded={openPanel === 'model'}
              aria-label="Model and sampling options"
              onClick={() =>
                setOpenPanel((open) => (open === 'model' ? null : 'model'))
              }
            >
              <BrainIcon />{' '}
              {engine === 'mock'
                ? 'mock'
                : genDrafts.model || DEFAULT_GENERATION_MODEL}
              {(genDrafts.temperature || genDrafts.topP || genDrafts.maxTokens) && (
                <span className="chat-sys-badge">tuned</span>
              )}
            </button>
            {(() => {
              // S07b8b/c intent preview (the researched pattern: show
              // what will be sent, ambiently) — now COMPLETE: system
              // from the arranged plan, context from the live sizes,
              // history from the visible turns, the draft as typed;
              // chars/4, estimated everywhere, detail on hover.
              const est = (chars: number): number =>
                chars === 0 ? 0 : Math.max(1, Math.ceil(chars / 4))
              const sysTok =
                sysPrompts === null
                  ? null
                  : est(
                      sysPlan.reduce(
                        (sum, entry) =>
                          sum +
                          systemPlanEntryBody(
                            entry,
                            'append',
                            sysBuiltins,
                            sysPrompts
                          ).length,
                        0
                      )
                    )
              const ctxChars =
                ctxList.length > 0
                  ? ctxList.reduce((sum, entry) => {
                      const parsed = parseChatContextEntry(entry)
                      return (
                        sum +
                        (parsed.from !== undefined && parsed.to !== undefined
                          ? parsed.to - parsed.from
                          : (ctxSizes[parsed.path] ?? 0))
                      )
                    }, 0)
                  : targetPath !== null
                    ? (ctxSizes[targetPath] ?? 0)
                    : 0
              const ctxTok = est(ctxChars)
              const histTok = est(
                turns.reduce((sum, turn) => sum + turn.text.length, 0)
              )
              const draftTok = est(input.length)
              const total = (sysTok ?? 0) + ctxTok + histTok + draftTok
              const parts = [
                `system ${sysTok === null ? '…' : `~${sysTok}`}`,
                ...(ctxTok > 0 ? [`context ~${ctxTok}`] : []),
                ...(histTok > 0 ? [`history ~${histTok}`] : []),
                ...(draftTok > 0 ? [`draft ~${draftTok}`] : [])
              ].join(' · ')
              return (
                <span
                  className="chat-send-preview"
                  title={`next send, estimated at chars/4: ${parts}`}
                >
                  ~{total} tok
                </span>
              )
            })()}
            <button
              type="button"
              className="icon-button chat-send"
              disabled={running || input.trim().length === 0}
              title={running ? 'Running…' : 'Send'}
              aria-label="Send"
              onClick={() => void send()}
            >
              <SendIcon />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
