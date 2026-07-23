import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  ClaimRecord,
  VaultFolder,
  WorkspaceState,
  WorkspaceTab
} from '../../../shared/ipc-contract'
import { applyChatAtPick, chatAtItems, type ChatAtItem } from '../editor/chat-at'
import {
  appendChatTurn,
  chatHistoryOf,
  chatNotePathForMessage,
  chatRelPath,
  newChatFileContent,
  parseChatTurns,
  threadFromTurns,
  type ChatTurn
} from '../editor/chat-file'
import {
  composeGenerationParams,
  defaultGenOptionDrafts
} from '../editor/gen-params'
import { GenOptionsFields } from '../editor/gen-options'
import { prepareAiRun } from '../editor/ai-run'
import { atPromptToken, loadPromptsFor, type PromptFile } from '../editor/prompts'
import { linkableNotesOf, sourceBundlesOf } from '../editor/quick-actions'
import { noteMarkdown } from '../editor/note-markdown'
import {
  HistoryIcon,
  InsertIcon,
  NoteAddIcon,
  PlusIcon,
  SendIcon
} from '../icons'
import {
  resolveAiContext,
  useAiContexts,
  type AiContextEntry
} from './ai-context'
import {
  chatFileOf,
  openNoteInNewPane,
  openNoteTabPaths,
  updateTabParams
} from './model'
import { useWorkspace } from './store'

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

export type ChatViewProps = {
  tab: WorkspaceTab
  paneId: string
  dispatch: Dispatch
}

/** Session-only metadata of a freshly answered turn (trace decision +
 *  claim chips); restored transcripts are plain text again. */
