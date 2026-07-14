import { afterEach, describe, expect, it } from 'vitest'
import {
  canGoBack,
  canGoForward,
  goBack,
  goForward,
  recordVisit,
  resetTrails
} from '../renderer/src/vault/nav-history'

afterEach(resetTrails)

describe('note navigation history (owner request: ‹ › through consulted pages)', () => {
  it('records a linear trail and steps back/forward through it', () => {
    recordVisit('tab1', 'a.md')
    recordVisit('tab1', 'b.md')
    recordVisit('tab1', 'c.md')
    expect(canGoBack('tab1')).toBe(true)
    expect(canGoForward('tab1')).toBe(false)
    expect(goBack('tab1')).toBe('b.md')
    expect(goBack('tab1')).toBe('a.md')
    expect(canGoBack('tab1')).toBe(false)
    expect(goBack('tab1')).toBeNull()
    expect(goForward('tab1')).toBe('b.md')
    expect(goForward('tab1')).toBe('c.md')
    expect(canGoForward('tab1')).toBe(false)
  })

  it('re-recording the CURRENT entry is a no-op (back/forward and refresh)', () => {
    recordVisit('t', 'a.md')
    recordVisit('t', 'a.md') // same page again — no growth
    recordVisit('t', 'b.md')
    expect(goBack('t')).toBe('a.md')
    // stepping back leaves cursor on a.md; recording a.md again = no-op
    recordVisit('t', 'a.md')
    expect(canGoForward('t')).toBe(true) // forward branch (b.md) intact
    expect(goForward('t')).toBe('b.md')
  })

  it('a NEW visit while back in the trail drops the forward branch', () => {
    recordVisit('t', 'a.md')
    recordVisit('t', 'b.md')
    recordVisit('t', 'c.md')
    goBack('t') // now at b.md
    recordVisit('t', 'd.md') // diverge — c.md is gone
    expect(canGoForward('t')).toBe(false)
    expect(goBack('t')).toBe('b.md')
    expect(goForward('t')).toBe('d.md')
  })

  it('trails are per-tab and independent', () => {
    recordVisit('tabA', 'a1.md')
    recordVisit('tabA', 'a2.md')
    recordVisit('tabB', 'b1.md')
    expect(canGoBack('tabA')).toBe(true)
    expect(canGoBack('tabB')).toBe(false)
    expect(goBack('tabA')).toBe('a1.md')
    expect(goBack('tabB')).toBeNull()
  })

  it('an unknown tab has no history', () => {
    expect(canGoBack('nope')).toBe(false)
    expect(canGoForward('nope')).toBe(false)
    expect(goBack('nope')).toBeNull()
  })
})
