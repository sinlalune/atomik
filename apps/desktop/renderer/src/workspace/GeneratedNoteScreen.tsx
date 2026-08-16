import { useEffect, useRef, useState } from 'react'
import {
  DEFAULT_GENERATION_MODEL,
  PARAM_LIMITS,
  PROVIDER_CATALOG,
  type GenerationModelId,
  type GenerationParams
} from '../../../shared/generation-params'
import type { ClaimRecord, TraceSummary } from '../../../shared/ipc-contract'
import { prepareAiRun, type SentRequest } from '../editor/ai-run'
import { AiNotePreview } from '../editor/AiNotePreview'
import { PRESETS } from '../editor/ai-helpers'
import {
  composeMenuInstruction,
  loadBuiltinOverridesFor,
  loadPromptsFor,
  scopeLabel,
  toggleStackBlock,
  visibleMenuPrompts,
  type PromptFile
} from '../editor/prompts'
import { MENU_SEARCH_THRESHOLD, MENU_SECTION_MAX } from '../editor/AiSelectionMenu'

/**
 * The new-tab NOTE stage (CP-MVP-008 S05e, owner directive): a "New
 * note" button for the blank flow, and under it the FULL composer from
 * the selection menu — orderable message picks + built-ins, the system
 * stack, search past the cap, the foldable sampling options, a topic
 * and an optional ask — generating a new note FROM SCRATCH. The
 * result previews as the simulated tab (S05c) and is created only on
 * accept, opening in this tab.
 */