type TurnMeta = { bundleId: string; claims: ClaimRecord[] }

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
  const pickedCtx = tab.params?.['ctx'] ?? null
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
  const context = resolveAiContext(contexts, pickedCtx)
  /** The path a send will read: the explicit pick wins even when its
   *  view is not mounted; otherwise the best mounted entry; otherwise
   *  the first open tab. */
  const targetPath =
    (pickedCtx && optionPaths.includes(pickedCtx) ? pickedCtx : null) ??
    context?.notePath ??
    optionPaths[0] ??
    null
  const targetEditable = contexts.some(
    (entry) => entry.notePath === targetPath && entry.editable
  )

  const [turns, setTurns] = useState<ChatTurn[]>([])
  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const [engine, setEngine] = useState('…')
  const [genDrafts, setGenDrafts] = useState(defaultGenOptionDrafts)
  const [historyOpen, setHistoryOpen] = useState(false)
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
  const scrollRef = useRef<HTMLDivElement | null>(null)

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
  // from racing the in-flight answer. A failed read KEEPS the pointer
  // (S06b: a transient failure must not wipe the chat) and says so.
  const loadedRef = useRef<string | null>(null)
  useEffect(() => {
    if (file === loadedRef.current) return
    loadedRef.current = file
    metaByTurn.current.clear()
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
    }
    // reload on file change only — sends update local state themselves
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file])

  // keep the latest exchange in view
  useEffect(() => {
    const scroller = scrollRef.current
    if (scroller) scroller.scrollTop = scroller.scrollHeight
  }, [turns, running])

  /** Appends one turn to the transcript through the ordinary note
   *  verbs (fresh read → write with the mtime handshake); returns the
   *  file path, creating `chats/…` at the FIRST message. */
  const persistTurn = useCallback(
    async (role: 'you' | 'atomik', text: string): Promise<string> => {
      const existing = fileRef.current
      if (existing) {
        const note = await window.atomik.readNote(existing)
        await window.atomik.writeNote(
          existing,
          appendChatTurn(note.content, role, text),
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

  /** Resolves the send target NOW: a mounted surface for the picked
   *  path (editable mount wins), else the note read from disk as a
   *  read-only whole-note context. */
  const resolveTarget = useCallback(async (): Promise<ChatTarget | null> => {
    const path = targetPathRef.current
    if (!path) return null
    const mounted = contextsRef.current.filter(
      (entry) => entry.notePath === path
    )
    const best = mounted.filter((entry) => entry.editable).at(-1) ?? mounted.at(-1)
    if (best) {
      return {
        notePath: best.notePath,
        editable: best.editable,
        getSelection: best.getSelection,
        getDoc: best.getDoc,
        insert: best.insert
      }
    }
    try {
      const note = await window.atomik.readNote(path)
      return {
        notePath: path,
        editable: false,
        getSelection: () => ({ from: 0, to: 0, text: '' }),
        getDoc: () => note.content
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

  const send = useCallback(async (): Promise<void> => {
    const text = input.trim()
    if (text.length === 0 || running) return
    const target = await resolveTarget()
    if (!target) {
      setError('Open a note somewhere to chat over it — the context list is empty.')
      return
    }
    setError(null)
    try {
      const prompts = await loadPrompts()
      const params = composeGenerationParams(genDrafts)
      const prepared = await prepareAiRun(
        {
          noteRelPath: target.notePath,
          doc: target.getDoc(),
          selection: target.getSelection(),
          instruction: text,
          systemStack: [],
          prompts,
          destination: 'append',
          newNotePath: '',
          ...(params ? { params } : {})
        },
        window.atomik.readNote
      )
      if (!prepared) return
      const thread = threadFromTurns(turns)
      const operation =
        thread.length > 0
          ? { ...prepared.operation, thread }
          : prepared.operation

      // The user's turn lands in the file BEFORE the call — a
      // cancelled or failed run keeps what was asked.
      await persistTurn('you', text)
      setTurns((current) => [...current, { role: 'you', text }])
      setInput('')
      setAtMenu(null)

      setRunning(true)
      runningOperationId.current = operation.id
      const result = await window.atomik.runAiOperation(operation)
      const answer =
        result.blocks.find((block) => block.role === 'answer')?.content ??
        result.blocks[0]?.content ??
        ''
      await persistTurn('atomik', answer)
      setTurns((current) => {
        metaByTurn.current.set(current.length, {
          bundleId: result.id,
          claims: result.claims
        })
        return [...current, { role: 'atomik', text: answer }]
      })
    } catch (reason) {
      setError(String(reason))
    } finally {
      setRunning(false)
      runningOperationId.current = null
    }
  }, [genDrafts, input, loadPrompts, persistTurn, resolveTarget, running, turns])

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

  const newChat = useCallback(() => {
    metaByTurn.current.clear()
    fileRef.current = null
    loadedRef.current = null
    setTurns([])
    setError(null)
    patchParams({ file: '' })
  }, [patchParams])

  const openFromHistory = useCallback(
    (relPath: string) => {
      setHistoryOpen(false)
      metaByTurn.current.clear()
      setError(null)
      patchParams({ file: relPath })
    },
    [patchParams]
  )

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

  const history = tree ? chatHistoryOf(tree) : []
  const title = file
    ? (file.split('/').pop() ?? file).replace(/\.md$/i, '')
    : 'New chat'

  return (
    <div className="chat-view" aria-label="Chat pane">
      <div className="tree-bar">
        <span className="tree-bar-label" title={file ?? 'no transcript yet — born at the first message'}>
          chat · {engine}
        </span>
        <span className="chat-history">
          <button
            type="button"
            className="tree-toggle"
            title="Past chats (transcripts in chats/)"
            aria-label="Past chats"
            aria-expanded={historyOpen}
            onClick={() => setHistoryOpen((open) => !open)}
          >
            <HistoryIcon />
          </button>
          {historyOpen && (
            <div
              className="chat-pop"
              role="listbox"
              aria-label="Past chats"
              onKeyDown={(event) => {
                if (event.key === 'Escape') setHistoryOpen(false)
              }}
            >
              {history.length === 0 && (
                <p className="chat-pop-empty">no transcripts in chats/ yet</p>
              )}
              {history.map((entry) => (
                <button
                  key={entry.relPath}
                  type="button"
                  role="option"
                  aria-selected={entry.relPath === file}
                  className={entry.relPath === file ? 'active' : ''}
                  title={entry.relPath}
                  onClick={() => openFromHistory(entry.relPath)}
                >
                  {entry.name}
                </button>
              ))}
            </div>
          )}
        </span>
        <button
          type="button"
          className="tree-toggle"
          title="New chat (the current transcript stays in chats/)"
          aria-label="New chat"
          onClick={newChat}
        >
          <PlusIcon />
        </button>
      </div>
      <div className="chat-context">
        <label>
          context
          <select
            aria-label="Chat context"
            value={targetPath ?? ''}
            onChange={(event) => patchParams({ ctx: event.target.value })}
          >
            {optionPaths.length === 0 && <option value="">no open note</option>}
            {optionPaths.map((notePath) => (
              <option key={notePath} value={notePath}>
                {notePath}
                {contexts.some(
                  (entry) => entry.notePath === notePath && entry.editable
                )
                  ? ''
                  : ' — read-only'}
              </option>
            ))}
          </select>
        </label>
        {targetPath !== null && !targetEditable && (
          <span className="chat-context-hint">read-only — insert needs an editor</span>
        )}
      </div>
      <div className="chat-scroll" ref={scrollRef}>
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
          return (
            <article key={index} className={`chat-turn role-${turn.role}`}>
              <header className="chat-turn-head">
                <span className="chat-turn-role">{turn.role}</span>
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
              <div
                className="markdown-body chat-turn-body"
                dangerouslySetInnerHTML={{ __html: md.render(turn.text) }}
              />
              {meta && meta.claims.length > 0 && (
                <div className="chat-claims">
                  {meta.claims.slice(0, 8).map((claim) => (
                    <span
                      key={claim.id}
                      className={`truth-chip label-${claim.label}`}
                      title={claim.text}
                    >
                      {claim.label}
                    </span>
                  ))}
                </div>
              )}
            </article>
          )
        })}
        {running && (
          <article className="chat-turn role-atomik chat-running">
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
      {error && <p className="error chat-error">{error}</p>}
      <div className="chat-compose">
        <GenOptionsFields drafts={genDrafts} onChange={setGenDrafts} />
        <div className="chat-input">
          <span className="chat-input-host">
            <textarea
              ref={inputRef}
              rows={2}
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
  )
}
