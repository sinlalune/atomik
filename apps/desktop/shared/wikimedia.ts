/**
 * Wikimedia live-grounding contracts (CP-MVP-011 S01).
 *
 * This file is deliberately PURE. It names the data that may cross the
 * main/renderer and model-tool boundaries, but it owns no network transport.
 * The main-side seat supplies fetch, time and cancellation in later steps.
 * Raw MediaWiki HTML never belongs in this public result contract.
 */

export const WIKIMEDIA_API_SNAPSHOT_ID = 'wikimedia-live@2026-08-17' as const

/** Wikimedia asks API clients to identify themselves with a contact route. */
export const WIKIMEDIA_USER_AGENT =
  'Atomik/0.1 (https://github.com/sinlalune/atomik; desktop knowledge tool)'

/**
 * Product budgets, not Wikimedia rate-limit claims. Server limits are
 * deployment facts and may change; the client must still honour 429 and
 * Retry-After rather than assuming these numbers buy capacity.
 */
export const WIKIMEDIA_LIMITS = {
  maxQueryChars: 300,
  defaultResults: 3,
  maxResults: 5,
  maxNetworkRequestsPerSearch: 8,
  /** Per HTTP response; the whole search has its own independent ceiling. */
  maxResponseBytes: 2_000_000,
  maxTotalResponseBytes: 6_000_000,
  maxArticleTextChars: 6_000,
  maxToolTextChars: 18_000,
  requestTimeoutMs: 12_000,
  maxRetryAfterMs: 5_000
} as const

export type WikimediaProject =
  | 'wikipedia'
  | 'wikidata'
  | 'commons'
  | 'wiktionary'

/** Commons is reached through a Wikidata P18 result, not searched by the model. */
export type WikimediaSearchCorpus =
  | 'auto'
  | 'wikipedia'
  | 'wikidata'
  | 'wiktionary'

export type SearchWikiRequest = {
  query: string
  /** Wikimedia edition/display language, normalized to a safe host label. */
  language: string
  /** `auto` searches Wikipedia + Wikidata; Wiktionary is always deliberate. */
  corpus: WikimediaSearchCorpus
  limit: number
  /** Only meaningful for Wikidata/auto; media still has to pass attribution. */
  includeMedia: boolean
}

export type WikimediaLicense = {
  name: string
  url: string
}

export type WikimediaRevision = {
  /** Null only when the chosen API response does not expose an id. */
  id: number | null
  /** ISO timestamp when exposed by the chosen endpoint. */
  timestamp: string | null
}

/** The common citation/provenance atom for every live Wikimedia result. */
export type WikimediaSource = {
  project: WikimediaProject
  /** Requested edition/display language, including for multilingual hosts. */
  language: string
  title: string
  pageId: number | null
  revision: WikimediaRevision
  canonicalUrl: string
  accessedAt: string
  license: WikimediaLicense | null
}

export type WikipediaArticle = {
  kind: 'wikipedia-article'
  rank: number
  description: string | null
  /** Bounded plain text derived from the consulted revision's page HTML. */
  text: string
  truncated: boolean
  source: WikimediaSource & { project: 'wikipedia' }
}

export type WikidataValue =
  | { kind: 'entity'; id: string; label: string | null }
  | { kind: 'time'; value: string; precision: number }
  | { kind: 'quantity'; amount: string; unit: string | null }
  | { kind: 'coordinate'; latitude: number; longitude: number; precision: number | null }
  | { kind: 'monolingual-text'; language: string; text: string }
  | { kind: 'string'; value: string }
  | { kind: 'commons-media'; fileTitle: string }

export type WikidataRank = 'preferred' | 'normal' | 'deprecated'

export type WikidataStatement = {
  id: string
  property: WikidataPropertyId
  propertyLabel: string
  rank: WikidataRank
  value: WikidataValue
}

export type WikidataSitelink = {
  language: string
  site: string
  title: string
  url: string
}

export type WikidataEntity = {
  kind: 'wikidata-entity'
  id: string
  rank: number
  label: string
  description: string | null
  aliases: string[]
  sitelinks: WikidataSitelink[]
  statements: WikidataStatement[]
  source: WikimediaSource & { project: 'wikidata' }
}

