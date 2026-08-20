import { parseHTML } from 'linkedom'
import {
  parseSearchWikiRequest,
  WIKIDATA_PROPERTY_ALLOWLIST,
  WIKIMEDIA_LIMITS,
  WIKIMEDIA_USER_AGENT,
  wikimediaActionApiBase,
  wikimediaCoreRestBase,
  wikimediaHostOf,
  type CommonsMedia,
  type EtymologyStatus,
  type SearchWikiRequest,
  type WikidataEntity,
  type WikidataPropertyId,
  type WikidataRank,
  type WikidataSitelink,
  type WikidataStatement,
  type WikidataValue,
  type WikimediaErrorKind,
  type WikimediaSearchBundle,
  type WikimediaTraceRecord,
  type WikimediaWarning,
  type WikipediaArticle,
  type WiktionaryEtymology
} from '../shared/wikimedia'
import { selectWikiSections, type WikiSection } from '../shared/wiki-sections'

/**
 * Main-side Wikimedia seat (CP-MVP-011 S02). Transport, clock and traces are
 * injected; fixed-host routing and result types live in the pure shared core.
 */

export type WikimediaTraceSink = {
  recordWikimedia(record: WikimediaTraceRecord): string | void
}

export type WikimediaSearchContext = {
  signal: AbortSignal
  parentTraceId: string
  parentOperationId: string
  /** S07e: which corpora `auto` may consult — the user's own switches, passed
   *  from main. Absent means the historical Wikipedia+Wikidata pair. The owner
   *  switched all four on and got Wikipedia only, because `auto` was hard-coded
   *  to two. */
  corpora?: readonly ('auto' | 'wikipedia' | 'wikidata' | 'wiktionary')[]
  /** Fail-closed default is private: no remote thumbnail URL is returned. */
  mediaPolicy?: 'remote' | 'private' | 'offline'
}

type WikimediaClientOptions = {
  fetchImpl?: typeof fetch
  nowMs?: () => number
  userAgent?: string
  trace?: WikimediaTraceSink
  limits?: Partial<EffectiveLimits>
}

type EffectiveLimits = {
  [Key in keyof typeof WIKIMEDIA_LIMITS]: number
}

type RequestBudget = {
  requests: number
  responseBytes: number
}

type SearchPage = {
  id: number
  key: string
  title: string
  description: string | null
}

type PageWithHtml = {
  id: number
  key: string
  title: string
  latest: { id: number; timestamp: string }
  license: { url: string; title: string }
  html: string
}

type WikidataSearchHit = {
  id: string
  label: string
  description: string | null
}

type WikidataSearchResponse = {
  hits: WikidataSearchHit[]
  hasMore: boolean
}

const QID_RE = /^Q[1-9][0-9]*$/
const WIKIDATA_LICENSE = {
  name: 'Creative Commons CC0 1.0',
  url: 'https://creativecommons.org/publicdomain/zero/1.0/'
} as const

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export class WikimediaError extends Error {
  constructor(
    readonly kind: WikimediaErrorKind,
    detail: string,
    readonly retryAfterMs?: number
  ) {
    super(`wiki(${kind}): ${detail}`)
    this.name = 'WikimediaError'
  }
}

const positiveInteger = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value > 0

const nonNegativeInteger = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0

const requiredString = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0

function parseSearchPages(value: unknown, source = 'Wikipedia'): SearchPage[] {
  if (!isRecord(value) || !Array.isArray(value.pages)) {
    throw new WikimediaError('malformed', `${source} search response has no pages array`)
  }
  const pages: SearchPage[] = []
  for (const candidate of value.pages) {
    if (
      !isRecord(candidate) ||
      !positiveInteger(candidate.id) ||
      !requiredString(candidate.key) ||
      !requiredString(candidate.title) ||
      (candidate.description !== null &&
        candidate.description !== undefined &&
        typeof candidate.description !== 'string')
    ) {
      throw new WikimediaError('malformed', `${source} search result is malformed`)
    }
    pages.push({
      id: candidate.id,
      key: candidate.key,
      title: candidate.title,
      description:
        typeof candidate.description === 'string' ? candidate.description : null
    })
  }
  return pages
}

function parsePageWithHtml(value: unknown, source = 'Wikipedia'): PageWithHtml {
  if (
    !isRecord(value) ||
    !positiveInteger(value.id) ||
    !requiredString(value.key) ||
    !requiredString(value.title) ||
    !isRecord(value.latest) ||
    !positiveInteger(value.latest.id) ||
    !requiredString(value.latest.timestamp) ||
    !isRecord(value.license) ||
    !requiredString(value.license.url) ||
    !requiredString(value.license.title) ||
    typeof value.html !== 'string'
  ) {
    throw new WikimediaError('malformed', `${source} page response is malformed`)
  }
  return {
    id: value.id,
    key: value.key,
    title: value.title,
    latest: { id: value.latest.id, timestamp: value.latest.timestamp },
    license: { url: value.license.url, title: value.license.title },
    html: value.html
  }
}

function throwActionApiError(value: unknown, source = 'Wikidata'): void {
  if (!isRecord(value) || !isRecord(value.error)) return
  const code = typeof value.error.code === 'string' ? value.error.code : 'unknown'
  if (code === 'maxlag' || code === 'ratelimited' || code === 'readonly') {
    throw new WikimediaError('rate-limit', `${source} Action API returned ${code}`)
  }
  throw new WikimediaError('malformed', `${source} Action API returned ${code}`)
}

function parseWikidataSearch(value: unknown): WikidataSearchResponse {
  throwActionApiError(value)
  if (!isRecord(value) || !Array.isArray(value.search)) {
    throw new WikimediaError('malformed', 'Wikidata search response has no search array')
  }
  const hits: WikidataSearchHit[] = []
  for (const candidate of value.search) {
    if (
      !isRecord(candidate) ||
      typeof candidate.id !== 'string' ||
      !QID_RE.test(candidate.id) ||
      !requiredString(candidate.label) ||
      (candidate.description !== undefined &&
        candidate.description !== null &&
        typeof candidate.description !== 'string')
    ) {
      throw new WikimediaError('malformed', 'Wikidata search result is malformed')
    }
    hits.push({
      id: candidate.id,
      label: candidate.label,
      description:
        typeof candidate.description === 'string' ? candidate.description : null
    })
  }
  return {
    hits,
    hasMore:
      typeof value['search-continue'] === 'number' ||
      typeof value['search-continue'] === 'string'
  }
}