export function GeneratedNoteScreen({
  basePath,
  onPlainNewNote,
  onBack,
  onCreated
}: {
  /** Pseudo note path anchoring prompt scoping + file naming (a
   *  project pane passes `<project>/generated.md`). */
  basePath: string
  onPlainNewNote: () => void
  onBack: () => void
  onCreated: (relPath: string) => void
}): React.JSX.Element {
  const [prompts, setPrompts] = useState<PromptFile[]>([])
  const [topic, setTopic] = useState('')
  const [query, setQuery] = useState('')
  const [messageOrder, setMessageOrder] = useState<string[]>([])
  const [systemOrder, setSystemOrder] = useState<string[]>([])
  const [ask, setAsk] = useState('')
  const [model, setModel] = useState<GenerationModelId>(DEFAULT_GENERATION_MODEL)
  const [temperature, setTemperature] = useState('')
  const [topP, setTopP] = useState('')
  const [maxTokens, setMaxTokens] = useState('')
  const [preview, setPreview] = useState<{
    phase: 'running' | 'review' | 'error'
    path: string
    proposal: string
    claims: ClaimRecord[]
    trace: TraceSummary | null
    sent: SentRequest | null
    error?: string
  } | null>(null)
  const metaRef = useRef<{
    operationId: string | null
    bundleId: string | null
    filePath: string | null
    proposal: string
  }>({ operationId: null, bundleId: null, filePath: null, proposal: '' })

  useEffect(() => {
    loadPromptsFor(basePath, window.atomik).then(setPrompts, () => setPrompts([]))
  }, [basePath])

  const messagePrompts = prompts.filter((prompt) => prompt.kind === 'message')
  const systemPrompts = prompts.filter((prompt) => prompt.kind === 'system')
  const showSearch = prompts.length > MENU_SEARCH_THRESHOLD

  const clamp = (
    raw: string,
    limits: { min: number; max: number }
  ): number | undefined => {
    if (raw.trim().length === 0) return undefined
    const parsed = Number(raw)
    if (!Number.isFinite(parsed)) return undefined
    return Math.min(limits.max, Math.max(limits.min, parsed))
  }

  const runnable =
    topic.trim().length > 0 || messageOrder.length > 0 || ask.trim().length > 0

  const runNow = async (): Promise<void> => {
    if (!runnable) return
    const composed = composeMenuInstruction(messageOrder, prompts, PRESETS, ask)
    const instruction =
      composed.length > 0 ? composed : 'Write this note about the subject.'
    const params: GenerationParams = {
      ...(model !== DEFAULT_GENERATION_MODEL ? { model } : {}),
      ...(clamp(temperature, PARAM_LIMITS.temperature) !== undefined
        ? { temperature: clamp(temperature, PARAM_LIMITS.temperature) }
        : {}),
      ...(clamp(topP, PARAM_LIMITS.topP) !== undefined
        ? { topP: clamp(topP, PARAM_LIMITS.topP) }
        : {}),
      ...(clamp(maxTokens, PARAM_LIMITS.maxTokens) !== undefined
        ? { maxTokens: clamp(maxTokens, PARAM_LIMITS.maxTokens) }
        : {})
    }
    metaRef.current = { operationId: null, bundleId: null, filePath: null, proposal: '' }
    setPreview({
      phase: 'running',
      path: '…',
      proposal: '',
      claims: [],
      trace: null,
      sent: null
    })
    try {
      const builtins = await loadBuiltinOverridesFor(
        basePath,
        window.atomik
      ).catch(() => ({}))
      const prepared = await prepareAiRun(
        {
          noteRelPath: basePath,
          doc: '',
          selection: { from: 0, to: 0, text: topic.trim() },
          instruction,
          systemStack: systemOrder,
          prompts,
          builtins,
          destination: 'new-note',
          newNotePath: '',
          ...(Object.keys(params).length > 0 ? { params } : {})
        },
        window.atomik.readNote
      )
      if (!prepared) {
        setPreview(null)
        return
      }
      metaRef.current.operationId = prepared.operation.id
      const plannedPath =
        prepared.operation.target.destination.kind === 'new-note'
          ? prepared.operation.target.destination.newNotePath
          : basePath
      setPreview((current) =>
        current ? { ...current, path: plannedPath, sent: prepared.sent } : current
      )
      const result = await window.atomik.runAiOperation(prepared.operation)
      metaRef.current.bundleId = result.id
      const file = result.patchProposals[0]?.files[0] ?? null
      metaRef.current.filePath = file?.relPath ?? plannedPath
      metaRef.current.proposal = file?.newText ?? ''
      const trace = await window.atomik.getAiTraceSummary(result.id).catch(() => null)
      setPreview({
        phase: 'review',
        path: metaRef.current.filePath,
        proposal: metaRef.current.proposal,
        claims: result.claims,
        trace,
        sent: prepared.sent
      })
    } catch (reason) {
      setPreview((current) =>
        current ? { ...current, phase: 'error', error: String(reason) } : null
      )
    }
  }

  const accept = async (edited: string): Promise<void> => {
    const meta = metaRef.current
    if (!meta.filePath) return
    const decision = edited === meta.proposal ? 'accepted' : 'edited'
    try {
      await window.atomik.createNote(meta.filePath, edited)
      if (meta.bundleId) {
        window.atomik.resolveAiTrace(meta.bundleId, decision).catch(() => undefined)
      }
      onCreated(meta.filePath)
    } catch (reason) {
      setPreview((current) =>
        current ? { ...current, phase: 'error', error: String(reason) } : null
      )
    }
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
        title={title}
        onClick={() => setOrder(toggleStackBlock(order, entry))}
      >
        {position >= 0 ? `${position + 1} · ` : ''}
        {label}
      </button>
    )
  }

  if (preview) {
    return (
      <div className="ai-generate-preview-host">
        <AiNotePreview
          path={preview.path}
          phase={preview.phase}
          proposal={preview.proposal}
          claims={preview.claims}
          trace={preview.trace}
          sent={preview.sent}
          {...(preview.error ? { error: preview.error } : {})}
          onAccept={(edited) => void accept(edited)}
          onReject={() => {
            if (metaRef.current.bundleId) {
              window.atomik
                .resolveAiTrace(metaRef.current.bundleId, 'rejected')
                .catch(() => undefined)
            }
            setPreview(null)
          }}
          onCancel={() => {
            if (metaRef.current.operationId) {
              void window.atomik
                .cancelAiOperation(metaRef.current.operationId)
                .catch(() => undefined)
            }
          }}
        />
      </div>
    )
  }

  return (
    <div className="vault-empty ai-generate-screen">
      <h2>New note</h2>
      <ul className="project-list">
        <li>
          <button type="button" onClick={onPlainNewNote}>
            New note
            <span className="project-path">blank — pick a place in this pane’s tree</span>
          </button>
        </li>
      </ul>
      <h3 className="ai-generate-or">or generate from scratch</h3>
      <div className="ai-generate-composer">
        <input
          className="ai-generate-topic"
          value={topic}
          placeholder="topic — names the note and sets the subject…"
          aria-label="Topic"
          onChange={(event) => setTopic(event.target.value)}
        />
        {showSearch && (
          <input
            className="ai-menu-search"
            value={query}
            placeholder="filter prompts…"
            aria-label="Filter prompts"
            onChange={(event) => setQuery(event.target.value)}
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
                  `${prompt.description ?? prompt.title} · ${scopeLabel(prompt.scopeFolder, basePath)}`
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
                  `${prompt.description ?? prompt.title} · ${scopeLabel(prompt.scopeFolder, basePath)}`
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
        <details className="ai-menu-options">
          <summary>options</summary>
          <div className="ai-menu-options-grid">
            <label>
              model
              <select
                aria-label="Model"
                value={model}
                onChange={(event) => setModel(event.target.value as GenerationModelId)}
              >
                {Object.values(PROVIDER_CATALOG).map((provider) => (
                  <optgroup key={provider.id} label={provider.name}>
                    {provider.models.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label} ({m.id})
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>
            <label>
              temperature
              <input
                type="number"
                step="0.1"
                min={PARAM_LIMITS.temperature.min}
                max={PARAM_LIMITS.temperature.max}
                placeholder={String(PARAM_LIMITS.temperature.default)}
                aria-label="Temperature"
                value={temperature}
                onChange={(event) => setTemperature(event.target.value)}
              />
            </label>
            <label>
              top p
              <input
                type="number"
                step="0.05"
                min={PARAM_LIMITS.topP.min}
                max={PARAM_LIMITS.topP.max}
                placeholder={`${PARAM_LIMITS.topP.default} (default)`}
                aria-label="Top p"
                value={topP}
                onChange={(event) => setTopP(event.target.value)}
              />
            </label>
            <label>
              max tokens
              <input
                type="number"
                step="50"
                min={PARAM_LIMITS.maxTokens.min}
                max={PARAM_LIMITS.maxTokens.max}
                placeholder={String(PARAM_LIMITS.maxTokens.default)}
                aria-label="Max tokens"
                value={maxTokens}
                onChange={(event) => setMaxTokens(event.target.value)}
              />
            </label>
          </div>
        </details>
        <textarea
          className="ai-generate-ask"
          rows={2}
          value={ask}
          placeholder="add your own ask (optional) — Enter runs"
          aria-label="Custom AI instruction"
          onChange={(event) => setAsk(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              void runNow()
            }
          }}
        />
        <div className="ai-generate-actions">
          <button type="button" onClick={onBack}>
            ‹ back
          </button>
          <button
            type="button"
            className="ai-menu-run"
            disabled={!runnable}
            title={runnable ? 'Generate (Enter)' : 'Give a topic, a prompt, or an ask'}
            onClick={() => void runNow()}
          >
            Generate
          </button>
        </div>
      </div>
    </div>
  )
}