export type CommonsMedia = {
  kind: 'commons-media'
  fileTitle: string
  description: string | null
  creator: string
  credit: string | null
  attributionRequired: boolean
  originalUrl: string
  thumbnailUrl: string
  mime: string
  width: number
  height: number
  /** A media result cannot exist without a concrete licence. */
  source: WikimediaSource & {
    project: 'commons'
    license: WikimediaLicense
  }
}

export type EtymologyStatus =
  | 'attested'
  | 'reconstructed'
  | 'disputed'
  | 'unknown'

export type WiktionaryEtymology = {
  kind: 'wiktionary-etymology'
  term: string
  editionLanguage: string
  entryLanguage: string
  heading: string
  /** Exact bounded section text; parser uncertainty remains visible in status. */
  text: string
  status: EtymologyStatus
  truncated: boolean
  source: WikimediaSource & { project: 'wiktionary' }
}

export type WikimediaResult =
  | WikipediaArticle
  | WikidataEntity
  | WiktionaryEtymology

export type WikimediaWarningKind =
  | 'ambiguous'
  | 'truncated'
  | 'parser-uncertain'
  | 'media-withheld'

export type WikimediaWarning = {
  kind: WikimediaWarningKind
  message: string
}

export type WikimediaSearchBundle = {
  request: SearchWikiRequest
  results: WikimediaResult[]
  media: CommonsMedia[]
  warnings: WikimediaWarning[]
  /** Total response bytes consumed by the main-side seat. */
  responseBytes: number
  accessedAt: string
}

export type WikimediaErrorKind =
  | 'empty'
  | 'rate-limit'
  | 'network'
  | 'timeout'
  | 'malformed'
  | 'cancelled'
  | 'budget-exceeded'
  | 'unsupported-language'

/** Privacy-safe receipt input; it deliberately has no query or result text. */
export type WikimediaTraceRecord = {
  parentTraceId: string
  parentOperationId: string
  tool: 'search_wiki'
  corpus: Exclude<WikimediaSearchCorpus, 'auto'>
  language: string
  requests: number
  resultCount: number
  responseBytes: number
  wallMs: number
  status: 'completed' | 'failed'
  errorKind?: WikimediaErrorKind
}

/**
 * The claim vocabulary is data, not an ontology. Only these properties may
 * enter a chat result or disposable graph projection; adding one is a
 * contract change that needs fixtures and documentation.
 */
export const WIKIDATA_PROPERTY_ALLOWLIST = {
  P18: { label: 'image', valueKind: 'commons-media' },
  P31: { label: 'instance-of', valueKind: 'entity' },
  P279: { label: 'subclass-of', valueKind: 'entity' },
  P361: { label: 'part-of', valueKind: 'entity' },
  P527: { label: 'has-part', valueKind: 'entity' },
  P17: { label: 'country', valueKind: 'entity' },
  P27: { label: 'country-of-citizenship', valueKind: 'entity' },
  P131: { label: 'located-in', valueKind: 'entity' },
  P276: { label: 'location', valueKind: 'entity' },
  P19: { label: 'place-of-birth', valueKind: 'entity' },
  P20: { label: 'place-of-death', valueKind: 'entity' },
  P106: { label: 'occupation', valueKind: 'entity' },
  P50: { label: 'author', valueKind: 'entity' },
  P170: { label: 'creator', valueKind: 'entity' },
  P112: { label: 'founded-by', valueKind: 'entity' },
  P138: { label: 'named-after', valueKind: 'entity' },
  P737: { label: 'influenced-by', valueKind: 'entity' },
  P569: { label: 'date-of-birth', valueKind: 'time' },
  P570: { label: 'date-of-death', valueKind: 'time' },
  P571: { label: 'inception', valueKind: 'time' },
  P576: { label: 'dissolved-or-abolished', valueKind: 'time' }
} as const

export type WikidataPropertyId = keyof typeof WIKIDATA_PROPERTY_ALLOWLIST

