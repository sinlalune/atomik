import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { ensureSyntaxTree } from '@codemirror/language'
import { EditorSelection, EditorState } from '@codemirror/state'
import { describe, expect, it } from 'vitest'
import type { LivePreviewKind } from '../renderer/src/editor/live-preview'
import {
  computeLivePreviewDecorations,
  frontmatterEnd,
  linkHrefAt,
  notePathFacet,
  parseTable,
  resolveEmbedPath,
  wikiCandidatesField
} from '../renderer/src/editor/live-preview'

type Deco = {
  from: number
  to: number
  kind: LivePreviewKind
  cls?: string
  edgeKind?: string
  edgeBroken?: boolean
}

/** Fully parses the doc (GFM base, like the editor), lists decorations. */
function decorate(doc: string, cursor = 0): Deco[] {
  const state = EditorState.create({
    doc,
    selection: EditorSelection.cursor(Math.min(cursor, doc.length)),
    extensions: [markdown({ base: markdownLanguage })]
  })
  ensureSyntaxTree(state, state.doc.length, 5000)
  const set = computeLivePreviewDecorations(state)
  const out: Deco[] = []
  const iter = set.iter()
  while (iter.value) {
    const spec = iter.value.spec as {
      lp: LivePreviewKind
      class?: string
      edgeKind?: string
      edgeBroken?: boolean
    }
    const deco: Deco = { from: iter.from, to: iter.to, kind: spec.lp }
    if (spec.class !== undefined) deco.cls = spec.class
    if (spec.edgeKind !== undefined) deco.edgeKind = spec.edgeKind
    if (spec.edgeBroken !== undefined) deco.edgeBroken = spec.edgeBroken
    out.push(deco)
    iter.next()
  }
  return out
}

const hidden = (decos: Deco[]): Deco[] =>
  decos.filter((deco) => deco.kind === 'hide' || deco.kind === 'bullet')

/** frontmatterEnd needs only the doc, not a finished parse. */
function decorateState(doc: string): EditorState {
  return EditorState.create({
    doc,
    extensions: [markdown({ base: markdownLanguage })]
  })
}

