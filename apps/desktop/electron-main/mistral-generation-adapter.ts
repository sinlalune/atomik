import { randomUUID } from 'node:crypto'
import { provenanceLine } from './ai-mock'
import {
  FINAL_ONLY_TOOL_CAPABILITY,
  GenerationError,
  type GenerationAdapter,
  type GenerationResult,
  type GenerationUsage
} from './generation'
import { labelClaims, type ClaimCandidate } from './truth'
import { systemTextOf, userTextOf } from '../shared/prompt-composition'
import {
  DEFAULT_GENERATION_MODEL,
  GENERATION_MODELS,
  PARAM_LIMITS,
  type GenerationModelId
} from '../shared/generation-params'
import type {
  AiOperation,
  AiOutputBlock,
  AiSelection,
  ProposedFileChange,
  WebEvidenceProvenance
} from '../shared/ipc-contract'

/**
 * The first REAL generation engine (CP-MVP-008 S02; owner decisions
 * 2026-07-20): Mistral Small over chat completions, behind the
 * GenerationAdapter seam — cloud-first, Mistral-first (the smallest
 * real diff: the key seam and the cloud-adapter pattern exist since
 * CP-MVP-005; French lab, EU residency). Key via `readMistralKey`,
 * attached HERE in main — it never crosses to the renderer (13).
 * Failures surface through the typed taxonomy; there is NO silent
 * fallback to the mock (13 explicit-policy rule).
 */

/** Pinned live 2026-07-21 (docs.mistral.ai models overview: Mistral
 *  Small 4) — dated, no alias; upgrades are a new dated decision
 *  (precedent: mistral-ocr-4-0 / voxtral-mini-2602). */
export const MISTRAL_SMALL_MODEL = 'mistral-small-2603'
const CHAT_URL = 'https://api.mistral.ai/v1/chat/completions'

/**
 * The dated price snapshot behind every cost estimate (33): per-model
 * prices from mistral.ai/pricing/api, fetched 2026-07-22 (S05d — the
 * medium tier joined). Billing basis stays 'estimated'.
 */
export const GENERATION_PRICE_SNAPSHOT = {
  id: 'mistral.ai/pricing/api@2026-07-22'
} as const

/** Budgets in MAIN below renderer state (S01 pin; 06/33). Kept equal to
 *  `PARAM_LIMITS.maxTokens.default` — main's ceiling and the renderer's
 *  default are the same number seen from two sides, and a test pins it. */
export const DEFAULT_MAX_OUTPUT_TOKENS = 5000
export const DEFAULT_MAX_WALL_MS = 60_000
/** Pre-flight input ceiling: 128K context minus output headroom. */
const MAX_INPUT_TOKENS_ESTIMATE = 120_000

/** Rough chars/4 heuristic — labeled estimated wherever it lands. */
const estimateTokens = (chars: number): number =>
  Math.max(1, Math.ceil(chars / 4))

export function estimateCostUsd(
  usage: { inputTokens: number; outputTokens: number },
  model: GenerationModelId = DEFAULT_GENERATION_MODEL
): number {
  const price =
    (GENERATION_MODELS as Record<string, { inputUsdPerMTok: number; outputUsdPerMTok: number }>)[model] ?? {
      inputUsdPerMTok: 0.20,
      outputUsdPerMTok: 0.60
    }
  const amount =
    (usage.inputTokens / 1e6) * price.inputUsdPerMTok +
    (usage.outputTokens / 1e6) * price.outputUsdPerMTok
  return Number(amount.toFixed(6))
}

/** S04h: composition moved to shared/prompt-composition.ts — ONE
 *  source of truth with the renderer's sent-request inspector; what
 *  the popover shows IS what travels, by construction. */
export function defaultSystemPrompt(operation: AiOperation): string {
  // S07b8: plan-aware — the ONE resolver display and wire both use
  return systemTextOf(operation)
}

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

/** instruction + selection(s) → chat-completions messages (S01 pin);
 *  both halves come from shared/prompt-composition — the renderer's
 *  inspector shows and copies the SAME text by construction (S04h/i).
 *  A chat thread (S06) replays VERBATIM between system and the current
 *  user message — history is history, only the live turn composes.
 *  Input bounds are ai-mock's validation constants, enforced by
 *  `isValidAiOperation` before any adapter runs. */
export function buildMessages(operation: AiOperation): ChatMessage[] {
  return [
    { role: 'system', content: defaultSystemPrompt(operation) },
    ...(operation.thread ?? []).map(
      (turn): ChatMessage => ({ role: turn.role, content: turn.content })
    ),
    {
      role: 'user',
      // S07b12: mode-aware — a chat sends the CONVERSATION contract
      content: userTextOf(operation)
    }
  ]
}

