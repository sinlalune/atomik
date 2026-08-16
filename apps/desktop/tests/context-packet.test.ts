import { describe, expect, it } from 'vitest'
import { compileContextPacket, type PacketDeps } from '../shared/context-packet'
import { buildGraphIndex } from '../shared/graph-core'
import { buildRetrievalIndex } from '../shared/retrieval-core'
import { toPacketRequest } from '../electron-main/retrieval'

/**
 * The context packet (CP-MVP-010 S05). The promises under test are the
 * ones bedrock 26 and 33 actually make: entries say WHY they are here,
 * omissions say why they are not, the budget is real, and the coverage
 * verdict answers "does the vault already know this?" — the question the
 * owner named as the harness minimum, and the branch CP-MVP-011 reads.
 */

const VAULT = [
  {
    path: 'concepts/ethos.md',
    content:
      "# L'éthos\n\nL'éthos est la crédibilité de l'orateur.\n" +
      'Il [[pathos]]{oppose-a} le pathos.\n'
  },
  {
    path: 'concepts/pathos.md',
    content: '# Pathos\n\nLe pathos joue sur les émotions.\n[[emotion]]{repose-sur}\n'
  },
  { path: 'concepts/emotion.md', content: '# Émotion\n\nUn mouvement de l\'âme.\n' },
  {
    path: 'projects/cours/plan.md',
    content: '# Plan du cours\n\nUne séance sur la crédibilité.\n'
  },
  { path: 'sources/web/curlew/snapshot.mhtml' }
]

const deps: PacketDeps = {
  index: buildRetrievalIndex(VAULT),
  graph: buildGraphIndex(VAULT),
  read: (path) => VAULT.find((file) => file.path === path)?.content,
  id: 'packet-test'
}

const paths = (entries: { path: string }[]): string[] =>
  entries.map((entry) => entry.path)

describe('compileContextPacket', () => {
  it('walks the ladder and labels every entry with the stage that found it', () => {
    const packet = compileContextPacket({ query: 'crédibilité' }, deps)

    expect(packet.retrieval.stages).toEqual(['lexical', 'link'])
    const lexical = packet.entries.filter((entry) => entry.stage === 'lexical')
    expect(paths(lexical)).toContain('concepts/ethos.md')
    expect(paths(lexical)).toContain('projects/cours/plan.md')

    // pathos was never mentioned in the query — the EDGE brought it in
    const linked = packet.entries.find((entry) => entry.path === 'concepts/pathos.md')!
    expect(linked.stage).toBe('link')
    expect(linked.reason).toContain('oppose-a')
  })

  it('puts what the user already has first, and says so', () => {
    const packet = compileContextPacket(
      { query: 'crédibilité', scope: { paths: ['concepts/emotion.md'] } },
      deps
    )
    expect(packet.strategy).toBe('selection-first')
    expect(packet.entries[0]).toMatchObject({
      path: 'concepts/emotion.md',
      stage: 'direct',
      reason: 'open in the workspace'
    })
  })

  it('reports coverage in terms of the words themselves', () => {
    const covered = compileContextPacket({ query: 'pathos émotions' }, deps).coverage
    expect(covered.verdict).toBe('covered')
    expect(covered.missingTerms).toEqual([])

    // the vault has "pathos" but nothing about Wikidata — the exact
    // branch CP-MVP-011's external half will take
    const thin = compileContextPacket({ query: 'pathos wikidata' }, deps).coverage
    expect(thin.verdict).toBe('thin')
    expect(thin.missingTerms).toEqual(['wikidata'])

    const empty = compileContextPacket({ query: 'zzzunknown' }, deps).coverage
    expect(empty).toMatchObject({ verdict: 'empty', matchedTerms: [], missingTerms: ['zzzunknown'] })
  })

  it('is bounded, and every omission carries its reason', () => {
    const packet = compileContextPacket({ query: 'crédibilité pathos', maxTokens: 20 }, deps)

    expect(packet.retrieval.contextTokens).toBeLessThanOrEqual(20)
    expect(packet.entries.length).toBeGreaterThan(0)
    expect(packet.omitted.length).toBeGreaterThan(0)
    expect(packet.omitted.every((entry) => entry.reason === 'budget')).toBe(true)
    // the diagnostics are the contract, not a debug aid
    expect(packet.retrieval.candidates).toBeGreaterThan(packet.retrieval.selected)
  })

  it('drops entries outside the scope folder as scope omissions', () => {
    const packet = compileContextPacket(
      { query: 'crédibilité', scope: { folder: 'projects' } },
      deps
    )
    expect(paths(packet.entries).every((path) => path.startsWith('projects/'))).toBe(true)
    expect(packet.omitted.some((entry) => entry.reason === 'scope')).toBe(true)
  })

  it('never lists the same note twice, whichever stage found it', () => {
    const packet = compileContextPacket(
      { query: 'pathos', scope: { paths: ['concepts/pathos.md'] } },
      deps
    )
    expect(new Set(paths(packet.entries)).size).toBe(packet.entries.length)
    expect(packet.omitted.some((entry) => entry.reason === 'duplicate')).toBe(true)
  })

  it('can be asked for no expansion at all', () => {
    const packet = compileContextPacket({ query: 'crédibilité', hops: 0 }, deps)
    expect(packet.retrieval.stages).not.toContain('link')
    expect(paths(packet.entries)).not.toContain('concepts/pathos.md')
  })

  it('is JSON-safe: it crosses IPC', () => {
    const packet = compileContextPacket({ query: 'crédibilité' }, deps)
    expect(JSON.parse(JSON.stringify(packet))).toEqual(packet)
  })
})

describe('toPacketRequest (main-side validation, 13)', () => {
  it('accepts a well-formed request and bounds its numbers', () => {
    expect(
      toPacketRequest({ query: '  ethos  ', maxTokens: 1e9, hops: 7, limit: 0 })
    ).toEqual({ query: 'ethos', maxTokens: 32_000, hops: 3, limit: 1 })
  })

  it('rejects a missing or oversized query, and a traversing scope', () => {
    expect(() => toPacketRequest(null)).toThrow()
    expect(() => toPacketRequest({})).toThrow()
    expect(() => toPacketRequest({ query: '   ' })).toThrow()
    expect(() => toPacketRequest({ query: 'x'.repeat(600) })).toThrow()
    expect(() => toPacketRequest({ query: 'ok', scope: { folder: '../secrets' } })).toThrow()
    expect(() => toPacketRequest({ query: 'ok', scope: { folder: '/etc' } })).toThrow()
  })

  it('filters rung-0 paths instead of trusting them', () => {
    const request = toPacketRequest({
      query: 'ok',
      scope: { paths: ['notes/a.md', '../escape.md', '.hidden/x.md', 42] }
    })
    expect(request.scope?.paths).toEqual(['notes/a.md'])
  })
})
