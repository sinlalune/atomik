import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  clearImageCache,
  getCachedImage,
  imageCacheStats,
  invalidateImage,
  isCachedDataUrl,
  setCachedImage,
  setImageCacheBudgetForTests
} from '../renderer/src/vault/image-cache'

/** A fake data URL of exactly `bytes` characters. */
const url = (bytes: number, tag = 'x'): string =>
  `data:${tag};`.padEnd(bytes, 'a')

/** Tiny test budget so eviction is exercised without MB allocations. */
const BUDGET = 1000

describe('the shared bounded image cache (perf audit 2026-07-15)', () => {
  beforeEach(() => {
    clearImageCache()
    setImageCacheBudgetForTests(BUDGET)
  })
  afterEach(() => setImageCacheBudgetForTests(null))

  it('round-trips entries and reports honest stats', () => {
    setCachedImage('a.png', url(100))
    expect(getCachedImage('a.png')).toBe(url(100))
    expect(imageCacheStats()).toEqual({ count: 1, bytes: 100 })
  })

  it('markers cost zero bytes and read back', () => {
    setCachedImage('a.png', 'loading')
    setCachedImage('b.png', 'failed')
    expect(getCachedImage('a.png')).toBe('loading')
    expect(getCachedImage('b.png')).toBe('failed')
    expect(imageCacheStats().bytes).toBe(0)
    expect(isCachedDataUrl(getCachedImage('a.png'))).toBe(false)
    expect(isCachedDataUrl(getCachedImage('b.png'))).toBe(false)
    expect(isCachedDataUrl('data:image/png;base64,AAA')).toBe(true)
  })

  it('replacing an entry replaces its byte count, never doubles it', () => {
    setCachedImage('a.png', url(100))
    setCachedImage('a.png', url(60))
    expect(imageCacheStats()).toEqual({ count: 1, bytes: 60 })
  })

  it('evicts oldest-first once over budget, and only as far as needed', () => {
    setCachedImage('old.png', url(500))
    setCachedImage('mid.png', url(400)) // 900 ≤ 1000, both stay
    setCachedImage('new.png', url(400)) // 1300 > 1000 → old goes, 800 fits
    expect(getCachedImage('old.png')).toBeUndefined()
    expect(getCachedImage('mid.png')).toBe(url(400)) // eviction stopped in time
    expect(getCachedImage('new.png')).toBe(url(400))
    expect(imageCacheStats()).toEqual({ count: 2, bytes: 800 })
  })

  it('a read refreshes recency: the recently-used entry survives eviction', () => {
    setCachedImage('first.png', url(500))
    setCachedImage('second.png', url(400))
    getCachedImage('first.png') // now newest
    setCachedImage('third.png', url(500)) // evicts second (oldest), not first
    expect(getCachedImage('first.png')).toBe(url(500))
    expect(getCachedImage('second.png')).toBeUndefined()
    expect(getCachedImage('third.png')).toBe(url(500))
  })

  it('a single oversized entry stays usable', () => {
    setCachedImage('huge.png', url(BUDGET + 5))
    expect(getCachedImage('huge.png')).toBe(url(BUDGET + 5))
    expect(imageCacheStats().count).toBe(1)
    setCachedImage('next.png', url(10)) // the oversized one now leaves
    expect(getCachedImage('huge.png')).toBeUndefined()
    expect(getCachedImage('next.png')).toBe(url(10))
  })

  it('invalidateImage drops exactly one asset (the rotation fix)', () => {
    setCachedImage('a.png', url(100))
    setCachedImage('b.png', url(50))
    invalidateImage('a.png')
    expect(getCachedImage('a.png')).toBeUndefined()
    expect(getCachedImage('b.png')).toBe(url(50))
    expect(imageCacheStats()).toEqual({ count: 1, bytes: 50 })
    invalidateImage('missing.png') // no-op, no drift
    expect(imageCacheStats()).toEqual({ count: 1, bytes: 50 })
  })

  it('clearImageCache drops everything (the vault-switch fix)', () => {
    setCachedImage('a.png', url(100))
    setCachedImage('b.png', 'loading')
    clearImageCache()
    expect(imageCacheStats()).toEqual({ count: 0, bytes: 0 })
    expect(getCachedImage('a.png')).toBeUndefined()
  })
})
