/**
 * Graph core (CP-MVP-009 S06) — the index as a pure, deterministic
 * projection: nodes with H1 titles, nearest-wins edge resolution,
 * label registry, broken diagnostics.
 */
import { describe, expect, it } from 'vitest'
import {
  buildGraphIndex,
  frontmatterTitleOf,
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

describe('source bundles (S07d: the source name and its forms)', () => {
  const BUNDLE = [
    {
      path: 'sources/web/curlew/source.md',
      content:
        '---\ntype: Atomik Source\ntitle: "Curlew sandpiper - Wikipedia"\noriginal_url: https://en.wikipedia.org/wiki/Curlew_sandpiper\n---\n\n# Source dossier\n\n- [Original URL](https://en.wikipedia.org/wiki/Curlew_sandpiper) — accessed\n- [Local snapshot](<./snapshot.mhtml>) — the page as rendered.\n- [Reader text](<./reader.md>)\n'
    },
    {
      path: 'sources/web/curlew/index.md',
      content: '---\ntitle: "Curlew sandpiper - Wikipedia"\n---\n\n# Curlew sandpiper - Wikipedia\n'
    },
    { path: 'sources/web/curlew/reader.md', content: '# Reader text — derived\n' },
    { path: 'sources/web/curlew/snapshot.mhtml' },
    { path: 'sources/web/curlew/media/a1b2.jpg' },
    { path: 'notes/birds.md', content: '# Birds\n\n[curlew](<../sources/web/curlew/source.md>){cite}\n' }
  ]
  const index = buildGraphIndex(BUNDLE)
  const at = (path: string) => index.nodes.find((n) => n.path === path)!

  it('every file of a bundle wears the SOURCE name, with its own form', () => {
    expect(at('sources/web/curlew/source.md')).toMatchObject({
      title: 'Curlew sandpiper - Wikipedia',
      form: 'dossier'
    })
    expect(at('sources/web/curlew/reader.md')).toMatchObject({
      title: 'Curlew sandpiper - Wikipedia',
      form: 'reader text'
    })
    expect(at('sources/web/curlew/index.md')!.form).toBe('index')
  })

  it('the name comes from the dossier FRONTMATTER, not its generic H1', () => {
    expect(at('sources/web/curlew/source.md')!.title).not.toBe('Source dossier')
  })

  it('non-markdown files are nodes too — the snapshot and the media', () => {
    expect(at('sources/web/curlew/snapshot.mhtml')).toMatchObject({
      title: 'Curlew sandpiper - Wikipedia',
      form: 'snapshot'
    })
    expect(at('sources/web/curlew/media/a1b2.jpg')!.form).toBe('media')
    // they carry no edges of their own
    expect(index.edges.some((e) => e.subject.endsWith('.mhtml'))).toBe(false)
  })

  it('the snapshot link now RESOLVES to that node (it used to vanish)', () => {
    const toSnapshot = index.edges.find((e) => e.targetRaw.includes('snapshot'))!
    expect(toSnapshot.object).toBe('sources/web/curlew/snapshot.mhtml')
  })

  it("a PDF bundle's original is the form 'original', extension dropped", () => {
    const pdf = buildGraphIndex([
      {
        path: 'sources/pdf/mml-book/source.md',
        content: '---\ntitle: mml-book\n---\n\n# Source dossier\n\n[the original](<./original.pdf>)\n'
      },
      { path: 'sources/pdf/mml-book/original.pdf' }
    ])
    expect(pdf.nodes.find((n) => n.path.endsWith('.pdf'))).toMatchObject({
      title: 'mml-book',
      form: 'original',
      kind: 'pdf'
    })
  })

  it('an ordinary note keeps its heading as title, with no form', () => {
    expect(at('notes/birds.md')).toEqual({
      path: 'notes/birds.md',
      kind: 'note',
      title: 'Birds'
    })
  })

  it('a wikilink still resolves to NOTES only', () => {
    const names = wikiCandidatesFor('notes/birds.md', index.nodes).map((c) => c.relPath)
    expect(names).not.toContain('sources/web/curlew/snapshot.mhtml')
    expect(names).not.toContain('sources/web/curlew/media/a1b2.jpg')
  })

  it('rebuilds byte-identical (the projection rule, 03)', () => {
    expect(JSON.stringify(buildGraphIndex(BUNDLE))).toBe(JSON.stringify(index))
  })
})

describe('frontmatterTitleOf', () => {
  it('reads quoted, bare, and absent titles', () => {
    expect(frontmatterTitleOf('---\ntitle: "A - B"\n---\nbody')).toBe('A - B')
    expect(frontmatterTitleOf("---\ntitle: Plain name\n---\n")).toBe('Plain name')
    expect(frontmatterTitleOf('---\ntype: Note\n---\n')).toBeNull()
    expect(frontmatterTitleOf('# No frontmatter')).toBeNull()
    expect(frontmatterTitleOf('---\ntitle:   \n---\n')).toBeNull()
  })
})
