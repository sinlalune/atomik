/** Pure URL-bar input handling for the web tab (CP-MVP-006 S03). */

/**
 * What the user typed, as a navigable URL: a bare host gains https://,
 * anything that isn't http(s) after that — javascript:, file:, garbage —
 * returns null (main re-validates regardless; this is the UX gate).
 */
export function normalizeInputUrl(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`
  try {
    const url = new URL(candidate)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
    return url.href
  } catch {
    return null
  }
}
