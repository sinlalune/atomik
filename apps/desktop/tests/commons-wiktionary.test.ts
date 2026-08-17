import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { CommonsMedia, WiktionaryEtymology } from '../shared/wikimedia'
import {
  etymologyStatusOf,
  WikimediaClient,
  wiktionaryEtymologiesOfHtml
} from '../electron-main/wikimedia'

const FIXTURES = join(import.meta.dirname, 'fixtures', 'wikimedia')
const fixture = (name: string): string =>
  readFileSync(join(FIXTURES, name), 'utf8')
const response = (body: string): Response =>
  new Response(body, {
    status: 200,
    headers: { 'content-type': 'application/json' }
  })
const context = (mediaPolicy?: 'remote' | 'private' | 'offline') => ({
  signal: new AbortController().signal,
  parentTraceId: 'trace_wikimedia_parent',
  parentOperationId: 'operation_wikimedia_parent',
  ...(mediaPolicy === undefined ? {} : { mediaPolicy })
})
const wikidataRequest = {
  query: 'Marie Curie',
  language: 'fr',
  corpus: 'wikidata',
  limit: 1,
  includeMedia: true
}
const wiktionaryRequest = (query: string, language: string) => ({
  query,
  language,
  corpus: 'wiktionary',
  limit: 1,
  includeMedia: false
})

