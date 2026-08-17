import { parseHTML } from 'linkedom'
import {
  parseSearchWikiRequest,
  WIKIMEDIA_LIMITS,
  WIKIMEDIA_USER_AGENT,
  wikimediaCoreRestBase,
  wikimediaHostOf,
  type SearchWikiRequest,
  type WikimediaErrorKind,
  type WikimediaSearchBundle,
  type WikimediaTraceRecord,
  type WikipediaArticle
} from '../shared/wikimedia'

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

const requiredString = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0

function parseSearchPages(value: unknown): SearchPage[] {
  if (!isRecord(value) || !Array.isArray(value.pages)) {
    throw new WikimediaError('malformed', 'Wikipedia search response has no pages array')
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
      throw new WikimediaError('malformed', 'Wikipedia search result is malformed')
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

function parsePageWithHtml(value: unknown): PageWithHtml {
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
    throw new WikimediaError('malformed', 'Wikipedia page response is malformed')
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

/** Hostile page HTML in, bounded plain article text out. */
export function wikipediaTextOfHtml(
  html: string,
  maxChars: number = WIKIMEDIA_LIMITS.maxArticleTextChars
): { text: string; truncated: boolean } {
  const { document } = parseHTML(`<html><body>${html}</body></html>`)
  const root =
    document.querySelector('#mw-content-text .mw-parser-output') ??
    document.querySelector('.mw-parser-output') ??
    document.querySelector('main') ??
    document.body
  for (const selector of REMOVE_FROM_ARTICLE) {
    for (const node of Array.from(root.querySelectorAll(selector))) node.remove()
  }
  const normalized = (root.textContent ?? '')
    .replace(/\[[0-9]+\]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (normalized.length <= maxChars) return { text: normalized, truncated: false }
  const clipped = normalized.slice(0, maxChars)
  const lastSpace = clipped.lastIndexOf(' ')
  return {
    text: clipped.slice(0, lastSpace > maxChars * 0.8 ? lastSpace : maxChars).trimEnd(),
    truncated: true
  }
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

  async searchWikipedia(
    value: unknown,
    context: WikimediaSearchContext
  ): Promise<WikimediaSearchBundle> {
    const request = parseSearchWikiRequest(value)
    if (request.corpus !== 'wikipedia') {
      throw new WikimediaError('malformed', 'Wikipedia seat requires corpus=wikipedia')
    }
    if (context.signal.aborted) {
      throw new WikimediaError('cancelled', 'operation was cancelled')
    }
    const started = this.nowMs()
    const budget: RequestBudget = { requests: 0, responseBytes: 0 }
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
      for (const [index, hit] of hits.slice(0, request.limit).entries()) {
        const pageUrl = new URL(
          `${base}/page/${encodeURIComponent(hit.key)}/with_html`
        )
        const page = parsePageWithHtml(
          await this.json(pageUrl, context.signal, budget)
        )
        if (page.id !== hit.id) {
          throw new WikimediaError('malformed', 'Wikipedia page identity changed during lookup')
        }
        const extracted = wikipediaTextOfHtml(
          page.html,
          this.limits.maxArticleTextChars
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
      resultCount = articles.length
      return {
        request,
        results: articles,
        media: [],
        warnings: articles.some((article) => article.truncated)
          ? [{ kind: 'truncated', message: 'One or more articles were clipped to the text budget.' }]
          : [],
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
        corpus: 'wikipedia',
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