function entityRecordsOf(value: unknown): Record<string, Record<string, unknown>> {
  throwActionApiError(value)
  if (!isRecord(value) || !isRecord(value.entities)) {
    throw new WikimediaError('malformed', 'Wikidata entity response has no entities')
  }
  const entities: Record<string, Record<string, unknown>> = {}
  for (const [id, entity] of Object.entries(value.entities)) {
    if (!QID_RE.test(id) || !isRecord(entity)) {
      throw new WikimediaError('malformed', 'Wikidata entity record is malformed')
    }
    entities[id] = entity
  }
  return entities
}

function localizedString(value: unknown, language: string): string | null {
  if (!isRecord(value)) return null
  const candidates = [language, ...(language === 'en' ? [] : ['en']), ...Object.keys(value)]
  for (const candidate of candidates) {
    const entry = value[candidate]
    if (isRecord(entry) && requiredString(entry.value)) return entry.value
  }
  return null
}

function localizedStrings(
  value: unknown,
  language: string,
  limit: number
): string[] {
  if (!isRecord(value)) return []
  const candidates = [language, ...(language === 'en' ? [] : ['en']), ...Object.keys(value)]
  for (const candidate of candidates) {
    const entries = value[candidate]
    if (!Array.isArray(entries)) continue
    const strings = entries
      .map((entry) => (isRecord(entry) && requiredString(entry.value) ? entry.value : null))
      .filter((entry): entry is string => entry !== null)
    if (strings.length > 0) return [...new Set(strings)].slice(0, limit)
  }
  return []
}

function wikidataValueOf(
  value: unknown,
  expected: (typeof WIKIDATA_PROPERTY_ALLOWLIST)[WikidataPropertyId]['valueKind'],
  labels: ReadonlyMap<string, string>
): WikidataValue | null {
  if (!isRecord(value) || !requiredString(value.type)) return null
  const raw = value.value
  if (expected === 'entity') {
    if (value.type !== 'wikibase-entityid' || !isRecord(raw)) return null
    const id = typeof raw.id === 'string' ? raw.id : null
    if (id === null || !QID_RE.test(id)) return null
    return { kind: 'entity', id, label: labels.get(id) ?? null }
  }
  if (expected === 'time') {
    if (value.type !== 'time' || !isRecord(raw)) return null
    if (!requiredString(raw.time) || !nonNegativeInteger(raw.precision)) return null
    return { kind: 'time', value: raw.time, precision: raw.precision }
  }
  if (value.type !== 'string' || !requiredString(raw)) return null
  return { kind: 'commons-media', fileTitle: raw }
}

function wikidataStatementsOf(
  entity: Record<string, unknown>,
  labels: ReadonlyMap<string, string>,
  limits: EffectiveLimits
): WikidataStatement[] {
  if (!isRecord(entity.claims)) return []
  const statements: WikidataStatement[] = []
  for (const property of Object.keys(
    WIKIDATA_PROPERTY_ALLOWLIST
  ) as WikidataPropertyId[]) {
    const candidates = entity.claims[property]
    if (!Array.isArray(candidates)) continue
    const definition = WIKIDATA_PROPERTY_ALLOWLIST[property]
    for (const candidate of candidates.slice(0, limits.maxStatementsPerProperty)) {
      if (statements.length >= limits.maxStatementsPerEntity) return statements
      if (
        !isRecord(candidate) ||
        !requiredString(candidate.id) ||
        (candidate.rank !== 'preferred' &&
          candidate.rank !== 'normal' &&
          candidate.rank !== 'deprecated') ||
        !isRecord(candidate.mainsnak) ||
        candidate.mainsnak.snaktype !== 'value' ||
        candidate.mainsnak.property !== property
      ) {
        continue
      }
      const normalized = wikidataValueOf(
        candidate.mainsnak.datavalue,
        definition.valueKind,
        labels
      )
      if (normalized === null) continue
      statements.push({
        id: candidate.id,
        property,
        propertyLabel: definition.label,
        rank: candidate.rank as WikidataRank,
        value: normalized
      })
    }
  }
  return statements
}

function wikipediaSitelinksOf(
  value: unknown,
  language: string
): WikidataSitelink[] {
  if (!isRecord(value)) return []
  const languages = [...new Set([language, 'en'])]
  const links: WikidataSitelink[] = []
  for (const linkLanguage of languages) {
    const site = `${linkLanguage}wiki`
    const entry = value[site]
    if (!isRecord(entry) || !requiredString(entry.title)) continue
    const encoded = entry.title
      .split('/')
      .map((part) => encodeURIComponent(part.replace(/ /g, '_')))
      .join('/')
    links.push({
      language: linkLanguage,
      site,
      title: entry.title,
      url: `https://${wikimediaHostOf('wikipedia', linkLanguage)}/wiki/${encoded}`
    })
  }
  return links
}

function wikidataEntityOf(
  entity: Record<string, unknown>,
  hit: WikidataSearchHit,
  language: string,
  labels: ReadonlyMap<string, string>,
  accessedAt: string,
  rank: number,
  limits: EffectiveLimits
): WikidataEntity {
  if (
    !positiveInteger(entity.pageid) ||
    entity.title !== hit.id ||
    !positiveInteger(entity.lastrevid) ||
    !requiredString(entity.modified)
  ) {
    throw new WikimediaError('malformed', `Wikidata entity ${hit.id} lacks revision identity`)
  }
  const label = localizedString(entity.labels, language) ?? hit.label
  return {
    kind: 'wikidata-entity',
    id: hit.id,
    rank,
    label,
    description:
      localizedString(entity.descriptions, language) ?? hit.description,
    aliases: localizedStrings(entity.aliases, language, limits.maxAliasesPerEntity),
    sitelinks: wikipediaSitelinksOf(entity.sitelinks, language),
    statements: wikidataStatementsOf(entity, labels, limits),
    source: {
      project: 'wikidata',
      language,
      title: label,
      pageId: entity.pageid,
      revision: { id: entity.lastrevid, timestamp: entity.modified },
      canonicalUrl: `https://www.wikidata.org/wiki/${hit.id}`,
      accessedAt,
      license: WIKIDATA_LICENSE
    }
  }
}

function labelsOfEntities(
  entities: Record<string, Record<string, unknown>>,
  language: string
): Map<string, string> {
  const labels = new Map<string, string>()
  for (const [id, entity] of Object.entries(entities)) {
    const label = localizedString(entity.labels, language)
    if (label !== null) labels.set(id, label)
  }
  return labels
}

