/**
 * Edge authoring ops (CP-MVP-009 S05) — one gesture, one single-span
 * change, over the exact shapes the app writes (incl. @ menu angle
 * brackets).
 */
import { describe, expect, it } from 'vitest'
import {
  addLabel,
  editLabel,
  findEdgeAt,
  flipDirection,
  removeLabel,
  type EdgeChange
} from '../renderer/src/editor/edge-author'
import { parseEdges } from '../shared/edge-grammar'

const apply = (content: string, change: EdgeChange): string =>
  content.slice(0, change.from) + change.insert + content.slice(change.to)

describe('findEdgeAt', () => {
  it('finds the edge whose widget starts at the offset', () => {
    const doc = 'See [[a]] and [b](<c.md>)'
    expect(findEdgeAt(doc, 4)?.target).toBe('a')
    expect(findEdgeAt(doc, 14)?.target).toBe('c.md')
    expect(findEdgeAt(doc, 5)).toBeNull()
  })
})

describe('addLabel', () => {
  it('appends a normalized decoration to an untyped edge', () => {
    const doc = 'link [[attention]] here'
    const edge = findEdgeAt(doc, 5)!
    expect(apply(doc, addLabel(edge, 'Part of')!)).toBe(
      'link [[attention]]{part-of} here'
    )
  })

  it('supports the reverse direction and @ menu links', () => {
    const doc = '[h](<chats/2026-07-24-hello.md>)'
    const edge = findEdgeAt(doc, 0)!
    expect(apply(doc, addLabel(edge, 'unlocked by', true)!)).toBe(
      '[h](<chats/2026-07-24-hello.md>){^unlocked-by}'
    )
  })

  it('refuses empty input and already-typed edges', () => {
    const doc = '[[a]]{x}'
    expect(addLabel(findEdgeAt(doc, 0)!, 'y')).toBeNull()
    expect(addLabel(findEdgeAt('[[a]]', 0)!, '  ')).toBeNull()
  })
})

describe('editLabel', () => {
  it('replaces the label, keeping direction', () => {
    const doc = '[[a]]{^old-label} tail'
    expect(apply(doc, editLabel(findEdgeAt(doc, 0)!, 'New Label')!)).toBe(
      '[[a]]{^new-label} tail'
    )
  })

  it('empty input removes the decoration', () => {
    const doc = '[[a]]{gone} tail'
    expect(apply(doc, editLabel(findEdgeAt(doc, 0)!, '')!)).toBe('[[a]] tail')
  })

  it('no-ops on an identical label', () => {
    const doc = '[[a]]{same}'
    expect(editLabel(findEdgeAt(doc, 0)!, 'same')).toBeNull()
  })
})

describe('flipDirection', () => {
  it('toggles the caret both ways', () => {
    const fwd = '[[a]]{part-of}'
    const flipped = apply(fwd, flipDirection(findEdgeAt(fwd, 0)!)!)
    expect(flipped).toBe('[[a]]{^part-of}')
    expect(apply(flipped, flipDirection(findEdgeAt(flipped, 0)!)!)).toBe(fwd)
  })
})

describe('removeLabel', () => {
  it('deletes the brace group only', () => {
    const doc = 'x [[a]]{dead} y'
    expect(apply(doc, removeLabel(findEdgeAt(doc, 2)!)!)).toBe('x [[a]] y')
  })

  it('round-trips add → remove to the exact original', () => {
    const doc = '[t](<sources/web/w/source.md>) end'
    const edge = findEdgeAt(doc, 0)!
    const typed = apply(doc, addLabel(edge, 'grounded-at')!)
    const back = apply(typed, removeLabel(findEdgeAt(typed, 0)!)!)
    expect(back).toBe(doc)
    expect(parseEdges(back)[0]?.decoration).toBeNull()
  })
})
