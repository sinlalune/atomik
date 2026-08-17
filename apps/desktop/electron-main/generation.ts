import { runAiOperation } from './ai-mock'
import type {
  AiEngine,
  AiOperation,
  AiResponseBundle,
  WebEvidenceProvenance
} from '../shared/ipc-contract'
import {
  createGenerationToolPolicy,
  FINAL_ONLY_TOOL_CAPABILITY,
  GenerationToolContractError,
  parseGenerationToolCall,
  type GenerationToolCall,
  type GenerationToolCapability,
  type GenerationToolExecution,
  type GenerationToolErrorCode,
  type GenerationToolPayload,
  type GenerationToolPolicy,
  type GenerationToolResult
} from '../shared/generation-tools'

export { FINAL_ONLY_TOOL_CAPABILITY } from '../shared/generation-tools'

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

/** A provider adapter has normalized its native call envelope, not its args. */
export type AdapterToolCall = {
  id: string
  name: string
  arguments: unknown
}

export type GenerationAdapterTurn =
  | { kind: 'final'; result: GenerationResult }
  | {
      kind: 'tool-calls'
      calls: AdapterToolCall[]
      continue(results: readonly GenerationToolResult[]): Promise<GenerationAdapterTurn>
    }

export type GenerationToolExecutor = (
  call: GenerationToolCall,
  context: { signal: AbortSignal }
) => Promise<{ result: GenerationToolResult; payload?: GenerationToolPayload }>

