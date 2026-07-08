/**
 * Minimal EXIF orientation reader (CP-MVP-005 S05e): phone JPEGs store
 * sideways pixels + an Orientation tag; Chromium's display path honors
 * it silently, Electron's nativeImage does NOT — so the OCR seat must
 * (the S04 incident's true root cause: the owner's page LOOKED portrait
 * while the model received landscape). Dependency-free, tolerant:
 * anything unexpected returns 0.
 */
export function exifOrientationDegrees(bytes: Buffer): 0 | 90 | 180 | 270 {
  try {
    if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return 0
    let offset = 2
    while (offset + 4 <= bytes.length) {
      if (bytes[offset] !== 0xff) return 0
      const marker = bytes[offset + 1]!
      if (marker === 0xda || marker === 0xd9) return 0 // image data / end
      const length = bytes.readUInt16BE(offset + 2)
      if (marker === 0xe1 && bytes.subarray(offset + 4, offset + 10).toString('latin1') === 'Exif\0\0') {
        const tiff = offset + 10
        const little = bytes.subarray(tiff, tiff + 2).toString('latin1') === 'II'
        const read16 = (at: number): number =>
          little ? bytes.readUInt16LE(at) : bytes.readUInt16BE(at)
        const read32 = (at: number): number =>
          little ? bytes.readUInt32LE(at) : bytes.readUInt32BE(at)
        if (read16(tiff + 2) !== 42) return 0
        const ifd = tiff + read32(tiff + 4)
        const entries = read16(ifd)
        for (let i = 0; i < entries; i++) {
          const entry = ifd + 2 + i * 12
          if (read16(entry) === 0x0112) {
            const value = read16(entry + 8)
            // mirrored variants map to their rotation component
            if (value === 3 || value === 4) return 180
            if (value === 6 || value === 5) return 90
            if (value === 8 || value === 7) return 270
            return 0
          }
        }
        return 0
      }
      offset += 2 + length
    }
    return 0
  } catch {
    return 0
  }
}
