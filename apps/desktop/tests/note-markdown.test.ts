import { describe, expect, it } from 'vitest'
import { noteMarkdown } from '../renderer/src/editor/note-markdown'

describe('noteMarkdown — the ONE note renderer (S05g)', () => {
  const md = noteMarkdown()

  it('renders GFM task lists as disabled checkboxes, checked state kept', () => {
    const html = md.render('- [ ] open item\n- [x] done item\n- plain item')
    expect(html).toContain('<input type="checkbox" class="task-checkbox" disabled> open item')
    expect(html).toContain('<input type="checkbox" class="task-checkbox" disabled checked> done item')
    expect(html).toContain('<li class="task-item">')
    // plain items untouched
    expect(html).toContain('<li>plain item')
    expect((html.match(/<input/g) ?? []).length).toBe(2)
  })

  it('leaves bracket text outside list items alone', () => {
    const html = md.render('a [ ] in prose\n\n> - [x] quoted task')
    expect(html).toContain('a [ ] in prose')
    // nested inside a blockquote still converts (list item structure)
    expect(html).toContain('checked> quoted task')
  })

  it('spaces blocks from the SOURCE blank lines (S05o)', () => {
    // no blank line after the heading -> the list is tight
    const tight = md.render('### Key Ideas\n- **a**: b')
    expect(tight).toContain('<ul class="md-tight">')
    // one blank line -> default gap (no class, no style)
    const one = md.render('### Key Ideas\n\n- **a**: b')
    expect(one).not.toContain('md-tight')
    expect(one).not.toContain('margin-top')
    // two blank lines -> explicit two-gap margin
    const two = md.render('para\n\n\nnext')
    expect(two).toContain('margin-top: calc(2 * var(--note-block-gap))')
    // first block never gets a marker
    expect(md.render('# Title\n\nbody')).not.toContain('md-tight')
  })

  it('counts blank lines in the SOURCE, not the previous map end (S05p)', () => {
    // list maps swallow their trailing blank line — the heading after
    // this list must keep its one-gap default, not go tight
    const afterList = md.render('## Ideas\n\n- a\n- b\n\n## Legacy')
    expect(afterList).not.toContain('<h2 class="md-tight">')
    // no blank line after the list -> the heading IS tight
    const tightAfterList = md.render('- a\n- b\n## Legacy')
    expect(tightAfterList).toContain('<h2 class="md-tight">')
    // two blank lines after a list -> explicit margin, unswallowed
    const twoAfterList = md.render('- a\n\n\n## Legacy')
    expect(twoAfterList).toContain('margin-top: calc(2 * var(--note-block-gap))')
  })

  it('keeps the note config: emphasis, tables, breaks', () => {
    expect(md.render('**b** *i* ~~s~~')).toContain('<strong>b</strong>')
    expect(md.render('a\nb')).toContain('a<br>')
    expect(md.render('| h |\n| - |\n| c |')).toContain('<table>')
  })

  it('emits breaks WITHOUT raw newlines — break-spaces blocks would render them (S05t)', () => {
    // soft break: exactly <br>, no trailing \n inside the paragraph
    expect(md.render('a\nb')).toBe('<p>a<br>b</p>\n')
    // hard break (two trailing spaces) — same contract
    expect(md.render('a  \nb')).toBe('<p>a<br>b</p>\n')
  })
})

