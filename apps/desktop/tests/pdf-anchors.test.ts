import { describe, expect, it } from 'vitest'
import { withPageAnchor, withPassageAnchor } from '../renderer/src/source/dossier'
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

  it('passage anchors (S07b6): quote-identified, numbered per page, table-safe', () => {
    const once = withPassageAnchor(DOSSIER, 4, 'The dichotomy   of\ncontrol')
    expect(once).toContain(
      '| `p4q1` | “The dichotomy of control” | [page 4](./original.pdf#page=4) |'
    )
    // the SAME quote re-anchors as a no-op
    expect(withPassageAnchor(once, 4, 'The dichotomy of control')).toBe(once)
    // a second passage on the same page numbers up
    const twice = withPassageAnchor(once, 4, 'Another passage entirely')
    expect(twice).toContain('| `p4q2` | “Another passage entirely”')
    // pipes collapse (table safety), overlong quotes cap
    expect(withPassageAnchor(DOSSIER, 1, 'a | b')).toContain('“a / b”')
    const long = withPassageAnchor(DOSSIER, 1, 'x'.repeat(300))
    expect(long).toContain(`“${'x'.repeat(120)}”`)
    // empty/whitespace quote or a dossier without the table = unchanged
    expect(withPassageAnchor(DOSSIER, 2, '   ')).toBe(DOSSIER)
    expect(withPassageAnchor('no table here', 2, 'quote')).toBe('no table here')
    // passage anchors coexist with page anchors on the same page
    const both = withPassageAnchor(withPageAnchor(DOSSIER, 4), 4, 'A quote')
    expect(both).toContain('| `p4` | page 4 |')
    expect(both).toContain('| `p4q1` | “A quote”')
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
