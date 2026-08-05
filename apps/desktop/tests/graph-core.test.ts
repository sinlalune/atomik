/**
 * Graph core (CP-MVP-009 S06) — the index as a pure, deterministic
 * projection: nodes with H1 titles, nearest-wins edge resolution,
 * label registry, broken diagnostics.
 */
import { describe, expect, it } from 'vitest'
import {
  buildGraphIndex,
  vocabularyOf,
  wikiCandidatesFor
} from '../shared/graph-core'

const FILES = [
  { path: "L'ethos.md", content: "# L'ethos\n\n[[fiabilité]]{repose-sur} et [crédibilité](<crédibilité.md>){definit}\n[[ghost]]\n[web](https://example.org)" },
  { path: 'fiabilité.md', content: '# La fiabilité\n\ncorps' },
  { path: 'crédibilité.md', content: 'sans titre' },
  { path: 'philosophy/ethos-notes.md', content: '# Notes\n\n[[fiabilité]]{part-of}' },
  { path: 'sources/web/curlew/source.md', content: '# curlew dossier' },
  { path: 'sources/web/curlew/index.md', content: '# curlew' }
]

describe('buildGraphIndex', () => {
  const index = buildGraphIndex(FILES)

  it('nodes carry kind and H1 title (stem fallback)', () => {
    const byPath = Object.fromEntries(index.nodes.map((n) => [n.path, n]))
    expect(byPath["L'ethos.md"]).toMatchObject({ kind: 'note', title: "L'ethos" })
    expect(byPath['fiabilité.md']!.title).toBe('La fiabilité')
    expect(byPath['crédibilité.md']!.title).toBe('crédibilité')
    expect(byPath['sources/web/curlew/source.md']!.kind).toBe('web')
  })

  it('edges resolve: wiki by stem, md by relative path (angle form ok)', () => {
    const ethos = index.edges.filter((e) => e.subject === "L'ethos.md")
    expect(ethos.map((e) => [e.targetRaw, e.object, e.label])).toEqual([
      ['fiabilité', 'fiabilité.md', 'repose-sur'],
      ['crédibilité.md', 'crédibilité.md', 'definit'],
      ['ghost', null, null],
      ['https://example.org', null, null]
    ])
  })

  it('labels count vault-wide; broken lists only real misses', () => {
    expect(index.labels).toEqual({ definit: 1, 'part-of': 1, 'repose-sur': 1 })
    expect(index.broken).toEqual([
      { subject: "L'ethos.md", targetRaw: 'ghost', line: 4 }
    ])
  })

  it('is deterministic: same files → byte-identical JSON', () => {
    expect(JSON.stringify(buildGraphIndex(FILES))).toBe(
      JSON.stringify(buildGraphIndex([...FILES].reverse()))
    )
  })
})

describe('wikiCandidatesFor', () => {
  const nodes = buildGraphIndex(FILES).nodes

  it('orders nearest-first and excludes self + bundle contracts', () => {
    const names = wikiCandidatesFor('philosophy/ethos-notes.md', nodes).map(
      (c) => c.relPath
    )
    expect(names[0]).not.toBe('philosophy/ethos-notes.md')
    expect(names).not.toContain('sources/web/curlew/source.md')
    expect(names).not.toContain('sources/web/curlew/index.md')
    expect(names).toContain("L'ethos.md")
  })

  it('carries titles when they differ from the stem', () => {
    const fiab = wikiCandidatesFor("L'ethos.md", nodes).find(
      (c) => c.relPath === 'fiabilité.md'
    )
    expect(fiab?.title).toBe('La fiabilité')
  })
})

describe('vocabularyOf', () => {
  it('most-used first, ties alphabetical', () => {
    const index = buildGraphIndex([
      { path: 'a.md', content: '[[b]]{x} [[b]]{x} [[b]]{aa}' },
      { path: 'b.md', content: '# B' }
    ])
    expect(vocabularyOf(index)).toEqual(['x', 'aa'])
  })
})
