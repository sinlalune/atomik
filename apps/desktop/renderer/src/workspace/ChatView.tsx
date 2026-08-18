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
import { decorateWikiLinks } from '../editor/link-pills'
import { resolveWikiTarget, wikiCandidatesFor, type WikiCandidate } from '../../../shared/graph-core'
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
  atPromptToken,
  loadBuiltinOverridesFor,
  loadPromptsFor,
  type PromptFile
} from '../editor/prompts'
import { linkableNotesOf, sourceBundlesOf } from '../editor/quick-actions'
import { noteMarkdown } from '../editor/note-markdown'
import { hydrateRichMarkdown } from '../editor/rich-markdown/hydration'
import {
  citationSourcesOf,
  consultedMaterialOf,
  serializeCitedMeta,
  type CitationSource,
  type ConsultedMaterial
} from '../../../shared/chat-citations'
import { ConsultedBlock } from './ConsultedBlock'
import { serializePacketMeta } from '../../../shared/context-packet'
import { applyCitationChips, type AppliedCitations } from '../editor/citation-chips'
import {
  BookIcon,
  GlobeIcon,
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

/** What each retrieval stage IS — hover copy, in the vocabulary of
 *  33's ladder rather than the code's. */
const STAGE_DESCRIPTIONS: Record<string, string> = {
  direct: 'you already had it open, pinned or selected — nothing was searched for it',
  lexical: 'the words of your message were found in this note',
  link: 'no word matched: a typed edge from a matching note led here'
}

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
  sources,
  onOpenSource
}: {
  text: string
  meta: TurnMeta | undefined
  /** CP-MVP-010 S08: what this answer was allowed to cite. */
  sources?: readonly CitationSource[]
  onOpenSource: (relPath: string) => void
}): React.JSX.Element {
  const ref = useRef<HTMLDivElement | null>(null)
  // S08d: the answer is rendered AS WRITTEN; markers are decorated
  // afterwards, like claim marks. A citation is not a link that happens
  // to be short, so it does not borrow the link pill.
  const [citations, setCitations] = useState<AppliedCitations | null>(null)
  const wikiCandidates = useWikiCandidates()
  useEffect(() => {
    const container = ref.current
    if (!container) return
    // Pointing wikilinks resolve on the HTML STRING, before it is mounted, so
    // the citation chips and the rich-markdown hydration below still run over
    // final markup — re-writing innerHTML afterwards would destroy both.
    const rendered = md.render(text)
    container.innerHTML = wikiCandidates
      ? decorateWikiLinks(rendered, (target) =>
          resolveWikiTarget(wikiCandidates, target)
        )
      : rendered
    // CLAIM MARKS ARE OFF IN CHAT (S10f, owner ruling 2026-08-16: "I
    // think we should disable claims for now untill we find a better
    // solution later on the truth lens path"). Three bench rounds in a
    // row, what looked broken was this overlay rather than retrieval:
    // claims are extracted as sentences of RAW markdown and then
    // re-located in RENDERED text by fuzzy matching, so any inline
    // formatting — bold, a link pill standing in for [[XML]], a smart
    // quote — could shift or shorten a mark. S10e's word-boundary guard
    // stopped it breaking words; it could not make the mechanism sound.
    //
    // Nothing is deleted: `claim-highlight` and its tests stay, the
    // bundle still carries claims and evidence, and the AI panel still
    // labels what enters the vault. What is gone is the inline overlay
    // in a CONVERSATION, where citations now say the useful half —
    // "this stands on that note" — with a mechanism that cannot drift,
    // because a citation is a number the model emitted rather than a
    // sentence someone has to find again.
    //
    // M6 inherits the real question: whether a claim should carry
    // offsets from the moment it is extracted, instead of being located
    // afterwards in text it no longer matches.

    setCitations(
      sources && sources.length > 0
        ? applyCitationChips(container, text, sources)
        : null
    )
    const hydration = hydrateRichMarkdown(container)
    return () => hydration.dispose()
  }, [text, meta, sources, wikiCandidates])
  const body = (
    <div
      ref={ref}
      className="markdown-body chat-turn-body"
      onClick={(event) => {
        // S08: a citation opens its note — a marker that could not be
        // clicked would be a footnote, not a citation.
        const citation = (event.target as HTMLElement).closest<HTMLElement>(
          'a[data-citation]'
        )
        if (citation) {
          event.preventDefault()
          onOpenSource(citation.dataset['citation'] as string)
          return
        }
        // A POINTING wikilink (S02). Same routing rule as the vault: go by the
        // RESOLVED `data-rel`; an unresolved pill stays inert — a diagnostic,
        // never an auto-create.
        const wiki = (event.target as HTMLElement).closest<HTMLElement>(
          'a[data-wiki]'
        )
        if (wiki) {
          event.preventDefault()
          const rel = wiki.dataset['rel']
          if (rel && rel.endsWith('.md')) onOpenSource(rel)
        }
        // The claim-mark handler went with the overlay (S10f): there is
        // nothing to click when nothing is marked, and a citation now
        // carries the "open what this stands on" gesture.
      }}
    />
  )

  if (!citations || (citations.cited.length === 0 && citations.unresolved.length === 0)) {
    return body
  }
  return (
    <>
      {body}
      <div className="chat-sources">
        {citations.cited.map((source) => (
          <button
            key={source.number}
            type="button"
            className="chat-source"
            title={source.path}
            onClick={() => onOpenSource(source.path)}
          >
            <span className="chat-source-n">{source.number}</span>
            {source.title}
          </button>
        ))}
        {citations.unresolved.length > 0 && (
          // A citation that pointed nowhere stays VISIBLE: silently
          // dropping it would hide the one failure mode that matters.
          <span
            className="chat-source-unresolved"
            title="The answer cited a number that was never among its sources"
          >
            unresolved: {citations.unresolved.map((number) => `[${number}]`).join(' ')}
          </span>
        )}
      </div>
    </>
  )
}

