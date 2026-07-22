import { useEffect, useRef, useState } from 'react'
import { CheckIcon } from '../icons'
import { PRESETS } from './AiPanel'
import {
  groupPromptsByScope,
  layerDirectiveFor,
  loadPromptsFor,
  scopeLabel,
  toggleStackBlock,
  type PromptFile
} from './prompts'

/**
 * The selection AI menu (CP-MVP-008 S04, owner directive): highlight
 * note text → right-click (or Shift+F10) → the contextual AI request
 * menu at the click location. TreeMenu machinery: hand-rolled popup,
 * on-screen clamping, action → input morph in place. The AI trigger
 * LIVES here now — the note-bar top row keeps editing concerns only.
 *
 * Quick actions are the note's resolved MESSAGE prompts (scope-grouped,
 * nearest first) plus the built-ins; a quick action runs the prompt's
 * LAYER DIRECTIVE (composed at run time, S03d). "Custom…" morphs into
 * an instruction input with system-prompt PILLS — click order builds
 * the system stack (S03f). "Open chat" opens the conversational
 * surface (the docked panel until S06's lateral column).
 */

export type AiMenuRequest = {
  instruction: string
  preset?: string
  stack: string[]
}

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
  const [mode, setMode] = useState<'menu' | 'custom'>('menu')
  const [prompts, setPrompts] = useState<PromptFile[]>([])
  const [custom, setCustom] = useState('')
  const [stack, setStack] = useState<string[]>([])
  const panelRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    loadPromptsFor(notePath, window.atomik).then(setPrompts, () => setPrompts([]))
  }, [notePath])

  useEffect(() => {
    if (mode === 'custom') inputRef.current?.focus()
  }, [mode])

  // On-screen clamping (TreeMenu pattern): a right-click near an edge
  // must not push the menu out of view.
  useEffect(() => {
    const panel = panelRef.current
    if (!panel) return
    const rect = panel.getBoundingClientRect()
    const dx = Math.min(0, window.innerWidth - 8 - rect.right)
    const dy = Math.min(0, window.innerHeight - 8 - rect.bottom)
    panel.style.transform = `translate(${dx}px, ${dy}px)`
  }, [mode, prompts.length])

  const excerpt =
    selectionText.trim().length > 0
      ? `“${selectionText.trim().replace(/\s+/g, ' ').slice(0, 60)}${selectionText.trim().length > 60 ? '…' : ''}”`
      : 'whole note'

  const runCustom = (): void => {
    if (custom.trim().length === 0) return
    onRun({ instruction: custom, stack })
  }

  const messageGroups = groupPromptsByScope(
    prompts.filter((prompt) => prompt.kind === 'message'),
    notePath
  )
  const systemPrompts = prompts.filter((prompt) => prompt.kind === 'system')

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
        {mode === 'menu' ? (
          <>
            {messageGroups.map((group) => (
              <div key={group.scope} className="ai-menu-group">
                <div className="ai-menu-scope">{group.scope}</div>
                {group.prompts.map((prompt) => (
                  <button
                    key={prompt.relPath}
                    type="button"
                    role="menuitem"
                    title={prompt.description ?? prompt.relPath}
                    onClick={() =>
                      onRun({
                        instruction: layerDirectiveFor(prompt.name),
                        preset: `file:${prompt.name}`,
                        stack: []
                      })
                    }
                  >
                    {prompt.title}
                  </button>
                ))}
              </div>
            ))}
            <div className="ai-menu-group">
              <div className="ai-menu-scope">built-in</div>
              {PRESETS.map((spec) => (
                <button
                  key={spec.id}
                  type="button"
                  role="menuitem"
                  onClick={() =>
                    onRun({ instruction: spec.instruction, preset: spec.id, stack: [] })
                  }
                >
                  {spec.label}
                </button>
              ))}
            </div>
            <button type="button" role="menuitem" onClick={() => setMode('custom')}>
              Custom…
            </button>
            <button type="button" role="menuitem" onClick={onOpenChat}>
              Open chat
            </button>
          </>
        ) : (
          <div className="ai-menu-custom">
            {systemPrompts.length > 0 && (
              <div className="ai-menu-pills" role="group" aria-label="System blocks">
                {systemPrompts.map((prompt) => {
                  const position = stack.indexOf(prompt.relPath)
                  return (
                    <button
                      key={prompt.relPath}
                      type="button"
                      className={position >= 0 ? 'active' : ''}
                      aria-pressed={position >= 0}
                      title={`${prompt.description ?? prompt.title} · ${scopeLabel(prompt.scopeFolder, notePath)} — click order builds the stack`}
                      onClick={() =>
                        setStack((current) => toggleStackBlock(current, prompt.relPath))
                      }
                    >
                      {position >= 0 ? `${position + 1} · ` : ''}
                      {prompt.title}
                    </button>
                  )
                })}
              </div>
            )}
            <div className="tree-menu-form">
              <textarea
                ref={inputRef}
                rows={3}
                value={custom}
                placeholder="Ask about the selection… Ctrl+Enter runs"
                aria-label="Custom AI instruction"
                onChange={(event) => setCustom(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
                    event.preventDefault()
                    runCustom()
                  }
                }}
              />
              <button
                type="button"
                disabled={custom.trim().length === 0}
                title="Run"
                aria-label="Run"
                onClick={runCustom}
              >
                <CheckIcon />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
