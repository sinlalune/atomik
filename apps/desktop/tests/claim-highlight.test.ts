import { describe, expect, it } from 'vitest'
import type { ClaimRecord } from '../shared/ipc-contract'
import {
  claimPattern,
  claimTitle,
  findClaimRanges,
  isWordBoundary,
  stripInlineMarkdown
} from '../renderer/src/editor/claim-highlight'

const claim = (
  id: string,
  text: string,
  label: ClaimRecord['label'] = 'model-only'
): ClaimRecord => ({ id, blockId: 'b1', text, label, evidenceIds: [] })

describe('claim highlighting (S06c17): locating raw-markdown claims in rendered text', () => {
  it('stripInlineMarkdown drops emphasis/code and keeps link labels', () => {
    expect(
      stripInlineMarkdown('Plato’s **Form of the Good** and the *logos*')
    ).toBe('Plato’s Form of the Good and the logos')
    expect(stripInlineMarkdown('see [the Academy](notes/academy.md) here')).toBe(
      'see the Academy here'
    )
    expect(stripInlineMarkdown('uses `reason`  and\n virtue')).toBe(
      'uses reason and virtue'
    )
  })

  it('claimPattern refuses anchors too short to be safe', () => {
    expect(claimPattern('too short')).toBeNull()
    expect(claimPattern('this one is long enough to anchor')).not.toBeNull()
  })

  it('finds a markdown-styled claim inside the rendered plain text', () => {
    const rendered =
      'Stoicism emerged in the early 3rd century BCE, founded by Zeno of Citium.'
    const raw =
      'Stoicism emerged in the early 3rd century BCE, founded by **Zeno of Citium**.'
    const ranges = findClaimRanges(rendered, [claim('c1', raw)])
    expect(ranges).toHaveLength(1)
    expect(rendered.slice(ranges[0]!.from, ranges[0]!.to)).toBe(rendered)
  })

  it('matches across reflowed whitespace', () => {
    const rendered = 'reason is the path\nto knowledge and virtue for the Stoics'
    const raw = 'reason is the path to knowledge and virtue for the Stoics'
    expect(findClaimRanges(rendered, [claim('c1', raw)])).toHaveLength(1)
  })

  it('matches across a <br> boundary, where textContent fuses the words', () => {
    // breaks:true renders hard-wrapped lines as <br>, which adds NO
    // character to textContent — 'carry no' + 'factual value' fuse
    const rendered = 'Mock placeholders carry nofactual value. And more prose.'
    const raw = 'Mock placeholders carry no factual value.'
    const ranges = findClaimRanges(rendered, [claim('c1', raw)])
    expect(ranges).toHaveLength(1)
    expect(rendered.slice(ranges[0]!.from, ranges[0]!.to)).toBe(
      'Mock placeholders carry nofactual value.'
    )
  })

  it('overlapping claims keep the longest; ranges come back in order', () => {
    const rendered =
      'The four cardinal virtues influenced the Stoic ethical system deeply. A second sentence stands alone here.'
    const long = claim(
      'long',
      'The four cardinal virtues influenced the Stoic ethical system deeply.'
    )
    const contained = claim(
      'contained',
      'virtues influenced the Stoic ethical system'
    )
    const second = claim('second', 'A second sentence stands alone here.')
    const ranges = findClaimRanges(rendered, [contained, second, long])
    expect(ranges.map((r) => r.claim.id)).toEqual(['long', 'second'])
    expect(ranges[0]!.from).toBeLessThan(ranges[1]!.from)
  })

  it('a claim absent from the rendered text is skipped', () => {
    expect(
      findClaimRanges('completely different text body', [
        claim('c1', 'this sentence never appears anywhere at all')
      ])
    ).toHaveLength(0)
  })

  it('claimTitle names the source for source-backed claims', () => {
    expect(
      claimTitle(claim('c1', 'x', 'source-backed'), 'notes/socrates.md')
    ).toContain('notes/socrates.md')
    expect(claimTitle(claim('c2', 'x', 'needs-citation'), null)).toContain(
      'needs-citation'
    )
    expect(claimTitle(claim('c3', 'x', 'interpretive'), null)).toContain(
      'interpretive'
    )
    expect(claimTitle(claim('c4', 'x'), null)).toContain('model-only')
  })
})

describe('a highlight never ends inside a word (CP-MVP-010 S10e)', () => {
  const rendered =
    'XML is a markup language. It defines a set of rules for encoding documents ' +
    'in a format that is both human-readable and machine-readable.'

  it('keeps a match that lands on word boundaries', () => {
    const whole = claim('c1', 'It defines a set of rules for encoding documents')
    const [range] = findClaimRanges(rendered, [whole])
    expect(range).toBeDefined()
    expect(rendered.slice(range!.from, range!.to)).toBe(
      'It defines a set of rules for encoding documents'
    )
  })

  it('drops a match that would cut a word in half', () => {
    // the claim text was truncated upstream — the located range would
    // end at "human-readable an", which reads as a rendering fault
    const truncated = claim('c2', 'in a format that is both human-readable an')
    expect(findClaimRanges(rendered, [truncated])).toEqual([])
  })

  it('allows a boundary at punctuation or at the very edges', () => {
    expect(isWordBoundary(rendered, 0)).toBe(true)
    expect(isWordBoundary(rendered, rendered.length)).toBe(true)
    expect(isWordBoundary(rendered, rendered.indexOf(' It defines'))).toBe(true)
    expect(isWordBoundary(rendered, rendered.indexOf('ML is'))).toBe(false)
  })
})
