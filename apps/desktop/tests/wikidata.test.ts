import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  buildGraphIndex,
  wikidataGraphProjectionOf,
  withExternalGraphProjection
} from '../shared/graph-core'
import type { WikidataEntity } from '../shared/wikimedia'
import { WikimediaClient } from '../electron-main/wikimedia'

const FIXTURES = join(import.meta.dirname, 'fixtures', 'wikimedia')
const fixture = (name: string): string =>
  readFileSync(join(FIXTURES, name), 'utf8')
const response = (body: string): Response =>
  new Response(body, { status: 200, headers: { 'content-type': 'application/json' } })
const context = () => ({
  signal: new AbortController().signal,
  parentTraceId: 'trace_wikidata_parent',
  parentOperationId: 'operation_wikidata_parent'
})
const request = (
  query: string,
  language: string,
  limit = 1
): Record<string, unknown> => ({
  query,
  language,
  corpus: 'wikidata',
  limit,
  includeMedia: true
})

function marieClient(
  calls: URL[] = [],
  records: unknown[] = []
): WikimediaClient {
  return new WikimediaClient({
    nowMs: () => Date.parse('2026-08-17T12:30:00Z'),
    trace: { recordWikimedia: (record) => void records.push(record) },
    fetchImpl: async (input) => {
      const url = new URL(String(input))
      calls.push(url)
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

const firstEntity = (results: readonly unknown[]): WikidataEntity => {
  const result = results[0]
  if (!result || typeof result !== 'object' || !('kind' in result)) {
    throw new Error('missing Wikidata fixture result')
  }
  if (result.kind !== 'wikidata-entity') throw new Error('wrong fixture kind')
  return result as WikidataEntity
}

describe('Wikidata live seat', () => {
  it('preserves language, revision, statements and ambiguity-safe provenance', async () => {
    const calls: URL[] = []
    const records: unknown[] = []
    const bundle = await marieClient(calls, records).searchWikidata(
      request('Marie Curie', 'fr'),
      context()
    )

    expect(calls).toHaveLength(3)
    expect(calls.every((url) => url.origin === 'https://www.wikidata.org')).toBe(true)
    expect(calls[0]!.searchParams.get('action')).toBe('wbsearchentities')
    expect(calls[0]!.searchParams.get('language')).toBe('fr')
    expect(calls[0]!.searchParams.get('maxlag')).toBe('5')
    expect(calls[1]!.searchParams.get('props')).toContain('claims')
    expect(calls[1]!.searchParams.get('languages')).toBe('fr|en')
    expect(calls[1]!.searchParams.get('sitefilter')).toBe('frwiki|enwiki')
    expect(new Set(calls[2]!.searchParams.get('ids')!.split('|'))).toEqual(
      new Set(['Q5', 'Q169470', 'Q593644', 'Q270', 'Q142'])
    )

    const entity = firstEntity(bundle.results)
    expect(entity).toMatchObject({
      id: 'Q7186',
      rank: 1,
      label: 'Marie Curie',
      description: 'physicienne et chimiste polonaise et française',
      aliases: ['Marie Sklodowska-Curie', 'Madame Curie'],
      source: {
        project: 'wikidata',
        language: 'fr',
        title: 'Marie Curie',
        pageId: 8349,
        revision: { id: 2532255818, timestamp: '2026-08-17T09:02:17Z' },
        canonicalUrl: 'https://www.wikidata.org/wiki/Q7186',
        accessedAt: '2026-08-17T12:30:00.000Z',
        license: {
          name: 'Creative Commons CC0 1.0',
          url: 'https://creativecommons.org/publicdomain/zero/1.0/'
        }
      }
    })
    expect(entity.sitelinks).toEqual([
      {
        language: 'fr',
        site: 'frwiki',
        title: 'Marie Curie',
        url: 'https://fr.wikipedia.org/wiki/Marie_Curie'
      },
      {
        language: 'en',
        site: 'enwiki',
        title: 'Marie Curie',
        url: 'https://en.wikipedia.org/wiki/Marie_Curie'
      }
    ])
    expect(entity.statements.map((statement) => statement.property)).toEqual(
      expect.arrayContaining(['P18', 'P31', 'P106', 'P19', 'P27', 'P569'])
    )
    expect(entity.statements.some((statement) => statement.property === ('P999' as never))).toBe(
      false
    )
    expect(JSON.stringify(bundle)).not.toContain('must-not-cross')
    expect(entity.statements).toContainEqual(
      expect.objectContaining({
        property: 'P18',
        value: {
          kind: 'commons-media',
          fileTitle: 'Marie Curie (1900) (cropped).jpg'
        }
      })
    )
    expect(entity.statements).toContainEqual(
      expect.objectContaining({
        property: 'P106',
        value: { kind: 'entity', id: 'Q169470', label: 'physicien ou physicienne' }
      })
    )
    expect(entity.statements).toContainEqual(
      expect.objectContaining({
        property: 'P569',
        value: { kind: 'time', value: '+1867-11-07T00:00:00Z', precision: 11 }
      })
    )

    expect(records).toEqual([
      expect.objectContaining({
        corpus: 'wikidata',
        language: 'fr',
        requests: 3,
        resultCount: 1,
        status: 'completed'
      })
    ])
    const traceJson = JSON.stringify(records)
    expect(traceJson).not.toContain('Marie Curie')
    expect(traceJson).not.toContain('Q7186')
  })

  it('returns ranked candidates and an explicit ambiguity warning', async () => {
    let calls = 0
    const client = new WikimediaClient({
      fetchImpl: async (input) => {
        calls += 1
        return response(
          fixture(
            String(input).includes('wbsearchentities')
              ? 'wikidata-search-en-atom-ambiguous.json'
              : 'wikidata-entities-en-atom-ambiguous.json'
          )
        )
      }
    })
    const bundle = await client.searchWikidata(request('atom', 'en', 5), context())
    expect(calls).toBe(2)
    expect(
      bundle.results.map((result) => ({
        id: (result as WikidataEntity).id,
        rank: (result as WikidataEntity).rank
      }))
    ).toEqual([
      { id: 'Q16766305', rank: 1 },
      { id: 'Q267956', rank: 2 },
      { id: 'Q483261', rank: 3 },
      { id: 'Q4817196', rank: 4 },
      { id: 'Q9121', rank: 5 }
    ])
    expect(bundle.warnings).toEqual([
      {
        kind: 'ambiguous',
        message: 'Wikidata returned multiple ranked entity candidates.'
      }
    ])
  })

  it('maps Action API maxlag and omitted entities to typed failures', async () => {
    const lagged = new WikimediaClient({
      fetchImpl: async () => response('{"error":{"code":"maxlag"}}')
    })
    await expect(lagged.searchWikidata(request('x', 'en'), context())).rejects.toMatchObject({
      kind: 'rate-limit'
    })

    let call = 0
    const omitted = new WikimediaClient({
      fetchImpl: async () => {
        call += 1
        return call === 1
          ? response(fixture('wikidata-search-fr-marie-curie.json'))
          : response('{"success":1,"entities":{}}')
      }
    })
    await expect(
      omitted.searchWikidata(request('Marie Curie', 'fr'), context())
    ).rejects.toMatchObject({ kind: 'malformed' })
  })
})

describe('Wikidata -> disposable graph bridge', () => {
  it('reuses GraphIndex nodes/edges with URL ids and separate provenance', async () => {
    const bundle = await marieClient().searchWikidata(
      request('Marie Curie', 'fr'),
      context()
    )
    const entity = firstEntity(bundle.results)
    const projection = wikidataGraphProjectionOf([entity])

    expect(projection.graph.nodes).toContainEqual({
      path: 'https://www.wikidata.org/wiki/Q7186',
      kind: 'web',
      title: 'Marie Curie'
    })
    expect(projection.graph.nodes).toContainEqual({
      path: 'https://www.wikidata.org/wiki/Q169470',
      kind: 'web',
      title: 'physicien ou physicienne'
    })
    expect(projection.graph.edges).toContainEqual(
      expect.objectContaining({
        subject: 'https://www.wikidata.org/wiki/Q7186',
        object: 'https://www.wikidata.org/wiki/Q169470',
        targetRaw: 'https://www.wikidata.org/wiki/Q169470',
        external: true,
        label: 'occupation'
      })
    )
    expect(projection.graph.edges.some((edge) => edge.label === 'image')).toBe(false)
    expect(projection.graph.edges.some((edge) => edge.label === 'date-of-birth')).toBe(false)
    expect(projection.provenance).toHaveLength(1)
    expect(projection.provenance[0]).toMatchObject({
      node: 'https://www.wikidata.org/wiki/Q7186',
      source: { revision: { id: 2532255818 } }
    })

    const base = buildGraphIndex([
      { path: 'notes/local.md', content: '# Local\n\nVault knowledge.' }
    ])
    const augmented = withExternalGraphProjection(base, projection)
    expect(base.nodes).toHaveLength(1)
    expect(base.edges).toHaveLength(0)
    expect(augmented.nodes.length).toBeGreaterThan(base.nodes.length)
    expect(augmented.edges).toEqual(projection.graph.edges)
    expect(JSON.parse(JSON.stringify(augmented))).toEqual(augmented)
  })
})
