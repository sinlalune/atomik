import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { ensureSyntaxTree } from '@codemirror/language'
import { EditorSelection, EditorState } from '@codemirror/state'
import { describe, expect, it } from 'vitest'
import type { LivePreviewKind } from '../renderer/src/editor/live-preview'
import {
  computeLivePreviewDecorations,
  frontmatterEnd,
  linkHrefAt
} from '../renderer/src/editor/live-preview'

type Deco = { from: number; to: number; kind: LivePreviewKind; cls?: string }

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
    const spec = iter.value.spec as { lp: LivePreviewKind; class?: string }
    const deco: Deco = { from: iter.from, to: iter.to, kind: spec.lp }
    if (spec.class !== undefined) deco.cls = spec.class
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

  it('collapses [text](url) to styled text away from the cursor', () => {
    const doc = 'see [docs](https://example.org) now\n\nelsewhere\n'
    const decos = decorate(doc, doc.indexOf('elsewhere'))
    const urlStart = doc.indexOf('(https')
    const urlEnd = doc.indexOf(')') + 1
    // brackets hidden, '(url)' hidden, text styled as a link
    expect(decos).toContainEqual({ from: 4, to: 5, kind: 'hide' })
    expect(
      decos.some(
        (deco) =>
          deco.kind === 'hide' && deco.from >= urlStart - 1 && deco.to === urlEnd
      )
    ).toBe(true)
    expect(
      decos.some((deco) => deco.kind === 'mark' && deco.cls === 'lp-link')
    ).toBe(true)
  })

  it('replaces list dashes with bullets and marks quote lines', () => {
    const doc = '- item one\n- item two\n\n> quoted\n\nelsewhere\n'
    const decos = decorate(doc, doc.indexOf('elsewhere'))
    expect(decos.filter((deco) => deco.kind === 'bullet')).toHaveLength(2)
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

  it('styles tables: mono lines, dimmed pipes, bold header cells', () => {
    const doc = '| a | b |\n| - | - |\n| 1 | 2 |\n\nelsewhere\n'
    const decos = decorate(doc, doc.indexOf('elsewhere'))
    expect(
      decos.filter((deco) => deco.kind === 'line' && deco.cls === 'lp-table')
    ).toHaveLength(3)
    expect(
      decos.some((deco) => deco.kind === 'mark' && deco.cls === 'lp-dim')
    ).toBe(true)
    const headerCells = decos.filter(
      (deco) => deco.kind === 'mark' && deco.cls === 'lp-strong'
    )
    expect(headerCells.map((deco) => doc.slice(deco.from, deco.to))).toEqual([
      'a',
      'b'
    ])
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
