import type { RetrievalSensitivity } from './retrieval-core'
import type { ContextPacket } from './context-packet'
import {
  normalizeWikimediaLanguage,
  parseSearchWikiRequest,
  type SearchWikiRequest,
  type WikimediaSearchBundle,
  type WikimediaSearchCorpus
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
/** The wiki tool's fine-tune, mirroring the vault tool's `reach` (owner
 *  ruling 2026-08-17). Depth is a NAMED step, never a raw number from the
 *  renderer: main maps it to the pinned result ceiling. */
export type GenerationWikiReach = 'quick' | 'standard' | 'deep'

/** Which of the four augmentations the user left switched on. */
export type GenerationWikiSources = {
  wikipedia: boolean
  wikidata: boolean
  media: boolean
  wiktionary: boolean
}

export const WIKI_REACH_LIMITS: Record<GenerationWikiReach, number> = {
  quick: 2,
  standard: 3,
  deep: 5
}

export const DEFAULT_WIKI_SOURCES: GenerationWikiSources = {
  wikipedia: true,
  wikidata: true,
  media: true,
  wiktionary: true
}

/** What the RENDERER may send: the fine-tune is optional, and omitting it
 *  means the pinned defaults rather than an error. */
export type GenerationToolPreference = {
  mode: GenerationToolMode
  wikiLanguage: string
  wikiReach?: GenerationWikiReach
  wikiSources?: Partial<GenerationWikiSources>
}

/** What MAIN works with once every default has been resolved. */
export type ResolvedGenerationToolPreference = {
  mode: GenerationToolMode
  wikiLanguage: string
  wikiReach: GenerationWikiReach
  wikiSources: GenerationWikiSources
}

export type GenerationToolPolicy = {
  mode: GenerationToolMode
  allowed: readonly GenerationToolName[]
  wikiLanguage: string
  /** Corpora the user left switched on, derived — never sent by the renderer. */
  wikiCorpora: readonly WikimediaSearchCorpus[]
  /** Result ceiling for this reach; the model may ask for less, never more. */
  wikiLimit: number
  wikiMedia: boolean
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
const PREFERENCE_KEYS = new Set([
  'mode',
  'wikiLanguage',
  'wikiReach',
  'wikiSources'
])
const WIKI_SOURCE_KEYS = new Set(['wikipedia', 'wikidata', 'media', 'wiktionary'])
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
): ResolvedGenerationToolPreference {
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
  const wikiReach = value.wikiReach ?? 'standard'
  if (
    wikiReach !== 'quick' &&
    wikiReach !== 'standard' &&
    wikiReach !== 'deep'
  ) {
    throw new GenerationToolContractError(
      'invalid-arguments',
      'wiki reach must be quick, standard or deep'
    )
  }
  const wikiSources = parseWikiSources(value.wikiSources)
  return { mode: value.mode, wikiLanguage, wikiReach, wikiSources }
}

function parseWikiSources(value: unknown): GenerationWikiSources {
  if (value === undefined) return { ...DEFAULT_WIKI_SOURCES }
  if (!isRecord(value)) {
    throw new GenerationToolContractError(
      'invalid-arguments',
      'wiki sources must be an object'
    )
  }
  const unknown = Object.keys(value).filter((key) => !WIKI_SOURCE_KEYS.has(key))
  if (unknown.length > 0) {
    throw new GenerationToolContractError(
      'invalid-arguments',
      `unknown wiki source field: ${unknown[0]}`
    )
  }
  const read = (key: keyof GenerationWikiSources): boolean => {
    const entry = value[key]
    if (entry === undefined) return DEFAULT_WIKI_SOURCES[key]
    if (typeof entry !== 'boolean') {
      throw new GenerationToolContractError(
        'invalid-arguments',
        `wiki source ${key} must be a boolean`
      )
    }
    return entry
  }
  return {
    wikipedia: read('wikipedia'),
    wikidata: read('wikidata'),
    media: read('media'),
    wiktionary: read('wiktionary')
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
    const request = parseSearchWikiRequest(value.arguments)
    if (request.language !== policy.wikiLanguage) {
      throw new GenerationToolContractError(
        'not-allowed',
        `search_wiki language must be ${policy.wikiLanguage}`
      )
    }
    // The emitted schema already advertises only the switched-on corpora; a
    // model that asks anyway is refused here, because a schema is advice and
    // this parser is authority.
    if (!policy.wikiCorpora.includes(request.corpus)) {
      throw new GenerationToolContractError(
        'not-allowed',
        `${request.corpus} is switched off for this thread`
      )
    }
    return {
      id: value.id,
      name: value.name,
      arguments: {
        ...request,
        // Reach and the media switch CLAMP rather than refuse: asking for more
        // breadth than the user allowed is not misconduct, so the call still
        // runs, bounded to what they chose.
        limit: Math.min(request.limit, policy.wikiLimit),
        includeMedia: request.includeMedia && policy.wikiMedia
      }
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
  const sources = parsed.wikiSources
  const corpora: WikimediaSearchCorpus[] = []
  // `auto` only means anything when BOTH of its legs are switched on.
  if (sources.wikipedia && sources.wikidata) corpora.push('auto')
  if (sources.wikipedia) corpora.push('wikipedia')
  if (sources.wikidata) corpora.push('wikidata')
  if (sources.wiktionary) corpora.push('wiktionary')
  // Switching every source off removes the VERB, rather than leaving a tool
  // that can only fail: the model is never offered a door it cannot open.
  const allowed: GenerationToolName[] =
    parsed.mode === 'model'
      ? corpora.length > 0
        ? ['search_vault', 'search_wiki']
        : ['search_vault']
      : []
  return {
    mode: parsed.mode,
    allowed,
    wikiLanguage: parsed.wikiLanguage,
    wikiCorpora: corpora,
    wikiLimit: WIKI_REACH_LIMITS[parsed.wikiReach],
    // Media rides on Wikidata's P18; without that leg there is nothing to
    // resolve a filename from.
    wikiMedia: sources.media && sources.wikidata,
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
            enum: [...policy.wikiCorpora],
            default: policy.wikiCorpora[0]
          },
          limit: {
            type: 'integer',
            minimum: 1,
            maximum: policy.wikiLimit,
            default: policy.wikiLimit
          },
          includeMedia: policy.wikiMedia
            ? { type: 'boolean', default: true }
            : { type: 'boolean', enum: [false], default: false }
        },
        required: ['query', 'language']
      }
    })
  }
  return definitions
}
