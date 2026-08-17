import {
  GenerationError,
  type AdapterToolCall,
  type GenerationAdapterTurn,
  type GenerationResult,
  type GenerationUsage
} from './generation'
import {
  generationToolDefinitions,
  type GenerationToolPolicy,
  type GenerationToolResult
} from '../shared/generation-tools'

/**
 * The `openai-chat-completions` tool dialect, in ONE place (CP-MVP-011 S06b).
 *
 * Five of the six real providers speak it: Mistral, Google (its adapter talks
 * to Gemini's OpenAI-compatibility endpoint, not `generateContent`), OpenAI,
 * OpenRouter and DeepSeek. Only Anthropic needs a second codec. An adapter
 * supplies transport, usage arithmetic and result shaping through the hooks
 * below; the wire grammar — schema emission, call parsing, continuation —
 * lives here so adding a provider never re-derives it.
 */

/** A message on the wire. Assistant turns are ECHOED, never rebuilt (below). */
export type OpenAiChatMessage = {
  role: string
  content?: unknown
  [field: string]: unknown
}

export type OpenAiChoiceMessage = {
  role?: string
  content?: string | null
  tool_calls?: unknown
}

/** The request fields that turn an ordinary completion into a tool turn. */
export function openAiToolRequestFields(policy: GenerationToolPolicy): {
  tools: Array<{
    type: 'function'
    function: { name: string; description: string; parameters: unknown }
  }>
  tool_choice: 'auto'
  parallel_tool_calls: false
} {
  return {
    tools: generationToolDefinitions(policy).map((definition) => ({
      type: 'function',
      function: {
        name: definition.name,
        description: definition.description,
        parameters: definition.inputSchema
      }
    })),
    tool_choice: 'auto',
    // Sequential accounting is inspectable and cancellable; ADR-015 disables
    // parallel calls even where the provider offers them.
    parallel_tool_calls: false
  }
}

/**
 * Normalize the provider's `tool_calls` into Atomik's neutral envelope.
 *
 * Arguments arrive as a JSON *string* on this dialect. A string that does not
 * parse is passed through UNCHANGED rather than rejected here: the shared
 * authority parser turns it into an untrusted invalid-arguments result the
 * model can recover from, and nothing executes either way.
 */
export function parseOpenAiToolCalls(value: unknown): AdapterToolCall[] {
  if (!Array.isArray(value) || value.length === 0) return []
  const calls: AdapterToolCall[] = []
  const ids = new Set<string>()
  for (const candidate of value) {
    if (
      typeof candidate !== 'object' ||
      candidate === null ||
      typeof (candidate as Record<string, unknown>)['id'] !== 'string' ||
      typeof (candidate as Record<string, unknown>)['function'] !== 'object' ||
      (candidate as Record<string, unknown>)['function'] === null
    ) {
      throw new GenerationError(
        'provider-request',
        'provider returned a malformed tool call'
      )
    }
    const record = candidate as Record<string, unknown>
    const fn = record['function'] as Record<string, unknown>
    const id = record['id'] as string
    if (ids.has(id) || typeof fn['name'] !== 'string' || !('arguments' in fn)) {
      throw new GenerationError(
        'provider-request',
        'provider returned a malformed tool call'
      )
    }
    ids.add(id)
    let args = fn['arguments']
    if (typeof args === 'string') {
      try {
        args = JSON.parse(args) as unknown
      } catch {
        // Preserved as data — see the doc comment above.
      }
    }
    calls.push({ id, name: fn['name'] as string, arguments: args })
  }
  return calls
}

/**
 * Echo the provider's assistant turn VERBATIM.
 *
 * Rebuilding it from the normalized call fields looks equivalent and is not:
 * observed on 2026-08-17, Gemini attaches
 * `tool_calls[].extra_content.google.thought_signature`, an opaque field
 * carrying reasoning continuity across the tool boundary. A reconstructed turn
 * drops it silently. Normalization exists for Atomik's authority layer; the
 * wire keeps whatever the provider put on it.
 */