export type GenerationAdapter = {
  id: AiEngine
  /** Fail closed: native tool calls exist only when the adapter declares them. */
  tools: GenerationToolCapability
  generate(
    operation: AiOperation,
    context: GenerationContext
  ): Promise<GenerationResult>
  /** Present iff `tools.kind === native`; continuation state stays adapter-owned. */
  startToolLoop?(
    operation: AiOperation,
    context: GenerationContext,
    policy: GenerationToolPolicy
  ): Promise<GenerationAdapterTurn>
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

const bytesOf = (value: string): number => new TextEncoder().encode(value).byteLength

function rejectedToolResult(
  call: AdapterToolCall,
  code: GenerationToolErrorCode,
  message: string,
  wallMs = 0
): GenerationToolResult {
  const content = JSON.stringify({
    _atomik: { untrusted: true },
    ok: false,
    error: { code, message }
  })
  return {
    callId: call.id,
    name: call.name,
    ok: false,
    untrusted: true,
    content,
    stats: {
      resultCount: 0,
      chars: content.length,
      bytes: bytesOf(content),
      wallMs
    },
    error: { code, message }
  }
}

function visibleUnsupportedResult(
  result: GenerationResult,
  adapter: GenerationAdapter
): GenerationResult {
  const message = `Model tools are unavailable for ${adapter.id}: ${
    adapter.tools.kind === 'unsupported'
      ? adapter.tools.reason
      : 'native tool turn implementation is missing'
  }. The deterministic vault grounding pass still ran.`
  return {
    ...result,
    bundle: {
      ...result.bundle,
      toolExecutions: [],
      uncertainties: [
        ...result.bundle.uncertainties,
        { message, severity: 'warning' }
      ]
    }
  }
}

/**
 * Shared, sequential client-tool loop. Adapters own wire codecs; this function
 * owns authority, budgets, execution, cancellation and visible fallback.
 */
export async function runGenerationWithTools(
  adapter: GenerationAdapter,
  operation: AiOperation,
  context: GenerationContext,
  execute: GenerationToolExecutor,
  nowMs: () => number = Date.now
): Promise<GenerationResult> {
  const preference = operation.tools
  if (preference === undefined || preference.mode === 'off') {
    return adapter.generate(operation, context)
  }
  const policy = createGenerationToolPolicy(preference)
  if (adapter.tools.kind === 'unsupported' || adapter.startToolLoop === undefined) {
    return visibleUnsupportedResult(
      await adapter.generate(operation, context),
      adapter
    )
  }

  const started = nowMs()
  const controller = new AbortController()
  let wallBudgetWon = false
  const relayCancel = (): void => controller.abort(context.signal.reason)
  if (context.signal.aborted) relayCancel()
  else context.signal.addEventListener('abort', relayCancel, { once: true })
  const timer = setTimeout(() => {
    wallBudgetWon = true
    controller.abort(new Error('tool loop wall budget exhausted'))
  }, policy.limits.maxWallMs)
  const loopContext: GenerationContext = {
    ...context,
    signal: controller.signal
  }
  const executions: GenerationToolExecution[] = []
  let calls = 0
  let depth = 0
  let resultChars = 0

  const checkBudget = (): void => {
    if (context.signal.aborted) {
      throw new GenerationError('cancelled', 'operation cancelled')
    }
    if (wallBudgetWon || nowMs() - started > policy.limits.maxWallMs) {
      throw new GenerationError('budget-exceeded', 'tool loop wall budget exhausted')
    }
  }

  try {
    checkBudget()
    let turn = await adapter.startToolLoop(operation, loopContext, policy)
    while (turn.kind === 'tool-calls') {
      checkBudget()
      depth += 1
      if (depth > policy.limits.maxDepth) {
        throw new GenerationError('budget-exceeded', 'tool loop depth exhausted')
      }
      if (turn.calls.length === 0) {
        throw new GenerationError('provider-request', 'provider returned an empty tool turn')
      }
      if (!adapter.tools.parallelCalls && turn.calls.length > 1) {
        throw new GenerationError(
          'provider-request',
          'provider returned parallel tool calls while parallel execution is disabled'
        )
      }

      const results: GenerationToolResult[] = []
      for (const rawCall of turn.calls) {
        checkBudget()
        calls += 1
        if (calls > policy.limits.maxCallsPerOperation) {
          throw new GenerationError('budget-exceeded', 'tool call budget exhausted')
        }

        let execution: GenerationToolExecution
        try {
          const call = parseGenerationToolCall(rawCall, policy)
          const executed = await execute(call, { signal: controller.signal })
          if (
            executed.result.callId !== call.id ||
            executed.result.name !== call.name ||
            executed.result.untrusted !== true
          ) {
            throw new GenerationError(
              'provider-request',
              'tool executor returned a mismatched result'
            )
          }
          execution = {
            call: rawCall,
            result: executed.result,
            ...(executed.payload === undefined
              ? {}
              : { payload: executed.payload })
          }
        } catch (error) {
          if (error instanceof GenerationError) throw error
          if (context.signal.aborted) {
            throw new GenerationError('cancelled', 'operation cancelled')
          }
          if (wallBudgetWon) {
            throw new GenerationError(
              'budget-exceeded',
              'tool loop wall budget exhausted'
            )
          }
          const code =
            error instanceof GenerationToolContractError
              ? error.code
              : 'failed'
          const result = rejectedToolResult(
            rawCall,
            code,
            error instanceof Error ? error.message : 'tool execution failed'
          )
          execution = { call: rawCall, result }
        }

        const chars = execution.result.content.length
        const bytes = bytesOf(execution.result.content)
        if (
          chars > policy.limits.maxResultCharsPerCall ||
          bytes > policy.limits.maxResultBytesPerCall
        ) {
          throw new GenerationError(
            'budget-exceeded',
            'tool result exceeded the per-call budget'
          )
        }
        resultChars += chars
        if (resultChars > policy.limits.maxResultCharsPerOperation) {
          throw new GenerationError(
            'budget-exceeded',
            'tool result operation budget exhausted'
          )
        }
        execution = {
          ...execution,
          result: {
            ...execution.result,
            stats: { ...execution.result.stats, chars, bytes }
          }
        }
        executions.push(execution)
        results.push(execution.result)
      }
      checkBudget()
      turn = await turn.continue(results)
    }
    checkBudget()
    return {
      ...turn.result,
      bundle: {
        ...turn.result.bundle,
        toolExecutions: executions
      }
    }
  } catch (error) {
    if (context.signal.aborted) {
      throw new GenerationError('cancelled', 'operation cancelled')
    }
    if (wallBudgetWon) {
      throw new GenerationError('budget-exceeded', 'tool loop wall budget exhausted')
    }
    throw error
  } finally {
    clearTimeout(timer)
    context.signal.removeEventListener('abort', relayCancel)
  }
}

/** The S08 mock behind the seam — selectable engine, offline path. */
export const mockGenerationAdapter: GenerationAdapter = {
  id: 'mock',
  tools: FINAL_ONLY_TOOL_CAPABILITY,
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