function boundedPlainText(html: string, maxChars: number): string | null {
  const { document } = parseHTML(`<html><body>${html}</body></html>`)
  for (const selector of [
    'script',
    'style',
    'noscript',
    'img',
    'svg',
    '[style*="display: none"]',
    '[style*="display:none"]'
  ]) {
    for (const node of Array.from(document.body.querySelectorAll(selector))) node.remove()
  }
  const text = (document.body.textContent ?? '').replace(/\s+/g, ' ').trim()
  if (text.length === 0) return null
  return text.slice(0, maxChars).trimEnd()
}

function metadataTextOf(
  metadata: Record<string, unknown>,
  field: string,
  maxChars: number
): string | null {
  const entry = metadata[field]
  if (!isRecord(entry) || typeof entry.value !== 'string') return null
  return boundedPlainText(entry.value, maxChars)
}

function safeHttpUrl(value: unknown, requiredHost?: string): string | null {
  if (typeof value !== 'string') return null
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
    if (
      requiredHost !== undefined &&
      (url.protocol !== 'https:' || url.hostname !== requiredHost)
    ) {
      return null
    }
    return url.toString()
  } catch {
    return null
  }
}

function commonsLicenseUrl(name: string, value: string | null): string | null {
  const supplied = safeHttpUrl(value)
  if (supplied !== null) return supplied
  return name.toLowerCase() === 'public domain'
    ? 'https://commons.wikimedia.org/wiki/Commons:Public_domain'
    : null
}

function commonsMediaOf(
  value: unknown,
  requested: ReadonlySet<string>,
  language: string,
  accessedAt: string,
  limits: EffectiveLimits
): { media: CommonsMedia[]; withheld: number } {
  throwActionApiError(value, 'Commons')
  if (!isRecord(value) || !isRecord(value.query) || !Array.isArray(value.query.pages)) {
    throw new WikimediaError('malformed', 'Commons response has no pages array')
  }
  const media: CommonsMedia[] = []
  let withheld = 0
  const seen = new Set<string>()
  for (const page of value.query.pages) {
    if (!isRecord(page) || !requiredString(page.title)) {
      throw new WikimediaError('malformed', 'Commons page record is malformed')
    }
    const fileTitle = page.title.replace(/^File:/i, '')
    if (!requested.has(fileTitle)) continue
    seen.add(fileTitle)
    const info = Array.isArray(page.imageinfo) ? page.imageinfo[0] : undefined
    if (
      !positiveInteger(page.pageid) ||
      !isRecord(info) ||
      !requiredString(info.timestamp) ||
      !requiredString(info.mime) ||
      !info.mime.startsWith('image/') ||
      !positiveInteger(info.width) ||
      !positiveInteger(info.height) ||
      !isRecord(info.extmetadata)
    ) {
      withheld += 1
      continue
    }
    const originalUrl = safeHttpUrl(info.url, 'upload.wikimedia.org')
    const thumbnailUrl = safeHttpUrl(info.thumburl, 'upload.wikimedia.org')
    const creator = metadataTextOf(
      info.extmetadata,
      'Artist',
      limits.maxMetadataChars
    )
    const credit = metadataTextOf(
      info.extmetadata,
      'Credit',
      limits.maxMetadataChars
    )
    const description = metadataTextOf(
      info.extmetadata,
      'ImageDescription',
      limits.maxMetadataChars
    )
    const licenseName =
      metadataTextOf(
        info.extmetadata,
        'LicenseShortName',
        limits.maxMetadataChars
      ) ??
      metadataTextOf(info.extmetadata, 'UsageTerms', limits.maxMetadataChars)
    const licenseUrl =
      licenseName === null
        ? null
        : commonsLicenseUrl(
            licenseName,
            metadataTextOf(info.extmetadata, 'LicenseUrl', limits.maxMetadataChars)
          )
    if (
      originalUrl === null ||
      thumbnailUrl === null ||
      creator === null ||
      licenseName === null ||
      licenseUrl === null
    ) {
      withheld += 1
      continue
    }
    const encoded = fileTitle
      .split('/')
      .map((part) => encodeURIComponent(part.replace(/ /g, '_')))
      .join('/')
    media.push({
      kind: 'commons-media',
      fileTitle,
      description,
      creator,
      credit,
      attributionRequired:
        metadataTextOf(info.extmetadata, 'AttributionRequired', 16)?.toLowerCase() ===
        'true',
      originalUrl,
      thumbnailUrl,
      mime: info.mime,
      width: info.width,
      height: info.height,
      source: {
        project: 'commons',
        language,
        title: page.title,
        pageId: page.pageid,
        revision: { id: null, timestamp: info.timestamp },
        canonicalUrl: `https://commons.wikimedia.org/wiki/File:${encoded}`,
        accessedAt,
        license: { name: licenseName, url: licenseUrl }
      }
    })
    if (media.length >= limits.maxCommonsMedia) break
  }
  withheld += [...requested].filter((fileTitle) => !seen.has(fileTitle)).length
  return { media, withheld }
}

const WIKTIONARY_SECTIONS = {
  en: { language: 'English', etymology: /^Etymology(?:\s+[0-9]+)?$/i },
  fr: { language: 'Français', etymology: /^Étymologie(?:\s+[0-9]+)?$/i }
} as const

export function etymologyStatusOf(text: string): EtymologyStatus {
  const folded = text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
  if (/\b(disputed|controversial|contestee?|controversee?)\b/.test(folded)) {
    return 'disputed'
  }
  if (
    /\b(reconstructed|reconstruction|reconstruit|reconstituee?)\b/.test(folded) ||
    /(^|\s)\*[a-z]/i.test(folded)
  ) {
    return 'reconstructed'
  }
  if (/\b(attested|attestee?)\b/.test(folded)) return 'attested'
  return 'unknown'
}

export type ExtractedEtymology = {
  heading: string
  text: string
  status: EtymologyStatus
  truncated: boolean
}