export function assistantEcho(message: OpenAiChoiceMessage): OpenAiChatMessage {
  return { ...message, role: message.role ?? 'assistant' }
}

/** One `role: "tool"` message per call, in the order the provider asked. */
export function toolResultMessages(
  calls: readonly AdapterToolCall[],
  results: readonly GenerationToolResult[]
): OpenAiChatMessage[] {
  const byId = new Map(results.map((result) => [result.callId, result]))
  return calls.map((call) => {
    const result = byId.get(call.id)
    if (result === undefined) {
      throw new GenerationError(
        'provider-request',
        'tool continuation omitted a call result'
      )
    }
    return {
      role: 'tool',
      tool_call_id: call.id,
      name: call.name,
      content: result.content
    }
  })
}

/**
 * Accumulate usage across the turns of one tool loop. Every provider on this
 * dialect needs the identical rule, so it lives beside the codec: a total is
 * only `provider-reported` when EVERY turn in it was.
 */
export function combineTurnUsage(
  previous: GenerationUsage | undefined,
  next: GenerationUsage
): GenerationUsage {
  if (previous === undefined) return next
  return {
    inputTokens: previous.inputTokens + next.inputTokens,
    outputTokens: previous.outputTokens + next.outputTokens,
    basis:
      previous.basis === 'provider-reported' &&
      next.basis === 'provider-reported'
        ? 'provider-reported'
        : 'estimated'
  }
}

export type OpenAiTurnHooks<TResponse> = {
  /** Send one turn. `policy` is present on every request inside the loop. */
  request: (
    messages: OpenAiChatMessage[],
    policy: GenerationToolPolicy
  ) => Promise<TResponse>
  /** The provider's first choice, unmodified. */
  choiceOf: (response: TResponse) => OpenAiChoiceMessage | undefined
  /** This turn's usage, already combined with what earlier turns spent. */
  usageOf: (
    response: TResponse,
    outputChars: number,
    accumulated: GenerationUsage | undefined
  ) => GenerationUsage
  /** Shape the answer once the model stops calling tools. */
  finalResult: (
    response: TResponse,
    content: string,
    usage: GenerationUsage
  ) => GenerationResult
}

/**
 * One provider turn, recursing through `continue` while the model keeps
 * calling tools. Budgets, the allowlist, execution and cancellation are NOT
 * here — `runGenerationWithTools` owns all of that. This function owns the
 * wire only, and keeps the provider's message state in the closure so the
 * loop never has to learn a vendor transcript.
 */
export async function openAiToolTurn<TResponse>(
  hooks: OpenAiTurnHooks<TResponse>,
  policy: GenerationToolPolicy,
  messages: OpenAiChatMessage[],
  accumulated?: GenerationUsage
): Promise<GenerationAdapterTurn> {
  const response = await hooks.request(messages, policy)
  const message = hooks.choiceOf(response)
  // Gemini omits `content` entirely on a tool turn (observed 2026-08-17), so
  // this must tolerate an ABSENT key, not merely an empty string.
  const content = (message?.content ?? '').trim()
  const calls = parseOpenAiToolCalls(message?.tool_calls)
  const usage = hooks.usageOf(
    response,
    content.length +
      (message?.tool_calls === undefined
        ? 0
        : JSON.stringify(message.tool_calls).length),
    accumulated
  )

  if (calls.length > 0 && message !== undefined) {
    return {
      kind: 'tool-calls',
      calls,
      continue: (results) =>
        openAiToolTurn(
          hooks,
          policy,
          [
            ...messages,
            assistantEcho(message),
            ...toolResultMessages(calls, results)
          ],
          usage
        )
    }
  }

  if (content.length === 0) {
    throw new GenerationError(
      'provider-request',
      'provider returned neither a tool call nor a completion'
    )
  }
  return { kind: 'final', result: hooks.finalResult(response, content, usage) }
}
