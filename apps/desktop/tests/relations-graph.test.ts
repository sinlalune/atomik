/**
 * Relations strip geometry (CP-MVP-009 S07) — the 1-hop neighbourhood
 * as pure data: direction doctrine (`{^label}` flips the reading, not
 * the storage), dedupe with counts, and a deterministic layout with no
 * stored positions.
 */
import { describe, expect, it } from 'vitest'
import { buildGraphIndex } from '../shared/graph-core'
import {
  CENTER_W,
  NODE_W,
  filterNeighborhood,
  kindsPresent,
  layoutRelations,
  neighborhoodOf,
  relationsSummary
} from '../renderer/src/vault/relations-graph'

const FILES = [
  {
    path: "L'ethos.md",
    content:
      "# L'ethos\n\n[[crédibilité]]{repose-sur}\n[[ghost]]\n[web](https://example.org){cite}\n[[L'ethos]]{self}"
  },
  {
    path: 'pathos.md',
    content: '# Le pathos\n\n[[crédibilité]]{repose-sur} et encore [[crédibilité]]{repose-sur}'
  },
  {
    path: 'crédibilité.md',
    content: '## La crédibilité\n\n[[aristote]]{cite}\n[[pathos]]{^illustre}\n[[sources/pdf/rhet/index.md]]'
  },
  { path: 'aristote.md', content: '# Aristote' },
  { path: 'sources/pdf/rhet/index.md', content: '# Rhétorique' }
]

const index = buildGraphIndex(FILES)

describe('neighborhoodOf', () => {
  const hood = neighborhoodOf(index, 'crédibilité.md')

  it('centers on the note, titled by its first heading (## counts)', () => {
    expect(hood.center).toEqual({
      path: 'crédibilité.md',
      title: 'La crédibilité',
      kind: 'note'
    })
  })

  it('inbound = notes pointing here, labelled as authored, deduped with counts', () => {
    expect(hood.inbound.map((l) => [l.path, l.label, l.count])).toEqual([
      ['pathos.md', 'illustre', 1],
      ["L'ethos.md", 'repose-sur', 1],
      ['pathos.md', 'repose-sur', 2]
    ])
  })

  it('outbound carries the note kind of the target', () => {
    expect(hood.outbound.map((l) => [l.path, l.label, l.kind])).toEqual([
      ['aristote.md', 'cite', 'note'],
      ['sources/pdf/rhet/index.md', null, 'pdf']
    ])
  })

  it('`{^label}` flips the reading, not the storage', () => {
    // crédibilité WRITES [[pathos]]{^illustre}; the assertion reads
    // "pathos illustre crédibilité" — so it is INBOUND here and
    // OUTBOUND from pathos, though only crédibilité's file holds it.
    expect(hood.inbound.map((l) => [l.path, l.label])).toContainEqual([
      'pathos.md',
      'illustre'
    ])
    const fromPathos = neighborhoodOf(index, 'pathos.md')
    expect(fromPathos.outbound.map((l) => [l.path, l.label])).toContainEqual([
      'crédibilité.md',
      'illustre'
    ])
    expect(fromPathos.inbound.map((l) => l.label)).not.toContain('illustre')
  })

  it('untyped links sort last but are never dropped', () => {
    expect(hood.outbound.at(-1)?.label).toBeNull()
  })

  it('unresolved and self edges draw no node; an EXTERNAL one does (S07d)', () => {
    const ethos = neighborhoodOf(index, "L'ethos.md")
    // [[ghost]] (unresolved) and [[L'ethos]] (self) are absent;
    // the http target is a neighbour of its own, titled by its host.
    expect(ethos.outbound.map((l) => l.path)).toEqual([
      'https://example.org',
      'crédibilité.md'
    ])
    expect(ethos.outbound[0]).toMatchObject({
      title: 'example.org',
      kind: 'web',
      external: true,
      label: 'cite'
    })
    expect(ethos.inbound).toEqual([])
  })

  it('an external target only counts for the note that WRITES it', () => {
    // nothing points AT a URL: it has no inbound side anywhere else
    expect(neighborhoodOf(index, 'pathos.md').outbound.every((l) => !l.external)).toBe(
      true
    )
  })

  it('an unknown path is an honest empty neighbourhood', () => {
    const orphan = neighborhoodOf(index, 'nowhere/absent.md')
    expect(orphan).toMatchObject({
      center: { path: 'nowhere/absent.md', title: 'absent', kind: 'note' },
      inbound: [],
      outbound: []
    })
  })
})

