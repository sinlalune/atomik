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
})
