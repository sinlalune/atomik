/** Pure omnibox and page-identity handling for the web tab. */

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

const BLOCKED_INPUT_SCHEMES = new Set([
  'about',
  'chrome',
  'data',
  'file',
  'javascript',
  'mailto',
  'tel',
  'vbscript'
])

function parsedHttpUrl(candidate: string): string | null {
  try {
    const url = new URL(candidate)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
    return url.hostname ? url.href : null
  } catch {
    return null
  }
}

/** A scheme-less value that is clearly an address rather than prose. */
function bareWebAddress(raw: string): string | null {
  if (/\s/.test(raw)) return null
  try {
    const url = new URL(`https://${raw}`)
    if (url.username || url.password) return null
    const host = url.hostname.toLowerCase()
    const localAddress =
      host === 'localhost' ||
      host.includes(':') ||
      /^(?:\d{1,3}\.){3}\d{1,3}$/.test(host)
    const addressLike = localAddress || host.includes('.')
    if (localAddress) url.protocol = 'http:'
    return addressLike ? url.href : null
  } catch {
    return null
  }
}

function googleSearchUrl(query: string): string {
  const search = new URL('https://www.google.com/search')
  search.searchParams.set('q', query)
  return search.href
}

/**
 * What the user submitted to the web-tab omnibox. Explicit http(s) and clear
 * bare hosts navigate; ordinary prose and single words become a Google search.
 * Explicit browser/local schemes still fail closed (main re-validates the
 * resulting http(s) URL regardless). Search operators such as `site:` remain
 * useful because only known unsafe schemes or `scheme://` forms are rejected.
 */
export function normalizeInputUrl(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null

  const bare = bareWebAddress(trimmed)
  if (bare !== null) return bare

  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(trimmed)
  if (scheme) {
    const name = scheme[1]!.toLowerCase()
    if (name === 'http' || name === 'https') return parsedHttpUrl(trimmed)
    if (
      BLOCKED_INPUT_SCHEMES.has(name) ||
      trimmed.slice(scheme[0].length).startsWith('//')
    ) {
      return null
    }
  }

  return googleSearchUrl(trimmed)
}
