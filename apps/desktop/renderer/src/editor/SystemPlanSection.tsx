import { useState } from 'react'
import {
  BUILTIN_BLOCK_DEFAULTS,
  type BuiltinOverrides,
  type DestinationKind
} from '../../../shared/prompt-composition'
import type { PromptFile } from './prompts'
import {
  addableBlocks,
  defaultSystemPlan,
  isDefaultSystemPlan,
  moveSystemPlanEntry,
  systemBlockLabel,
  systemPlanEntryBody,
  systemPlanEntryFile,
  systemPlanEntryLabel,
  type SystemPlanEntry,
  type SystemPlanVariant
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
  variant,
  onOpenFile
}: {
  plan: SystemPlanEntry[]
  onChange: (next: SystemPlanEntry[]) => void
  destination: DestinationKind
  builtins: BuiltinOverrides
  prompts: PromptFile[]
  /** 'chat' defaults/resets to the CHAT plan (S07b13) — the chips
   *  themselves are always literal, never mode-resolved. */
  variant?: SystemPlanVariant
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
  const addableBlockIds = addableBlocks(plan)
  const totalTokens = plan.reduce(
    (sum, entry) =>
      sum +
      estimateTokens(
        systemPlanEntryBody(entry, destination, builtins, prompts).length
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
        {!isDefaultSystemPlan(plan, variant) && (
          <button
            type="button"
            className="sys-plan-reset"
            title="Restore the default system composition"
            aria-label="Restore default system"
            onClick={() => onChange(defaultSystemPlan(variant))}
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
          const body = systemPlanEntryBody(entry, destination, builtins, prompts)
          const file = systemPlanEntryFile(entry, destination)
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
        <button
          type="button"
          className="sys-plan-add-toggle"
          title="Add a built-in block or a system prompt from the vault"
          aria-expanded={adding}
          onClick={() => setAdding((open) => !open)}
        >
          +
        </button>
      </div>
      {adding && (
        <div className="sys-plan-add-rows" role="group" aria-label="Add to the system message">
          {addableBlockIds.length > 0 && (
            <div className="sys-plan-add-group">
              <span className="sys-plan-add-label">blocks</span>
              {addableBlockIds.map((id) => (
                <button
                  key={id}
                  type="button"
                  className="sys-plan-chip kind-builtin sys-plan-addable"
                  title={`${BUILTIN_BLOCK_DEFAULTS[id].slice(0, 200)}`}
                  onClick={() => {
                    onChange([...plan, { kind: 'builtin', id }])
                    setAdding(false)
                  }}
                >
                  + {systemBlockLabel(id)}
                </button>
              ))}
            </div>
          )}
          <div className="sys-plan-add-group">
            <span className="sys-plan-add-label">prompts</span>
            {addable.length === 0 && (
              <span className="sys-plan-empty">
                none in scope — create one in prompts/
              </span>
            )}
            {addable.map((prompt) => (
              <button
                key={prompt.relPath}
                type="button"
                className="sys-plan-chip kind-prompt sys-plan-addable"
                title={prompt.description ?? prompt.relPath}
                onClick={() => {
                  onChange([...plan, { kind: 'prompt', relPath: prompt.relPath }])
                  setAdding(false)
                }}
              >
                + {prompt.title}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
