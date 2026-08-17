import { randomUUID } from 'node:crypto'
import { provenanceLine } from './ai-mock'
import {
  GenerationError,
  type GenerationAdapter,
  type GenerationAdapterTurn,
  type GenerationResult,
  type GenerationUsage
} from './generation'
import {
  combineTurnUsage,
  openAiToolRequestFields,
  openAiToolTurn,
  type OpenAiChatMessage
} from './openai-tool-codec'
import { type GenerationToolPolicy } from '../shared/generation-tools'
import { labelClaims } from './truth'
import {
  buildMessages,
  extractClaimCandidates,
  DEFAULT_MAX_OUTPUT_TOKENS,
  DEFAULT_MAX_WALL_MS
} from './mistral-generation-adapter'
import {
  estimateCostUsdForModel,
  PARAM_LIMITS,
  PROVIDER_CATALOG
} from '../shared/generation-params'
import type {
  AiOperation,
  AiOutputBlock,
  AiSelection,
  ProposedFileChange,
  WebEvidenceProvenance
} from '../shared/ipc-contract'

/**
 * Google Gemini Direct Generation Adapter (CP-PROVIDERS S03; tools S06b)
 *
 * Talks to Gemini's OpenAI-compatibility endpoint with Bearer auth, NOT the
 * native `generateContent` API — which is why it shares the
 * `openai-chat-completions` tool codec with Mistral rather than needing a
 * dialect of its own. The wire shape was probed live on 2026-08-17; see
 * `docs/research/provider-tool-calling-snapshot-2026-08-17.md`.
 */

const GOOGLE_CHAT_URL =
  'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions'
const MAX_INPUT_TOKENS_ESTIMATE = 500_000
const PRICE_SNAPSHOT_ID = 'model-research@2026-08-16'

const estimateTokens = (chars: number): number =>
  Math.max(1, Math.ceil(chars / 4))

function proposedTextFor(
  operation: AiOperation,
  content: string,
  webSource?: WebEvidenceProvenance
): string {
  const destination = operation.target.destination
  switch (destination.kind) {
    case 'replace-selection':
      return content
    case 'append':
      return `\n${content}\n${webSource ? `\n${provenanceLine(webSource, operation.target.relPath)}\n` : ''}`
    case 'new-note':
      return `${content}\n${webSource ? `\n${provenanceLine(webSource, destination.newNotePath)}\n` : ''}`
  }
}

type GoogleChatResponse = {
  model?: string
  choices?: Array<{
    message?: {
      role?: string
      /** Absent entirely on a tool turn — observed 2026-08-17. */
      content?: string | null
      tool_calls?: unknown
    }
    finish_reason?: string
  }>
  usage?: {
    prompt_tokens?: number
    completion_tokens?: number
    /** Exceeds prompt+completion on thinking models: the remainder is
     *  thinking, billed as output. Observed 614 vs 506 on 2026-08-17. */
    total_tokens?: number
  }
}

export type GoogleAdapterOptions = {
  maxOutputTokens?: number
  maxWallMs?: number
  defaultModel?: string
}