const md = noteMarkdown()

/**
 * Wikilink candidates for CHAT (CP-AI-CAPABILITIES S02).
 *
 * The model may POINT at a note with a plain `[[wikilink]]` — a different act
 * from citing, which keeps its numbered marker and chip (bedrock 28, and the
 * owner's CP-MVP-010 bench ruling that a citation must not borrow the link
 * pill). Pointing had no mechanism: chat's click handler routed only
 * `a[data-citation]`, so a wikilink rendered `href="#"` and did nothing.
 *
 * Resolution reuses the vault's pipeline rather than growing a second one —
 * `readGraphIndex` -> `wikiCandidatesFor` -> `resolveWikiTarget` ->
 * `decorateWikiLinks`. A conversation has no subject note, so candidates are
 * built from the vault root (`''`): there is no sibling to prefer.
 *
 * Loaded ONCE per view, not per token: an answer streams, and an IPC round
 * trip per chunk would be absurd. Until it resolves, wikilinks render as the
 * ordinary unresolved pill and simply do not navigate yet.
 */
function useWikiCandidates(): readonly WikiCandidate[] | null {
  const [candidates, setCandidates] = useState<readonly WikiCandidate[] | null>(
    null
  )
  useEffect(() => {
    let cancelled = false
    window.atomik.readGraphIndex().then(
      (index) => {
        if (!cancelled) setCandidates(wikiCandidatesFor('', index.nodes))
      },
      () => {
        // No index is not an error here: pointing degrades to an inert pill,
        // exactly as an unresolved target does.
        if (!cancelled) setCandidates([])
      }
    )
    return () => {
      cancelled = true
    }
  }, [])
  return candidates
}

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

/**
 * Which Wikimedia edition to consult. Derived from the user's own locale, so a
 * French user reads fr.wikipedia without configuring anything; main validates
 * the label and pins it for the whole exchange, and anything unrecognizable
 * falls back to English rather than guessing a host.
 */
/** The editions offered by the composer control: the user's own locale first,
 *  then English and French. Deduplicated, so a French machine sees fr · en
 *  rather than fr · en · fr. A wider picker is a later concern; this exists
 *  because guessing alone read the wrong edition on the owner's own bench. */
function WIKI_EDITIONS(): string[] {
  return [...new Set([wikiLanguageOf(), 'en', 'fr'])]
}

