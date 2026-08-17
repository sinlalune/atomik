import type { RetrievalSensitivity } from './retrieval-core'
import type { ContextPacket } from './context-packet'
import {
  normalizeWikimediaLanguage,
  parseSearchWikiRequest,
  type SearchWikiRequest,
  type WikimediaSearchBundle
} from './wikimedia'

/** Provider-neutral model tool protocol (CP-MVP-011 S01). */

export const GENERATION_TOOL_LIMITS = {
  maxCallsPerOperation: 4,
  maxDepth: 3,
  maxArgumentsChars: 1_000,
  maxResultCharsPerCall: 18_000,
  maxResultCharsPerOperation: 48_000,
  maxResultBytesPerCall: 96_000,
  maxWallMs: 25_000,
  maxVaultResults: 8,
  maxVaultTokens: 2_500
} as const

export type GenerationToolName = 'search_vault' | 'search_wiki'
export type GenerationToolMode = 'off' | 'model'

/** Renderer preference only; main owns the allowlist and hard budgets. */
export type GenerationToolPreference = {
  mode: GenerationToolMode
  wikiLanguage: string
}

export type GenerationToolPolicy = {
  mode: GenerationToolMode
  allowed: readonly GenerationToolName[]
  wikiLanguage: string
  limits: typeof GENERATION_TOOL_LIMITS
}

export type SearchVaultToolArguments = {
  query: string
  sensitivity: RetrievalSensitivity
  limit: number
}

export type SearchWikiToolArguments = SearchWikiRequest

export type GenerationToolCall =
  | {
      id: string
      name: 'search_vault'
      arguments: SearchVaultToolArguments
    }
  | {
      id: string
      name: 'search_wiki'
      arguments: SearchWikiToolArguments
    }

export type GenerationToolResultStats = {
  resultCount: number
  chars: number
  bytes: number
  wallMs: number
}

export type GenerationToolErrorCode =
  | 'invalid-arguments'
  | 'not-allowed'
  | 'budget-exhausted'
  | 'cancelled'
  | 'unavailable'
  | 'failed'

/**
 * `content` is appended to a provider conversation as UNTRUSTED material. It
 * may inform an answer; it never becomes an instruction or durable vault data.
 */
export type GenerationToolResult = {
  callId: string
  /** Echoes the provider request even when the name is rejected. */
  name: string
  ok: boolean
  untrusted: true
  content: string
  stats: GenerationToolResultStats
  error?: { code: GenerationToolErrorCode; message: string }
}

export type GenerationToolPayload =
  | { kind: 'vault-context'; packet: ContextPacket }
  | { kind: 'wikimedia'; bundle: WikimediaSearchBundle }

/** Inspectable activity returned with the answer; still transient. */
export type GenerationToolExecution = {
  call: { id: string; name: string; arguments: unknown }
  result: GenerationToolResult
  payload?: GenerationToolPayload
}

export type GenerationToolDefinition = {
  name: GenerationToolName
  description: string
  inputSchema: Record<string, unknown>
}

export type GenerationToolDialect =
  | 'openai-chat-completions'
  | 'anthropic-messages'

/** Fail closed: adapters advertise native tool support only when implemented. */
export type GenerationToolCapability =
  | { kind: 'unsupported'; reason: string }
  | {
      kind: 'native'
      dialect: GenerationToolDialect
      parallelCalls: boolean
    }

export const FINAL_ONLY_TOOL_CAPABILITY: GenerationToolCapability = {
  kind: 'unsupported',
  reason: 'adapter returns final responses only'
}

type UnknownRecord = Record<string, unknown>

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const CALL_ID_RE = /^[A-Za-z0-9._:-]{1,128}$/
const VAULT_KEYS = new Set(['query', 'sensitivity', 'limit'])
const PREFERENCE_KEYS = new Set(['mode', 'wikiLanguage'])
const SENSITIVITIES = new Set<RetrievalSensitivity>(['titles', 'linked', 'full'])

export class GenerationToolContractError extends Error {
  constructor(
    readonly code: 'invalid-arguments' | 'not-allowed',
    detail: string
  ) {
    super(`tool(${code}): ${detail}`)
    this.name = 'GenerationToolContractError'
  }
}

/** Strict renderer-wire parser; a preference grants no execution authority. */
export function parseGenerationToolPreference(
  value: unknown
): GenerationToolPreference {
  if (!isRecord(value)) {
    throw new GenerationToolContractError(
      'invalid-arguments',
      'tool preference must be an object'
    )
  }
  const unknownKeys = Object.keys(value).filter(
    (key) => !PREFERENCE_KEYS.has(key)
  )
  if (unknownKeys.length > 0) {
    throw new GenerationToolContractError(
      'invalid-arguments',
      `unknown tool preference field: ${unknownKeys[0]}`
    )
  }
  if (value.mode !== 'off' && value.mode !== 'model') {
    throw new GenerationToolContractError(
      'invalid-arguments',
      'tool mode must be off or model'
    )
  }
  const wikiLanguage = normalizeWikimediaLanguage(value.wikiLanguage)
  if (wikiLanguage === null) {
    throw new GenerationToolContractError(
      'invalid-arguments',
      'invalid Wikimedia language'
    )
  }
  return { mode: value.mode, wikiLanguage }
}

