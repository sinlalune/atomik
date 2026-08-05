/**
 * Edge grammar (CP-MVP-009 S02, ADR-011) — the session-A collision
 * suite as executable law, plus round-trip and scan-position checks.
 */
import { describe, expect, it } from 'vitest'
import {
  matchDecorationAt,
  matchMdLinkAt,
  matchWikilinkAt,
  normalizeLabel,
  parseEdges,
  serializeWikilink
} from '../shared/edge-grammar'

describe('matchWikilinkAt', () => {
  it('parses a typed wikilink: [[attention]]{normalizes}', () => {
    const m = matchWikilinkAt('[[attention]]{normalizes}', 0)
    expect(m).toEqual({
      target: 'attention',
      decoration: { label: 'normalizes', reverse: false },
      length: '[[attention]]{normalizes}'.length
    })
  })

  it('parses a reverse decoration: [[attention]]{^part-of}', () => {
    const m = matchWikilinkAt('[[attention]]{^part-of}', 0)
    expect(m?.decoration).toEqual({ label: 'part-of', reverse: true })
  })

  it('adjacency is strict: a space before the brace makes it prose', () => {
    const m = matchWikilinkAt('[[attention]] {normalizes}', 0)
    expect(m?.decoration).toBeNull()
    expect(m?.length).toBe('[[attention]]'.length)
  })

  it('rejects {<label} (HTML-escape trap) — link survives untyped', () => {
    const m = matchWikilinkAt('[[attention]]{<part-of}', 0)
    expect(m?.decoration).toBeNull()
  })

  it('rejects non-kebab labels: {Part Of} stays prose', () => {
    const m = matchWikilinkAt('[[attention]]{Part Of}', 0)
    expect(m?.decoration).toBeNull()
  })

  it('rejects pandoc-attr form {.label} on the dot', () => {
    const m = matchWikilinkAt('[[attention]]{.label}', 0)
    expect(m?.decoration).toBeNull()
  })

  it('rejects empty, newline, and nested targets', () => {
    expect(matchWikilinkAt('[[]]', 0)).toBeNull()
    expect(matchWikilinkAt('[[a\nb]]', 0)).toBeNull()
    expect(matchWikilinkAt('[[a [[b]]', 0)).toBeNull()
    expect(matchWikilinkAt('[[unclosed', 0)).toBeNull()
  })
})

describe('matchDecorationAt', () => {
  it('parses {label} and {^label}', () => {
    expect(matchDecorationAt('{part-of}', 0)).toEqual({
      label: 'part-of',
      reverse: false,
      length: 9
    })
    expect(matchDecorationAt('{^part-of}', 0)).toEqual({
      label: 'part-of',
      reverse: true,
      length: 10
    })
  })

  it('rejects empty, caret-only, and multiline groups', () => {
    expect(matchDecorationAt('{}', 0)).toBeNull()
    expect(matchDecorationAt('{^}', 0)).toBeNull()
    expect(matchDecorationAt('{a\nb}', 0)).toBeNull()
    expect(matchDecorationAt('{unclosed', 0)).toBeNull()
  })
})

describe('matchMdLinkAt', () => {
  it('parses a decorated md link: [att](x.md){grounded-at}', () => {
    const m = matchMdLinkAt('[att](x.md){grounded-at}', 0)
    expect(m).toEqual({
      text: 'att',
      target: 'x.md',
      decoration: { label: 'grounded-at', reverse: false },
      length: '[att](x.md){grounded-at}'.length
    })
  })

  it('leaves undecorated md links untyped', () => {
    expect(matchMdLinkAt('[att](x.md) next', 0)?.decoration).toBeNull()
  })

  it('never matches a wikilink opener', () => {
    expect(matchMdLinkAt('[[att]]', 0)).toBeNull()
  })
})

describe('serializeWikilink', () => {
  it('round-trips through matchWikilinkAt', () => {
    for (const deco of [
      null,
      { label: 'normalizes', reverse: false },
      { label: 'part-of', reverse: true }
    ]) {
      const s = serializeWikilink('attention', deco)
      const m = matchWikilinkAt(s, 0)
      expect(m?.target).toBe('attention')
      expect(m?.decoration).toEqual(deco)
      expect(m?.length).toBe(s.length)
    }
  })
})

describe('normalizeLabel', () => {
  it('kebab-normalizes the owner vocabulary', () => {
    expect(normalizeLabel('Part of')).toBe('part-of')
    expect(normalizeLabel('définit')).toBe('definit')
    expect(normalizeLabel('  weird__Stuff  ')).toBe('weird-stuff')
    expect(normalizeLabel('---')).toBe('')
  })
})

describe('parseEdges (document scan)', () => {
  it('finds wikilinks and md links with positions, typed and untyped', () => {
    const doc = 'See [[attention]]{normalizes} and [paper](x.md).\nAlso [[query]].'
    const edges = parseEdges(doc)
    expect(edges.map((e) => [e.kind, e.target, e.decoration?.label ?? null])).toEqual([
      ['wikilink', 'attention', 'normalizes'],
      ['md-link', 'x.md', null],
      ['wikilink', 'query', null]
    ])
    expect(edges[0]).toMatchObject({ line: 1, col: 4, start: 4 })
    expect(edges[2]).toMatchObject({ line: 2, col: 5 })
    expect(doc.slice(edges[0]!.start, edges[0]!.end)).toBe('[[attention]]{normalizes}')
  })

  it('skips fenced blocks, inline code, and images', () => {
    const doc = [
      '```',
      '[[in-fence]]',
      '```',
      'code `[[in-code]]` after',
      '![alt](img.png){label}',
      '[[real]]'
    ].join('\n')
    expect(parseEdges(doc).map((e) => e.target)).toEqual(['real'])
  })

  it('two links on one line both scan, decoration boundaries exact', () => {
    const doc = '[[a]]{x-y}[[b]]{^z}'
    const edges = parseEdges(doc)
    expect(edges).toHaveLength(2)
    expect(edges[1]).toMatchObject({
      target: 'b',
      decoration: { label: 'z', reverse: true },
      start: '[[a]]{x-y}'.length
    })
  })
})

describe('angle-bracketed destinations (owner bench round 5 — the @ menu form)', () => {
  it('unwraps <path> exactly like the read renderer', () => {
    const m = matchMdLinkAt('[2026-07-24-hello](<chats/2026-07-24-hello.md>)', 0)
    expect(m?.target).toBe('chats/2026-07-24-hello.md')
    expect(m?.length).toBe('[2026-07-24-hello](<chats/2026-07-24-hello.md>)'.length)
  })

  it('unwraps accented and spaced destinations', () => {
    expect(matchMdLinkAt('[c](<crédibilité.md>)', 0)?.target).toBe('crédibilité.md')
    expect(matchMdLinkAt('[a](<my note.md>)', 0)?.target).toBe('my note.md')
  })

  it('keeps decorations working after an angle-bracketed link', () => {
    const m = matchMdLinkAt('[c](<crédibilité.md>){definit}', 0)
    expect(m?.target).toBe('crédibilité.md')
    expect(m?.decoration).toEqual({ label: 'definit', reverse: false })
  })

  it('parseEdges carries the unwrapped target', () => {
    const edges = parseEdges('[h](<chats/2026-07-24-hello.md>)\nnext')
    expect(edges[0]?.target).toBe('chats/2026-07-24-hello.md')
  })
})
