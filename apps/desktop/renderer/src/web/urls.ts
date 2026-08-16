/** Pure URL-bar and page-identity handling for the web tab. */

const PAGE_TITLE_MAX = 240

/**
 * Page titles cross from an untrusted remote document into trusted browser
 * chrome. React escapes markup, but controls and bidi overrides can still make
 * that chrome misleading. Keep one compact line and a comfortably bounded
 * workspace param; the full URL remains visible beside it and in the input.
 */
export function cleanWebPageTitle(raw: string | undefined): string {
  return (raw ?? '')
    .replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, PAGE_TITLE_MAX)
    .trim()
}

export type WebPageIdentity = {
  /** Metadata-led label used by the tab and the in-pane location surface. */
  label: string
  /** Sanitized metadata value safe to persist in renderer workspace state. */
  title: string
  /** Full current URL; deliberately retained as honest secondary identity. */
  url: string
  /** Full URL when it adds information beyond the primary label. */
  secondary: string | null
}

/**
 * One identity rule for every renderer-owned piece of browser chrome:
 * page title -> hostname -> URL -> generic Web label.
 */
export function webPageIdentity(
  rawUrl: string | undefined,
  rawTitle: string | undefined
): WebPageIdentity {
  const title = cleanWebPageTitle(rawTitle)
  const url = (rawUrl ?? '').trim()
  const usableUrl = url === 'about:blank' ? '' : url
  let hostname = ''
  if (usableUrl) {
    try {
      const parsed = new URL(usableUrl)
      if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
        hostname = parsed.hostname
      }
    } catch {
      // A malformed restored param is still an honest last-resort label.
    }
  }
  const label = title || hostname || usableUrl || 'Web'
  return {
    label,
    title,
    url: usableUrl,
    secondary: usableUrl && usableUrl !== label ? usableUrl : null
  }
}

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