function parseVaultArguments(value: unknown): SearchVaultToolArguments {
  if (!isRecord(value)) {
    throw new GenerationToolContractError('invalid-arguments', 'arguments must be an object')
  }
  const unknownKeys = Object.keys(value).filter((key) => !VAULT_KEYS.has(key))
  if (unknownKeys.length > 0) {
    throw new GenerationToolContractError(
      'invalid-arguments',
      `unknown search_vault field: ${unknownKeys[0]}`
    )
  }
  if (typeof value.query !== 'string') {
    throw new GenerationToolContractError('invalid-arguments', 'query is required')
  }
  const query = value.query.trim()
  if (query.length === 0 || query.length > 500) {
    throw new GenerationToolContractError(
      'invalid-arguments',
      'vault query must contain 1-500 characters'
    )
  }
  const sensitivity = value.sensitivity ?? 'linked'
  if (
    typeof sensitivity !== 'string' ||
    !SENSITIVITIES.has(sensitivity as RetrievalSensitivity)
  ) {
    throw new GenerationToolContractError('invalid-arguments', 'invalid sensitivity')
  }
  const limit = value.limit ?? GENERATION_TOOL_LIMITS.maxVaultResults
  if (
    typeof limit !== 'number' ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > GENERATION_TOOL_LIMITS.maxVaultResults
  ) {
    throw new GenerationToolContractError(
      'invalid-arguments',
      `vault limit must be an integer from 1-${GENERATION_TOOL_LIMITS.maxVaultResults}`
    )
  }
  return {
    query,
    sensitivity: sensitivity as RetrievalSensitivity,
    limit
  }
}

/**
 * Provider adapters first normalize their native payload into
 * `{ id, name, arguments }`; this parser is the one main-side allowlist gate.
 */
export function parseGenerationToolCall(
  value: unknown,
  policy: GenerationToolPolicy
): GenerationToolCall {
  if (!isRecord(value)) {
    throw new GenerationToolContractError('invalid-arguments', 'call must be an object')
  }
  if (typeof value.id !== 'string' || !CALL_ID_RE.test(value.id)) {
    throw new GenerationToolContractError('invalid-arguments', 'invalid call id')
  }
  if (value.name !== 'search_vault' && value.name !== 'search_wiki') {
    throw new GenerationToolContractError('not-allowed', 'tool is not on the allowlist')
  }
  if (policy.mode !== 'model' || !policy.allowed.includes(value.name)) {
    throw new GenerationToolContractError('not-allowed', `${value.name} is disabled`)
  }
  const argumentChars = JSON.stringify(value.arguments ?? null).length
  if (argumentChars > policy.limits.maxArgumentsChars) {
    throw new GenerationToolContractError('invalid-arguments', 'arguments exceed the byte budget')
  }
  if (value.name === 'search_vault') {
    return {
      id: value.id,
      name: value.name,
      arguments: parseVaultArguments(value.arguments)
    }
  }
  try {
    const request = parseSearchWikiRequest(value.arguments)
    if (request.language !== policy.wikiLanguage) {
      throw new GenerationToolContractError(
        'not-allowed',
        `search_wiki language must be ${policy.wikiLanguage}`
      )
    }
    return {
      id: value.id,
      name: value.name,
      arguments: request
    }
  } catch (error) {
    if (error instanceof GenerationToolContractError) throw error
    const detail = error instanceof Error ? error.message : 'invalid wiki arguments'
    throw new GenerationToolContractError('invalid-arguments', detail)
  }
}

export function createGenerationToolPolicy(
  preference: GenerationToolPreference
): GenerationToolPolicy {
  const parsed = parseGenerationToolPreference(preference)
  return {
    mode: parsed.mode,
    allowed: parsed.mode === 'model' ? ['search_vault', 'search_wiki'] : [],
    wikiLanguage: parsed.wikiLanguage,
    limits: GENERATION_TOOL_LIMITS
  }
}

/** Provider-neutral schemas; adapters translate only the outer wire dialect. */
export function generationToolDefinitions(
  policy: GenerationToolPolicy
): GenerationToolDefinition[] {
  if (policy.mode !== 'model') return []
  const definitions: GenerationToolDefinition[] = []
  if (policy.allowed.includes('search_vault')) {
    definitions.push({
      name: 'search_vault',
      description:
        "Search the owner's local vault for bounded, inspectable context.",
      inputSchema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          query: { type: 'string', minLength: 1, maxLength: 500 },
          sensitivity: {
            type: 'string',
            enum: ['titles', 'linked', 'full'],
            default: 'linked'
          },
          limit: {
            type: 'integer',
            minimum: 1,
            maximum: policy.limits.maxVaultResults,
            default: policy.limits.maxVaultResults
          }
        },
        required: ['query']
      }
    })
  }
  if (policy.allowed.includes('search_wiki')) {
    definitions.push({
      name: 'search_wiki',
      description:
        'Search bounded Wikipedia, Wikidata, Commons P18 or pinned Wiktionary material.',
      inputSchema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          query: { type: 'string', minLength: 1, maxLength: 300 },
          language: { type: 'string', enum: [policy.wikiLanguage] },
          corpus: {
            type: 'string',
            enum: ['auto', 'wikipedia', 'wikidata', 'wiktionary'],
            default: 'auto'
          },
          limit: { type: 'integer', minimum: 1, maximum: 5, default: 3 },
          includeMedia: { type: 'boolean', default: true }
        },
        required: ['query', 'language']
      }
    })
  }
  return definitions
}
