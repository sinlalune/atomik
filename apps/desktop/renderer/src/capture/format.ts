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
