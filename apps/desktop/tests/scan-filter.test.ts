import { describe, expect, it } from 'vitest'
import { rotateRgba, scanCleanRgba } from '../electron-main/scan-filter'

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

  it('rotates clockwise by quarter turns (dossier rotation)', () => {
    // 2×1 image: [A B] — after 90° CW it is 1 wide, 2 tall: [A] over [B]
    const px = Buffer.from([1, 1, 1, 255, 2, 2, 2, 255])
    const quarter = rotateRgba(px, 2, 1, 90)
    expect([quarter.width, quarter.height]).toEqual([1, 2])
    expect(quarter.pixels[0]).toBe(1)
    expect(quarter.pixels[4]).toBe(2)
    // 270° CW: [B] over [A]
    const threeQuarter = rotateRgba(px, 2, 1, 270)
    expect(threeQuarter.pixels[0]).toBe(2)
    expect(threeQuarter.pixels[4]).toBe(1)
    // 0° and 360° are identity
    expect(rotateRgba(px, 2, 1, 360).pixels.equals(px)).toBe(true)
  })
})
