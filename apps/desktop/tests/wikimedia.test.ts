import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { ActionTraceLedger } from '../electron-main/action-trace'
import {
  WikimediaClient,
  WikimediaError,
  wikipediaTextOfHtml
} from '../electron-main/wikimedia'
import { WIKIMEDIA_USER_AGENT } from '../shared/wikimedia'

const FIXTURES = join(import.meta.dirname, 'fixtures', 'wikimedia')
const fixture = (name: string): string =>
  readFileSync(join(FIXTURES, name), 'utf8')

const response = (
  body: string,
  status = 200,
  headers: Record<string, string> = {}
): Response => new Response(body, { status, headers })

const request = (
  query = 'atom',
  language = 'en'
): Record<string, unknown> => ({
  query,
  language,
  corpus: 'wikipedia',
  limit: 1,
  includeMedia: false
})

const context = (
  signal: AbortSignal = new AbortController().signal,
  parentTraceId = 'trace_parent'
) => ({
  signal,
  parentTraceId,
  parentOperationId: 'operation_parent'
})

const tempDirs: string[] = []
afterEach(() => {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

describe('Wikipedia live seat', () => {
  it('searches and reads a revision through fixed hosts, with bounded clean text', async () => {
    const calls: Array<{ url: URL; init: RequestInit }> = []
    const fetchImpl: typeof fetch = async (input, init = {}) => {
      const url = new URL(String(input))
      calls.push({ url, init })
      return url.pathname.endsWith('/search/page')
        ? response(fixture('wikipedia-search-en-atom.json'))
        : response(fixture('wikipedia-page-en-atom.json'))
    }
    const dir = mkdtempSync(join(tmpdir(), 'atomik-wiki-trace-'))
    tempDirs.push(dir)
    const traces = new ActionTraceLedger(dir)
    const client = new WikimediaClient({
      fetchImpl,
      trace: traces,
      nowMs: () => Date.parse('2026-08-17T12:00:00Z')
    })
    const parentTraceId = traces.beginGeneration('operation_parent')

    const bundle = await client.searchWikipedia(
      request(),
      context(new AbortController().signal, parentTraceId)
    )

    expect(calls).toHaveLength(2)
    expect(calls[0]!.url.toString()).toBe(
      'https://en.wikipedia.org/w/rest.php/v1/search/page?q=atom&limit=1'
    )
    expect(calls[1]!.url.toString()).toBe(
      'https://en.wikipedia.org/w/rest.php/v1/page/Atom/with_html'
    )
    expect(new Headers(calls[0]!.init.headers).get('user-agent')).toBe(
      WIKIMEDIA_USER_AGENT
    )
    expect(calls.every((call) => call.init.redirect === 'error')).toBe(true)

    expect(bundle).toMatchObject({
      accessedAt: '2026-08-17T12:00:00.000Z',
      request: { query: 'atom', language: 'en', corpus: 'wikipedia' },
      results: [
        {
          kind: 'wikipedia-article',
          rank: 1,
          description: 'Smallest unit of a chemical element',
          source: {
            pageId: 902,
            revision: {
              id: 1368905891,
              timestamp: '2026-08-11T19:33:57Z'
            },
            canonicalUrl: 'https://en.wikipedia.org/wiki/Atom',
            license: {
              name: 'Creative Commons Attribution-Share Alike 4.0',
              url: 'https://creativecommons.org/licenses/by-sa/4.0/deed.en'
            }
          }
        }
      ]
    })
    const article = bundle.results[0]!
    expect(article.kind).toBe('wikipedia-article')
    if (article.kind !== 'wikipedia-article') throw new Error('wrong fixture kind')
    expect(article.text).toContain('fundamental building blocks of matter')
    expect(article.text).toContain('Structure')
    expect(article.text).not.toMatch(/Contents chrome|Reference furniture|\[1\]/)
    expect(bundle.responseBytes).toBeGreaterThan(0)

    const rawTrace = readFileSync(traces.ledgerPath(), 'utf8')
    const trace = JSON.parse(rawTrace) as Record<string, unknown>
    expect(trace).toMatchObject({
      parentTraceId,
      operationId: 'operation_parent',
      action: 'retrieve',
      execution: {
        location: 'public-api',
        provider: 'wikimedia',
        model: 'wikipedia'
      },
      usage: {
        tool: 'search_wiki',
        corpus: 'wikipedia',
        language: 'en',
        requests: 2,
        results: 1
      },
      outcome: { status: 'completed' },
      privacy: { mode: 'public-api', contentRecorded: false }
    })
    expect(rawTrace).not.toContain('atom')
    expect(rawTrace).not.toContain('building blocks')
  })

  it('keeps the selected language in host, provenance and licence', async () => {
    const urls: string[] = []
    const client = new WikimediaClient({
      fetchImpl: async (input) => {
        const url = String(input)
        urls.push(url)
        return response(
          fixture(
            url.includes('/search/page')
              ? 'wikipedia-search-fr-atome.json'
              : 'wikipedia-page-fr-atome.json'
          )
        )
      },
      nowMs: () => Date.parse('2026-08-17T12:00:00Z')
    })
    const bundle = await client.searchWikipedia(request('atome', 'fr'), context())
    expect(urls.every((url) => url.startsWith('https://fr.wikipedia.org/'))).toBe(true)
    expect(bundle.results[0]).toMatchObject({
      source: {
        language: 'fr',
        canonicalUrl: 'https://fr.wikipedia.org/wiki/Atome',
        revision: { id: 238155014 },
        license: { url: 'https://creativecommons.org/licenses/by-sa/4.0/deed.fr' }
      }
    })
  })

  it('reports an empty search without making a page request', async () => {
    const records: unknown[] = []
    let calls = 0
    const client = new WikimediaClient({
      fetchImpl: async () => {
        calls += 1
        return response(fixture('wikipedia-search-empty.json'))
      },
      trace: { recordWikimedia: (record) => void records.push(record) }
    })
    await expect(client.searchWikipedia(request('zzznothing'), context())).rejects.toMatchObject({
      kind: 'empty'
    })
    expect(calls).toBe(1)
    expect(records).toEqual([
      expect.objectContaining({
        status: 'failed',
        errorKind: 'empty',
        requests: 1,
        resultCount: 0
      })
    ])
  })

  it('preserves Retry-After on 429 instead of retrying early', async () => {
    const client = new WikimediaClient({
      fetchImpl: async () => response('slow down', 429, { 'retry-after': '9' }),
      nowMs: () => 0
    })
    let failure: unknown
    try {
      await client.searchWikipedia(request(), context())
    } catch (error) {
      failure = error
    }
    expect(failure).toBeInstanceOf(WikimediaError)
    expect(failure).toMatchObject({ kind: 'rate-limit', retryAfterMs: 9_000 })
  })

  it('rejects malformed page JSON and oversized bodies', async () => {
    const malformed = new WikimediaClient({
      fetchImpl: async (input) =>
        response(
          fixture(
            String(input).includes('/search/page')
              ? 'wikipedia-search-en-atom.json'
              : 'wikipedia-page-malformed.json'
          )
        )
    })
    await expect(malformed.searchWikipedia(request(), context())).rejects.toMatchObject({
      kind: 'malformed'
    })

    const oversized = new WikimediaClient({
      fetchImpl: async () => response('{}', 200, { 'content-length': '100' }),
      limits: { maxResponseBytes: 50, maxTotalResponseBytes: 50 }
    })
    await expect(oversized.searchWikipedia(request(), context())).rejects.toMatchObject({
      kind: 'budget-exceeded'
    })
  })

  it('distinguishes timeout from caller cancellation', async () => {
    const waitForAbort: typeof fetch = async (_input, init = {}) =>
      await new Promise<Response>((_resolve, reject) => {
        const signal = init.signal
        if (!signal) return reject(new Error('missing signal'))
        signal.addEventListener(
          'abort',
          () => reject(new DOMException('aborted', 'AbortError')),
          { once: true }
        )
      })

    const timed = new WikimediaClient({
      fetchImpl: waitForAbort,
      limits: { requestTimeoutMs: 5 }
    })
    await expect(timed.searchWikipedia(request(), context())).rejects.toMatchObject({
      kind: 'timeout'
    })

    const controller = new AbortController()
    const cancelled = new WikimediaClient({ fetchImpl: waitForAbort })
    const pending = cancelled.searchWikipedia(request(), context(controller.signal))
    controller.abort()
    await expect(pending).rejects.toMatchObject({ kind: 'cancelled' })
  })
})

describe('provider-neutral search_wiki door (S05)', () => {
  const autoRequest = {
    query: 'atom',
    language: 'en',
    corpus: 'auto',
    limit: 5,
    includeMedia: true
  }

  function autoClient(
    calls: URL[],
    records: unknown[] = [],
    limits?: {
      maxNetworkRequestsPerSearch?: number
      maxTotalResponseBytes?: number
    }
  ): WikimediaClient {
    return new WikimediaClient({
      ...(limits === undefined ? {} : { limits }),
      trace: { recordWikimedia: (record) => void records.push(record) },
      fetchImpl: async (input) => {
        const url = new URL(String(input))
        calls.push(url)
        if (url.hostname === 'en.wikipedia.org') {
          return response(
            fixture(
              url.pathname.endsWith('/search/page')
                ? 'wikipedia-search-en-atom.json'
                : 'wikipedia-page-en-atom.json'
            )
          )
        }
        if (url.hostname === 'commons.wikimedia.org') {
          return response(fixture('commons-marie-curie.json'))
        }
        if (url.searchParams.get('action') === 'wbsearchentities') {
          return response(fixture('wikidata-search-fr-marie-curie.json'))
        }
        if (url.searchParams.get('props') === 'labels') {
          return response(fixture('wikidata-labels-fr-marie-curie.json'))
        }
        return response(fixture('wikidata-entity-fr-marie-curie.json'))
      }
    })
  }

  it('dispatches auto through fixed hosts with one shared request budget', async () => {
    const calls: URL[] = []
    const records: unknown[] = []
    const bundle = await autoClient(calls, records).search(
      autoRequest,
      { ...context(), mediaPolicy: 'remote' }
    )

    expect(calls).toHaveLength(6)
    expect(
      calls.every((url) =>
        [
          'en.wikipedia.org',
          'www.wikidata.org',
          'commons.wikimedia.org'
        ].includes(url.hostname)
      )
    ).toBe(true)
    expect(calls[0]!.searchParams.get('limit')).toBe('3')
    expect(
      calls.find((url) => url.searchParams.get('action') === 'wbsearchentities')
        ?.searchParams.get('limit')
    ).toBe('2')
    expect(bundle.request).toEqual(autoRequest)
    expect(bundle.results.map((result) => result.kind)).toEqual([
      'wikipedia-article',
      'wikidata-entity'
    ])
    expect(bundle.media).toHaveLength(1)
    expect(bundle.responseBytes).toBeGreaterThan(0)
    expect(records).toEqual([
      expect.objectContaining({
        parentTraceId: 'trace_parent',
        corpus: 'wikipedia',
        requests: 2,
        status: 'completed'
      }),
      expect.objectContaining({
        parentTraceId: 'trace_parent',
        corpus: 'wikidata',
        requests: 4,
        status: 'completed'
      })
    ])
  })

  /** S06c: found on the live 2026-08-17 Gemini bench. Wikidata answered 429
   *  AFTER Wikipedia had returned usable articles, and the whole search failed
   *  — the model saw an error where good results existed, and paid for a
   *  second call to recover. Partial success now survives as a warning. */
  it('keeps the corpus that answered when the other fails transiently', async () => {
    const records: unknown[] = []
    const client = new WikimediaClient({
      trace: { recordWikimedia: (record) => void records.push(record) },
      fetchImpl: async (input) => {
        const url = new URL(String(input))
        if (url.hostname === 'en.wikipedia.org') {
          return response(
            fixture(
              url.pathname.endsWith('/search/page')
                ? 'wikipedia-search-en-atom.json'
                : 'wikipedia-page-en-atom.json'
            )
          )
        }
        return response('{"error":"maxlag"}', 429, { 'retry-after': '5' })
      }
    })

    const bundle = await client.search(autoRequest, {
      ...context(),
      mediaPolicy: 'remote'
    })

    expect(bundle.results.map((result) => result.kind)).toEqual([
      'wikipedia-article'
    ])
    expect(bundle.warnings).toContainEqual({
      kind: 'corpus-unavailable',
      message:
        'wikidata was unavailable (rate-limit); these results come from the other corpus only'
    })
    // The failed corpus still files its own content-free receipt.
    expect(records).toContainEqual(
      expect.objectContaining({ corpus: 'wikidata', status: 'failed' })
    )
  })

  it('never degrades cancellation to a warning', async () => {
    const controller = new AbortController()
    const client = new WikimediaClient({
      trace: { recordWikimedia: () => undefined },
      fetchImpl: async (input) => {
        const url = new URL(String(input))
        if (url.hostname === 'en.wikipedia.org') {
          return response(
            fixture(
              url.pathname.endsWith('/search/page')
                ? 'wikipedia-search-en-atom.json'
                : 'wikipedia-page-en-atom.json'
            )
          )
        }
        controller.abort()
        throw new DOMException('aborted', 'AbortError')
      }
    })

    await expect(
      client.search(autoRequest, {
        signal: controller.signal,
        parentTraceId: 'trace_parent',
        parentOperationId: 'operation_parent',
        mediaPolicy: 'remote'
      })
    ).rejects.toMatchObject({ kind: 'cancelled' })
  })

  /** S07d: the owner hit `budget-exceeded` on an ordinary question — one
   *  huge article failed the whole search, and huge articles are exactly the
   *  famous subjects people ask about. */
  /** S07d: the owner hit `budget-exceeded` on an ordinary question — one
   *  huge article failed the whole search, and huge articles are exactly the
   *  famous subjects people ask about. */
  it('skips a page too large to read and keeps the ones it could', async () => {
    const client = new WikimediaClient({
      trace: { recordWikimedia: () => undefined },
      limits: { maxResponseBytes: 20_000 },
      fetchImpl: async (input) => {
        const url = new URL(String(input))
        if (url.pathname.endsWith('/search/page')) {
          return response(fixture('wikipedia-search-en-atom-two.json'))
        }
        // The second candidate is enormous; the first is an ordinary page.
        return url.pathname.includes('Atomic_theory')
          ? response(`{"padding":"${'x'.repeat(30_000)}"}`)
          : response(fixture('wikipedia-page-en-atom.json'))
      }
    })

    const bundle = await client.searchWikipedia(
      { query: 'atom', language: 'en', corpus: 'wikipedia', limit: 2, includeMedia: false },
      context()
    )

    expect(bundle.results).toHaveLength(1)
    expect(bundle.warnings).toContainEqual({
      kind: 'truncated',
      message:
        '"Atomic theory" was too large to read within the response budget and was skipped.'
    })
  })

  it('reports empty when EVERY candidate was too large to read', async () => {
    const client = new WikimediaClient({
      trace: { recordWikimedia: () => undefined },
      limits: { maxResponseBytes: 20_000 },
      fetchImpl: async (input) => {
        const url = new URL(String(input))
        return url.pathname.endsWith('/search/page')
          ? response(fixture('wikipedia-search-en-atom-two.json'))
          : response(`{"padding":"${'x'.repeat(30_000)}"}`)
      }
    })

    // `empty` and not `budget-exceeded`: it is the one kind `auto` falls
    // through on, so the search still reaches the other corpus.
    await expect(
      client.searchWikipedia(
        { query: 'atom', language: 'en', corpus: 'wikipedia', limit: 2, includeMedia: false },
        context()
      )
    ).rejects.toMatchObject({ kind: 'empty' })
  })

  it('does not reset the network-call budget between auto corpora', async () => {
    const calls: URL[] = []
    await expect(
      autoClient(calls, [], { maxNetworkRequestsPerSearch: 5 }).search(autoRequest, {
        ...context(),
        mediaPolicy: 'remote'
      })
    ).rejects.toMatchObject({ kind: 'budget-exceeded' })
    expect(calls).toHaveLength(5)
  })

  it('does not reset the response-byte budget between auto corpora', async () => {
    const calls: URL[] = []
    const wikipediaBytes = new TextEncoder().encode(
      fixture('wikipedia-search-en-atom.json') +
        fixture('wikipedia-page-en-atom.json')
    ).byteLength
    await expect(
      autoClient(calls, [], {
        maxTotalResponseBytes: wikipediaBytes + 16
      }).search(autoRequest, { ...context(), mediaPolicy: 'remote' })
    ).rejects.toMatchObject({ kind: 'budget-exceeded' })
    expect(calls).toHaveLength(3)
  })

  it('does not begin the second auto corpus after parent cancellation', async () => {
    const controller = new AbortController()
    const calls: URL[] = []
    const client = new WikimediaClient({
      fetchImpl: async (input) => {
        const url = new URL(String(input))
        calls.push(url)
        const search = url.pathname.endsWith('/search/page')
        if (!search) controller.abort()
        return response(
          fixture(
            search
              ? 'wikipedia-search-en-atom.json'
              : 'wikipedia-page-en-atom.json'
          )
        )
      }
    })

    await expect(
      client.search(autoRequest, context(controller.signal))
    ).rejects.toMatchObject({ kind: 'cancelled' })
    expect(calls).toHaveLength(2)
    expect(calls.every((url) => url.hostname === 'en.wikipedia.org')).toBe(true)
  })

  it('keeps a usable corpus when the other auto corpus is empty', async () => {
    const calls: URL[] = []
    const client = new WikimediaClient({
      fetchImpl: async (input) => {
        const url = new URL(String(input))
        calls.push(url)
        if (url.hostname === 'en.wikipedia.org') {
          return response(fixture('wikipedia-search-empty.json'))
        }
        return response(
          fixture(
            url.searchParams.get('action') === 'wbsearchentities'
              ? 'wikidata-search-en-atom-ambiguous.json'
              : 'wikidata-entities-en-atom-ambiguous.json'
          )
        )
      }
    })

    const bundle = await client.search(autoRequest, context())
    expect(calls).toHaveLength(3)
    expect(bundle.results.map((result) => result.kind)).toEqual([
      'wikidata-entity',
      'wikidata-entity'
    ])
  })

  it('rejects malformed requests before transport through the unified door', async () => {
    let calls = 0
    const client = new WikimediaClient({
      fetchImpl: async () => {
        calls += 1
        return response('{}')
      }
    })
    await expect(
      client.search(
        {
          query: 'atom',
          language: 'en',
          url: 'https://example.test'
        },
        context()
      )
    ).rejects.toThrow('unknown field')
    expect(calls).toBe(0)
  })
})

describe('Wikipedia HTML extraction', () => {
  it('removes chrome and clips on a word boundary', () => {
    const result = wikipediaTextOfHtml(
      '<main><p>alpha beta gamma delta epsilon</p><nav>not content</nav></main>',
      18
    )
    // S07i: a page with nothing to compete against still spends the whole
    // budget on its lead — the lead cap guards against crowding out an
    // answer, not against being the only thing there is.
    expect(result).toEqual({
      text: 'alpha beta gamma',
      truncated: true,
      kept: ['(lead)'],
      skipped: 0
    })
  })

  it('spends the budget on the sections that answer, in reading order', () => {
    // The owner's ruling (S07i): "we can't set a limit to a page if we have
    // no tool to … assert that we have reached the part that fits the
    // answer". Position is not relevance.
    const html = [
      '<main>',
      '<p>Lead paragraph about a person, mostly biographical framing.</p>',
      '<h2>Jeunesse</h2><p>Born somewhere, studied something, early life details.</p>',
      '<h2>Carrière</h2><p>Worked here and there in various roles over years.</p>',
      '<h2>Réforme des retraites</h2><p>The pension reform of 2023 raised the retirement age and provoked strikes.</p>',
      '</main>'
    ].join('')
    const result = wikipediaTextOfHtml(html, 200, 'réforme des retraites')
    expect(result.kept).toContain('Réforme des retraites')
    expect(result.text).toContain('pension reform')
    // the lead still leads, and the sections that lost are counted
    expect(result.kept[0]).toBe('(lead)')
    expect(result.skipped).toBeGreaterThan(0)
    expect(result.truncated).toBe(true)
  })

  it('falls back to reading order when the query has no usable terms', () => {
    const html = [
      '<main>',
      '<p>Lead paragraph.</p>',
      '<h2>First</h2><p>First section body text here.</p>',
      '<h2>Second</h2><p>Second section body text here.</p>',
      '</main>'
    ].join('')
    const result = wikipediaTextOfHtml(html, 40, '   ')
    expect(result.kept[0]).toBe('(lead)')
    expect(result.text.startsWith('Lead paragraph.')).toBe(true)
  })
})
