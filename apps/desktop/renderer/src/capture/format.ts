/** Pure display helpers for the capture view (unit-tested headless). */

/** Remaining session time as m:ss; never negative. */
export function formatRemaining(expiresAtMs: number, nowMs: number): string {
  const remaining = Math.max(0, Math.ceil((expiresAtMs - nowMs) / 1000))
  const minutes = Math.floor(remaining / 60)
  const seconds = remaining % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

/** Byte counts the way a human reads them (display only, base 1024). */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** Display-side slug for the DEFAULT destination only (mirrors main's
 *  slugify; main re-validates whatever the user actually submits). */
export function captureSlug(text: string): string {
  const slug = text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug.length > 0 ? slug : 'capture'
}

/** Title guess from the phone's file name: stem, separators to spaces. */
export function captureTitleOf(fileName: string): string {
  const stem = fileName.replace(/\.[A-Za-z0-9]+$/, '')
  const spaced = stem.replace(/[-_.]+/g, ' ').trim()
  return spaced.length > 0 ? spaced : 'Phone capture'
}

/** Default bundle folder per 08's file model: sources/captures/<date-slug>. */
export function defaultCaptureDestination(
  fileName: string,
  nowMs: number
): string {
  const day = new Date(nowMs).toISOString().slice(0, 10)
  return `sources/captures/${day}-${captureSlug(captureTitleOf(fileName))}`
}
