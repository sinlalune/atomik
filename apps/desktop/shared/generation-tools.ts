import type { RetrievalSensitivity } from './retrieval-core'
import {
  parseSearchWikiRequest,
  type SearchWikiRequest
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
  name: GenerationToolName
  ok: boolean
  untrusted: true
  content: string
  stats: GenerationToolResultStats
  error?: { code: GenerationToolErrorCode; message: string }
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
    return {
      id: value.id,
      name: value.name,
      arguments: parseSearchWikiRequest(value.arguments)
    }
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'invalid wiki arguments'
    throw new GenerationToolContractError('invalid-arguments', detail)
  }
}

export function createGenerationToolPolicy(
  preference: GenerationToolPreference
): GenerationToolPolicy {
  return {
    mode: preference.mode,
    allowed: preference.mode === 'model' ? ['search_vault', 'search_wiki'] : [],
    wikiLanguage: preference.wikiLanguage,
    limits: GENERATION_TOOL_LIMITS
  }
}
