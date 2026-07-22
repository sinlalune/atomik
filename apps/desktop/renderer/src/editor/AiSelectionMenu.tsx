import { useEffect, useRef, useState } from 'react'
import { PlayIcon } from '../icons'
import { PRESETS } from './AiPanel'
import {
  composeMenuInstruction,
  loadPromptsFor,
  scopeLabel,
  toggleStackBlock,
  visibleMenuPrompts,
  type PromptFile
} from './prompts'

/**
 * The selection AI menu (CP-MVP-008 S04; S04c owner redesign: "first
 * and only contextual display"): ONE screen, no morph — orderable
 * MESSAGE picks, orderable SYSTEM stack, built-ins, an OPTIONAL input,
 * one Run. Click order numbers the pills on BOTH sides (the S03f
 * nesting direction at a click); message picks + built-ins share one
 * sequence composing into the instruction (directives for files, raw
 * lines for built-ins, typed input last); the system sequence is the
 * stack. Enter runs and closes. Past the display cap a search bar
 * appears; picked pills never drop out of view.
 */

export type AiMenuRequest = {
  instruction: string
  preset?: string
  stack: string[]
  /** How the proposal integrates (owner, S04e): replace the
   *  selection, append to the note, or a new note. */
  destination: 'replace-selection' | 'append' | 'new-note'
}

/** Search appears when the vault offers more labels than this. */
export const MENU_SEARCH_THRESHOLD = 10
/** Per-section display cap (picked pills always shown on top of it). */
export const MENU_SECTION_MAX = 6