describe('live preview decorations (MVP-001: seamless editing)', () => {
  it('hides heading marks away from the cursor and sizes the line', () => {
    // Cursor on line 2 -> the heading's '# ' (0..2) is hidden.
    const doc = '# Title\n\nbody text\n'
    const decos = decorate(doc, doc.indexOf('body'))
    expect(decos).toContainEqual({ from: 0, to: 2, kind: 'hide' })
    expect(decos).toContainEqual({ from: 0, to: 0, kind: 'line', cls: 'lp-h1' })
  })

  it('reveals the syntax on the active line', () => {
    const doc = '# Title\n\nbody text\n'
    const onHeading = decorate(doc, 3) // cursor inside 'Title'
    expect(hidden(onHeading)).toEqual([])
    // the line still LOOKS like a heading while being edited
    expect(onHeading).toContainEqual({
      from: 0,
      to: 0,
      kind: 'line',
      cls: 'lp-h1'
    })
  })

  it('hides emphasis and inline-code marks, styles their content', () => {
    const doc = 'a **bold** and `code` here\n\nelsewhere\n'
    const decos = decorate(doc, doc.indexOf('elsewhere'))
    const boldOpen = doc.indexOf('**')
    const boldClose = doc.indexOf('**', boldOpen + 2)
    expect(decos).toContainEqual({ from: boldOpen, to: boldOpen + 2, kind: 'hide' })
    expect(decos).toContainEqual({
      from: boldClose,
      to: boldClose + 2,
      kind: 'hide'
    })
    expect(
      decos.some((deco) => deco.kind === 'mark' && deco.cls === 'lp-strong')
    ).toBe(true)
    const tick1 = doc.indexOf('`')
    const tick2 = doc.indexOf('`', tick1 + 1)
    expect(decos).toContainEqual({ from: tick1, to: tick1 + 1, kind: 'hide' })
    expect(decos).toContainEqual({ from: tick2, to: tick2 + 1, kind: 'hide' })
    expect(
      decos.some((deco) => deco.kind === 'mark' && deco.cls === 'lp-code')
    ).toBe(true)
  })

  it('collapses [text](url) into ONE edge pill away from the cursor (S05c)', () => {
    const doc = 'see [docs](https://example.org) now\n\nelsewhere\n'
    const decos = decorate(doc, doc.indexOf('elsewhere'))
    const linkEnd = doc.indexOf(')') + 1
    // the whole link is one edge replace — NO decorations nest inside
    // it (nested replaces corrupted CM's incremental redraw, S05c)
    expect(decos).toContainEqual(
      expect.objectContaining({ from: 4, to: linkEnd, kind: 'edge' })
    )
    expect(
      decos.some(
        (deco) => deco.kind === 'hide' && deco.from >= 4 && deco.to <= linkEnd
      )
    ).toBe(false)
  })

  it('replaces list dashes with bullets and marks quote lines', () => {
    const doc = '- item one\n- item two\n\n> quoted\n\nelsewhere\n'
    const decos = decorate(doc, doc.indexOf('elsewhere'))
    const bullets = decos.filter((deco) => deco.kind === 'bullet')
    expect(bullets).toHaveLength(2)
    // S05q: the replaced range swallows the marker's following space —
    // otherwise it renders as a leading space on the first line,
    // offsetting it from the wraps (read starts text at the padding
    // edge, no space).
    expect(bullets[0]).toMatchObject({ from: 0, to: 2 })
    expect(bullets[1]).toMatchObject({
      from: doc.indexOf('- item two'),
      to: doc.indexOf('- item two') + 2
    })
    expect(
      decos.some((deco) => deco.kind === 'line' && deco.cls === 'lp-quote')
    ).toBe(true)
    const quoteMark = doc.indexOf('>')
    expect(
      decos.some((deco) => deco.kind === 'hide' && deco.from === quoteMark)
    ).toBe(true)
  })

  it('folds fence marks away from the cursor, dims them on the active line', () => {
    const doc = '```js\ncode()\n```\n\nelsewhere\n'
    const away = decorate(doc, doc.indexOf('elsewhere'))
    // opening ``` + js info + closing ``` all fold; block lines stay tinted
    expect(away.filter((deco) => deco.kind === 'hide')).toHaveLength(3)
    expect(
      away.some((deco) => deco.kind === 'mark' && deco.cls === 'lp-dim')
    ).toBe(false)
    expect(
      away.filter((deco) => deco.kind === 'line' && deco.cls === 'lp-fence')
    ).toHaveLength(3)
    // rounded caps for read parity: first + last fence lines tagged
    expect(
      away.some((deco) => deco.kind === 'line' && deco.cls === 'lp-fence-first')
    ).toBe(true)
    expect(
      away.some((deco) => deco.kind === 'line' && deco.cls === 'lp-fence-last')
    ).toBe(true)

    const onFence = decorate(doc, 1)
    expect(
      onFence.some((deco) => deco.kind === 'mark' && deco.cls === 'lp-dim')
    ).toBe(true)
  })

  it('hides GFM strikethrough marks and styles the content', () => {
    const doc = 'so ~~gone~~ then\n\nelsewhere\n'
    const decos = decorate(doc, doc.indexOf('elsewhere'))
    const open = doc.indexOf('~~')
    expect(decos).toContainEqual({ from: open, to: open + 2, kind: 'hide' })
    expect(
      decos.some((deco) => deco.kind === 'mark' && deco.cls === 'lp-strike')
    ).toBe(true)
  })

  it('folds frontmatter to a metadata chip away from the cursor', () => {
    const doc = '---\ntitle: X --- Y\ntags: [a]\n---\n\n# Real heading\n'
    const fmEnd = doc.indexOf('\n\n')
    expect(frontmatterEnd(decorateState(doc))).toBe(fmEnd)
    const decos = decorate(doc, doc.length - 1)
    // one chip replaces the whole block; no markdown decorations inside
    expect(decos.filter((deco) => deco.from < fmEnd)).toEqual([
      { from: 0, to: fmEnd, kind: 'metadata' }
    ])
    // the real heading below still gets its size
    expect(
      decos.some((deco) => deco.kind === 'line' && deco.cls === 'lp-h1')
    ).toBe(true)
  })

  it('reveals raw frontmatter (dim unit, no markdown inside) when touched', () => {
    const doc = '---\ntitle: X --- Y\ntags: [a]\n---\n\n# Real heading\n'
    const fmEnd = doc.indexOf('\n\n')
    const decos = decorate(doc, doc.indexOf('tags'))
    const fmDecos = decos.filter((deco) => deco.from < fmEnd)
    expect(fmDecos).toHaveLength(4)
    expect(
      fmDecos.every(
        (deco) => deco.kind === 'line' && deco.cls === 'lp-frontmatter'
      )
    ).toBe(true)
  })

  it('does not mistake an opening --- without a close for frontmatter', () => {
    // no closing delimiter anywhere: a thematic break, not frontmatter
    expect(frontmatterEnd(decorateState('---\nno close ever\n'))).toBe(0)
    expect(frontmatterEnd(decorateState('---\n'))).toBe(0)
    expect(frontmatterEnd(decorateState('regular\ntext\n'))).toBe(0)
  })

  it('renders task checkboxes (no bullet, dash hidden), strikes done', () => {
    const doc = '- [ ] todo\n- [x] done\n\nelsewhere\n'
    const decos = decorate(doc, doc.indexOf('elsewhere'))
    expect(decos.filter((deco) => deco.kind === 'task')).toHaveLength(2)
    expect(decos.filter((deco) => deco.kind === 'bullet')).toHaveLength(0)
    // the '- ' before each checkbox folds away
    expect(decos).toContainEqual({ from: 0, to: 2, kind: 'hide' })
    const done = decos.find(
      (deco) => deco.kind === 'mark' && deco.cls === 'lp-done'
    )
    expect(done).toBeDefined()
    expect(doc.slice(done!.from, done!.to)).toBe(' done')
  })

  it('replaces a horizontal rule with the widget away from the cursor', () => {
    const doc = 'above\n\n---\n\nelsewhere\n'
    const hrFrom = doc.indexOf('---')
    const away = decorate(doc, doc.indexOf('elsewhere'))
    expect(away).toContainEqual({ from: hrFrom, to: hrFrom + 3, kind: 'hr' })
    const onIt = decorate(doc, hrFrom + 1)
    expect(onIt.filter((deco) => deco.kind === 'hr')).toHaveLength(0)
  })

  it('renders tables as a widget away from the cursor, raw when touched', () => {
    const doc = '| a | b |\n| - | - |\n| 1 | 2 |\n\nelsewhere\n'
    const away = decorate(doc, doc.indexOf('elsewhere'))
    const tableEnd = doc.indexOf('|\n\n') + 1
    expect(away.filter((deco) => deco.kind === 'table')).toEqual([
      { from: 0, to: tableEnd, kind: 'table' }
    ])
    expect(
      away.some((deco) => deco.kind === 'line' && deco.cls === 'lp-table')
    ).toBe(false)

    const touched = decorate(doc, doc.indexOf('1'))
    expect(touched.filter((deco) => deco.kind === 'table')).toHaveLength(0)
    expect(
      touched.filter((deco) => deco.kind === 'line' && deco.cls === 'lp-table')
    ).toHaveLength(3)
    expect(
      touched.some((deco) => deco.kind === 'mark' && deco.cls === 'lp-dim')
    ).toBe(true)
    const headerCells = touched.filter(
      (deco) => deco.kind === 'mark' && deco.cls === 'lp-strong'
    )
    expect(headerCells.map((deco) => doc.slice(deco.from, deco.to))).toEqual([
      'a',
      'b'
    ])
  })

  it('parseTable splits header/delimiter/rows and rejects non-tables', () => {
    expect(parseTable('| a | b |\n| - | - |\n| 1 | 2 |')).toEqual({
      header: ['a', 'b'],
      rows: [['1', '2']]
    })
    expect(parseTable('| a | b |\n| not a delimiter |')).toBeNull()
    expect(parseTable('just text')).toBeNull()
  })

  it('leaves bare [text] literal — only [text](url) is a link (read parity)', () => {
    const doc = '## [mock] QUOI\n\n**[mock free]** QUOI\n\nelsewhere\n'
    const decos = decorate(doc, doc.indexOf('elsewhere'))
    // no link styling anywhere, and no bracket hidden anywhere
    expect(
      decos.some((deco) => deco.kind === 'mark' && deco.cls === 'lp-link')
    ).toBe(false)
    for (const bracket of ['[mock]', '[mock free]']) {
      const from = doc.indexOf(bracket)
      expect(
        decos.some((deco) => deco.kind === 'hide' && deco.from === from)
      ).toBe(false)
    }
    // the surrounding constructs still render: h2 line + strong marks fold
    expect(
      decos.some((deco) => deco.kind === 'line' && deco.cls === 'lp-h2')
    ).toBe(true)
    expect(
      decos.some((deco) => deco.kind === 'mark' && deco.cls === 'lp-strong')
    ).toBe(true)
    const strongOpen = doc.indexOf('**')
    expect(decos).toContainEqual({
      from: strongOpen,
      to: strongOpen + 2,
      kind: 'hide'
    })
  })

  it('linkHrefAt finds the URL from anywhere inside the link, else null', () => {
    const doc = 'see [docs](notes/target.md) here\n'
    const state = decorateState(doc)
    ensureSyntaxTree(state, state.doc.length, 5000)
    expect(linkHrefAt(state, doc.indexOf('docs') + 1)).toBe('notes/target.md')
    expect(linkHrefAt(state, doc.indexOf('see'))).toBeNull()
    expect(linkHrefAt(state, doc.indexOf('here'))).toBeNull()
  })

  it('an active multi-line selection reveals every touched line', () => {
    const doc = '# One\n\n**two**\n'
    const state = EditorState.create({
      doc,
      selection: EditorSelection.range(0, doc.length - 1),
      extensions: [markdown()]
    })
    ensureSyntaxTree(state, state.doc.length, 5000)
    const set = computeLivePreviewDecorations(state)
    const kinds: string[] = []
    const iter = set.iter()
    while (iter.value) {
      kinds.push((iter.value.spec as { lp: string }).lp)
      iter.next()
    }
    expect(kinds).not.toContain('hide')
    expect(kinds).not.toContain('bullet')
  })
})

