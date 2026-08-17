import { appendFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import type {
  AiOperation,
  AiResponseBundle,
  AiTraceDecision,
  TraceSummary
} from '../shared/ipc-contract'
import type { WikimediaTraceRecord } from '../shared/wikimedia'

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

/**
 * One retrieval, as the ledger sees it (CP-MVP-010 S06). 33 asks for
 * search to record "candidates, selected entries, context tokens,
 * latency", and the packet already computes all four — this line is
 * where they become durable. Deterministic location, zero external
 * billing, and the same absolute rule as every other line: no content,
 * ever. The QUERY is not recorded either; it is user text like a prompt.
 */
export type RetrievalRecord = {
  packetId: string
  stages: string[]
  candidates: number
  selected: number
  /** Estimated (chars/4) — named estimated, per 33. */
  contextTokens: number
  /** How much of the query the vault could answer at all. */
  coverage: 'covered' | 'thin' | 'empty'
  wallMs: number
  status: 'completed' | 'failed'
}

type RetrieveTraceLine = {
  id: string
  /** The packet this line measures — the link is one-way on purpose:
   *  telemetry points at knowledge, never the reverse. */
  packetId: string
  timestamp: string
  action: 'retrieve'
  execution: { location: 'deterministic'; provider: 'atomik'; model: 'lexical-bm25' }
  usage: {
    candidates: number
    selected: number
    estimatedContextTokens: number
    basis: 'estimated'
    stages: string[]
    coverage: 'covered' | 'thin' | 'empty'
  }
  performance: { wallMs: number }
  billing: { currency: 'EUR'; estimatedAmount: 0; basis: 'estimated' }
  outcome: { status: 'completed' | 'failed' }
  privacy: { mode: 'offline'; contentRecorded: false }
}

/** One external read-only tool call, content-free and parented (011/33). */
type WikimediaTraceLine = {
  id: string
  parentTraceId: string
  operationId: string
  timestamp: string
  action: 'retrieve'
  execution: {
    location: 'public-api'
    provider: 'wikimedia'
    model: string
  }
  usage: {
    tool: 'search_wiki'
    corpus: string
    language: string
    requests: number
    results: number
    responseBytes: number
  }
  performance: { wallMs: number }
  billing: { currency: 'EUR'; estimatedAmount: 0; basis: 'estimated' }
  outcome: {
    status: 'completed' | 'failed'
    errorKind?: string
  }
  privacy: { mode: 'public-api'; contentRecorded: false }
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

type PendingGenerationTrace = {
  operationId: string
  meta: GenerationTraceMeta
  startedAt: number
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
  /** Parent ids exist before a provider can emit its first tool call. */
  private readonly pendingGenerationParents = new Map<
    string,
    PendingGenerationTrace
  >()

  constructor(private readonly stateDir: string) {}

  ledgerPath(): string {
    return join(this.stateDir, 'usage', 'private', 'actions.jsonl')
  }

  private append(
    line:
      | ActionTraceLine
      | TranscribeTraceLine
      | RetrieveTraceLine
      | WikimediaTraceLine
  ): void {
    mkdirSync(join(this.stateDir, 'usage', 'private'), { recursive: true })
    appendFileSync(this.ledgerPath(), `${JSON.stringify(line)}\n`, 'utf8')
  }

  /** Pre-generated so files can reference the trace before it lands. */
  newTraceId(): string {
    return `trace_${randomUUID()}`
  }

  /**
   * Reserve the root generation id before provider work begins. Wikimedia
   * receipts are accepted only while this exact operation parent is live.
   */
  beginGeneration(
    operationId: string,
    meta: GenerationTraceMeta = MOCK_META
  ): string {
    if (operationId.length === 0) throw new Error('trace: invalid operation id')
    if (
      [...this.pendingGenerationParents.values()].some(
        (pending) => pending.operationId === operationId
      )
    ) {
      throw new Error('trace: operation already active')
    }
    const id = this.newTraceId()
    this.pendingGenerationParents.set(id, {
      operationId,
      meta,
      startedAt: Date.now()
    })
    return id
  }

  private completeGenerationParent(
    traceId: string,
    operationId: string
  ): void {
    const pending = this.pendingGenerationParents.get(traceId)
    if (pending?.operationId !== operationId) {
      throw new Error('trace: unknown generation parent')
    }
    this.pendingGenerationParents.delete(traceId)
  }

  /**
   * One line per compiled context packet (CP-MVP-010 S06), appended
   * immediately: retrieval has no accept/reject decision to wait for —
   * it either happened or it did not. A local result reports zero
   * EXTERNAL billing without claiming zero cost (33): the wall time is
   * right there beside it.
   */
  recordRetrieval(record: RetrievalRecord): string {
    const id = this.newTraceId()
    this.append({
      id,
      packetId: record.packetId,
      timestamp: new Date().toISOString(),
      action: 'retrieve',
      execution: { location: 'deterministic', provider: 'atomik', model: 'lexical-bm25' },
      usage: {
        candidates: record.candidates,
        selected: record.selected,
        estimatedContextTokens: record.contextTokens,
        basis: 'estimated',
        stages: record.stages,
        coverage: record.coverage
      },
      performance: { wallMs: record.wallMs },
      billing: { currency: 'EUR', estimatedAmount: 0, basis: 'estimated' },
      outcome: { status: record.status },
      privacy: { mode: 'offline', contentRecorded: false }
    })
    return id
  }

  /**
   * One line per search_wiki execution. Query and returned prose are absent by
   * type, not merely omitted by convention.
   */
  recordWikimedia(record: WikimediaTraceRecord): string {
    const parent = this.pendingGenerationParents.get(record.parentTraceId)
    if (parent?.operationId !== record.parentOperationId) {
      throw new Error('trace: Wikimedia receipt has no active generation parent')
    }
    const id = this.newTraceId()
    this.append({
      id,
      parentTraceId: record.parentTraceId,
      operationId: record.parentOperationId,
      timestamp: new Date().toISOString(),
      action: 'retrieve',
      execution: {
        location: 'public-api',
        provider: 'wikimedia',
        model: record.corpus
      },
      usage: {
        tool: record.tool,
        corpus: record.corpus,
        language: record.language,
        requests: record.requests,
        results: record.resultCount,
        responseBytes: record.responseBytes
      },
      performance: { wallMs: record.wallMs },
      billing: { currency: 'EUR', estimatedAmount: 0, basis: 'estimated' },
      outcome: {
        status: record.status,
        ...(record.errorKind === undefined ? {} : { errorKind: record.errorKind })
      },
      privacy: { mode: 'public-api', contentRecorded: false }
    })
    return id
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
    meta: GenerationTraceMeta = MOCK_META,
    parentTraceId?: string
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
    const id = parentTraceId ?? this.newTraceId()
    if (parentTraceId !== undefined) {
      this.completeGenerationParent(parentTraceId, operation.id)
    }
    const line: ActionTraceLine = {
      id,
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
    meta: GenerationTraceMeta = MOCK_META,
    parentTraceId?: string
  ): void {
    const id = parentTraceId ?? this.newTraceId()
    if (parentTraceId !== undefined) {
      this.completeGenerationParent(parentTraceId, operationId)
    }
    this.append({
      id,
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
    for (const [traceId, pending] of [
      ...this.pendingGenerationParents.entries()
    ]) {
      this.recordFailure(
        pending.operationId,
        Math.max(0, Date.now() - pending.startedAt),
        pending.meta,
        traceId
      )
    }
    for (const draft of this.drafts.values()) {
      this.append(draft)
    }
    this.drafts.clear()
  }
}
