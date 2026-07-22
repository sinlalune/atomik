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

  it('keeps the note config: emphasis, tables, breaks', () => {
    expect(md.render('**b** *i* ~~s~~')).toContain('<strong>b</strong>')
    expect(md.render('a\nb')).toContain('a<br>')
    expect(md.render('| h |\n| - |\n| c |')).toContain('<table>')
  })
})