describe('image embeds in live mode (owner report: raw text shown)', () => {
  const withNotePath = (doc: string, cursor = 0): Deco[] => {
    const state = EditorState.create({
      doc,
      selection: EditorSelection.cursor(Math.min(cursor, doc.length)),
      extensions: [
        markdown({ base: markdownLanguage }),
        notePathFacet.of('notes/idea.md')
      ]
    })
    ensureSyntaxTree(state, state.doc.length, 5000)
    const set = computeLivePreviewDecorations(state)
    const out: Deco[] = []
    const iter = set.iter()
    while (iter.value) {
      const spec = iter.value.spec as { lp: LivePreviewKind; class?: string }
      out.push({ from: iter.from, to: iter.to, kind: spec.lp })
      iter.next()
    }
    return out
  }

  it('replaces the whole embed with an image widget away from the cursor', () => {
    const doc = 'above\n\n![page](../sources/captures/P/original.jpg)\n'
    const decos = withNotePath(doc, 0)
    const start = doc.indexOf('![')
    expect(decos).toContainEqual({
      from: start,
      to: doc.indexOf(')') + 1,
      kind: 'image'
    })
  })

  it('reveals the raw syntax on the touched line', () => {
    const doc = '![page](../sources/captures/P/original.jpg)\n'
    expect(withNotePath(doc, 3).filter((d) => d.kind === 'image')).toEqual([])
  })

  it('renders nothing without a note path or for non-image destinations', () => {
    const doc = '![page](img.jpg)\n'
    expect(decorate(doc, 0).filter((d) => d.kind === 'image')).toEqual([])
    const pdf = '![doc](file.pdf)\n'
    expect(withNotePath(pdf, 0).filter((d) => d.kind === 'image')).toEqual([])
  })

  it('resolveEmbedPath: relative only, root-escape refused, <> and %20 accepted', () => {
    expect(resolveEmbedPath('notes/idea.md', '../sources/P/original.jpg')).toBe(
      'sources/P/original.jpg'
    )
    expect(resolveEmbedPath('notes/idea.md', '<../sources/Pascal 2/x.jpg>')).toBe(
      'sources/Pascal 2/x.jpg'
    )
    expect(resolveEmbedPath('notes/idea.md', 'Pascal%202/x.jpg')).toBe(
      'notes/Pascal 2/x.jpg'
    )
    expect(resolveEmbedPath('top.md', '../../escape.jpg')).toBeNull()
    expect(resolveEmbedPath('top.md', '/absolute.jpg')).toBeNull()
    expect(resolveEmbedPath('top.md', 'not-an-image.txt')).toBeNull()
  })
})

