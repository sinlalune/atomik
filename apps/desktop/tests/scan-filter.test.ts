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

describe('EXIF orientation (CP-MVP-005 S05e) — the display/OCR parity fix', () => {
  const app1 = (tiff: number[]): Buffer => {
    const payload = Buffer.from([0x45, 0x78, 0x69, 0x66, 0, 0, ...tiff])
    const header = Buffer.from([0xff, 0xd8, 0xff, 0xe1, 0, 0])
    header.writeUInt16BE(payload.length + 2, 4)
    return Buffer.concat([header, payload])
  }

  it('reads orientation 6 (little-endian) as 90° CW', async () => {
    const { exifOrientationDegrees } = await import('../electron-main/exif')
    const jpeg = app1([
      0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, // II, 42, IFD@8
      0x01, 0x00, // 1 entry
      0x12, 0x01, 0x03, 0x00, 0x01, 0x00, 0x00, 0x00, 0x06, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00
    ])
    expect(exifOrientationDegrees(jpeg)).toBe(90)
  })

  it('reads orientation 3 (big-endian) as 180°, and tolerates absence/garbage', async () => {
    const { exifOrientationDegrees } = await import('../electron-main/exif')
    const jpeg = app1([
      0x4d, 0x4d, 0x00, 0x2a, 0x00, 0x00, 0x00, 0x08, // MM, 42, IFD@8
      0x00, 0x01,
      0x01, 0x12, 0x00, 0x03, 0x00, 0x00, 0x00, 0x01, 0x00, 0x03, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00
    ])
    expect(exifOrientationDegrees(jpeg)).toBe(180)
    expect(exifOrientationDegrees(Buffer.from([0xff, 0xd8, 0xff, 0xd9]))).toBe(0)
    expect(exifOrientationDegrees(Buffer.from('not a jpeg'))).toBe(0)
  })
})