describe('relationsSummary', () => {
  it('counts every written relation, not just distinct neighbours', () => {
    expect(relationsSummary(neighborhoodOf(index, 'crédibilité.md'))).toBe(
      '4 in · 2 out'
    )
  })

  it('speaks plainly when the note has no edges', () => {
    expect(relationsSummary(neighborhoodOf(index, 'aristote.md'))).toBe('1 in · 0 out')
    expect(relationsSummary(neighborhoodOf(index, 'nowhere.md'))).toBe(
      'no relations yet'
    )
  })
})

describe('the kind filter (S07b)', () => {
  const hood = neighborhoodOf(index, 'crédibilité.md')

  it('offers only the kinds actually present, most numerous first', () => {
    // pathos + L'ethos inbound, aristote outbound = 3 distinct notes
    expect(kindsPresent(hood)).toEqual([
      { kind: 'note', count: 3 },
      { kind: 'pdf', count: 1 }
    ])
  })

  it('counts NEIGHBOURS, not relations (pathos is related twice)', () => {
    const notes = kindsPresent(hood).find((k) => k.kind === 'note')!
    // 4 note-kind RELATIONS inbound+outbound, but only 3 note NEIGHBOURS
    expect(notes.count).toBe(3)
    expect(
      [...hood.inbound, ...hood.outbound].filter((l) => l.kind === 'note')
    ).toHaveLength(4)
  })

  it('hiding a kind drops it from both columns, index untouched', () => {
    const shown = filterNeighborhood(hood, new Set(['pdf']))
    expect(shown.outbound.map((l) => l.path)).toEqual(['aristote.md'])
    expect(shown.inbound).toHaveLength(3)
    expect(hood.outbound).toHaveLength(2)
  })

  it('hiding nothing returns the very same object (no needless re-layout)', () => {
    expect(filterNeighborhood(hood, new Set())).toBe(hood)
  })

  it('an unknown kind in the param hides nothing', () => {
    expect(filterNeighborhood(hood, new Set(['nonsense']))).toEqual(hood)
  })

  it('the bar keeps the WHOLE truth and says how many are hidden', () => {
    const shown = filterNeighborhood(hood, new Set(['pdf']))
    expect(relationsSummary(hood, shown)).toBe('4 in · 2 out · 1 hidden')
    expect(relationsSummary(hood, hood)).toBe('4 in · 2 out')
  })
})

describe('layoutRelations', () => {
  const hood = neighborhoodOf(index, 'crédibilité.md')
  const layout = layoutRelations(hood, 1000)

  it('places the note in the middle, inbound left, outbound right', () => {
    expect(layout.center.x).toBe(500)
    const left = layout.nodes.filter((n) => n.side === 'left')
    const right = layout.nodes.filter((n) => n.side === 'right')
    // pathos is related twice (illustre + repose-sur ×2): ONE chip.
    expect(left.map((n) => n.path)).toEqual(['pathos.md', "L'ethos.md"])
    expect(right).toHaveLength(2)
    for (const node of left) expect(node.x).toBeLessThan(layout.center.x - CENTER_W / 2)
    for (const node of right) expect(node.x).toBeGreaterThan(layout.center.x + CENTER_W / 2)
  })

  it('keeps every chip inside the figure', () => {
    for (const node of layout.nodes) {
      expect(node.x - NODE_W / 2).toBeGreaterThanOrEqual(0)
      expect(node.x + NODE_W / 2).toBeLessThanOrEqual(layout.width)
      expect(node.y).toBeGreaterThan(0)
      expect(node.y).toBeLessThan(layout.height)
    }
  })

  it('never overlaps two chips of the same column', () => {
    const ys = layout.nodes.filter((n) => n.side === 'left').map((n) => n.y)
    expect(Math.abs(ys[0]! - ys[1]!)).toBeGreaterThanOrEqual(24)
  })

  it('draws one connector per NEIGHBOUR, in reading order, labels merged', () => {
    expect(layout.links).toHaveLength(4)
    const toPathos = layout.links.find((l) => l.path === 'pathos.md')!
    expect(toPathos.labels).toEqual([
      { label: 'illustre', count: 1 },
      { label: 'repose-sur', count: 2 }
    ])
    const inbound = layout.links.find((l) => l.direction === 'in')!
    // inbound starts at the neighbour and ENDS on the centre node
    expect(inbound.d.endsWith(`${layout.center.x - CENTER_W / 2} ${layout.center.y}`)).toBe(
      true
    )
    const outbound = layout.links.find((l) => l.direction === 'out')!
    expect(
      outbound.d.startsWith(`M ${layout.center.x + CENTER_W / 2} ${layout.center.y}`)
    ).toBe(true)
  })

  it('is deterministic — same index, same picture', () => {
    expect(layoutRelations(hood, 1000)).toEqual(layout)
  })

  it('a narrow pane keeps a usable minimum width', () => {
    const narrow = layoutRelations(hood, 120)
    expect(narrow.width).toBeGreaterThanOrEqual(NODE_W * 2 + CENTER_W)
  })

  it('an empty neighbourhood still has a positive box (the caller shows the empty state)', () => {
    const empty = layoutRelations(neighborhoodOf(index, 'nowhere.md'), 1000)
    expect(empty.links).toEqual([])
    expect(empty.nodes).toHaveLength(1)
    expect(empty.height).toBeGreaterThan(0)
  })
})

