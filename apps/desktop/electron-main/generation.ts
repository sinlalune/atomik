import { runAiOperation } from './ai-mock'
import type {
  AiEngine,
  AiOperation,
  AiResponseBundle,
  WebEvidenceProvenance
} from '../shared/ipc-contract'

/**
 * The GenerationAdapter seam (CP-MVP-008 S02) — the ai-core seat (14)
 * the mock incubated, now typed. An adapter is PURE COMPUTE like the
 * mock: it never touches the filesystem; accepted patches ride the
 * editor buffer + vault verbs. The ai-mock header's promise is the
 * contract bar: swapping engines changes nothing renderer-side —
 * identity travels in the answering adapter's output (the
 * transcription-seat precedent).
 */

export type GenerationUsage = {
  inputTokens: number
  outputTokens: number
  /** Provider-reported preferred over estimates; each labeled (06/33). */
  basis: 'provider-reported' | 'estimated'
}

export type GenerationBilling = {
  currency: 'USD'
  estimatedAmount: number
  basis: 'estimated'
  /** Which dated price snapshot produced the estimate (33). */
  priceSnapshotId: string
}

export type GenerationProviderMeta = {
  location: 'deterministic' | 'cloud-model'
  provider: string
  model: string
  modelVersion: string
  billing?: GenerationBilling
}

export type GenerationResult = {
  bundle: AiResponseBundle
  usage?: GenerationUsage
  providerMeta: GenerationProviderMeta
}

export type GenerationContext = {
  signal: AbortSignal
  /** Web provenance resolved by the CALLER (adapters stay fs-free). */
  provenance?: Map<string, WebEvidenceProvenance>
}

export type GenerationAdapter = {
  id: AiEngine
  generate(
    operation: AiOperation,
    context: GenerationContext
  ): Promise<GenerationResult>
}

/**
 * The typed error taxonomy (S01 pin; 13 explicit-policy rule: a failed
 * cloud call surfaces — it NEVER silently falls back to the mock). The
 * kind rides the message as `ai(<kind>): …` so it survives Electron's
 * IPC error flattening and the renderer can still branch on it.
 */
export type GenerationErrorKind =
  | 'offline'
  | 'timeout'
  | 'auth'
  | 'rate-limit'
  | 'provider-request'
  | 'provider-server'
  | 'cancelled'
  | 'budget-exceeded'

export class GenerationError extends Error {
  constructor(
    readonly kind: GenerationErrorKind,
    detail: string,
    readonly retryAfterSeconds?: number
  ) {
    super(`ai(${kind}): ${detail}`)
    this.name = 'GenerationError'
  }
}

/** The S08 mock behind the seam — selectable engine, offline path. */
export const mockGenerationAdapter: GenerationAdapter = {
  id: 'mock',
  generate: (operation, context) =>
    Promise.resolve({
      bundle: runAiOperation(operation, context.provenance),
      providerMeta: {
        location: 'deterministic',
        provider: 'atomik',
        model: 'mock',
        modelVersion: 's08'
      }
    })
}
