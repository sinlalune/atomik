import { describe, expect, it } from 'vitest'
import { withPageAnchor } from '../renderer/src/source/dossier'
import { pdfPageTarget } from '../renderer/src/source/pdf-open'

const DOSSIER = [
  '---',
  'type: Atomik Source',
  'resource: ./original.pdf',
  '---',
  '',
  '## Useful anchors',
  '',
  '| Anchor | Meaning | Target |',
  '|---|---|---|',
  '| `original-pdf` | the full original document | `./original.pdf` |',
  ''
].join('\n')

describe('PDF anchors + citation return (CP-MVP-003 S06)', () => {
  it('adds a page anchor row with a CLICKABLE target, idempotently', () => {
    const once = withPageAnchor(DOSSIER, 3)
    // the Target is a real markdown link, not bare text (the S06 bug)
    expect(once).toContain('| `p3` | page 3 | [page 3](./original.pdf#page=3) |')
    // inserted right under the header, above the existing row
    expect(once.indexOf('#page=3')).toBeLessThan(once.indexOf('original-pdf'))
    // idempotent
    expect(withPageAnchor(once, 3)).toBe(once)
    // a different page adds a second row
    expect(withPageAnchor(once, 7)).toContain('[page 7](./original.pdf#page=7)')
  })

  it('parses PDF page targets to the sibling dossier', () => {
    expect(pdfPageTarget('sources/pdf/quote/original.pdf', 'page=5')).toEqual({
      dossierRel: 'sources/pdf/quote/source.md',
      page: 5
    })
    // non-pdf, no page, or junk → null
    expect(pdfPageTarget('sources/pdf/quote/original.pdf', '')).toBeNull()
    expect(pdfPageTarget('notes/x.md', 'page=2')).toBeNull()
    expect(pdfPageTarget('a/original.pdf', 'page=0')).toBeNull()
  })
})
