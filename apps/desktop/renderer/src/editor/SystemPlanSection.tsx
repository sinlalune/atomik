import { useState } from 'react'
import type {
  BuiltinOverrides,
  DestinationKind
} from '../../../shared/prompt-composition'
import type { PromptFile } from './prompts'
import {
  defaultSystemPlan,
  isDefaultSystemPlan,
  moveSystemPlanEntry,
  systemPlanEntryBody,
  systemPlanEntryFile,
  systemPlanEntryLabel,
  type SystemPlanEntry
} from './system-plan'

/**
 * The SYSTEM section (S07b8, owner: "first section in both UI"): the
 * system message as visible, editable chips — preloaded with the
 * built-in blocks, reorderable (◂ ▸), removable (×), extendable with
 * the vault's system prompts (+). Every chip carries its live body
 * preview and token estimate on hover (the same text that travels —
 * display = sent), and opens its backing file on click when one
 * exists. A ↺ appears the moment the plan differs from the default.
 */

const estimateTokens = (chars: number): number =>
  chars === 0 ? 0 : Math.max(1, Math.ceil(chars / 4))

export function SystemPlanSection({
  plan,
  onChange,
  destination,
  builtins,
  prompts,
  mode,
  onOpenFile
}: {
  plan: SystemPlanEntry[]
  onChange: (next: SystemPlanEntry[]) => void
  destination: DestinationKind
  builtins: BuiltinOverrides
  prompts: PromptFile[]
  /** 'chat' previews the conversation-mode resolution (S07b12). */
  mode?: 'chat'
  /** Opens an entry's backing file for editing (revealNote-style). */
  onOpenFile?: (relPath: string) => void
}): React.JSX.Element {
  const [adding, setAdding] = useState(false)
  const inPlan = new Set(
    plan.map((entry) => (entry.kind === 'prompt' ? entry.relPath : ''))
  )
  const addable = prompts.filter(
    (prompt) => prompt.kind === 'system' && !inPlan.has(prompt.relPath)
  )
  const totalTokens = plan.reduce(
    (sum, entry) =>
      sum +
      estimateTokens(
        systemPlanEntryBody(entry, destination, builtins, prompts, mode).length
      ),
    0
  )
  return (
    <div className="sys-plan" aria-label="System message composition">
      <div className="sys-plan-head">
        <span className="sys-plan-title">system</span>
        <span
          className="sys-plan-total"
          title="estimated tokens of the composed system message (chars/4)"
        >
          ~{totalTokens} tok
        </span>
        {!isDefaultSystemPlan(plan) && (
          <button
            type="button"
            className="sys-plan-reset"
            title="Restore the default system composition"
            aria-label="Restore default system"
            onClick={() => onChange(defaultSystemPlan())}
          >
            ↺
          </button>
        )}
      </div>
      <div className="sys-plan-chips">
        {plan.length === 0 && (
          <span className="sys-plan-empty">empty — nothing rides as system</span>
        )}
        {plan.map((entry, index) => {
          const body = systemPlanEntryBody(entry, destination, builtins, prompts, mode)
          const file = systemPlanEntryFile(entry, destination, mode)
          const label = systemPlanEntryLabel(entry, prompts)
          return (
            <span
              key={`${entry.kind}:${entry.kind === 'builtin' ? entry.id : entry.relPath}`}
              className={`sys-plan-chip kind-${entry.kind}`}
              title={`${label} · ~${estimateTokens(body.length)} tok${file ? ' · click to edit the file' : ''}\n\n${body.slice(0, 280)}${body.length > 280 ? '…' : ''}`}
            >
              <button
                type="button"
                className="sys-plan-move"
                aria-label={`Move ${label} earlier`}
                disabled={index === 0}
                onClick={() => onChange(moveSystemPlanEntry(plan, index, -1))}
              >
                ‹
              </button>
              <button
                type="button"
                className="sys-plan-open"
                onClick={() => {
                  if (file && onOpenFile) onOpenFile(file)
                }}
              >
                {label}
              </button>
              <button
                type="button"
                className="sys-plan-move"
                aria-label={`Move ${label} later`}
                disabled={index === plan.length - 1}
                onClick={() => onChange(moveSystemPlanEntry(plan, index, 1))}
              >
                ›
              </button>
              <button
                type="button"
                className="sys-plan-remove"
                aria-label={`Remove ${label} from the system message`}
                title="Remove from the system message (this run/conversation only — the file stays)"
                onClick={() => onChange(plan.filter((_, at) => at !== index))}
              >
                ×
              </button>
            </span>
          )
        })}
        <span className="sys-plan-add">
          <button
            type="button"
            className="sys-plan-add-toggle"
            title="Add a system prompt from the vault"
            aria-expanded={adding}
            onClick={() => setAdding((open) => !open)}
          >
            +
          </button>
          {adding && (
            <div className="chat-pop sys-plan-pop" role="listbox" aria-label="Add system prompt">
              {addable.length === 0 && (
                <p className="chat-pop-empty">
                  no further system prompts in scope — create one in prompts/
                </p>
              )}
              {addable.map((prompt) => (
                <button
                  key={prompt.relPath}
                  type="button"
                  role="option"
                  aria-selected={false}
                  title={prompt.description ?? prompt.relPath}
                  onClick={() => {
                    onChange([...plan, { kind: 'prompt', relPath: prompt.relPath }])
                    setAdding(false)
                  }}
                >
                  {prompt.title}
                </button>
              ))}
            </div>
          )}
        </span>
      </div>
    </div>
  )
}