export function wiktionaryEtymologiesOfHtml(
  html: string,
  language: string,
  maxChars: number = WIKIMEDIA_LIMITS.maxEtymologyTextChars,
  maxSections: number = WIKIMEDIA_LIMITS.maxEtymologiesPerEntry
): ExtractedEtymology[] {
  const config = WIKTIONARY_SECTIONS[language as keyof typeof WIKTIONARY_SECTIONS]
  if (config === undefined) {
    throw new WikimediaError('unsupported-language', `Wiktionary ${language} is not pinned`)
  }
  const { document } = parseHTML(`<html><body>${html}</body></html>`)
  const languageHeading = Array.from(document.querySelectorAll('h2')).find(
    (heading) => (heading.textContent ?? '').replace(/\s+/g, ' ').trim() === config.language
  )
  const languageSection = languageHeading?.parentElement
  if (!languageSection) return []
  const headings = Array.from(languageSection.querySelectorAll('h3,h4')).filter(
    (heading) => config.etymology.test((heading.textContent ?? '').trim())
  )
  const extracted: ExtractedEtymology[] = []
  for (const heading of headings.slice(0, maxSections)) {
    const section = heading.parentElement
    if (!section) continue
    const clone = section.cloneNode(true) as Element
    for (const selector of [
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'section',
      'script',
      'style',
      'link',
      'sup',
      '.reference',
      '.mw-editsection'
    ]) {
      for (const node of Array.from(clone.querySelectorAll(selector))) node.remove()
    }
    const normalized = (clone.textContent ?? '').replace(/\s+/g, ' ').trim()
    if (normalized.length === 0) continue
    const clipped = normalized.slice(0, maxChars)
    const lastSpace = clipped.lastIndexOf(' ')
    const truncated = normalized.length > maxChars
    const text = truncated
      ? clipped.slice(0, lastSpace > maxChars * 0.8 ? lastSpace : maxChars).trimEnd()
      : normalized
    extracted.push({
      heading: (heading.textContent ?? '').replace(/\s+/g, ' ').trim(),
      text,
      status: etymologyStatusOf(text),
      truncated
    })
  }
  return extracted
}

const REMOVE_FROM_ARTICLE = [
  'script',
  'style',
  'noscript',
  'nav',
  'aside',
  'form',
  '.mw-editsection',
  '.mw-jump-link',
  '.noprint',
  '.navbox',
  '.vertical-navbox',
  '.toc',
  '.mw-references-wrap',
  '.reflist',
  '.catlinks',
  '.printfooter'
]

