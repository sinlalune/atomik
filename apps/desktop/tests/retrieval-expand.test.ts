import { describe, expect, it } from 'vitest'
import { buildGraphIndex } from '../shared/graph-core'
import {
  adjacencyOf,
  expandOverGraph,
  explainStep,
  type ExpansionStep
} from '../shared/retrieval-expand'

/**
 * Link expansion (CP-MVP-010 S04) — the stage that turns a list of hits
 * into a neighbourhood. Pure, so the rules that matter (direction,
 * labels, decay, budget, determinism) are pinned here rather than by
 * running the app.
 */

const VAULT = [
  {
    path: 'ethos.md',
    content:
      "# L'éthos\n\nLa crédibilité. [[pathos]]{oppose-a} et [[rhetorique]]\n" +
      'Voir aussi [le site](https://example.org) et [[ghost]]\n'
  },
  { path: 'pathos.md', content: '# Pathos\n\n[[emotion]]{repose-sur}\n' },
  { path: 'emotion.md', content: '# Émotion\n' },
  { path: 'rhetorique.md', content: '# Rhétorique\n' },
  { path: 'orphan.md', content: '# Orphelin\n' }
]

const index = buildGraphIndex(VAULT)
const paths = (nodes: { path: string }[]): string[] => nodes.map((node) => node.path)

describe('adjacency', () => {
  it('walks resolved internal edges both ways and drops the rest', () => {
    const adjacency = adjacencyOf(index)
    expect(adjacency.get('ethos.md')?.map((entry) => entry.to).sort()).toEqual([
      'pathos.md',
      'rhetorique.md'
    ])
    // the http link and the unresolved [[ghost]] are not vault material
    expect(adjacency.has('https://example.org')).toBe(false)
    expect(adjacency.has('ghost')).toBe(false)
    // an edge is stored once but reads both ways
    expect(adjacency.get('pathos.md')?.find((entry) => entry.to === 'ethos.md')).
      toMatchObject({ direction: 'inbound', label: 'oppose-a' })
  })
})

describe('expansion', () => {
  it('returns the neighbours of a seed, never the seed itself', () => {
    const expanded = expandOverGraph(index, [{ path: 'ethos.md', score: 1 }])
    expect(paths(expanded)).toEqual(['pathos.md', 'rhetorique.md'])
    expect(paths(expanded)).not.toContain('ethos.md')
    expect(expanded.every((node) => node.hop === 1)).toBe(true)
  })

  it('ranks a typed edge above an untyped one', () => {
    const [first, second] = expandOverGraph(index, [{ path: 'ethos.md', score: 1 }])
    expect(first!.path).toBe('pathos.md') // {oppose-a}
    expect(second!.path).toBe('rhetorique.md') // bare [[link]]
    expect(first!.score).toBeGreaterThan(second!.score)
  })

  it('honours per-label weights — the vocabulary is data, not doctrine', () => {
    const expanded = expandOverGraph(
      index,
      [{ path: 'ethos.md', score: 1 }],
      { labelWeights: { 'oppose-a': 0.1 } }
    )
    expect(paths(expanded)[0]).toBe('rhetorique.md')
  })

  it('attenuates per hop and records the distance', () => {
    const oneHop = expandOverGraph(index, [{ path: 'ethos.md', score: 1 }], { hops: 1 })
    expect(paths(oneHop)).not.toContain('emotion.md')

    const twoHops = expandOverGraph(index, [{ path: 'ethos.md', score: 1 }], { hops: 2 })
    const emotion = twoHops.find((node) => node.path === 'emotion.md')!
    expect(emotion.hop).toBe(2)
    expect(emotion.score).toBeLessThan(
      twoHops.find((node) => node.path === 'pathos.md')!.score
    )
  })

  it('sums contributions from several seeds and explains the strongest', () => {
    const expanded = expandOverGraph(index, [
      { path: 'ethos.md', score: 1 },
      { path: 'emotion.md', score: 1 }
    ])
    const pathos = expanded.find((node) => node.path === 'pathos.md')!
    // reached from BOTH seeds, so it outranks a single-seed neighbour
    expect(pathos.score).toBeGreaterThan(
      expanded.find((node) => node.path === 'rhetorique.md')!.score
    )
    expect(pathos.via.from === 'ethos.md' || pathos.via.from === 'emotion.md').toBe(true)
  })

  it('respects the budget and is deterministic', () => {
    const options = { hops: 2, limit: 2 }
    const first = expandOverGraph(index, [{ path: 'ethos.md', score: 1 }], options)
    const again = expandOverGraph(index, [{ path: 'ethos.md', score: 1 }], options)
    expect(first).toHaveLength(2)
    expect(again).toEqual(first)
  })

  it('answers empty for no seeds, no hops, or an isolated note', () => {
    expect(expandOverGraph(index, [])).toEqual([])
    expect(expandOverGraph(index, [{ path: 'ethos.md', score: 1 }], { hops: 0 })).toEqual([])
    expect(expandOverGraph(index, [{ path: 'orphan.md', score: 1 }])).toEqual([])
  })
})

describe('explaining a step', () => {
  const step = (over: Partial<ExpansionStep>): ExpansionStep => ({
    from: 'ethos.md',
    label: null,
    direction: 'outbound',
    ...over
  })

  it('reads the label in the direction it was travelled', () => {
    expect(explainStep(step({ label: 'oppose-a' }), "L'éthos")).toBe("L'éthos · oppose-a")
    expect(explainStep(step({ label: 'oppose-a', direction: 'inbound' }), "L'éthos")).toBe(
      "oppose-a · L'éthos"
    )
    expect(explainStep(step({}), "L'éthos")).toBe("linked from L'éthos")
    expect(explainStep(step({ direction: 'inbound' }), "L'éthos")).toBe("links to L'éthos")
  })
})

describe('hubs (owner bench round 3, 2026-08-16)', () => {
  // The shape that produced the bug: one note links to everything, so a
  // weak match on it dragged AI, Le logos and Peloponnesian War into an
  // answer about XML.
  const HUB = [
    {
      path: 'vault-juju.md',
      content:
        '# vault-juju\n\n' +
        Array.from({ length: 30 }, (_, index) => `[[note-${index}]]`).join('\n') +
        '\n'
    },
    ...Array.from({ length: 30 }, (_, index) => ({
      path: `note-${index}.md`,
      content: `# Note ${index}\n`
    })),
    { path: 'xml.md', content: '# XML\n\n[[schema]]{defines}\n' },
    { path: 'schema.md', content: '# Schema\n' }
  ]
  const hubIndex = buildGraphIndex(HUB)

  it('a link from a hub is worth a fraction of a link from a focused note', () => {
    const fromHub = expandOverGraph(hubIndex, [{ path: 'vault-juju.md', score: 1 }])
    const fromFocused = expandOverGraph(hubIndex, [{ path: 'xml.md', score: 1 }])

    expect(fromFocused[0]!.path).toBe('schema.md')
    expect(fromHub[0]!.score).toBeLessThan(fromFocused[0]!.score / 4)
  })

  it('leaves a note with five links or fewer untouched', () => {
    const small = buildGraphIndex([
      { path: 'a.md', content: '# A\n\n[[b]]\n[[c]]\n' },
      { path: 'b.md', content: '# B\n' },
      { path: 'c.md', content: '# C\n' }
    ])
    const [first] = expandOverGraph(small, [{ path: 'a.md', score: 1 }])
    // untyped weight only: no hub penalty applied
    expect(first!.score).toBeCloseTo(0.8, 5)
  })
})