describe('doors (S07d: a chip opens what it actually is)', () => {
  const BUNDLE = [
    {
      path: 'sources/web/curlew/source.md',
      content:
        '---\ntitle: "Curlew sandpiper - Wikipedia"\n---\n\n# Source dossier\n\n[Original URL](https://en.wikipedia.org/wiki/Curlew_sandpiper)\n[Local snapshot](<./snapshot.mhtml>)\n[Reader text](<./reader.md>)\n'
    },
    { path: 'sources/web/curlew/reader.md', content: '# Reader text\n' },
    { path: 'sources/web/curlew/snapshot.mhtml' },
    { path: 'stray.pdf' },
    { path: 'notes/birds.md', content: '# Birds\n\n[a pdf](<../stray.pdf>)\n' }
  ]
  const bundleIndex = buildGraphIndex(BUNDLE)
  const dossier = neighborhoodOf(bundleIndex, 'sources/web/curlew/source.md')
  const at = (path: string) =>
    [...dossier.inbound, ...dossier.outbound].find((l) => l.path === path)!

  it('a markdown form opens as a note', () => {
    expect(at('sources/web/curlew/reader.md')).toMatchObject({
      door: 'note',
      target: 'sources/web/curlew/reader.md'
    })
  })

  it('a sibling of the SAME bundle shows its form alone', () => {
    // inside the dossier the centre already names the source, so the
    // chip reads "reader text", not "Curlew sandpip… | reader text"
    expect(at('sources/web/curlew/reader.md').title).toBe('reader text')
    expect(at('sources/web/curlew/reader.md').form).toBeUndefined()
    // from OUTSIDE the bundle the same node carries name + form
    const fromNote = neighborhoodOf(
      buildGraphIndex([
        ...BUNDLE,
        {
          path: 'notes/ref.md',
          content: '# Ref\n\n[d](<../sources/web/curlew/source.md>)\n'
        }
      ]),
      'notes/ref.md'
    ).outbound[0]!
    expect(fromNote).toMatchObject({
      title: 'Curlew sandpiper - Wikipedia',
      form: 'dossier'
    })
  })

  it('a snapshot opens through its BUNDLE, not as a note', () => {
    expect(at('sources/web/curlew/snapshot.mhtml')).toMatchObject({
      door: 'source',
      target: 'sources/web/curlew/source.md',
      title: 'snapshot'
    })
  })

  it('the original URL opens in a web tab', () => {
    expect(at('https://en.wikipedia.org/wiki/Curlew_sandpiper')).toMatchObject({
      door: 'web',
      target: 'https://en.wikipedia.org/wiki/Curlew_sandpiper',
      title: 'en.wikipedia.org/wiki/Curlew_sandpiper'
    })
  })

  it('a non-markdown file outside any bundle falls back to itself', () => {
    const birds = neighborhoodOf(bundleIndex, 'notes/birds.md')
    expect(birds.outbound[0]).toMatchObject({ door: 'source', target: 'stray.pdf' })
  })

  it('the layout carries the door to the chip', () => {
    const placed = layoutRelations(dossier, 1000)
    const snapshot = placed.nodes.find((n) => n.path.endsWith('.mhtml'))!
    expect(snapshot).toMatchObject({
      door: 'source',
      target: 'sources/web/curlew/source.md'
    })
    expect(placed.center).toMatchObject({ door: 'note' })
  })
})
