import { appendFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import type {
  AiOperation,
  AiResponseBundle,
  AiTraceDecision,
  TraceSummary
} from '../shared/ipc-contract'

/**
 * Minimal ActionTrace ledger (S09) — the incubating execution-core seat
 * (14). Exactly the S09 minimum, nothing more (the path's thinness rule):
 * one JSON line per resolved operation, appended to
 * `.atomik/usage/private/actions.jsonl` — append-only, git-ignored,
 * content-minimized (27/33): identifiers, counts, timing, outcome. Never
 * prompts, selections, or generated text (`contentRecorded: false`).
 *
 * The line already wears 06's ActionTrace SHAPE (execution / usage /
 * performance / billing / outcome / privacy) so later fields extend
 * instead of reshaping — "use the final trace shape from the beginning"
 * (roadmap M2). A torn final line from a crash is acceptable for private
 * telemetry; future readers skip unparseable lines.
 */

type ActionTraceLine = {
  id: string
  operationId: string
  timestamp: string
  action: 'generate'
  execution: {
    location: 'deterministic'
    provider: string
    model: string
    modelVersion: string
  }
  usage: {
    estimatedInputTokens: number
    estimatedOutputTokens: number
  }
  performance: { wallMs: number }
  billing: { currency: 'EUR'; estimatedAmount: 0; basis: 'estimated' }
  outcome: { status: 'completed' | 'failed'; decision?: AiTraceDecision }
  privacy: { mode: 'offline'; contentRecorded: false }
}

/** Rough chars/4 heuristic, honestly labeled estimated everywhere. */
const estimateTokens = (chars: number): number => Math.max(1, Math.ceil(chars / 4))

const DECISIONS: ReadonlySet<string> = new Set(['accepted', 'edited', 'rejected'])

export class ActionTraceLedger {
  private readonly drafts = new Map<string, ActionTraceLine>()

  constructor(private readonly stateDir: string) {}

  ledgerPath(): string {
    return join(this.stateDir, 'usage', 'private', 'actions.jsonl')
  }

  private append(line: ActionTraceLine): void {
    mkdirSync(join(this.stateDir, 'usage', 'private'), { recursive: true })
    appendFileSync(this.ledgerPath(), `${JSON.stringify(line)}\n`, 'utf8')
  }

  /** Called when the mock completes; the line waits for the decision. */
  draftFor(
    operation: AiOperation,
    bundle: AiResponseBundle,
    wallMs: number
  ): string {
    const inputChars =
      operation.instruction.length +
      operation.input.reduce((total, selection) => total + selection.content.length, 0)
    const outputChars =
      bundle.blocks.reduce((total, block) => total + block.content.length, 0) +
      bundle.patchProposals.reduce(
        (total, proposal) =>
          total + proposal.files.reduce((sum, file) => sum + file.newText.length, 0),
        0
      )
    const line: ActionTraceLine = {
      id: `trace_${randomUUID()}`,
      operationId: operation.id,
      timestamp: new Date().toISOString(),
      action: 'generate',
      execution: {
        location: 'deterministic',
        provider: 'atomik',
        model: 'mock',
        modelVersion: 's08'
      },
      usage: {
        estimatedInputTokens: estimateTokens(inputChars),
        estimatedOutputTokens: estimateTokens(outputChars)
      },
      performance: { wallMs },
      billing: { currency: 'EUR', estimatedAmount: 0, basis: 'estimated' },
      outcome: { status: 'completed' },
      privacy: { mode: 'offline', contentRecorded: false }
    }
    this.drafts.set(bundle.id, line)
    return line.id
  }

  summary(bundleId: unknown): TraceSummary | null {
    if (typeof bundleId !== 'string') return null
    const draft = this.drafts.get(bundleId)
    if (!draft) return null
    return {
      traceId: draft.id,
      location: draft.execution.location,
      provider: draft.execution.provider,
      model: draft.execution.model,
      wallMs: draft.performance.wallMs,
      estimatedInputTokens: draft.usage.estimatedInputTokens,
      estimatedOutputTokens: draft.usage.estimatedOutputTokens,
      estimatedExternalCost: {
        currency: draft.billing.currency,
        amount: draft.billing.estimatedAmount
      }
    }
  }

  /** The decision completes the line; it is appended exactly once. */
  resolve(bundleId: unknown, decision: unknown): void {
    if (typeof bundleId !== 'string' || typeof decision !== 'string' || !DECISIONS.has(decision)) {
      throw new Error('trace: rejected resolution')
    }
    const draft = this.drafts.get(bundleId)
    if (!draft) throw new Error('trace: unknown bundle')
    this.drafts.delete(bundleId)
    this.append({
      ...draft,
      outcome: { status: 'completed', decision: decision as AiTraceDecision }
    })
  }

  /** A failed run is appended immediately; there is no decision to wait for. */
  recordFailure(operationId: string, wallMs: number): void {
    this.append({
      id: `trace_${randomUUID()}`,
      operationId,
      timestamp: new Date().toISOString(),
      action: 'generate',
      execution: {
        location: 'deterministic',
        provider: 'atomik',
        model: 'mock',
        modelVersion: 's08'
      },
      usage: { estimatedInputTokens: 0, estimatedOutputTokens: 0 },
      performance: { wallMs },
      billing: { currency: 'EUR', estimatedAmount: 0, basis: 'estimated' },
      outcome: { status: 'failed' },
      privacy: { mode: 'offline', contentRecorded: false }
    })
  }

  /** App quit: undecided operations are still real compute — append them
   *  without a decision rather than losing them. */
  flush(): void {
    for (const draft of this.drafts.values()) {
      this.append(draft)
    }
    this.drafts.clear()
  }
}
