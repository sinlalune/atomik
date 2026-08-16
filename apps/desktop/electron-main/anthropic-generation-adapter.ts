import { randomUUID } from 'node:crypto'
import { provenanceLine } from './ai-mock'
import {
  GenerationError,
  type GenerationAdapter,
  type GenerationResult,
  type GenerationUsage
} from './generation'
import { labelClaims } from './truth'
import {
  defaultSystemPrompt,
  extractClaimCandidates,
  DEFAULT_MAX_OUTPUT_TOKENS,
  DEFAULT_MAX_WALL_MS
} from './mistral-generation-adapter'
import { userTextOf } from '../shared/prompt-composition'
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
 * Anthropic Direct Generation Adapter (CP-PROVIDERS S03)
 *
 * Implements Anthropic Messages API (Claude 3.5 Haiku, Sonnet, Opus).
 * Anthropic expects a top-level `system` parameter and alternating user/assistant
 * messages. Pure compute HTTP client with zero heavy SDKs (bedrock 15).
 */

const ANTHROPIC_MESSAGES_URL = 'https://api.anthropic.com/v1/messages'
const ANTHROPIC_VERSION = '2023-06-01'
const MAX_INPUT_TOKENS_ESTIMATE = 180_000
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

type AnthropicMessage = {
  role: 'user' | 'assistant'
  content: string
}

type AnthropicResponse = {
  id?: string
  model?: string
  content?: Array<{ type?: string; text?: string }>
  stop_reason?: string
  usage?: { input_tokens?: number; output_tokens?: number }
}

export type AnthropicAdapterOptions = {
  maxOutputTokens?: number
  maxWallMs?: number
  defaultModel?: string
}

export function buildAnthropicPayload(
  operation: AiOperation,
  model: string,
  maxTokens: number,
  temperature: number,
  topP?: number
): {
  model: string
  max_tokens: number
  temperature: number
  top_p?: number
  system: string
  messages: AnthropicMessage[]
} {
  const system = defaultSystemPrompt(operation)
  const messages: AnthropicMessage[] = [
    ...(operation.thread ?? []).map((turn): AnthropicMessage => ({
      role: turn.role === 'assistant' ? 'assistant' : 'user',
      content: turn.content
    })),
    {
      role: 'user',
      content: userTextOf(operation)
    }
  ]

  return {
    model,
    max_tokens: maxTokens,
    temperature,
    ...(topP !== undefined ? { top_p: topP } : {}),
    system,
    messages
  }
}

export function createAnthropicGenerationAdapter(
  key: string,
  fetchImpl: typeof fetch = fetch,
  options: AnthropicAdapterOptions = {}
): GenerationAdapter {
  const maxOutputTokens = options.maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS
  const maxWallMs = options.maxWallMs ?? DEFAULT_MAX_WALL_MS
  const fallbackModel =
    options.defaultModel ?? PROVIDER_CATALOG.anthropic.defaultModel

  return {
    id: 'anthropic',
    generate: async (operation, context): Promise<GenerationResult> => {
      const model = operation.params?.model ?? fallbackModel
      const temperature =
        operation.params?.temperature ?? PARAM_LIMITS.temperature.default
      const maxTokens = operation.params?.maxTokens ?? maxOutputTokens

      const payload = buildAnthropicPayload(
        operation,
        model,
        maxTokens,
        temperature,
        operation.params?.topP
      )

      const inputChars =
        payload.system.length +
        payload.messages.reduce(
          (total, message) => total + message.content.length,
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

      let response: Response
      try {
        response = await fetchImpl(ANTHROPIC_MESSAGES_URL, {
          method: 'POST',
          headers: {
            'x-api-key': key,
            'anthropic-version': ANTHROPIC_VERSION,
            'content-type': 'application/json'
          },
          body: JSON.stringify(payload),
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
        if (response.status === 401 || response.status === 403) {
          throw new GenerationError(
            'auth',
            `the Anthropic key was rejected (HTTP ${response.status}) — check it in ☰ → Settings`
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
        if (response.status >= 500 || response.status === 529) {
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

      const parsed =
        (await response.json().catch(() => ({}))) as AnthropicResponse
      const textBlock = parsed.content?.find((block) => block.type === 'text')
      const content = (textBlock?.text ?? '').trim()
      if (content.length === 0) {
        throw new GenerationError(
          'provider-request',
          'provider returned an empty completion'
        )
      }

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

      const usage: GenerationUsage =
        parsed.usage?.input_tokens !== undefined &&
        parsed.usage?.output_tokens !== undefined
          ? {
              inputTokens: parsed.usage.input_tokens,
              outputTokens: parsed.usage.output_tokens,
              basis: 'provider-reported'
            }
          : {
              inputTokens: estimateTokens(inputChars),
              outputTokens: estimateTokens(content.length),
              basis: 'estimated'
            }

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
            parsed.stop_reason === 'max_tokens'
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
          provider: 'anthropic',
          model,
          modelVersion: parsed.model ?? model,
          billing: {
            currency: 'USD',
            estimatedAmount: estimateCostUsdForModel(
              usage,
              'anthropic',
              model
            ),
            basis: 'estimated',
            priceSnapshotId: PRICE_SNAPSHOT_ID
          }
        }
      }
    }
  }
}
