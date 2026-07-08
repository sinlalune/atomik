/**
 * The owner's "custom scan filter", seated (CP-MVP-005 S05b): the same
 * illumination-flattening that produced the bench's clean-scan tier
 * (S07 addendum 5 — divide by an estimated paper background, then a
 * percentile contrast stretch), reimplemented dependency-free on raw
 * RGBA/BGRA pixels so Electron's nativeImage is the only image code in
 * the app (15). Channel-order agnostic (channels are averaged), so BGRA
 * from `toBitmap()` is fine. Pure; ~O(n) via an integral image.
 */
export function scanCleanRgba(pixels: Buffer, width: number, height: number): Buffer {
  const n = width * height
  if (pixels.length < n * 4) throw new Error('scan-filter: buffer smaller than dimensions')

  // 1. channel-agnostic gray
  const gray = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const o = i * 4
    gray[i] = (pixels[o]! + pixels[o + 1]! + pixels[o + 2]!) / 3
  }

  // 2. background estimate: box mean over a large window (integral image)
  const integral = new Float64Array((width + 1) * (height + 1))
  for (let y = 0; y < height; y++) {
    let rowSum = 0
    for (let x = 0; x < width; x++) {
      rowSum += gray[y * width + x]!
      integral[(y + 1) * (width + 1) + (x + 1)] = integral[y * (width + 1) + (x + 1)]! + rowSum
    }
  }
  const radius = Math.max(8, Math.round(Math.min(width, height) / 8))
  const boxMean = (x: number, y: number): number => {
    const x0 = Math.max(0, x - radius)
    const y0 = Math.max(0, y - radius)
    const x1 = Math.min(width, x + radius + 1)
    const y1 = Math.min(height, y + radius + 1)
    const sum =
      integral[y1 * (width + 1) + x1]! -
      integral[y0 * (width + 1) + x1]! -
      integral[y1 * (width + 1) + x0]! +
      integral[y0 * (width + 1) + x0]!
    return sum / ((x1 - x0) * (y1 - y0))
  }

  // 3. flatten: paper -> ~1, ink -> < 1 (histogram for the stretch)
  const flat = new Float32Array(n)
  const bins = new Uint32Array(512)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x
      const value = gray[i]! / Math.max(1, boxMean(x, y))
      flat[i] = value
      bins[Math.min(511, Math.max(0, Math.round(value * 256)))]++
    }
  }

  // 4. percentile stretch (P1..P90 — paper saturates to white)
  const percentile = (p: number): number => {
    const target = p * n
    let seen = 0
    for (let b = 0; b < 512; b++) {
      seen += bins[b]!
      if (seen >= target) return b / 256
    }
    return 511 / 256
  }
  const lo = percentile(0.01)
  const hi = Math.max(percentile(0.9), lo + 1e-6)

  const out = Buffer.alloc(n * 4)
  for (let i = 0; i < n; i++) {
    const norm = Math.min(1, Math.max(0, (flat[i]! - lo) / (hi - lo)))
    const v = Math.round(norm * 255)
    const o = i * 4
    out[o] = v
    out[o + 1] = v
    out[o + 2] = v
    out[o + 3] = 255
  }
  return out
}