/** Fixture obligations are pinned before transport code is written. */
export const WIKIMEDIA_FIXTURE_CASES = [
  { id: 'wikipedia-en-atom', seat: 'wikipedia', outcome: 'result' },
  { id: 'wikipedia-fr-atome', seat: 'wikipedia', outcome: 'result' },
  { id: 'wikidata-atom-ambiguous', seat: 'wikidata', outcome: 'ambiguous' },
  { id: 'wikidata-marie-curie-p18', seat: 'wikidata', outcome: 'result' },
  { id: 'commons-marie-curie-attribution', seat: 'commons', outcome: 'result' },
  { id: 'commons-missing-attribution', seat: 'commons', outcome: 'withheld' },
  { id: 'wiktionary-en-atom', seat: 'wiktionary', outcome: 'result' },
  { id: 'wiktionary-fr-atome', seat: 'wiktionary', outcome: 'result' },
  { id: 'search-empty', seat: 'transport', outcome: 'empty' },
  { id: 'request-rate-limited', seat: 'transport', outcome: 'rate-limit' },
  { id: 'response-malformed', seat: 'transport', outcome: 'malformed' },
  { id: 'response-oversize', seat: 'transport', outcome: 'budget-exceeded' }
] as const

type UnknownRecord = Record<string, unknown>

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const SEARCH_KEYS = new Set(['query', 'language', 'corpus', 'limit', 'includeMedia'])
const CORPORA = new Set<WikimediaSearchCorpus>([
  'auto',
  'wikipedia',
  'wikidata',
  'wiktionary'
])

export class WikimediaContractError extends Error {
  constructor(detail: string) {
    super(`wiki(request): ${detail}`)
    this.name = 'WikimediaContractError'
  }
}

/**
 * Language codes become host labels, so this is intentionally narrower than
 * arbitrary BCP-47: lowercase alphanumeric subtags separated by single dashes.
 */
export function normalizeWikimediaLanguage(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim().toLowerCase()
  if (normalized.length === 0 || normalized.length > 32) return null
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized)) return null
  if (!/^[a-z]/.test(normalized)) return null
  return normalized
}

/** Fixed-host routing: no caller-provided URL can turn this into generic fetch. */
export function wikimediaHostOf(project: WikimediaProject, language: string): string {
  const safeLanguage = normalizeWikimediaLanguage(language)
  if (safeLanguage === null) {
    throw new WikimediaContractError('invalid language')
  }
  if (project === 'wikipedia') return `${safeLanguage}.wikipedia.org`
  if (project === 'wiktionary') return `${safeLanguage}.wiktionary.org`
  if (project === 'wikidata') return 'www.wikidata.org'
  return 'commons.wikimedia.org'
}

export function wikimediaCoreRestBase(
  project: Extract<WikimediaProject, 'wikipedia' | 'wiktionary'>,
  language: string
): string {
  return `https://${wikimediaHostOf(project, language)}/w/rest.php/v1`
}

export function wikimediaActionApiBase(
  project: WikimediaProject,
  language: string
): string {
  return `https://${wikimediaHostOf(project, language)}/w/api.php`
}

/** Parse the narrow IPC/tool request. Unknown fields fail loudly. */
export function parseSearchWikiRequest(value: unknown): SearchWikiRequest {
  if (!isRecord(value)) throw new WikimediaContractError('expected an object')
  const unknownKeys = Object.keys(value).filter((key) => !SEARCH_KEYS.has(key))
  if (unknownKeys.length > 0) {
    throw new WikimediaContractError(`unknown field: ${unknownKeys[0]}`)
  }

  if (typeof value.query !== 'string') {
    throw new WikimediaContractError('query is required')
  }
  const query = value.query.trim()
  if (query.length === 0 || query.length > WIKIMEDIA_LIMITS.maxQueryChars) {
    throw new WikimediaContractError(
      `query must contain 1-${WIKIMEDIA_LIMITS.maxQueryChars} characters`
    )
  }

  const language = normalizeWikimediaLanguage(value.language)
  if (language === null) {
    throw new WikimediaContractError('language is required and must be a safe edition code')
  }

  const corpus = value.corpus ?? 'auto'
  if (typeof corpus !== 'string' || !CORPORA.has(corpus as WikimediaSearchCorpus)) {
    throw new WikimediaContractError('unsupported corpus')
  }

  const limit = value.limit ?? WIKIMEDIA_LIMITS.defaultResults
  if (
    typeof limit !== 'number' ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > WIKIMEDIA_LIMITS.maxResults
  ) {
    throw new WikimediaContractError(
      `limit must be an integer from 1-${WIKIMEDIA_LIMITS.maxResults}`
    )
  }

  const includeMedia = value.includeMedia ?? true
  if (typeof includeMedia !== 'boolean') {
    throw new WikimediaContractError('includeMedia must be boolean')
  }

  return {
    query,
    language,
    corpus: corpus as WikimediaSearchCorpus,
    limit,
    includeMedia
  }
}
