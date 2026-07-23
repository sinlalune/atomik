import { useCallback, useEffect, useRef, useState } from 'react'
import type { ClaimRecord } from '../../../shared/ipc-contract'
import {
  appendChatTurn,
  chatRelPath,
  newChatFileContent,
  parseChatTurns,
  threadFromTurns,
  type ChatTurn
} from '../editor/chat-file'
import { prepareAiRun } from '../editor/ai-run'
import { loadPromptsFor } from '../editor/prompts'
import { noteMarkdown } from '../editor/note-markdown'
import { CloseIcon, InsertIcon, PlusIcon, SendIcon } from '../icons'
import { frameCoalesced } from './frame-coalesce'
import {
  clampChatWidth,
  paneChatFile,
  type PaneAiSurface,
  type PaneChat
} from './model'

/**
 * The pane's chat column (CP-MVP-008 S06) — right pane chrome on the
 * pane-tree pattern: it stands beside the tabs, not inside them, and
 * survives tab switches. Multi-turn requests travel the SAME operation
 * contract as every AI run (prior turns as `thread`, validated in
 * main); answers are insertable into the pane's open note through the
 * SAME buffer + save path as any accepted patch; and the transcript
 * persists as an ordinary vault note under chats/ — born at the FIRST
 * message, never on open (S01 pin: no writes on open).
 */

export type ChatPanelProps = {
  chat: PaneChat
  /** Merges column preferences (on/w/file) into the pane state. */
  onPatch: (patch: Record<string, string>) => void
  /** The pane's mounted editor at call time (S06 bridge); null when no
   *  editable note view is active. */
  getAiSurface: () => PaneAiSurface | null
}

/** Session-only metadata of a freshly answered turn (trace decision +
 *  claim chips); restored transcripts are plain text again. */
type TurnMeta = { bundleId: string; claims: ClaimRecord[] }

const md = noteMarkdown()

export function ChatPanel({
  chat,
  onPatch,
  getAiSurface
}: ChatPanelProps): React.JSX.Element {
  const file = paneChatFile(chat)
  const [turns, setTurns] = useState<ChatTurn[]>([])
  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const [engine, setEngine] = useState('…')
  const runningOperationId = useRef<string | null>(null)
  const metaByTurn = useRef(new Map<number, TurnMeta>())
  const scrollRef = useRef<HTMLDivElement | null>(null)
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

  // The transcript is a NOTE: (re)opening the column loads whatever
  // the file says now — hand edits included. A missing file (deleted
  // from the tree) resets to a fresh chat instead of erroring forever.
  // A file THIS session just created is already in local state — the
  // guard keeps the prop echo from racing the in-flight answer.
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
        if (live) setTurns(parseChatTurns(note.content))
      },
      () => {
        if (live) {
          setTurns([])
          onPatch({ file: '' })
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
          onPatch({ file: relPath })
          return relPath
        } catch (reason) {
          lastError = reason // taken name — try the next suffix
        }
      }
      throw lastError
    },
    [engine, onPatch]
  )

  const send = useCallback(async (): Promise<void> => {
    const text = input.trim()
    if (text.length === 0 || running) return
    const surface = getAiSurface()
    if (!surface) {
      setError('Open a note in this pane (live or source mode) to chat over it.')
      return
    }
    setError(null)
    try {
      const prompts = await loadPromptsFor(surface.notePath, window.atomik).catch(
        () => []
      )
      const prepared = await prepareAiRun(
        {
          noteRelPath: surface.notePath,
          doc: surface.getDoc(),
          selection: surface.getSelection(),
          instruction: text,
          systemStack: [],
          prompts,
          destination: 'append',
          newNotePath: ''
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
  }, [getAiSurface, input, persistTurn, running, turns])

  const cancel = useCallback(() => {
    const id = runningOperationId.current
    if (id) void window.atomik.cancelAiOperation(id).catch(() => undefined)
  }, [])

  /** Into the note through the SAME patch flow (06): the pane's editor
   *  applies + saves; inserting IS the accept decision for the trace. */
  const insert = useCallback(
    async (index: number, text: string): Promise<void> => {
      const surface = getAiSurface()
      if (!surface) {
        setError('Open a note in this pane (live or source mode) to insert into it.')
        return
      }
      setError(null)
      try {
        await surface.insert(text)
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
    [getAiSurface]
  )

  const newChat = useCallback(() => {
    metaByTurn.current.clear()
    fileRef.current = null
    loadedRef.current = null
    setTurns([])
    setError(null)
    onPatch({ file: '' })
  }, [onPatch])

  const onResizePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault()
      const handle = event.currentTarget
      const panel = handle.parentElement
      if (!panel) return
      const right = panel.getBoundingClientRect().right
      handle.setPointerCapture(event.pointerId)
      const applyWidth = frameCoalesced((px: number) =>
        onPatch({ w: String(px) })
      )
      const onMove = (move: PointerEvent): void => {
        applyWidth(clampChatWidth(right - move.clientX))
      }
      const onUp = (): void => {
        handle.removeEventListener('pointermove', onMove)
        handle.removeEventListener('pointerup', onUp)
      }
      handle.addEventListener('pointermove', onMove)
      handle.addEventListener('pointerup', onUp)
    },
    [onPatch]
  )

  const title = file
    ? (file.split('/').pop() ?? file).replace(/\.md$/i, '')
    : 'New chat'

  return (
    <aside className="pane-chat" aria-label="Chat panel">
      <div
        className="chat-resize"
        role="separator"
        aria-orientation="vertical"
        onPointerDown={onResizePointerDown}
      />
      <div className="tree-bar">
        <span className="tree-bar-label" title={file ?? 'no transcript yet — born at the first message'}>
          chat · {engine}
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
        <button
          type="button"
          className="tree-toggle"
          title="Hide chat panel"
          aria-label="Hide chat panel"
          onClick={() => onPatch({ on: '0' })}
        >
          <CloseIcon />
        </button>
      </div>
      <div className="chat-scroll" ref={scrollRef}>
        <p className="chat-title" title={file ?? undefined}>
          {title}
        </p>
        {turns.length === 0 && !running && (
          <p className="chat-hint">
            Ask about the note (or its selection) open in this pane. The
            transcript becomes an ordinary note in chats/ at your first
            message.
          </p>
        )}
        {turns.map((turn, index) => {
          const meta = metaByTurn.current.get(index)
          return (
            <article key={index} className={`chat-turn role-${turn.role}`}>
              <header className="chat-turn-head">
                <span className="chat-turn-role">{turn.role}</span>
                {turn.role === 'atomik' && (
                  <button
                    type="button"
                    className="icon-button chat-insert"
                    title="Insert this answer into the note at the cursor"
                    aria-label="Insert into note"
                    onClick={() => void insert(index, turn.text)}
                  >
                    <InsertIcon />
                  </button>
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
      <div className="chat-input">
        <textarea
          rows={2}
          value={input}
          placeholder="Ask about this note… Enter sends, Shift+Enter breaks"
          aria-label="Chat message"
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              void send()
            }
          }}
        />
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
    </aside>
  )
}
