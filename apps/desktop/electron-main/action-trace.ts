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
    location: 'deterministic' | 'cloud-model'
    provider: string
    model: string
    modelVersion: string
  }
  usage: {
    estimatedInputTokens: number
    estimatedOutputTokens: number
    /** Provider-reported counts when the provider returned them (S02);
     *  `basis` names which pair is authoritative — each labeled (06). */
    reportedInputTokens?: number
    reportedOutputTokens?: number
    basis?: 'provider-reported' | 'estimated'
  }
  performance: { wallMs: number }
  billing: {
    currency: 'EUR' | 'USD'
    estimatedAmount: number
    basis: 'estimated'
    /** The dated price snapshot behind the estimate (33). */
    priceSnapshotId?: string
  }
  outcome: { status: 'completed' | 'failed'; decision?: AiTraceDecision }
  privacy: { mode: 'offline' | 'cloud'; contentRecorded: false }
}

/** Engine identity + labeled usage/billing a real adapter reports
 *  (CP-MVP-008 S02); absent → the S08 mock identity. */
export type GenerationTraceMeta = {
  location: 'deterministic' | 'cloud-model'
  provider: string
  model: string
  modelVersion: string
  usage?: {
    inputTokens: number
    outputTokens: number
    basis: 'provider-reported' | 'estimated'
  }
  billing?: {
    currency: 'USD'
    estimatedAmount: number
    basis: 'estimated'
    priceSnapshotId: string
  }
}

const MOCK_META: GenerationTraceMeta = {
  location: 'deterministic',
  provider: 'atomik',
  model: 'mock',
  modelVersion: 's08'
}

/**
 * Transcription line (S06): beyond the S09 'generate' minimum, per 33 +
 * the trace contract — action 'transcribe', full runtime identity, input
 * bytes + content hash (never content), audioSeconds seat null until the
 * audio companion (S08). Appended immediately: the human decision for a
 * transcript is the S07 correction, recorded in the DOSSIER, not here.
 */
type TranscribeTraceLine = {
  id: string
  timestamp: string
  action: 'transcribe' | 'extract'
  execution: {
    location: 'deterministic' | 'local-model' | 'cloud-model'
    provider: 'atomik'
    model: string
    modelVersion: string
    runtime: string
    runtimeVersion: string
  }
  input: { bytes: number; audioSeconds: number | null; contentHashes: string[] }
  performance: { wallMs: number }
  billing: { currency: 'EUR'; estimatedAmount: 0; basis: 'estimated' }
  outcome: { status: 'completed' | 'failed' }
  privacy: { mode: 'offline'; contentRecorded: false }
}

export type TranscriptionRecord = {
  id: string
  /** 'transcribe' (default) or 'extract' — PDF extraction (CP-MVP-003
   *  S05) rides the same shape: identity, bytes+hash, wall, outcome. */
  action?: 'transcribe' | 'extract'
  output: {
    model: string
    modelVersion: string
    runtime: string
    runtimeVersion: string
    location: 'deterministic' | 'local-model' | 'cloud-model'
  } | null
  inputBytes: number
  contentSha256: string
  audioSeconds?: number | null
  wallMs: number
  status: 'completed' | 'failed'
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

  private append(line: ActionTraceLine | TranscribeTraceLine): void {
    mkdirSync(join(this.stateDir, 'usage', 'private'), { recursive: true })
    appendFileSync(this.ledgerPath(), `${JSON.stringify(line)}\n`, 'utf8')
  }

  /** Pre-generated so files can reference the trace before it lands. */
  newTraceId(): string {
    return `trace_${randomUUID()}`
  }

  /** One line per transcription run, appended immediately (S06). */
  recordTranscription(record: TranscriptionRecord): string {
    this.append({
      id: record.id,
      timestamp: new Date().toISOString(),
      action: record.action ?? 'transcribe',
      execution: {
        location: record.output?.location ?? 'deterministic',
        provider: 'atomik',
        model: record.output?.model ?? 'unknown',
        modelVersion: record.output?.modelVersion ?? 'unknown',
        runtime: record.output?.runtime ?? 'unknown',
        runtimeVersion: record.output?.runtimeVersion ?? 'unknown'
      },
      input: {
        bytes: record.inputBytes,
        // runtime-reported only (33): null when nothing decoded audio
        audioSeconds: record.audioSeconds ?? null,
        contentHashes: [record.contentSha256]
      },
      performance: { wallMs: record.wallMs },
      billing: { currency: 'EUR', estimatedAmount: 0, basis: 'estimated' },
      outcome: { status: record.status },
      privacy: { mode: 'offline', contentRecorded: false }
    })
    return record.id
  }

  /** Called when an engine completes; the line waits for the decision.
   *  `meta` is the answering adapter's identity + labeled usage/billing
   *  (S02) — provider-reported counts preferred over estimates, the
   *  external cost estimated from a dated price snapshot (33). */
  draftFor(
    operation: AiOperation,
    bundle: AiResponseBundle,
    wallMs: number,
    meta: GenerationTraceMeta = MOCK_META
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
    const reported = meta.usage?.basis === 'provider-reported' ? meta.usage : undefined
    const line: ActionTraceLine = {
      id: `trace_${randomUUID()}`,
      operationId: operation.id,
      timestamp: new Date().toISOString(),
      action: 'generate',
      execution: {
        location: meta.location,
        provider: meta.provider,
        model: meta.model,
        modelVersion: meta.modelVersion
      },
      usage: {
        estimatedInputTokens: estimateTokens(inputChars),
        estimatedOutputTokens: estimateTokens(outputChars),
        ...(reported
          ? {
              reportedInputTokens: reported.inputTokens,
              reportedOutputTokens: reported.outputTokens
            }
          : {}),
        ...(meta.usage ? { basis: meta.usage.basis } : {})
      },
      performance: { wallMs },
      billing: meta.billing ?? {
        currency: 'EUR',
        estimatedAmount: 0,
        basis: 'estimated'
      },
      outcome: { status: 'completed' },
      privacy: {
        mode: meta.location === 'cloud-model' ? 'cloud' : 'offline',
        contentRecorded: false
      }
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
      // best-known counts for the badge: provider-reported when present
      // (the LINE keeps both pairs, each labeled)
      estimatedInputTokens:
        draft.usage.reportedInputTokens ?? draft.usage.estimatedInputTokens,
      estimatedOutputTokens:
        draft.usage.reportedOutputTokens ?? draft.usage.estimatedOutputTokens,
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

  /** A failed run is appended immediately; there is no decision to wait
   *  for. `meta` names the engine that failed (S02). */
  recordFailure(
    operationId: string,
    wallMs: number,
    meta: GenerationTraceMeta = MOCK_META
  ): void {
    this.append({
      id: `trace_${randomUUID()}`,
      operationId,
      timestamp: new Date().toISOString(),
      action: 'generate',
      execution: {
        location: meta.location,
        provider: meta.provider,
        model: meta.model,
        modelVersion: meta.modelVersion
      },
      usage: { estimatedInputTokens: 0, estimatedOutputTokens: 0 },
      performance: { wallMs },
      billing: { currency: 'EUR', estimatedAmount: 0, basis: 'estimated' },
      outcome: { status: 'failed' },
      privacy: {
        mode: meta.location === 'cloud-model' ? 'cloud' : 'offline',
        contentRecorded: false
      }
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