function wikiLanguageOf(): string {
  const tag =
    typeof navigator === 'undefined' ? 'en' : (navigator.language ?? 'en')
  const primary = tag.split('-')[0]?.toLowerCase() ?? 'en'
  return /^[a-z]{2,3}$/.test(primary) ? primary : 'en'
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
  /**
   * What an answer was allowed to cite (S08). This session's packet is
   * richer (it knows titles), the transcript's own `cited:` map is what
   * survives a reopen — figures persist, prompts never do.
   */
  const citationsFor = useCallback(
    (turn: ChatTurn, index: number): CitationSource[] | undefined => {
      if (turn.role !== 'atomik') return undefined
      const packet = packetByTurn.current.get(index - 1)
      if (packet) {
        return citationSourcesOf(
          packet.entries.filter((entry) => entry.stage !== 'direct')
        )
      }
      return turn.cited?.map((entry) => ({
        number: entry.number,
        path: entry.path,
        title: (entry.path.split('/').pop() ?? entry.path).replace(/\.md$/i, '')
      }))
    },
    []
  )

  // CP-MVP-010 S07: vault grounding. The TOGGLE is a preference for the
  // next sends and belongs to the composer (session state, like the
  // model drafts beside it). A PACKET is not: it was compiled for one
  // message, so it belongs to that message's turn (S07b, owner bench:
  // "it is a message bounded information"). The composer holds only a
  // forward-looking preview of what the NEXT send would retrieve.
  const [grounding, setGrounding] = useState(false)
  // S08g: how wide the net is thrown. A preference for the next sends,
  // like the toggle beside it.
  const [sensitivity, setSensitivity] = useState<'titles' | 'linked' | 'full'>(
    'linked'
  )
  // CP-MVP-011 S07a: the wiki tool mirrors the vault tool's shape (owner
  // ruling 2026-08-17) — an enable toggle, a `reach` depth, and one switch
  // per augmentation. DEFAULT OFF: the owner's words were "the user enable
  // the tool wikisearch", and a thread that reaches the network without
  // being asked is not a preference, it is a surprise.
  const [wiki, setWiki] = useState(false)
  const [wikiReach, setWikiReach] = useState<'quick' | 'standard' | 'deep'>(
    'standard'
  )
  // S07b: the owner's first bench read fr.wikipedia in ENGLISH — the locale
  // guess was right for the machine and wrong for the person. The edition is
  // now a visible choice, seeded from the locale rather than dictated by it.
  const [wikiLang, setWikiLang] = useState(wikiLanguageOf)
  const [wikiSources, setWikiSources] = useState({
    wikipedia: true,
    wikidata: true,
    media: true,
    wiktionary: true
  })
  const [preview, setPreview] = useState<ContextPacket | null>(null)
  const packetByTurn = useRef(new Map<number, ContextPacket>())
  // S07b: what the ANSWER consulted outside the vault. Session-live like the
  // packet beside it — the transcript keeps the prose; the excerpts and
  // thumbnails are not re-fetched when a chat is reopened.
  const consultedByTurn = useRef(new Map<number, ConsultedMaterial>())
  const [openPacketTurn, setOpenPacketTurn] = useState<number | null>(null)
  const [openBreakdownTurn, setOpenBreakdownTurn] = useState<number | null>(null)
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
    packetByTurn.current.clear()
    consultedByTurn.current.clear()
    setPreview(null)
    setOpenPacketTurn(null)
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
      youPacket?: string | null,
      ownMeta?: string | readonly (string | undefined)[]
    ): Promise<string> => {
      const existing = fileRef.current
      if (existing) {
        const note = await window.atomik.readNote(existing)
        // S07b10: the answer's write also stamps the you-turn's sent
        // breakdown onto its heading — one write persists both;
        // S07b16: the answer's OWN metrics ride its own heading
        const base = youMeta
          ? withSentMetaOnLastYou(note.content, youMeta, [
              youPacket ? `packet:${youPacket}` : null
            ])
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
          setPreview(null) // the preview described the message just sent
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
          ...(grounding ? { grounding: { sensitivity } } : {}),
          // The renderer sends a PREFERENCE only: which augmentations are on
          // and how deep. Main derives the allowed corpora, the result
          // ceiling and the media rule from it (S07a), so a compromised
          // renderer cannot widen its own reach.
          ...(wiki
            ? {
                tools: {
                  mode: 'model' as const,
                  wikiLanguage: wikiLang,
                  wikiReach,
                  wikiSources
                }
              }
            : {})
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
          setPreview(null) // the preview described the message just sent
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
              // the packet belongs to the YOU turn it was compiled for
              packetByTurn.current.set(priorTurns.length, result.contextPacket)
            }
            if (result.toolExecutions && result.toolExecutions.length > 0) {
              // ...and what was consulted belongs to the ANSWER that used it.
              consultedByTurn.current.set(
                priorTurns.length + 1,
                consultedMaterialOf(result.toolExecutions)
              )
            }
            const answer =
              result.blocks.find((block) => block.role === 'answer')?.content ??
              result.blocks[0]?.content ??
              ''
            // S07b10: the you-turn's breakdown persists with the answer;
            // S07b16: so do the answer's own measured metrics
            const baseBreakdown = breakdownByTurn.current.get(priorTurns.length)
            const baseParts = baseBreakdown?.parts
            const usedPacket = packetByTurn.current.get(priorTurns.length)
            // The retrieved notes were part of what was SENT, so they
            // join the request breakdown of the turn that sent them —
            // figures persist with the transcript, the packet's detail
            // stays session-live like the full request text.
            const sentParts =
              baseParts && usedPacket && usedPacket.entries.length > 0
                ? [
                    ...baseParts,
                    {
                      kind: 'vault' as const,
                      label: `vault ${usedPacket.entries.length} notes`,
                      chars: usedPacket.entries.reduce(
                        (sum, entry) => sum + entry.excerpt.length,
                        0
                      ),
                      tokensEst: usedPacket.retrieval.contextTokens
                    }
                  ]
                : baseParts
            // S08c (owner bench round 5): the LIVE breakdown is what the
            // turn displays, so it has to learn about the vault part
            // too — otherwise the header says "~273 tok sent" for a send
            // that carried a thousand.
            if (baseBreakdown && sentParts && sentParts !== baseParts) {
              breakdownByTurn.current.set(priorTurns.length, {
                ...baseBreakdown,
                parts: sentParts,
                totalTokensEst: sentParts.reduce(
                  (sum, part) => sum + part.tokensEst,
                  0
                )
              })
            }
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
            // S08: the citation map travels WITH the answer, so a
            // reopened conversation still resolves its [1] markers.
            const citedMeta = usedPacket
              ? serializeCitedMeta(
                  citationSourcesOf(
                    usedPacket.entries.filter((entry) => entry.stage !== 'direct')
                  )
                )
              : null
            await persistTurn(
              'atomik',
              answer,
              sentParts ? serializeSentMeta(sentParts) : undefined,
              usedPacket ? serializePacketMeta(usedPacket) : undefined,
              [runMeta ?? undefined, citedMeta ? `cited:${citedMeta}` : undefined]
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
      sensitivity,
      wiki,
      wikiLang,
      wikiReach,
      wikiSources,
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
        <div className="chat-thread">
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
                  // S08d (owner bench round 6): the breakdown is DETAIL,
                  // so it hides behind the number it explains rather
                  // than crowding every turn.
                  <button
                    type="button"
                    className="chat-turn-metrics chat-turn-metrics-open"
                    aria-expanded={openBreakdownTurn === index}
                    title="What this exchange sent, estimated at chars/4 — click to retrace it part by part"
                    onClick={() =>
                      setOpenBreakdownTurn((open) => (open === index ? null : index))
                    }
                  >
                    ↑~{sentTotal} tok sent
                  </button>
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
                sources={citationsFor(turn, index)}
                onOpenSource={(relPath) =>
                  dispatch((state) => revealNote(state, paneId, relPath))
                }
              />
              {(() => {
                const consulted = consultedByTurn.current.get(index)
                if (!consulted) return null
                if (
                  consulted.sources.length === 0 &&
                  consulted.media.length === 0
                ) {
                  return null
                }
                return (
                  <ConsultedBlock
                    material={consulted}
                    onCopy={(value: string) => {
                      void copyText(value)
                    }}
                  />
                )
              })()}
              {sentParts && openBreakdownTurn === index && (
                <div className="chat-request-pills">
                  {sentParts.map((part, partIndex) => {
                    const packet =
                      part.kind === 'vault'
                        ? packetByTurn.current.get(index)
                        : undefined
                    const title = `${PART_DESCRIPTIONS[part.kind as RequestPartKind] ?? part.kind} · ${part.chars} chars · ~${part.tokensEst} tokens (estimated)`
                    // The vault pill OPENS: the packet was compiled for
                    // this message, so its detail belongs here and
                    // nowhere else (S07b, owner bench).
                    return packet ? (
                      <button
                        key={partIndex}
                        type="button"
                        className={`chat-request-pill kind-${part.kind} chat-request-pill-open`}
                        aria-expanded={openPacketTurn === index}
                        title={title}
                        onClick={() =>
                          setOpenPacketTurn((open) => (open === index ? null : index))
                        }
                      >
                        {part.label} <b>~{part.tokensEst}</b>
                      </button>
                    ) : (
                      <span
                        key={partIndex}
                        className={`chat-request-pill kind-${part.kind}`}
                        title={title}
                      >
                        {part.label} <b>~{part.tokensEst}</b>
                      </span>
                    )
                  })}
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
              {openPacketTurn === index &&
                (() => {
                  const packet = packetByTurn.current.get(index)
                  if (!packet) {
                    // Reopened transcript: the SHAPE survived, the
                    // excerpts did not (S08d).
                    const persisted = turn.packet
                    if (!persisted) return null
                    return (
                      <div className="chat-packet">
                        <ul className="chat-packet-list">
                          {persisted.map((entry) => (
                            <li key={entry.path}>
                              <span
                                className={`chat-packet-stage stage-${entry.stage}`}
                                title={STAGE_DESCRIPTIONS[entry.stage]}
                              >
                                {entry.stage}
                              </span>
                              <button
                                type="button"
                                className="chat-packet-note"
                                title={entry.path}
                                onClick={() =>
                                  dispatch((state) =>
                                    revealNote(state, paneId, entry.path)
                                  )
                                }
                              >
                                {(entry.path.split('/').pop() ?? entry.path).replace(
                                  /\.md$/i,
                                  ''
                                )}
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )
                  }
                  return (
                    <div className="chat-packet">
                      {packet.coverage.missingTerms.length > 0 && (
                        <p className="chat-packet-gap">
                          not in the vault: {packet.coverage.missingTerms.join(', ')}
                        </p>
                      )}
                      <ul className="chat-packet-list">
                        {packet.entries.map((entry) => (
                          <li key={entry.path}>
                            <span
                              className={`chat-packet-stage stage-${entry.stage}`}
                              title={STAGE_DESCRIPTIONS[entry.stage]}
                            >
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
                            <span
                              className="chat-packet-why"
                              // S08b: hovering shows the TEXT that was
                              // sent — the reason names the words, this
                              // shows them in place.
                              title={entry.excerpt}
                            >
                              {entry.reason}
                            </span>
                          </li>
                        ))}
                        {packet.omitted.length > 0 && (
                          <li className="chat-packet-omitted">
                            left out: {summarizeOmissions(packet.omitted)}
                          </li>
                        )}
                      </ul>
                    </div>
                  )
                })()}
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
          {grounding && preview !== null && (
            // Forward-looking ONLY: what the NEXT send would retrieve
            // for the draft as typed. What a PAST send actually used
            // lives on its own turn, above.
            <div className="chat-packet chat-packet-preview">
              <div className="chat-packet-head">
                <span>
                  next send · {preview.entries.length} notes · ~
                  {preview.retrieval.contextTokens} tok
                </span>
                {preview.coverage.missingTerms.length > 0 && (
                  <span className="chat-packet-gap">
                    not in the vault: {preview.coverage.missingTerms.join(', ')}
                  </span>
                )}
                <button
                  type="button"
                  className="chat-tool"
                  title="Dismiss this preview"
                  onClick={() => setPreview(null)}
                >
                  dismiss
                </button>
              </div>
              <ul className="chat-packet-list">
                {preview.entries.map((entry) => (
                  <li key={entry.path}>
                    <span
                      className={`chat-packet-stage stage-${entry.stage}`}
                      title={STAGE_DESCRIPTIONS[entry.stage]}
                    >
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
                    <span className="chat-packet-why" title={entry.excerpt}>
                      {entry.reason}
                    </span>
                  </li>
                ))}
              </ul>
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
                  ? 'Vault grounding ON — every send retrieves notes first; what each send used is shown on its own turn'
                  : 'Ground the next sends in the vault: retrieve related notes before answering'
              }
              aria-pressed={grounding}
              aria-label="Vault grounding"
              onClick={() => {
                setGrounding((on) => !on)
                setPreview(null)
              }}
            >
              <BookIcon /> vault
              {grounding && <span className="chat-sys-badge">on</span>}
            </button>
            {grounding && (
              <button
                type="button"
                className="chat-tool"
                title={
                  sensitivity === 'titles'
                    ? 'Notes whose TITLE matches — nothing else'
                    : sensitivity === 'linked'
                      ? 'Notes whose title matches, PLUS the notes linked to them'
                      : 'Everything, including notes that only mention it in their body'
                }
                aria-label={`Retrieval reach: ${sensitivity}`}
                onClick={() => {
                  const next =
                    sensitivity === 'titles'
                      ? 'linked'
                      : sensitivity === 'linked'
                        ? 'full'
                        : 'titles'
                  setSensitivity(next)
                  // S08l: a preview compiled at another reach is a
                  // stale answer to a question nobody asked. Recompile
                  // it rather than leave it lying.
                  if (preview !== null && input.trim().length > 0 && !running) {
                    void window.atomik
                      .compileContextPacket({
                        query: input.trim(),
                        sensitivity: next
                      })
                      .then(setPreview)
                      .catch(() => setPreview(null))
                  } else if (preview !== null) {
                    setPreview(null)
                  }
                }}
              >
                reach · {sensitivity}
              </button>
            )}
            {grounding && (
              <button
                type="button"
                className="chat-tool"
                disabled={input.trim().length === 0 || running}
                title="See what the NEXT send would retrieve, without sending"
                onClick={() => {
                  void window.atomik
                    .compileContextPacket({ query: input.trim(), sensitivity })
                    .then(setPreview)
                    .catch(() => {
                      /* a failed preview must never block the send */
                    })
                }}
              >
                preview
              </button>
            )}
            <button
              type="button"
              className="chat-tool"
              title={
                wiki
                  ? 'Wikimedia ON — the model may look up Wikipedia, Wikidata, images and etymology; every call is shown on its turn'
                  : 'Let the model consult Wikimedia when the vault is thin'
              }
              aria-pressed={wiki}
              aria-label="Wikimedia lookup"
              onClick={() => setWiki((on) => !on)}
            >
              <GlobeIcon /> wiki
              {wiki && <span className="chat-sys-badge">on</span>}
            </button>
            {wiki && (
              <button
                type="button"
                className="chat-tool"
                title={
                  wikiReach === 'quick'
                    ? 'One or two results per lookup — fastest and cheapest'
                    : wikiReach === 'standard'
                      ? 'A few results per lookup'
                      : 'The widest lookup — slower, and more to read'
                }
                aria-label={`Wikimedia reach: ${wikiReach}`}
                onClick={() =>
                  setWikiReach((current) =>
                    current === 'quick'
                      ? 'standard'
                      : current === 'standard'
                        ? 'deep'
                        : 'quick'
                  )
                }
              >
                reach · {wikiReach}
              </button>
            )}
            {wiki && (
              <button
                type="button"
                className="chat-tool"
                title={`Wikimedia edition to read: ${wikiLang}.wikipedia and its siblings`}
                aria-label={`Wikimedia edition: ${wikiLang}`}
                onClick={() =>
                  setWikiLang((current) => {
                    const editions = WIKI_EDITIONS()
                    const next = editions.indexOf(current) + 1
                    return editions[next % editions.length] ?? 'en'
                  })
                }
              >
                lang · {wikiLang}
              </button>
            )}
            {wiki &&
              (
                [
                  ['wikipedia', 'wikipedia', 'Article extracts'],
                  ['wikidata', 'wikidata', 'Entity facts (QID, claims)'],
                  ['media', 'image', 'Commons image, with attribution'],
                  ['wiktionary', 'etymology', 'Word origins']
                ] as const
              ).map(([key, label, hint]) => (
                <button
                  key={key}
                  type="button"
                  className="chat-tool chat-src"
                  // Media rides on Wikidata's P18: with Wikidata off there is
                  // nothing to resolve a filename from, so the switch says so
                  // instead of pretending to work.
                  disabled={key === 'media' && !wikiSources.wikidata}
                  title={
                    key === 'media' && !wikiSources.wikidata
                      ? 'Needs wikidata — an image is found through its entity'
                      : hint
                  }
                  aria-pressed={wikiSources[key]}
                  aria-label={`${label} source`}
                  onClick={() =>
                    setWikiSources((current) => ({
                      ...current,
                      [key]: !current[key]
                    }))
                  }
                >
                  {label}
                </button>
              ))}
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