describe('semantic edges in live (CP-MVP-009 S04 + S04b read parity)', () => {
  const edges = (decos: Deco[]): Deco[] => decos.filter((d) => d.kind === 'edge')

  it('replaces a wikilink with the pill widget away from the cursor', () => {
    const doc = 'See [[attention]]{normalizes} here'
    const decos = edges(decorate(doc, doc.length))
    // cursor on the same line reveals raw — move it to another line
    const twoLine = `${doc}\nnext`
    const away = edges(decorate(twoLine, twoLine.length))
    expect(decos).toHaveLength(0)
    expect(away).toHaveLength(1)
    expect(away[0]).toMatchObject({
      from: 4,
      to: '[[attention]]{normalizes}'.length + 4
    })
  })

  it('replaces a typed md link WHOLE, kind from the href (S04b parity)', () => {
    const doc = '[paper](sources/pdf/x/source.md){grounded-at}\nnext'
    const away = edges(decorate(doc, doc.length))
    expect(away).toHaveLength(1)
    expect(away[0]).toMatchObject({
      from: 0,
      to: '[paper](sources/pdf/x/source.md){grounded-at}'.length,
      edgeKind: 'pdf'
    })
  })

  it('pills untyped md links too — read parity (S04b owner ruling)', () => {
    const doc =
      '[paper](x.md), [saved](sources/web/a/source.md), and [w](https://a.b)\nnext'
    const away = edges(decorate(doc, doc.length))
    expect(away.map((d) => d.edgeKind)).toEqual([
      'note',
      'web-source',
      'web'
    ])
  })

  it('leaves hash links un-pilled, like read', () => {
    const doc = '[top](#top)\nnext'
    expect(edges(decorate(doc, doc.length))).toHaveLength(0)
  })

  it('resolves wikilinks against host-fed candidates: kind + broken', () => {
    const doc = '[[hello]] and [[ghost]]\nnext'
    const state = EditorState.create({
      doc,
      selection: EditorSelection.cursor(doc.length),
      extensions: [
        markdown({ base: markdownLanguage }),
        wikiCandidatesField.init(() => [
          { name: 'hello', relPath: 'chats/2026-08-04/hello.md' }
        ])
      ]
    })
    ensureSyntaxTree(state, state.doc.length, 5000)
    const set = computeLivePreviewDecorations(state)
    const found: { kind?: string; broken?: boolean }[] = []
    const iter = set.iter()
    while (iter.value) {
      const spec = iter.value.spec as {
        lp: LivePreviewKind
        edgeKind?: string
        edgeBroken?: boolean
      }
      if (spec.lp === 'edge') found.push({ kind: spec.edgeKind, broken: spec.edgeBroken })
      iter.next()
    }
    expect(found).toEqual([
      { kind: 'chat', broken: false },
      { kind: 'note', broken: true }
    ])
  })

  it('carries the follow target: resolved rel for wiki, raw href for md (S04c)', () => {
    const doc = '[[hello]] [x](y.md) [t](#top)\nnext'
    const state = EditorState.create({
      doc,
      selection: EditorSelection.cursor(doc.length),
      extensions: [
        markdown({ base: markdownLanguage }),
        wikiCandidatesField.init(() => [
          { name: 'hello', relPath: 'chats/2026-08-04/hello.md' }
        ])
      ]
    })
    ensureSyntaxTree(state, state.doc.length, 5000)
    const set = computeLivePreviewDecorations(state)
    const follows: unknown[] = []
    const iter = set.iter()
    while (iter.value) {
      const spec = iter.value.spec as { lp: LivePreviewKind; edgeFollow?: unknown }
      if (spec.lp === 'edge') follows.push(spec.edgeFollow)
      iter.next()
    }
    expect(follows).toEqual([
      { kind: 'rel', target: 'chats/2026-08-04/hello.md' },
      { kind: 'href', target: 'y.md' }
    ])
  })

  it('stays neutral (never broken) while candidates are unloaded', () => {
    const doc = '[[anything]]\nnext'
    const away = edges(decorate(doc, doc.length))
    expect(away[0]).toMatchObject({ edgeKind: 'note', edgeBroken: false })
  })

  it('reveals raw syntax on the active line, like every other mark', () => {
    const doc = '[[attention]]{normalizes}'
    expect(edges(decorate(doc, 3))).toHaveLength(0)
  })

  it('never decorates edges inside fences or frontmatter', () => {
    const fenced = '```\n[[a]]\n```\nnext'
    expect(edges(decorate(fenced, fenced.length))).toHaveLength(0)
    const fm = '---\ntitle: [[a]]\n---\n\nbody here\nnext'
    expect(edges(decorate(fm, fm.length))).toHaveLength(0)
  })
})
