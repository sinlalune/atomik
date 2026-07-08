import { describe, expect, it } from 'vitest'
import { scanCleanRgba } from '../electron-main/scan-filter'

/** Synthetic page photo: paper brightness slides 120→220 across the
 *  width (uneven lighting), "ink" pixels sit at 25% of local paper. */
function syntheticPage(width: number, height: number): { pixels: Buffer; ink: Array<[number, number]> } {
  const pixels = Buffer.alloc(width * height * 4)
  const ink: Array<[number, number]> = []
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const paper = 120 + Math.round((100 * x) / width)
      // ~2.9% ink — realistic for a printed page (the P1 anchor of the
      // stretch assumes ink+shadows exceed 1% of pixels, as on paper)
      const isInk = x % 7 === 3 && y % 5 === 2
      const value = isInk ? Math.round(paper * 0.25) : paper
      if (isInk) ink.push([x, y])
      const o = (y * width + x) * 4
      pixels[o] = value
      pixels[o + 1] = value
      pixels[o + 2] = value
      pixels[o + 3] = 255
    }
  }
  return { pixels, ink }
}

describe('scan filter (CP-MVP-005 S05b) — illumination flattening', () => {
  it('whitens uneven paper, keeps ink dark, and removes the lighting gradient', () => {
    const width = 96
    const height = 96
    const { pixels, ink } = syntheticPage(width, height)
    const out = scanCleanRgba(pixels, width, height)

    const at = (x: number, y: number): number => out[(y * width + x) * 4]!
    // paper saturates toward white on BOTH the dim and bright sides
    expect(at(10, 40)).toBeGreaterThan(230)
    expect(at(85, 40)).toBeGreaterThan(230)
    // the lighting gradient is gone: dim-side and bright-side paper match
    expect(Math.abs(at(10, 40) - at(85, 40))).toBeLessThan(12)
    // ink stays clearly dark
    const [ix, iy] = ink[Math.floor(ink.length / 2)]!
    expect(at(ix, iy)).toBeLessThan(120)
    // alpha intact, output same size
    expect(out.length).toBe(pixels.length)
    expect(out[3]).toBe(255)
  })

  it('rejects a buffer smaller than the declared dimensions', () => {
    expect(() => scanCleanRgba(Buffer.alloc(16), 10, 10)).toThrow('scan-filter')
  })
})