describe('noteMarkdown — inert rich placeholders (CP-RICH-MARKDOWN S02)', () => {
  const md = noteMarkdown()

  it('discovers strict inline and display math while currency stays prose', () => {
    const inline = md.render('Euler: $e^{i\\pi} + 1 = 0$.')
    expect(inline).toContain('data-rich-kind="math"')
    expect(inline).toContain('data-rich-info="inline"')
    expect(inline).toContain('e^{i\\pi} + 1 = 0')

    const display = md.render('$$\n\\int_0^1 x^2 dx\n$$')
    expect(display).toContain('data-rich-info="display"')
    expect(display).toContain('\\int_0^1 x^2 dx')

    for (const prose of ['price $5 and tax', '$ x$', '$x $', '`$x$`']) {
      expect(md.render(prose)).not.toContain('data-rich-block')
    }
  })

  it('emits escaped inert source for accepted renderer fences', () => {
    const html = md.render('```mermaid\ngraph TD\nA[<script>] --> B\n```')
    expect(html).toContain('data-rich-kind="mermaid"')
    expect(html).toContain('data-rich-info="mermaid"')
    expect(html).toContain('&lt;script&gt;')
    expect(html).not.toContain('<script>')

    expect(md.render('```VL\n{"data":{"values":[]}}\n```')).toContain(
      'data-rich-kind="vega-lite"'
    )
    expect(md.render('```latex\nx^2\n```')).toContain(
      'data-rich-kind="math"'
    )
  })

  it('keeps supported and unknown code escaped in inert code placeholders', () => {
    const python = md.render('```python\nprint("<safe>")\n```')
    expect(python).toContain('data-rich-kind="code"')
    expect(python).toContain('data-rich-info="python"')
    expect(python).toContain('class="language-python"')
    expect(python).toContain('&lt;safe&gt;')

    const unknown = md.render('```graphviz\ndigraph { a -> b }\n```')
    expect(unknown).toContain('data-rich-kind="code"')
    expect(unknown).toContain('data-rich-info="graphviz"')
    expect(unknown).toContain('digraph { a -&gt; b }')
  })

  it('carries source-gap classes onto rich block placeholders', () => {
    const html = md.render('## Diagram\n```mermaid\ngraph TD; A-->B\n```')
    expect(html).toMatch(/class="[^"]*md-tight[^"]*rich-markdown-block|class="[^"]*rich-markdown-block[^"]*md-tight/)
  })
})

describe('noteMarkdown — semantic edges (CP-MVP-009 S03, ADR-011)', () => {
  const md = noteMarkdown()

  it('renders a wikilink as a note pill with data-wiki', () => {
    const html = md.render('See [[attention]] here')
    expect(html).toContain('data-wiki="attention"')
    expect(html).toContain('class="link-pill link-pill--note"')
    expect(html).toContain('>attention</a>')
  })

  it('renders a typed wikilink with the graph mark INSIDE the pill', () => {
    const html = md.render('[[attention]]{normalizes}')
    expect(html).toContain('data-edge-label="normalizes"')
    expect(html).toContain('⟶ normalizes')
    // inside the anchor, not beside it
    expect(html).toMatch(/<a [^>]*>attention<span class="edge-mark"[^>]*><\/span><\/a>/)
    // the raw decoration never leaks as prose
    expect(html).not.toContain('{normalizes}')
  })

  it('renders the reverse marker on {^label}', () => {
    const html = md.render('[[attention]]{^part-of}')
    expect(html).toContain('class="edge-mark edge-mark--rev"')
    expect(html).toContain('data-edge-rev="1"')
    expect(html).toContain('⟵ part of')
  })

  it('adjacency is strict: a spaced brace group stays prose', () => {
    const html = md.render('[[attention]] {normalizes}')
    expect(html).not.toContain('edge-mark')
    expect(html).toContain('{normalizes}')
  })

  it('decorates a standard md link with an in-pill mark and kind class', () => {
    const html = md.render('[paper](sources/pdf/att/source.md){grounded-at}')
    expect(html).toContain('link-pill--pdf')
    expect(html).toMatch(/<a [^>]*>paper<span class="edge-mark"[^>]*><\/span><\/a>/)
    expect(html).not.toContain('{grounded-at}')
  })

  it('classifies md link kinds from the href', () => {
    expect(md.render('[c](chats/2026-08-03/a.md)')).toContain('link-pill--chat')
    expect(md.render('[f](notes/index.md)')).toContain('link-pill--folder')
    expect(md.render('[w](https://example.org)')).toContain('link-pill--web')
    expect(md.render('[n](other.md)')).toContain('link-pill--note')
  })

  it('leaves hash and mailto links plain', () => {
    expect(md.render('[top](#top)')).not.toContain('link-pill')
    expect(md.render('[m](mailto:a@b.c)')).not.toContain('link-pill')
  })

  it('invalid decorations stay prose: {<x}, {Part Of}, {.attr}', () => {
    for (const bad of ['{<x}', '{Part Of}', '{.attr}']) {
      const html = md.render(`[[a]]${bad}`)
      expect(html).not.toContain('edge-mark')
    }
  })

  it('wikilinks inside code spans and fences stay literal', () => {
    expect(md.render('`[[a]]`')).not.toContain('data-wiki')
    expect(md.render('```\n[[a]]\n```')).not.toContain('data-wiki')
  })
})
