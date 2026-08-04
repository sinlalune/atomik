/**
 * Edge autocompletes (CP-MVP-009 S04) — pure context matchers and the
 * document-local label vocabulary.
 */
import { describe, expect, it } from 'vitest'
import {
  labelQueryAt,
  labelsInDoc,
  wikiQueryAt
} from '../renderer/src/editor/edge-complete'

describe('wikiQueryAt', () => {
  it('matches an open wikilink with its partial target', () => {
    expect(wikiQueryAt('see [[att')).toEqual({ start: 6, query: 'att' })
    expect(wikiQueryAt('[[')).toEqual({ start: 2, query: '' })
  })

  it('stays quiet outside an open wikilink', () => {
    expect(wikiQueryAt('plain text')).toBeNull()
    expect(wikiQueryAt('[single bracket')).toBeNull()
    expect(wikiQueryAt('[[closed]]')).toBeNull()
    expect(wikiQueryAt('[[bad{char')).toBeNull()
  })
})

describe('labelQueryAt', () => {
  it('matches a brace group immediately after a closed link', () => {
    expect(labelQueryAt('[[a]]{')).toEqual({ start: 6, query: '' })
    expect(labelQueryAt('[[a]]{par')).toEqual({ start: 6, query: 'par' })
    expect(labelQueryAt('[t](x.md){ground')).toEqual({ start: 10, query: 'ground' })
  })

  it('keeps the reverse caret out of the query', () => {
    expect(labelQueryAt('[[a]]{^par')).toEqual({ start: 7, query: 'par' })
  })

  it('honors the adjacency rule: spaced or bare braces stay prose', () => {
    expect(labelQueryAt('[[a]] {par')).toBeNull()
    expect(labelQueryAt('just {par')).toBeNull()
    expect(labelQueryAt('{par')).toBeNull()
  })
})

describe('labelsInDoc', () => {
  it('collects typed-edge labels, most-used first', () => {
    const doc = [
      '[[a]]{part-of} and [[b]]{part-of}',
      '[[c]]{^normalizes}',
      '[x](y.md){grounded-at}',
      '[[untyped]]'
    ].join('\n')
    expect(labelsInDoc(doc)).toEqual(['part-of', 'grounded-at', 'normalizes'])
  })

  it('is empty when nothing is typed', () => {
    expect(labelsInDoc('[[a]] and [b](c.md)')).toEqual([])
  })
})
