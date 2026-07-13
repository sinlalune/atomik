import type { WebPreferences } from 'electron'
import type { WebViewBounds, WebViewControlAction } from '../shared/ipc-contract'
import { SECURE_WEB_PREFERENCES } from './security'

/**
 * The pure half of the embedded web view (CP-MVP-006 S03, bedrock 09/13;
 * dated engine decision: sessions/2026-07-13-web-engine-decision.md).
 * Everything here is electron-free and unit-tested; index.ts owns the
 * WebContentsView registry and applies these gates. The trusted UI and
 * the untrusted page never share anything but the typed state snapshot.
 */

/** One shared persistent partition for all web tabs (S02 decision):
 *  logins survive restarts; cookies live under userData/Partitions,
 *  fully separate from the trusted UI session; Atomik keys and
 *  channels never enter it. */
export const WEB_PARTITION = 'persist:web-sources'

/** Permissions the embedded web session may hold — everything else is
 *  denied outright (S02: fullscreen for videos/apps, sanitized clipboard
 *  writes because copying from Colab cells IS the learning flow). */
export const WEB_ALLOWED_PERMISSIONS: ReadonlySet<string> = new Set([
  'fullscreen',
  'clipboard-sanitized-write'
])

/** The guest gets the four required settings (13) and NO preload —
 *  zero bridge surface for remote content. */
export function guestWebPreferences(): WebPreferences {
  return { ...SECURE_WEB_PREFERENCES, partition: WEB_PARTITION }
}

/** View ids are tab ids — uuid-shaped opaque tokens, nothing pathy. */
export function isWebViewId(raw: unknown): raw is string {
  return typeof raw === 'string' && /^[0-9a-zA-Z_-]{1,64}$/.test(raw)
}

/** The embedded view browses the WEB and nothing else: http(s) plus the
 *  blank page. file:, javascript:, data:, chrome: … are all refused —
 *  in main, regardless of what the renderer asked. */
export function isAllowedWebUrl(raw: unknown): raw is string {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > 8192) {
    return false
  }
  if (raw === 'about:blank') return true
  try {
    const url = new URL(raw)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

export function isWebViewControlAction(
  raw: unknown
): raw is WebViewControlAction {
  return raw === 'back' || raw === 'forward' || raw === 'reload' || raw === 'stop'
}

/** Bounds arrive from the renderer's rect reports: integers, never
 *  negative, capped — garbage returns null and moves nothing. */
export function clampedViewBounds(raw: unknown): WebViewBounds | null {
  const candidate = raw as Partial<WebViewBounds> | null
  const dimension = (value: unknown): number | null =>
    typeof value === 'number' && Number.isFinite(value)
      ? Math.min(32000, Math.max(0, Math.round(value)))
      : null
  const x = dimension(candidate?.x)
  const y = dimension(candidate?.y)
  const width = dimension(candidate?.width)
  const height = dimension(candidate?.height)
  if (x === null || y === null || width === null || height === null) return null
  return { x, y, width, height }
}

/**
 * The web session's user agent, minus the tokens that make sites treat
 * an embedded browser as suspicious (the named Google-login-wall risk,
 * S02): the Electron token and the app's own name/version token. The
 * result reads as plain Chrome; the mitigation is recorded, not hidden.
 */
export function normalizeChromeUserAgent(
  userAgent: string,
  appToken?: string
): string {
  let normalized = userAgent.replace(/\s?Electron\/[\d.]+/g, '')
  if (appToken) {
    const escaped = appToken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    normalized = normalized.replace(
      new RegExp(`\\s?${escaped}/[\\d.]+`, 'g'),
      ''
    )
  }
  return normalized.replace(/\s{2,}/g, ' ').trim()
}

/**
 * The wall fell anyway (owner bench 2026-07-13, "Impossible de vous
 * connecter — ce navigateur ou cette application ne sont peut-être pas
 * sécurisés"): the clean Chrome UA is betrayed by the CLIENT-HINT
 * brands — captured on this machine: `Not;A=Brand + Chromium` WITHOUT
 * `Google Chrome`, the fingerprint of an embedded Chromium. The dated
 * mitigation (community-standard for a human logging into their OWN
 * account in an Electron browser; nativefier#831 lineage): on the
 * Google AUTH hosts only, the guest presents as FIREFOX — a profile
 * that legitimately sends no Chromium client hints — while everywhere
 * else (Colab included, which wants Chrome) keeps the normalized
 * Chrome UA. Checked 2026-07-13; recheck triggers: Google walls again,
 * or flags the pinned Firefox version as outdated.
 */
export const GOOGLE_AUTH_HOSTS: ReadonlySet<string> = new Set([
  'accounts.google.com',
  'accounts.youtube.com'
])

export const FIREFOX_UA =
  'Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0'

/** Exact-hostname match — `accounts.google.com.evil.example` stays out. */
export function isGoogleAuthUrl(raw: string): boolean {
  try {
    return GOOGLE_AUTH_HOSTS.has(new URL(raw).hostname)
  } catch {
    return false
  }
}

/** Headers for an auth-host request: Firefox UA, client hints REMOVED —
 *  a Firefox that sends Sec-CH-UA would be a new fingerprint, not a fix. */
export function authRequestHeaders(
  headers: Record<string, string>
): Record<string, string> {
  const rewritten: Record<string, string> = {}
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase().startsWith('sec-ch-ua')) continue
    if (key.toLowerCase() === 'user-agent') continue
    rewritten[key] = value
  }
  rewritten['User-Agent'] = FIREFOX_UA
  return rewritten
}
