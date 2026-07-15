/**
 * ONE bounded cache for vault image data URLs, shared by live mode
 * (the editor's ImageWidget) and read mode (useVaultNote's inliner).
 * The perf audit (2026-07-15) found the two previous extremes: live
 * cached forever (unbounded growth, and STALE bytes after a vault
 * switch or a photo rotation — two real bugs), read cached nothing
 * (every autosave re-fetched every inline image over IPC).
 *
 * Entries are FINAL display data URLs (rotation already baked in),
 * keyed by vault relPath, plus the 'loading'/'failed' markers the live
 * widget uses to avoid duplicate fetches and to render honest broken
 * chips. LRU by Map insertion order under a byte budget; invalidation
 * is explicit: clearImageCache() on vault switch, invalidateImage(rel)
 * when a rotation lands (the next consumer re-fetches and re-bakes).
 */

export const IMAGE_CACHE_BUDGET_BYTES = 64 * 1024 * 1024

export type CachedImage = string | 'loading' | 'failed'

const entries = new Map<string, CachedImage>()
let totalBytes = 0
let budgetBytes = IMAGE_CACHE_BUDGET_BYTES

/** Test seam: shrink the budget so eviction is testable without
 *  allocating tens of MB; null restores the real one. */
export function setImageCacheBudgetForTests(bytes: number | null): void {
  budgetBytes = bytes ?? IMAGE_CACHE_BUDGET_BYTES
}

/** Markers are free; a data URL costs its string length (≈ bytes). */
function bytesOf(value: CachedImage): number {
  return value === 'loading' || value === 'failed' ? 0 : value.length
}

/** A cached data URL is any string that is not one of the markers. */
export function isCachedDataUrl(value: CachedImage | undefined): value is string {
  return typeof value === 'string' && value !== 'loading' && value !== 'failed'
}

export function getCachedImage(relPath: string): CachedImage | undefined {
  const hit = entries.get(relPath)
  if (hit === undefined) return undefined
  // refresh recency: Maps iterate in insertion order, so re-inserting
  // makes this entry the newest — eviction takes the oldest first
  entries.delete(relPath)
  entries.set(relPath, hit)
  return hit
}

export function setCachedImage(relPath: string, value: CachedImage): void {
  const previous = entries.get(relPath)
  if (previous !== undefined) {
    entries.delete(relPath)
    totalBytes -= bytesOf(previous)
  }
  entries.set(relPath, value)
  totalBytes += bytesOf(value)
  // evict oldest-first until under budget; never evict the entry just
  // set (a single oversized image stays usable and goes out with the
  // next eviction pass)
  for (const [key, cached] of entries) {
    if (totalBytes <= budgetBytes) break
    if (key === relPath) continue
    entries.delete(key)
    totalBytes -= bytesOf(cached)
  }
}

/** A rotation landed for this asset: drop it so the next consumer
 *  re-fetches with the new rotation baked in. */
export function invalidateImage(relPath: string): void {
  const previous = entries.get(relPath)
  if (previous === undefined) return
  entries.delete(relPath)
  totalBytes -= bytesOf(previous)
}

/** Vault switch: same relPaths, different files — drop everything. */
export function clearImageCache(): void {
  entries.clear()
  totalBytes = 0
}

/** Test seam. */
export function imageCacheStats(): { count: number; bytes: number } {
  return { count: entries.size, bytes: totalBytes }
}