export function createGoogleGenerationAdapter(
  key: string,
  fetchImpl: typeof fetch = fetch,
  options: GoogleAdapterOptions = {}
): GenerationAdapter {
  const maxOutputTokens = options.maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS
  const maxWallMs = options.maxWallMs ?? DEFAULT_MAX_WALL_MS
  const fallbackModel =
    options.defaultModel ?? PROVIDER_CATALOG.google.defaultModel

  async function request(
    operation: AiOperation,
    context: { signal: AbortSignal },
    messages: OpenAiChatMessage[],
    policy?: GenerationToolPolicy
  ): Promise<{
    parsed: GoogleChatResponse
    inputChars: number
    model: string
    maxTokens: number
  }> {
    const inputChars = messages.reduce(
      (total, message) =>
        total +
        (typeof message.content === 'string' ? message.content.length : 0) +
        (message.tool_calls === undefined
          ? 0
          : JSON.stringify(message.tool_calls).length),
      0
    )

    if (estimateTokens(inputChars) > MAX_INPUT_TOKENS_ESTIMATE) {
      throw new GenerationError(
        'budget-exceeded',
        `input ≈${estimateTokens(inputChars)} tokens exceeds the ${MAX_INPUT_TOKENS_ESTIMATE}-token budget — narrow the selection`
      )
    }

    if (context.signal.aborted) {
      throw new GenerationError('cancelled', 'operation cancelled')
    }

    const fetchController = new AbortController()
    let timedOut = false
    const timer = setTimeout(() => {
      timedOut = true
      fetchController.abort()
    }, maxWallMs)
    const relayCancel = (): void => fetchController.abort()
    context.signal.addEventListener('abort', relayCancel, { once: true })

    const model = operation.params?.model ?? fallbackModel
    const temperature =
      operation.params?.temperature ?? PARAM_LIMITS.temperature.default
    const maxTokens = operation.params?.maxTokens ?? maxOutputTokens

    let response: Response
    try {
      response = await fetchImpl(GOOGLE_CHAT_URL, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${key}`,
          'x-goog-api-key': key,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: maxTokens,
          temperature,
          ...(operation.params?.topP !== undefined
            ? { top_p: operation.params.topP }
            : {}),
          ...(policy === undefined ? {} : openAiToolRequestFields(policy))
        }),
        signal: fetchController.signal
      })
    } catch (error) {
      if (timedOut) {
        throw new GenerationError(
          'timeout',
          `no response within ${maxWallMs / 1000}s`
        )
      }
      if (context.signal.aborted) {
        throw new GenerationError('cancelled', 'operation cancelled')
      }
      throw new GenerationError(
        'offline',
        `network failure — ${String(error).slice(0, 120)}`
      )
    } finally {
      clearTimeout(timer)
      context.signal.removeEventListener('abort', relayCancel)
    }

    if (!response.ok) {
      const detail = (await response.text().catch(() => '')).slice(0, 200)
      if (response.status === 400 && detail.toLowerCase().includes('api_key')) {
        throw new GenerationError(
          'auth',
          `the Google Gemini key was rejected (HTTP ${response.status}) — check it in ☰ → Settings`
        )
      }
      if (response.status === 401 || response.status === 403) {
        throw new GenerationError(
          'auth',
          `the Google Gemini key was rejected (HTTP ${response.status}) — check it in ☰ → Settings`
        )
      }
      if (response.status === 429) {
        const retryAfter = Number(response.headers.get('retry-after'))
        throw new GenerationError(
          'rate-limit',
          `rate/quota limit (HTTP 429)${Number.isFinite(retryAfter) ? ` — retry after ${retryAfter}s` : ''}`,
          Number.isFinite(retryAfter) ? retryAfter : undefined
        )
      }
      if (response.status >= 500) {
        throw new GenerationError(
          'provider-server',
          `provider error (HTTP ${response.status}) — ${detail}`
        )
      }
      throw new GenerationError(
        'provider-request',
        `request rejected (HTTP ${response.status}) — ${detail}`
      )
    }

    const parsed = (await response.json().catch(() => ({}))) as GoogleChatResponse
    return { parsed, inputChars, model, maxTokens }
  }

  /**
   * Thinking tokens are billed as output but are NOT in `completion_tokens`;
   * `total_tokens` carries them. Charging from prompt+completion alone would
   * understate Gemini spend, so the remainder is folded into output.
   */
  function usageOf(
    parsed: GoogleChatResponse,
    inputChars: number,
    outputChars: number
  ): GenerationUsage {
    const prompt = parsed.usage?.prompt_tokens
    const completion = parsed.usage?.completion_tokens
    if (prompt === undefined || completion === undefined) {
      return {
        inputTokens: estimateTokens(inputChars),
        outputTokens: estimateTokens(outputChars),
        basis: 'estimated'
      }
    }
    const total = parsed.usage?.total_tokens
    const billedOutput =
      total !== undefined && total > prompt + completion
        ? total - prompt
        : completion
    return {
      inputTokens: prompt,
      outputTokens: billedOutput,
      basis: 'provider-reported'
    }
  }

  function completionResult(
    operation: AiOperation,
    context: { provenance?: Map<string, WebEvidenceProvenance> },
    parsed: GoogleChatResponse,
    content: string,
    usage: GenerationUsage,
    model: string,
    maxTokens: number
  ): GenerationResult {
    const selection = operation.input[0] as AiSelection
    const webSource = context.provenance?.get(selection.relPath)
    const answerBlock: AiOutputBlock = {
      id: randomUUID(),
      kind: 'markdown',
      role: 'answer',
      content
    }
    const destination = operation.target.destination
    const proposedText = proposedTextFor(operation, content, webSource)
    const file: ProposedFileChange =
      destination.kind === 'replace-selection'
        ? {
            relPath: operation.target.relPath,
            kind: 'replace-range',
            range: selection.range,
            newText: proposedText
          }
        : destination.kind === 'append'
          ? {
              relPath: operation.target.relPath,
              kind: 'append',
              newText: proposedText
            }
          : {
              relPath: destination.newNotePath,
              kind: 'create',
              newText: proposedText
            }

    const { claims, evidence } = labelClaims(
      operation.input,
      extractClaimCandidates(content, answerBlock.id),
      context.provenance
    )

    return {
      bundle: {
        id: randomUUID(),
        operationId: operation.id,
        blocks: [answerBlock],
        patchProposals: [
          {
            id: randomUUID(),
            operationId: operation.id,
            files: [file],
            status: 'pending'
          }
        ],
        claims,
        evidence,
        verification: [],
        uncertainties:
          parsed.choices?.[0]?.finish_reason === 'length'
            ? [
                {
                  message: `Response hit the ${maxTokens}-token output budget and may be truncated.`,
                  severity: 'warning'
                }
              ]
            : [],
        actionTraceIds: []
      },
      usage,
      providerMeta: {
        location: 'cloud-model',
        provider: 'google',
        model,
        modelVersion: parsed.model ?? model,
        billing: {
          currency: 'USD',
          estimatedAmount: estimateCostUsdForModel(usage, 'google', model),
          basis: 'estimated',
          priceSnapshotId: PRICE_SNAPSHOT_ID
        }
      }
    }
  }

  return {
    id: 'google',
    // S06b: opted in only after a live two-turn probe and recorded fixtures.
    tools: {
      kind: 'native',
      dialect: 'openai-chat-completions',
      parallelCalls: false
    },
    generate: async (operation, context): Promise<GenerationResult> => {
      const response = await request(operation, context, buildMessages(operation))
      const content = (response.parsed.choices?.[0]?.message?.content ?? '').trim()
      if (content.length === 0) {
        throw new GenerationError(
          'provider-request',
          'provider returned an empty completion'
        )
      }
      return completionResult(
        operation,
        context,
        response.parsed,
        content,
        usageOf(response.parsed, response.inputChars, content.length),
        response.model,
        response.maxTokens
      )
    },
    startToolLoop: (operation, context, policy): Promise<GenerationAdapterTurn> =>
      openAiToolTurn(
        {
          request: (turnMessages, turnPolicy) =>
            request(operation, context, turnMessages, turnPolicy),
          choiceOf: (response) => response.parsed.choices?.[0]?.message,
          usageOf: (response, outputChars, accumulated) =>
            combineTurnUsage(
              accumulated,
              usageOf(response.parsed, response.inputChars, outputChars)
            ),
          finalResult: (response, content, usage) =>
            completionResult(
              operation,
              context,
              response.parsed,
              content,
              usage,
              response.model,
              response.maxTokens
            )
        },
        policy,
        buildMessages(operation)
      )
  }
}