const cleanArticleText = (raw: string): string =>
  raw
    .replace(/\[[0-9]+\]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

/**
 * The article, split at its top-level headings (S07i). Parsoid HTML nests
 * each section in a `<section>` whose first child is the heading; older or
 * stripped markup falls back to a flat walk over `h2` boundaries. Everything
 * before the first heading is the LEAD, and it carries no heading.
 */
function articleSectionsOf(root: Element): WikiSection[] {
  const sections: WikiSection[] = []
  const push = (heading: string, raw: string): void => {
    const text = cleanArticleText(raw)
    if (text.length > 0) sections.push({ heading, text })
  }
  const nested = Array.from(root.querySelectorAll(':scope > section'))
  if (nested.length > 1) {
    for (const section of nested) {
      const heading = section.querySelector('h2, h3, h4, h5, h6')
      const title = cleanArticleText(heading?.textContent ?? '')
      if (heading) heading.remove()
      push(title, section.textContent ?? '')
    }
    return sections
  }
  let heading = ''
  let buffer = ''
  for (const node of Array.from(root.children)) {
    if (/^H[23]$/.test(node.tagName)) {
      push(heading, buffer)
      heading = cleanArticleText(node.textContent ?? '')
      buffer = ''
      continue
    }
    buffer += ` ${node.textContent ?? ''}`
  }
  push(heading, buffer)
  return sections
}

/**
 * Hostile page HTML in, bounded plain article text out — bounded by RELEVANCE
 * from S07i, not by position (owner: *"we can't set a limit to a page if we
 * have no tool to … assert that we have reached the part that fits the
 * answer"*). Pass the query and the budget is spent on the sections that
 * answer it; omit it and the article reads from the top, as it always did.
 */
export function wikipediaTextOfHtml(
  html: string,
  maxChars: number = WIKIMEDIA_LIMITS.maxArticleTextChars,
  query = ''
): { text: string; truncated: boolean; kept: string[]; skipped: number } {
  const { document } = parseHTML(`<html><body>${html}</body></html>`)
  const root =
    document.querySelector('#mw-content-text .mw-parser-output') ??
    document.querySelector('.mw-parser-output') ??
    document.querySelector('main') ??
    document.body
  for (const selector of REMOVE_FROM_ARTICLE) {
    for (const node of Array.from(root.querySelectorAll(selector))) node.remove()
  }
  const whole = cleanArticleText(root.textContent ?? '')
  if (whole.length <= maxChars) {
    return { text: whole, truncated: false, kept: [], skipped: 0 }
  }
  return selectWikiSections(articleSectionsOf(root), query, maxChars)
}

function canonicalWikipediaUrl(language: string, key: string): string {
  const encoded = key
    .split('/')
    .map((part) => encodeURIComponent(part.replace(/ /g, '_')))
    .join('/')
  return `https://${wikimediaHostOf('wikipedia', language)}/wiki/${encoded}`
}

function retryAfterMsOf(value: string | null, nowMs: number): number | undefined {
  if (value === null) return undefined
  const seconds = Number(value)
  if (Number.isFinite(seconds) && seconds >= 0) return Math.round(seconds * 1_000)
  const date = Date.parse(value)
  return Number.isFinite(date) ? Math.max(0, date - nowMs) : undefined
}

function requestSignal(
  parent: AbortSignal,
  timeoutMs: number
): { signal: AbortSignal; timedOut: () => boolean; cleanup: () => void } {
  const controller = new AbortController()
  let timeoutWon = false
  const abortFromParent = (): void => controller.abort(parent.reason)
  if (parent.aborted) abortFromParent()
  else parent.addEventListener('abort', abortFromParent, { once: true })
  const timer = setTimeout(() => {
    timeoutWon = true
    controller.abort(new Error('Wikimedia request timed out'))
  }, timeoutMs)
  return {
    signal: controller.signal,
    timedOut: () => timeoutWon,
    cleanup: () => {
      clearTimeout(timer)
      parent.removeEventListener('abort', abortFromParent)
    }
  }
}

async function boundedText(
  response: Response,
  perResponseLimit: number,
  remainingTotal: number
): Promise<{ text: string; bytes: number }> {
  const allowed = Math.min(perResponseLimit, remainingTotal)
  const declared = Number(response.headers.get('content-length'))
  if (Number.isFinite(declared) && declared > allowed) {
    await response.body?.cancel()
    throw new WikimediaError('budget-exceeded', 'response Content-Length exceeds budget')
  }
  if (!response.body) return { text: '', bytes: 0 }
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let bytes = 0
  while (true) {
    const next = await reader.read()
    if (next.done) break
    bytes += next.value.byteLength
    if (bytes > allowed) {
      await reader.cancel()
      throw new WikimediaError('budget-exceeded', 'response body exceeds budget')
    }
    chunks.push(next.value)
  }
  const joined = new Uint8Array(bytes)
  let offset = 0
  for (const chunk of chunks) {
    joined.set(chunk, offset)
    offset += chunk.byteLength
  }
  return { text: new TextDecoder().decode(joined), bytes }
}

export class WikimediaClient {
  private readonly fetchImpl: typeof fetch
  private readonly nowMs: () => number
  private readonly userAgent: string
  private readonly trace?: WikimediaTraceSink
  private readonly limits: EffectiveLimits

  constructor(options: WikimediaClientOptions = {}) {
    this.fetchImpl = options.fetchImpl ?? fetch
    this.nowMs = options.nowMs ?? Date.now
    this.userAgent = options.userAgent ?? WIKIMEDIA_USER_AGENT
    this.trace = options.trace
    this.limits = { ...WIKIMEDIA_LIMITS, ...options.limits }
  }

  private async json(
    url: URL,
    signal: AbortSignal,
    budget: RequestBudget
  ): Promise<unknown> {
    if (budget.requests >= this.limits.maxNetworkRequestsPerSearch) {
      throw new WikimediaError('budget-exceeded', 'network request budget exhausted')
    }
    budget.requests += 1
    const request = requestSignal(signal, this.limits.requestTimeoutMs)
    try {
      const response = await this.fetchImpl(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'User-Agent': this.userAgent
        },
        signal: request.signal,
        redirect: 'error'
      })
      if (response.status === 429) {
        const retryAfter = retryAfterMsOf(
          response.headers.get('retry-after'),
          this.nowMs()
        )
        await response.body?.cancel()
        throw new WikimediaError(
          'rate-limit',
          'Wikimedia asked the client to slow down',
          retryAfter
        )
      }
      if (!response.ok) {
        await response.body?.cancel()
        throw new WikimediaError('network', `Wikimedia returned HTTP ${response.status}`)
      }
      const payload = await boundedText(
        response,
        this.limits.maxResponseBytes,
        this.limits.maxTotalResponseBytes - budget.responseBytes
      )
      budget.responseBytes += payload.bytes
      try {
        return JSON.parse(payload.text) as unknown
      } catch {
        throw new WikimediaError('malformed', 'response is not valid JSON')
      }
    } catch (error) {
      if (error instanceof WikimediaError) throw error
      if (signal.aborted) throw new WikimediaError('cancelled', 'operation was cancelled')
      if (request.timedOut()) throw new WikimediaError('timeout', 'request timed out')
      throw new WikimediaError(
        'network',
        error instanceof Error ? error.message : 'network request failed'
      )
    } finally {
      request.cleanup()
    }
  }

  /**
   * The one provider-neutral search_wiki door. A caller supplies the typed
   * request and parent operation context, never a URL. `auto` consults both
   * Wikipedia and Wikidata through one shared request/byte budget; its result
   * allocation keeps both corpora visible while staying within eight HTTP
   * requests at the maximum public limit.
   */
  async search(
    value: unknown,
    context: WikimediaSearchContext
  ): Promise<WikimediaSearchBundle> {
    const request = parseSearchWikiRequest(value)
    if (request.corpus === 'wikipedia') {
      return this.searchWikipedia(request, context)
    }
    if (request.corpus === 'wikidata') {
      return this.searchWikidata(request, context)
    }
    if (request.corpus === 'wiktionary') {
      return this.searchWiktionary(request, context)
    }

    const budget: RequestBudget = { requests: 0, responseBytes: 0 }
    // S07e: `auto` means every corpus the user left switched on, not a fixed
    // pair. The result allowance is shared across them, at least one each.
    const enabled = (context.corpora ?? ['wikipedia', 'wikidata']).filter(
      (corpus): corpus is 'wikipedia' | 'wikidata' | 'wiktionary' =>
        corpus !== 'auto'
    )
    // Spread the allowance, remainder to the earlier corpora, at least one
    // each — so limit 5 over Wikipedia+Wikidata stays the 3/2 split it was.
    const base = Math.floor(request.limit / enabled.length)
    const remainder = request.limit % enabled.length
    const bundles: WikimediaSearchBundle[] = []
    const degraded: WikimediaWarning[] = []
    for (const child of enabled.map((corpus, index) => ({
      ...request,
      corpus,
      limit: Math.max(1, base + (index < remainder ? 1 : 0))
    }))) {
      try {
        bundles.push(
          child.corpus === 'wikipedia'
            ? await this.searchWikipedia(child, context, budget)
            : child.corpus === 'wikidata'
              ? await this.searchWikidata(child, context, budget)
              : await this.searchWiktionary(child, context, budget)
        )
      } catch (error) {
        if (!(error instanceof WikimediaError)) throw error
        if (error.kind === 'empty') continue
        // S06c, from the live bench: Wikidata answered 429 AFTER Wikipedia had
        // already returned usable articles, and rethrowing discarded them —
        // the caller saw a failed search where good results existed. A corpus
        // that fails once the other has delivered is a WARNING, not a failure.
        // Cancellation is never degraded: it is the owner's decision, and the
        // budget ceiling is authority, not weather.
        if (
          bundles.length === 0 ||
          error.kind === 'cancelled' ||
          error.kind === 'budget-exceeded'
        ) {
          throw error
        }
        degraded.push({
          kind: 'corpus-unavailable',
          message: `${child.corpus} was unavailable (${error.kind}); these results come from the other corpus only`
        })
      }
    }
    if (bundles.length === 0) {
      throw new WikimediaError(
        'empty',
        `no matching result in ${enabled.join(', ')}`
      )
    }
    return {
      request,
      results: bundles.flatMap((bundle) => bundle.results),
      media: bundles.flatMap((bundle) => bundle.media),
      warnings: [
        ...bundles.flatMap((bundle) => bundle.warnings),
        ...degraded
      ],
      responseBytes: budget.responseBytes,
      accessedAt: bundles.at(-1)!.accessedAt
    }
  }

  async searchWikipedia(
    value: unknown,
    context: WikimediaSearchContext,
    /** Internal only: `auto` shares one whole-search budget. */
    sharedBudget?: RequestBudget
  ): Promise<WikimediaSearchBundle> {
    const request = parseSearchWikiRequest(value)
    if (request.corpus !== 'wikipedia') {
      throw new WikimediaError('malformed', 'Wikipedia seat requires corpus=wikipedia')
    }
    if (context.signal.aborted) {
      throw new WikimediaError('cancelled', 'operation was cancelled')
    }
    const started = this.nowMs()
    const budget = sharedBudget ?? { requests: 0, responseBytes: 0 }
    const requestsBefore = budget.requests
    const responseBytesBefore = budget.responseBytes
    let resultCount = 0
    let errorKind: WikimediaErrorKind | undefined
    try {
      const base = wikimediaCoreRestBase('wikipedia', request.language)
      const searchUrl = new URL(`${base}/search/page`)
      searchUrl.searchParams.set('q', request.query)
      searchUrl.searchParams.set('limit', String(request.limit))
      const hits = parseSearchPages(
        await this.json(searchUrl, context.signal, budget)
      )
      if (hits.length === 0) {
        throw new WikimediaError('empty', 'Wikipedia returned no matching page')
      }

      const accessedAt = new Date(this.nowMs()).toISOString()
      const articles: WikipediaArticle[] = []
      const warnings: WikimediaWarning[] = []
      for (const [index, hit] of hits.slice(0, request.limit).entries()) {
        const pageUrl = new URL(
          `${base}/page/${encodeURIComponent(hit.key)}/with_html`
        )
        let raw: unknown
        try {
          raw = await this.json(pageUrl, context.signal, budget)
        } catch (error) {
          // S07d (owner bench): one enormous article used to fail the entire
          // search, and the biggest articles are exactly the famous subjects
          // people ask about. A page too large to read within the budget is
          // SKIPPED with a warning; the search still returns what it could
          // read. Cancellation and every other failure still stop the seat.
          if (
            error instanceof WikimediaError &&
            error.kind === 'budget-exceeded' &&
            hits.length > 1
          ) {
            warnings.push({
              kind: 'truncated',
              message: `"${hit.title}" was too large to read within the response budget and was skipped.`
            })
            continue
          }
          throw error
        }
        const page = parsePageWithHtml(raw)
        if (page.id !== hit.id) {
          throw new WikimediaError('malformed', 'Wikipedia page identity changed during lookup')
        }
        const extracted = wikipediaTextOfHtml(
          page.html,
          this.limits.maxArticleTextChars,
          request.query
        )
        if (extracted.text.length === 0) {
          throw new WikimediaError('malformed', 'Wikipedia page contains no usable article text')
        }
        articles.push({
          kind: 'wikipedia-article',
          rank: index + 1,
          description: hit.description,
          text: extracted.text,
          truncated: extracted.truncated,
          sections: { kept: extracted.kept, skipped: extracted.skipped },
          source: {
            project: 'wikipedia',
            language: request.language,
            title: page.title,
            pageId: page.id,
            revision: {
              id: page.latest.id,
              timestamp: page.latest.timestamp
            },
            canonicalUrl: canonicalWikipediaUrl(request.language, page.key),
            accessedAt,
            license: {
              name: page.license.title,
              url: page.license.url
            }
          }
        })
      }
      // Every candidate skipped is an empty result, not a silent success:
      // `empty` is the one kind `auto` falls through on, so the search still
      // reaches the other corpus instead of returning nothing at all.
      if (articles.length === 0) {
        throw new WikimediaError(
          'empty',
          'every matching page was too large to read within the response budget'
        )
      }
      resultCount = articles.length
      return {
        request,
        results: articles,
        media: [],
        warnings: [
          ...warnings,
          // S07h (owner: *"why articles clipped?"*): a warning that names no
          // article and no number cannot be acted on. Name both — the cap is
          // a deliberate prompt budget, not a network failure, and seeing
          // WHICH page lost its tail is what makes it arguable.
          ...(articles.some((article) => article.truncated)
            ? [
                {
                  kind: 'truncated' as const,
                  // S07i: the budget SELECTS now, so the warning names what
                  // was read rather than confessing a cut. An omission you
                  // can see is inspectable (26); "clipped" was not.
                  message: articles
                    .filter((article) => article.truncated)
                    .map((article) =>
                      article.sections.kept.length > 0
                        ? `${article.source.title} — read ${article.sections.kept.join(', ')}; ${article.sections.skipped} other section${article.sections.skipped === 1 ? '' : 's'} did not fit the ${this.limits.maxArticleTextChars.toLocaleString('en-US')}-character budget.`
                        : `${article.source.title} — read to the first ${this.limits.maxArticleTextChars.toLocaleString('en-US')} characters, the per-article text budget.`
                    )
                    .join(' ')
                }
              ]
            : [])
        ],
        responseBytes: budget.responseBytes - responseBytesBefore,
        accessedAt
      }
    } catch (error) {
      errorKind = error instanceof WikimediaError ? error.kind : 'network'
      throw error
    } finally {
      this.trace?.recordWikimedia({
        parentTraceId: context.parentTraceId,
        parentOperationId: context.parentOperationId,
        tool: 'search_wiki',
        corpus: 'wikipedia',
        language: request.language,
        requests: budget.requests - requestsBefore,
        resultCount,
        responseBytes: budget.responseBytes - responseBytesBefore,
        wallMs: Math.max(0, this.nowMs() - started),
        status: errorKind === undefined ? 'completed' : 'failed',
        ...(errorKind === undefined ? {} : { errorKind })
      })
    }
  }

  /**
   * S06c — no `maxlag` on these READS, measured 2026-08-17.
   *
   * `maxlag=5` looked like good etiquette and made the Wikidata rung dead in
   * practice: the Action API counts the QUERY SERVICE's replication lag, and
   * with wdqs ~16s behind, every read came back `error.code: maxlag` (which
   * this client correctly maps to rate-limit). The identical request without
   * maxlag returned Q7186 immediately. maxlag exists to protect Wikimedia from
   * bots and bulk writes; Atomik issues at most a handful of human-initiated
   * reads per question. Politeness is kept where it belongs — an identifying
   * User-Agent, hard request/byte budgets, low concurrency, and honouring 429
   * plus Retry-After — none of which depend on a lag threshold we do not
   * control.
   */
  async searchWikidata(
    value: unknown,
    context: WikimediaSearchContext,
    /** Internal only: `auto` shares one whole-search budget. */
    sharedBudget?: RequestBudget
  ): Promise<WikimediaSearchBundle> {
    const request = parseSearchWikiRequest(value)
    if (request.corpus !== 'wikidata') {
      throw new WikimediaError('malformed', 'Wikidata seat requires corpus=wikidata')
    }
    if (context.signal.aborted) {
      throw new WikimediaError('cancelled', 'operation was cancelled')
    }
    const started = this.nowMs()
    const budget = sharedBudget ?? { requests: 0, responseBytes: 0 }
    const requestsBefore = budget.requests
    const responseBytesBefore = budget.responseBytes
    let resultCount = 0
    let errorKind: WikimediaErrorKind | undefined
    try {
      const base = wikimediaActionApiBase('wikidata', request.language)
      const searchUrl = new URL(base)
      searchUrl.searchParams.set('action', 'wbsearchentities')
      searchUrl.searchParams.set('search', request.query)
      searchUrl.searchParams.set('language', request.language)
      searchUrl.searchParams.set('uselang', request.language)
      searchUrl.searchParams.set('type', 'item')
      searchUrl.searchParams.set('limit', String(request.limit))
      searchUrl.searchParams.set('format', 'json')
      searchUrl.searchParams.set('formatversion', '2')
      const searched = parseWikidataSearch(
        await this.json(searchUrl, context.signal, budget)
      )
      const hits = searched.hits.slice(0, request.limit)
      if (hits.length === 0) {
        throw new WikimediaError('empty', 'Wikidata returned no matching entity')
      }

      const languages = [...new Set([request.language, 'en'])]
      const sites = languages.map((language) => `${language}wiki`)
      const entitiesUrl = new URL(base)
      entitiesUrl.searchParams.set('action', 'wbgetentities')
      entitiesUrl.searchParams.set('ids', hits.map((hit) => hit.id).join('|'))
      entitiesUrl.searchParams.set(
        'props',
        'info|labels|aliases|descriptions|sitelinks|claims'
      )
      entitiesUrl.searchParams.set('languages', languages.join('|'))
      entitiesUrl.searchParams.set('sitefilter', sites.join('|'))
      entitiesUrl.searchParams.set('format', 'json')
      entitiesUrl.searchParams.set('formatversion', '2')
      const rawEntities = entityRecordsOf(
        await this.json(entitiesUrl, context.signal, budget)
      )
      for (const hit of hits) {
        if (rawEntities[hit.id] === undefined) {
          throw new WikimediaError('malformed', `Wikidata omitted entity ${hit.id}`)
        }
      }

      const referencedIds = new Set<string>()
      for (const hit of hits) {
        const raw = rawEntities[hit.id]!
        for (const statement of wikidataStatementsOf(raw, new Map(), this.limits)) {
          if (statement.value.kind === 'entity') referencedIds.add(statement.value.id)
          if (referencedIds.size >= this.limits.maxReferencedEntities) break
        }
        if (referencedIds.size >= this.limits.maxReferencedEntities) break
      }
      for (const hit of hits) referencedIds.delete(hit.id)

      let labels = new Map<string, string>()
      if (referencedIds.size > 0) {
        const labelsUrl = new URL(base)
        labelsUrl.searchParams.set('action', 'wbgetentities')
        labelsUrl.searchParams.set('ids', [...referencedIds].join('|'))
        labelsUrl.searchParams.set('props', 'labels')
        labelsUrl.searchParams.set('languages', languages.join('|'))
        labelsUrl.searchParams.set('format', 'json')
        labelsUrl.searchParams.set('formatversion', '2')
        labels = labelsOfEntities(
          entityRecordsOf(await this.json(labelsUrl, context.signal, budget)),
          request.language
        )
      }

      const accessedAt = new Date(this.nowMs()).toISOString()
      const entities = hits.map((hit, index) =>
        wikidataEntityOf(
          rawEntities[hit.id]!,
          hit,
          request.language,
          labels,
          accessedAt,
          index + 1,
          this.limits
        )
      )
      // S07h (owner: *"what means ambiguous for wikidata?"*). It never meant
      // "this entity is doubtful": the search returned more candidates than
      // the slots we gave it, and we took the top-ranked one. Said blankly it
      // fires on every common name and teaches the reader to ignore it — so
      // it now names the entity that WAS chosen and what it beat.
      const chosen = entities[0]
      const candidates = `${searched.hits.length}${searched.hasMore ? '+' : ''}`
      const warnings: WikimediaWarning[] =
        (searched.hasMore || searched.hits.length > 1) && chosen !== undefined
          ? [
              {
                kind: 'ambiguous',
                message:
                  hits.length > 1
                    ? `Kept the top ${hits.length} of ${candidates} candidates; first is ${chosen.label} (${chosen.id}).`
                    : `Ranked first of ${candidates} candidates: ${chosen.label} (${chosen.id}).`
              }
            ]
          : []
      let media: CommonsMedia[] = []
      const fileTitles = [
        ...new Set(
          entities.flatMap((entity) =>
            entity.statements.flatMap((statement) =>
              statement.value.kind === 'commons-media'
                ? [statement.value.fileTitle]
                : []
            )
          )
        )
      ].slice(0, this.limits.maxCommonsMedia)
      if (request.includeMedia && fileTitles.length > 0) {
        if (context.mediaPolicy !== 'remote') {
          warnings.push({
            kind: 'media-withheld',
            message: 'Commons media is disabled by private/offline policy.'
          })
        } else {
          const commonsUrl = new URL(
            wikimediaActionApiBase('commons', request.language)
          )
          commonsUrl.searchParams.set('action', 'query')
          commonsUrl.searchParams.set(
            'titles',
            fileTitles.map((title) => `File:${title}`).join('|')
          )
          commonsUrl.searchParams.set('prop', 'imageinfo')
          commonsUrl.searchParams.set(
            'iiprop',
            'timestamp|url|mime|size|extmetadata'
          )
          commonsUrl.searchParams.set(
            'iiextmetadatafilter',
            'Artist|LicenseShortName|LicenseUrl|Credit|AttributionRequired|UsageTerms|ImageDescription|ObjectName'
          )
          commonsUrl.searchParams.set(
            'iiextmetadatalanguage',
            request.language
          )
          commonsUrl.searchParams.set('iiurlwidth', '640')
          commonsUrl.searchParams.set('uselang', request.language)
          commonsUrl.searchParams.set('format', 'json')
          commonsUrl.searchParams.set('formatversion', '2')
          const resolved = commonsMediaOf(
            await this.json(commonsUrl, context.signal, budget),
            new Set(fileTitles),
            request.language,
            accessedAt,
            this.limits
          )
          media = resolved.media
          if (resolved.withheld > 0) {
            warnings.push({
              kind: 'media-withheld',
              message: `${resolved.withheld} Commons image(s) lacked complete attribution or safe URLs.`
            })
          }
        }
      }
      resultCount = entities.length
      return {
        request,
        results: entities,
        media,
        warnings,
        responseBytes: budget.responseBytes - responseBytesBefore,
        accessedAt
      }
    } catch (error) {
      errorKind = error instanceof WikimediaError ? error.kind : 'network'
      throw error
    } finally {
      this.trace?.recordWikimedia({
        parentTraceId: context.parentTraceId,
        parentOperationId: context.parentOperationId,
        tool: 'search_wiki',
        corpus: 'wikidata',
        language: request.language,
        requests: budget.requests - requestsBefore,
        resultCount,
        responseBytes: budget.responseBytes - responseBytesBefore,
        wallMs: Math.max(0, this.nowMs() - started),
        status: errorKind === undefined ? 'completed' : 'failed',
        ...(errorKind === undefined ? {} : { errorKind })
      })
    }
  }

  async searchWiktionary(
    value: unknown,
    context: WikimediaSearchContext,
    /** Internal only: `auto` shares one whole-search budget. */
    sharedBudget?: RequestBudget
  ): Promise<WikimediaSearchBundle> {
    const request = parseSearchWikiRequest(value)
    if (request.corpus !== 'wiktionary') {
      throw new WikimediaError('malformed', 'Wiktionary seat requires corpus=wiktionary')
    }
    if (!(request.language in WIKTIONARY_SECTIONS)) {
      throw new WikimediaError(
        'unsupported-language',
        `Wiktionary ${request.language} is not pinned`
      )
    }
    if (context.signal.aborted) {
      throw new WikimediaError('cancelled', 'operation was cancelled')
    }
    const started = this.nowMs()
    const budget = sharedBudget ?? { requests: 0, responseBytes: 0 }
    let resultCount = 0
    let errorKind: WikimediaErrorKind | undefined
    try {
      const base = wikimediaCoreRestBase('wiktionary', request.language)
      const searchUrl = new URL(`${base}/search/page`)
      searchUrl.searchParams.set('q', request.query)
      searchUrl.searchParams.set('limit', String(request.limit))
      const hits = parseSearchPages(
        await this.json(searchUrl, context.signal, budget),
        'Wiktionary'
      )
      if (hits.length === 0) {
        throw new WikimediaError('empty', 'Wiktionary returned no matching entry')
      }

      const accessedAt = new Date(this.nowMs()).toISOString()
      const etymologies: WiktionaryEtymology[] = []
      let remainingTextChars = this.limits.maxToolTextChars
      entries: for (const hit of hits.slice(0, request.limit)) {
        const pageUrl = new URL(
          `${base}/page/${encodeURIComponent(hit.key)}/with_html`
        )
        const page = parsePageWithHtml(
          await this.json(pageUrl, context.signal, budget),
          'Wiktionary'
        )
        if (page.id !== hit.id) {
          throw new WikimediaError('malformed', 'Wiktionary page identity changed during lookup')
        }
        const sections = wiktionaryEtymologiesOfHtml(
          page.html,
          request.language,
          this.limits.maxEtymologyTextChars,
          this.limits.maxEtymologiesPerEntry
        )
        const encoded = page.key
          .split('/')
          .map((part) => encodeURIComponent(part.replace(/ /g, '_')))
          .join('/')
        for (const section of sections) {
          if (remainingTextChars <= 0) break entries
          const clipped = section.text.slice(0, remainingTextChars)
          const lastSpace = clipped.lastIndexOf(' ')
          const budgetTruncated = section.text.length > remainingTextChars
          const text = budgetTruncated
            ? clipped
                .slice(
                  0,
                  lastSpace > remainingTextChars * 0.8
                    ? lastSpace
                    : remainingTextChars
                )
                .trimEnd()
            : section.text
          etymologies.push({
            kind: 'wiktionary-etymology',
            term: page.title,
            editionLanguage: request.language,
            entryLanguage: request.language,
            heading: section.heading,
            text,
            status: section.status,
            truncated: section.truncated || budgetTruncated,
            source: {
              project: 'wiktionary',
              language: request.language,
              title: page.title,
              pageId: page.id,
              revision: {
                id: page.latest.id,
                timestamp: page.latest.timestamp
              },
              canonicalUrl: `https://${wikimediaHostOf(
                'wiktionary',
                request.language
              )}/wiki/${encoded}`,
              accessedAt,
              license: {
                name: page.license.title,
                url: page.license.url
              }
            }
          })
          remainingTextChars -= text.length
        }
      }
      if (etymologies.length === 0) {
        throw new WikimediaError(
          'empty',
          'Wiktionary entry has no pinned language etymology section'
        )
      }
      resultCount = etymologies.length
      const warnings: WikimediaWarning[] = []
      if (etymologies.some((entry) => entry.status === 'unknown')) {
        warnings.push({
          kind: 'parser-uncertain',
          message: 'Etymology status is unknown because the source exposes no explicit marker.'
        })
      }
      if (etymologies.some((entry) => entry.truncated)) {
        warnings.push({
          kind: 'truncated',
          message: 'One or more etymology sections were clipped to the text budget.'
        })
      }
      return {
        request,
        results: etymologies,
        media: [],
        warnings,
        responseBytes: budget.responseBytes,
        accessedAt
      }
    } catch (error) {
      errorKind = error instanceof WikimediaError ? error.kind : 'network'
      throw error
    } finally {
      this.trace?.recordWikimedia({
        parentTraceId: context.parentTraceId,
        parentOperationId: context.parentOperationId,
        tool: 'search_wiki',
        corpus: 'wiktionary',
        language: request.language,
        requests: budget.requests,
        resultCount,
        responseBytes: budget.responseBytes,
        wallMs: Math.max(0, this.nowMs() - started),
        status: errorKind === undefined ? 'completed' : 'failed',
        ...(errorKind === undefined ? {} : { errorKind })
      })
    }
  }
}

/** Convenience type for later corpus dispatch without weakening validation. */
export type ValidWikipediaRequest = SearchWikiRequest & { corpus: 'wikipedia' }