/**
 * Deterministic claim-candidate extraction over the REAL answer (28:
 * the model never self-grades; 06 mechanical labeling): sentences of
 * the prose, code fences dropped. The checker alone assigns labels —
 * an exact quote of a selection becomes source-backed, everything
 * else defaults model-only.
 */
export function extractClaimCandidates(
  answer: string,
  blockId: string
): ClaimCandidate[] {
  const MAX_CANDIDATES = 32
  const prose = answer
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/^[ \t]*(?:>[ \t]?)+/gm, '')
    .replace(/^#+[ \t]+/gm, '')
  return prose
    .split(/(?<=[.!?])\s+|\n+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 25)
    .slice(0, MAX_CANDIDATES)
    .map((text) => ({ blockId, text }))
}

/** The proposal text, shaped by the destination (mock precedent: web
 *  selections carry their provenance line into the note, 09). */
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

type ChatResponse = {
  model?: string
  choices?: Array<{
    message?: { content?: string }
    finish_reason?: string
  }>
  usage?: { prompt_tokens?: number; completion_tokens?: number }
}

export type MistralAdapterOptions = {
  maxOutputTokens?: number
  maxWallMs?: number
  defaultModel?: string
}

export function createMistralGenerationAdapter(
  key: string,
  fetchImpl: typeof fetch = fetch,
  options: MistralAdapterOptions = {}
): GenerationAdapter {
  const maxOutputTokens = options.maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS
  const maxWallMs = options.maxWallMs ?? DEFAULT_MAX_WALL_MS

  return {
    id: 'mistral',
    tools: FINAL_ONLY_TOOL_CAPABILITY,
    generate: async (operation, context): Promise<GenerationResult> => {
      const messages = buildMessages(operation)
      const inputChars = messages.reduce(
        (total, message) => total + message.content.length,
        0
      )
      // budget-exceeded is a MAIN-SIDE pre-check (S01 pin), not a
      // provider 4xx after the bytes already travelled.
      if (estimateTokens(inputChars) > MAX_INPUT_TOKENS_ESTIMATE) {
        throw new GenerationError(
          'budget-exceeded',
          `input ≈${estimateTokens(inputChars)} tokens exceeds the ${MAX_INPUT_TOKENS_ESTIMATE}-token budget — narrow the selection`
        )
      }
      if (context.signal.aborted) {
        throw new GenerationError('cancelled', 'operation cancelled')
      }

      // One fetch signal fed by two sources: the caller's cancel and an
      // own wall-clock timer — the flag keeps the two distinguishable.
      const fetchController = new AbortController()
      let timedOut = false
      const timer = setTimeout(() => {
        timedOut = true
        fetchController.abort()
      }, maxWallMs)
      const relayCancel = (): void => fetchController.abort()
      context.signal.addEventListener('abort', relayCancel, { once: true })

      // S05d: bounded overrides ride the operation (validated main-side)
      const fallbackModel =
        (options.defaultModel as GenerationModelId) ?? DEFAULT_GENERATION_MODEL
      const model: GenerationModelId = operation.params?.model ?? fallbackModel
      const temperature =
        operation.params?.temperature ?? PARAM_LIMITS.temperature.default
      const maxTokens = operation.params?.maxTokens ?? maxOutputTokens
      let response: Response
      try {
        response = await fetchImpl(CHAT_URL, {
          method: 'POST',
          headers: {
            authorization: `Bearer ${key}`,
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            model,
            messages,
            max_tokens: maxTokens,
            temperature,
            ...(operation.params?.topP !== undefined
              ? { top_p: operation.params.topP }
              : {})
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
        if (response.status === 401 || response.status === 403) {
          throw new GenerationError(
            'auth',
            `the Mistral key was rejected (HTTP ${response.status}) — check it in ☰ → AI`
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

      const parsed = (await response.json().catch(() => ({}))) as ChatResponse
      const choice = parsed.choices?.[0]
      const content = (choice?.message?.content ?? '').trim()
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
        parsed.usage?.prompt_tokens !== undefined &&
        parsed.usage?.completion_tokens !== undefined
          ? {
              inputTokens: parsed.usage.prompt_tokens,
              outputTokens: parsed.usage.completion_tokens,
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
            choice?.finish_reason === 'length'
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
          provider: 'mistral',
          model: `mistral-${(GENERATION_MODELS as Record<string, { label: string }>)[model]?.label ?? model}`,
          modelVersion: parsed.model ?? model,
          billing: {
            currency: 'USD',
            estimatedAmount: estimateCostUsd(usage, model),
            basis: 'estimated',
            priceSnapshotId: GENERATION_PRICE_SNAPSHOT.id
          }
        }
      }
    }
  }
}
