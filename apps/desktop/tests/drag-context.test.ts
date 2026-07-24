import { describe, expect, it } from 'vitest'
import {
  compatibleDropEffect,
  parseSelectionDrag,
  serializeSelectionDrag
} from '../renderer/src/editor/drag-context'

describe('compatibleDropEffect (S06c5 land fix)', () => {
  it("answers within the source's effectAllowed — Chromium refuses mismatches", () => {
    expect(compatibleDropEffect('move')).toBe('move') // tree rows
    expect(compatibleDropEffect('copy')).toBe('copy') // tabs
    expect(compatibleDropEffect('copyMove')).toBe('copy') // CM selections
    expect(compatibleDropEffect('all')).toBe('copy')
    expect(compatibleDropEffect('uninitialized')).toBe('copy')
    expect(compatibleDropEffect('linkMove')).toBe('move')
  })

  it("prefers 'copy' so a dragged CM selection is never deleted at the source", () => {
    expect(compatibleDropEffect('copyMove')).toBe('copy')
  })
})

describe('selection drag payload', () => {
  it('round-trips', () => {
    const source = { relPath: 'notes/plato.md', from: 12, to: 96 }
    expect(parseSelectionDrag(serializeSelectionDrag(source))).toEqual(source)
  })

  it('rejects garbage and impossible ranges', () => {
    expect(parseSelectionDrag('')).toBeNull()
    expect(parseSelectionDrag('nope')).toBeNull()
    expect(parseSelectionDrag('{"relPath":"a.md","from":9,"to":3}')).toBeNull()
    expect(parseSelectionDrag('{"relPath":"","from":0,"to":3}')).toBeNull()
  })
})
