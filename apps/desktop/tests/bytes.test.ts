import { describe, expect, it } from 'vitest'
import { base64ToBytes } from '../renderer/src/source/bytes'

describe('base64ToBytes (the fast decode, perf audit 2026-07-15)', () => {
  it('decodes exactly like the per-char callback it replaces', () => {
    const original = new Uint8Array([0, 1, 2, 127, 128, 200, 255, 66, 10, 13])
    const base64 = Buffer.from(original).toString('base64')
    expect(base64ToBytes(base64)).toEqual(original)
    expect(base64ToBytes(base64)).toEqual(
      Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
    )
  })

  it('handles empty input and binary round trips', () => {
    expect(base64ToBytes('')).toEqual(new Uint8Array(0))
    const blob = Buffer.from(
      Array.from({ length: 4096 }, (_, i) => (i * 37) % 256)
    )
    expect(Buffer.from(base64ToBytes(blob.toString('base64')))).toEqual(blob)
  })
})