function commonsClient(
  commonsFixture = 'commons-marie-curie.json',
  calls: URL[] = [],
  records: unknown[] = []
): WikimediaClient {
  return new WikimediaClient({
    nowMs: () => Date.parse('2026-08-17T12:30:00Z'),
    trace: { recordWikimedia: (record) => void records.push(record) },
    fetchImpl: async (input) => {
      const url = new URL(String(input))
      calls.push(url)
      if (url.hostname === 'commons.wikimedia.org') {
        return response(fixture(commonsFixture))
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

function firstMedia(results: readonly CommonsMedia[]): CommonsMedia {
  const result = results[0]
  if (!result) throw new Error('missing Commons fixture result')
  return result
}

describe('Commons P18 resolution', () => {
  it('returns only fully attributed HTTPS media in explicit remote mode', async () => {
    const calls: URL[] = []
    const records: unknown[] = []
    const bundle = await commonsClient(
      'commons-marie-curie.json',
      calls,
      records
    ).searchWikidata(wikidataRequest, context('remote'))

    expect(calls).toHaveLength(4)
    const commonsCall = calls[3]!
    expect(commonsCall.origin).toBe('https://commons.wikimedia.org')
    expect(commonsCall.searchParams.get('action')).toBe('query')
    expect(commonsCall.searchParams.get('titles')).toBe(
      'File:Marie Curie (1900) (cropped).jpg'
    )
    expect(commonsCall.searchParams.get('prop')).toBe('imageinfo')
    expect(commonsCall.searchParams.get('iiurlwidth')).toBe('640')
    expect(commonsCall.searchParams.get('iiextmetadatalanguage')).toBe('fr')
    expect(commonsCall.searchParams.get('maxlag')).toBe('5')

    expect(firstMedia(bundle.media)).toEqual({
      kind: 'commons-media',
      fileTitle: 'Marie Curie (1900) (cropped).jpg',
      description: 'Portrait of Marie Skłodowska-Curie',
      creator: 'Unknown author',
      credit: 'Historic photograph',
      attributionRequired: false,
      originalUrl:
        'https://upload.wikimedia.org/wikipedia/commons/7/77/Marie_Curie_%281900%29_%28cropped%29.jpg?fixture=original',
      thumbnailUrl:
        'https://upload.wikimedia.org/wikipedia/commons/7/77/Marie_Curie_%281900%29_%28cropped%29.jpg?fixture=thumbnail',
      mime: 'image/jpeg',
      width: 335,
      height: 491,
      source: {
        project: 'commons',
        language: 'fr',
        title: 'File:Marie Curie (1900) (cropped).jpg',
        pageId: 123803240,
        revision: { id: null, timestamp: '2022-10-05T09:16:49Z' },
        canonicalUrl:
          'https://commons.wikimedia.org/wiki/File:Marie_Curie_(1900)_(cropped).jpg',
        accessedAt: '2026-08-17T12:30:00.000Z',
        license: {
          name: 'Public domain',
          url: 'https://commons.wikimedia.org/wiki/Commons:Public_domain'
        }
      }
    })
    expect(bundle.warnings).toEqual([])
    expect(records).toEqual([
      expect.objectContaining({
        corpus: 'wikidata',
        requests: 4,
        resultCount: 1,
        status: 'completed'
      })
    ])
  })

  it.each(['private', 'offline'] as const)(
    'withholds remote media and skips Commons in %s mode',
    async (mediaPolicy) => {
      const calls: URL[] = []
      const bundle = await commonsClient(
        'commons-marie-curie.json',
        calls
      ).searchWikidata(wikidataRequest, context(mediaPolicy))

      expect(calls).toHaveLength(3)
      expect(calls.some((url) => url.hostname === 'commons.wikimedia.org')).toBe(false)
      expect(bundle.media).toEqual([])
      expect(bundle.warnings).toContainEqual({
        kind: 'media-withheld',
        message: 'Commons media is disabled by private/offline policy.'
      })
      expect(JSON.stringify(bundle)).not.toContain('upload.wikimedia.org')
    }
  )

  it('withholds incomplete attribution instead of inventing a creator', async () => {
    const bundle = await commonsClient(
      'commons-marie-curie-missing-attribution.json'
    ).searchWikidata(wikidataRequest, context('remote'))

    expect(bundle.media).toEqual([])
    expect(bundle.warnings).toContainEqual({
      kind: 'media-withheld',
      message: '1 Commons image(s) lacked complete attribution or safe URLs.'
    })
    expect(JSON.stringify(bundle)).not.toContain('Unknown author')
  })

  it('withholds an otherwise attributed image when an upload URL is not HTTPS', async () => {
    const client = new WikimediaClient({
      fetchImpl: async (input) => {
        const url = new URL(String(input))
        if (url.hostname === 'commons.wikimedia.org') {
          return response(
            fixture('commons-marie-curie.json').replace(
              'https://upload.wikimedia.org/wikipedia/commons/7/77/Marie_Curie_%281900%29_%28cropped%29.jpg?fixture=original',
              'http://upload.wikimedia.org/wikipedia/commons/7/77/file.jpg'
            )
          )
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

    const bundle = await client.searchWikidata(
      wikidataRequest,
      context('remote')
    )
    expect(bundle.media).toEqual([])
    expect(bundle.warnings[0]?.kind).toBe('media-withheld')
  })
})

function wiktionaryClient(
  calls: URL[] = [],
  records: unknown[] = [],
  maxToolTextChars?: number
): WikimediaClient {
  return new WikimediaClient({
    nowMs: () => Date.parse('2026-08-17T12:30:00Z'),
    trace: { recordWikimedia: (record) => void records.push(record) },
    ...(maxToolTextChars === undefined ? {} : { limits: { maxToolTextChars } }),
    fetchImpl: async (input) => {
      const url = new URL(String(input))
      calls.push(url)
      const french = url.hostname === 'fr.wiktionary.org'
      const search = url.pathname.endsWith('/search/page')
      return response(
        fixture(
          search
            ? french
              ? 'wiktionary-search-fr-atome.json'
              : 'wiktionary-search-en-atom.json'
            : french
              ? 'wiktionary-page-fr-atome.json'
              : 'wiktionary-page-en-atom.json'
        )
      )
    }
  })
}

const firstEtymology = (results: readonly unknown[]): WiktionaryEtymology => {
  const result = results[0]
  if (!result || typeof result !== 'object' || !('kind' in result)) {
    throw new Error('missing Wiktionary fixture result')
  }
  if (result.kind !== 'wiktionary-etymology') throw new Error('wrong fixture kind')
  return result as WiktionaryEtymology
}

describe('Wiktionary etymology seat', () => {
  it('extracts only the pinned English language section with revision provenance', async () => {
    const calls: URL[] = []
    const records: unknown[] = []
    const bundle = await wiktionaryClient(calls, records).searchWiktionary(
      wiktionaryRequest('atom', 'en'),
      context()
    )

    expect(calls).toHaveLength(2)
    expect(calls.every((url) => url.origin === 'https://en.wiktionary.org')).toBe(true)
    expect(calls[0]!.pathname).toBe('/w/rest.php/v1/search/page')
    expect(calls[0]!.searchParams.get('q')).toBe('atom')
    expect(calls[1]!.pathname).toBe('/w/rest.php/v1/page/atom/with_html')
    expect(firstEtymology(bundle.results)).toEqual({
      kind: 'wiktionary-etymology',
      term: 'atom',
      editionLanguage: 'en',
      entryLanguage: 'en',
      heading: 'Etymology',
      text: 'From Middle English attome, from Middle French athome, from Latin atomus (smallest particle), from Ancient Greek atomos (indivisible).',
      status: 'unknown',
      truncated: false,
      source: {
        project: 'wiktionary',
        language: 'en',
        title: 'atom',
        pageId: 29589,
        revision: { id: 91397040, timestamp: '2026-06-27T05:27:18Z' },
        canonicalUrl: 'https://en.wiktionary.org/wiki/atom',
        accessedAt: '2026-08-17T12:30:00.000Z',
        license: {
          name: 'Creative Commons Attribution-Share Alike 4.0',
          url: 'https://creativecommons.org/licenses/by-sa/4.0/deed.en'
        }
      }
    })
    expect(JSON.stringify(bundle)).not.toContain('From English atom')
    expect(bundle.warnings).toEqual([
      {
        kind: 'parser-uncertain',
        message:
          'Etymology status is unknown because the source exposes no explicit marker.'
      }
    ])
    expect(records).toEqual([
      expect.objectContaining({
        corpus: 'wiktionary',
        language: 'en',
        requests: 2,
        resultCount: 1,
        status: 'completed'
      })
    ])
    expect(JSON.stringify(records)).not.toContain('atom')
  })

  it('uses the French edition and its Français/Étymologie section', async () => {
    const calls: URL[] = []
    const bundle = await wiktionaryClient(calls).searchWiktionary(
      wiktionaryRequest('atome', 'fr'),
      context()
    )
    const entry = firstEtymology(bundle.results)

    expect(calls.every((url) => url.origin === 'https://fr.wiktionary.org')).toBe(true)
    expect(entry).toMatchObject({
      term: 'atome',
      editionLanguage: 'fr',
      entryLanguage: 'fr',
      heading: 'Étymologie',
      status: 'unknown',
      source: {
        pageId: 50574,
        revision: { id: 39727749, timestamp: '2026-08-01T18:02:30Z' },
        canonicalUrl: 'https://fr.wiktionary.org/wiki/atome'
      }
    })
    expect(entry.text).toContain('latin athomus')
    expect(entry.text).not.toContain('Définition, pas étymologie')
  })

  it('preserves only explicit source-status markers', () => {
    expect(etymologyStatusOf('The form is explicitly attested in 1420.')).toBe(
      'attested'
    )
    expect(etymologyStatusOf('Reconstructed from Proto-X *atomos.')).toBe(
      'reconstructed'
    )
    expect(etymologyStatusOf('This origin is disputed by later editors.')).toBe(
      'disputed'
    )
    expect(etymologyStatusOf('Possibly from a neighbouring dialect.')).toBe(
      'unknown'
    )
  })

  it('clips extracted text and never crosses into another language section', () => {
    const html =
      '<section><h2>English</h2><section><h3>Etymology</h3><p>' +
      'bounded words '.repeat(20) +
      '</p></section></section><section><h2>Français</h2><section><h3>Étymologie</h3><p>French only.</p></section></section>'
    const extracted = wiktionaryEtymologiesOfHtml(html, 'en', 40, 1)

    expect(extracted).toHaveLength(1)
    expect(extracted[0]?.text.length).toBeLessThanOrEqual(40)
    expect(extracted[0]?.truncated).toBe(true)
    expect(extracted[0]?.text).not.toContain('French only')
    expect(wiktionaryEtymologiesOfHtml(html, 'fr')[0]?.text).toBe('French only.')
  })

  it('enforces the combined tool-text budget', async () => {
    const bundle = await wiktionaryClient([], [], 48).searchWiktionary(
      wiktionaryRequest('atom', 'en'),
      context()
    )
    const entry = firstEtymology(bundle.results)

    expect(entry.text.length).toBeLessThanOrEqual(48)
    expect(entry.truncated).toBe(true)
    expect(bundle.warnings).toContainEqual({
      kind: 'truncated',
      message: 'One or more etymology sections were clipped to the text budget.'
    })
  })

  it('rejects unsupported editions before making a request', async () => {
    let calls = 0
    const client = new WikimediaClient({
      fetchImpl: async () => {
        calls += 1
        return response('{}')
      }
    })

    await expect(
      client.searchWiktionary(wiktionaryRequest('Atom', 'de'), context())
    ).rejects.toMatchObject({ kind: 'unsupported-language' })
    expect(calls).toBe(0)
  })

  it('returns a typed empty outcome when the pinned language has no etymology', async () => {
    let calls = 0
    const client = new WikimediaClient({
      fetchImpl: async () => {
        calls += 1
        return response(
          calls === 1
            ? fixture('wiktionary-search-en-atom.json')
            : JSON.stringify({
                id: 29589,
                key: 'atom',
                title: 'atom',
                latest: { id: 91397040, timestamp: '2026-06-27T05:27:18Z' },
                license: {
                  url: 'https://creativecommons.org/licenses/by-sa/4.0/deed.en',
                  title: 'Creative Commons Attribution-Share Alike 4.0'
                },
                html: '<section><h2>English</h2><section><h3>Noun</h3><p>Definition only.</p></section></section>'
              })
        )
      }
    })

    await expect(
      client.searchWiktionary(wiktionaryRequest('atom', 'en'), context())
    ).rejects.toMatchObject({ kind: 'empty' })
    expect(calls).toBe(2)
  })
})