export function AiSelectionMenu({
  x,
  y,
  notePath,
  selectionText,
  onClose,
  onRun,
  onOpenChat
}: {
  x: number
  y: number
  notePath: string
  /** Empty when the request scopes to the whole note. */
  selectionText: string
  onClose: () => void
  onRun: (request: AiMenuRequest) => void
  onOpenChat: () => void
}): React.JSX.Element {
  const [prompts, setPrompts] = useState<PromptFile[]>([])
  const [query, setQuery] = useState('')
  /** Prompt relPaths and `builtin:<id>` in click order. */
  const [messageOrder, setMessageOrder] = useState<string[]>([])
  const [systemOrder, setSystemOrder] = useState<string[]>([])
  const [input, setInput] = useState('')
  const [destination, setDestination] = useState<AiMenuRequest['destination']>('append')
  const panelRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const hasSelection = selectionText.trim().length > 0

  useEffect(() => {
    loadPromptsFor(notePath, window.atomik).then(setPrompts, () => setPrompts([]))
  }, [notePath])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // On-screen clamping (TreeMenu pattern).
  useEffect(() => {
    const panel = panelRef.current
    if (!panel) return
    const rect = panel.getBoundingClientRect()
    const dx = Math.min(0, window.innerWidth - 8 - rect.right)
    const dy = Math.min(0, window.innerHeight - 8 - rect.bottom)
    panel.style.transform = `translate(${dx}px, ${dy}px)`
  }, [prompts.length, query])

  const excerpt =
    selectionText.trim().length > 0
      ? `“${selectionText.trim().replace(/\s+/g, ' ').slice(0, 60)}${selectionText.trim().length > 60 ? '…' : ''}”`
      : 'whole note'

  const messagePrompts = prompts.filter((prompt) => prompt.kind === 'message')
  const systemPrompts = prompts.filter((prompt) => prompt.kind === 'system')
  const showSearch = prompts.length > MENU_SEARCH_THRESHOLD

  const runnable =
    messageOrder.length > 0 || input.trim().length > 0
  const runNow = (): void => {
    if (!runnable) return
    const instruction = composeMenuInstruction(messageOrder, prompts, PRESETS, input)
    if (instruction.length === 0) return
    const single =
      messageOrder.length === 1 && input.trim().length === 0
        ? messageOrder[0]!
        : null
    onRun({
      instruction,
      ...(single
        ? {
            preset: single.startsWith('builtin:')
              ? single.slice(8)
              : `file:${prompts.find((prompt) => prompt.relPath === single)?.name ?? single}`
          }
        : {}),
      stack: systemOrder,
      destination
    })
  }

  const orderedPill = (
    entry: string,
    order: string[],
    setOrder: (next: string[]) => void,
    label: string,
    title: string
  ): React.JSX.Element => {
    const position = order.indexOf(entry)
    return (
      <button
        key={entry}
        type="button"
        className={position >= 0 ? 'active' : ''}
        aria-pressed={position >= 0}
        title={`${title} — click order composes`}
        onClick={() => setOrder(toggleStackBlock(order, entry))}
      >
        {position >= 0 ? `${position + 1} · ` : ''}
        {label}
      </button>
    )
  }

  return (
    <div
      className="tree-menu-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
      onContextMenu={(event) => {
        event.preventDefault()
        if (event.target === event.currentTarget) onClose()
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') onClose()
      }}
    >
      <div
        ref={panelRef}
        className="tree-menu ai-selection-menu"
        style={{ left: x, top: y }}
        role="menu"
        aria-label={`AI actions — ${excerpt}`}
      >
        <div className="tree-menu-head" title={notePath}>
          {excerpt}
        </div>
        {showSearch && (
          <input
            className="ai-menu-search"
            value={query}
            placeholder="filter prompts…"
            aria-label="Filter prompts"
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                runNow()
              }
            }}
          />
        )}
        {messagePrompts.length > 0 && (
          <div className="ai-menu-group">
            <div className="ai-menu-scope">message</div>
            <div className="ai-menu-pills">
              {visibleMenuPrompts(
                messagePrompts,
                new Set(messageOrder),
                query,
                MENU_SECTION_MAX
              ).map((prompt) =>
                orderedPill(
                  prompt.relPath,
                  messageOrder,
                  setMessageOrder,
                  prompt.title,
                  `${prompt.description ?? prompt.title} · ${scopeLabel(prompt.scopeFolder, notePath)}`
                )
              )}
            </div>
          </div>
        )}
        {systemPrompts.length > 0 && (
          <div className="ai-menu-group">
            <div className="ai-menu-scope">system</div>
            <div className="ai-menu-pills">
              {visibleMenuPrompts(
                systemPrompts,
                new Set(systemOrder),
                query,
                MENU_SECTION_MAX
              ).map((prompt) =>
                orderedPill(
                  prompt.relPath,
                  systemOrder,
                  setSystemOrder,
                  prompt.title,
                  `${prompt.description ?? prompt.title} · ${scopeLabel(prompt.scopeFolder, notePath)}`
                )
              )}
            </div>
          </div>
        )}
        <div className="ai-menu-group">
          <div className="ai-menu-scope">built-in</div>
          <div className="ai-menu-pills">
            {PRESETS.map((spec) =>
              orderedPill(
                `builtin:${spec.id}`,
                messageOrder,
                setMessageOrder,
                spec.label,
                spec.instruction
              )
            )}
          </div>
        </div>
        <div className="ai-menu-group">
          <div className="ai-menu-scope">destination</div>
          <div className="ai-menu-pills" role="radiogroup" aria-label="Destination">
            {(
              [
                { kind: 'replace-selection', label: 'replace' },
                { kind: 'append', label: 'append' },
                { kind: 'new-note', label: 'new note' }
              ] as const
            ).map((option) => (
              <button
                key={option.kind}
                type="button"
                role="radio"
                aria-checked={destination === option.kind}
                className={destination === option.kind ? 'active' : ''}
                disabled={option.kind === 'replace-selection' && !hasSelection}
                title={
                  option.kind === 'replace-selection' && !hasSelection
                    ? 'Needs a selection'
                    : undefined
                }
                onClick={() => setDestination(option.kind)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <div className="ai-menu-custom">
          <textarea
            ref={inputRef}
            rows={2}
            value={input}
            placeholder="add your own ask (optional) — Enter runs"
            aria-label="Custom AI instruction"
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                runNow()
              }
            }}
          />
        </div>
        <div className="ai-menu-footer">
          <button type="button" className="ai-menu-chat" onClick={onOpenChat}>
            Open chat
          </button>
          <button
            type="button"
            className="ai-menu-run"
            disabled={!runnable}
            title={runnable ? 'Run (Enter)' : 'Pick a prompt or type an ask'}
            aria-label="Run"
            onClick={runNow}
          >
            <PlayIcon /> Run
          </button>
        </div>
      </div>
    </div>
  )
}
