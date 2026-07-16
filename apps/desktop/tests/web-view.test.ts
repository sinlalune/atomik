import { describe, expect, it } from 'vitest'
import { SECURE_WEB_PREFERENCES } from '../electron-main/security'
import {
  authRequestHeaders,
  clampedViewBounds,
  FIREFOX_UA,
  guestWebPreferences,
  isAllowedWebUrl,
  isGoogleAuthUrl,
  isSnapshotRelPath,
  isWebViewControlAction,
  isWebViewId,
  normalizeChromeUserAgent,
  SNAPSHOT_PARTITION,
  snapshotWebPreferences,
  WEB_ALLOWED_PERMISSIONS,
  WEB_PARTITION
} from '../electron-main/web-view'

describe('embedded web view gates (CP-MVP-006 S03, 13)', () => {
  it('the guest gets the four required settings, the partition, and NO preload', () => {
    const prefs = guestWebPreferences()
    expect(prefs).toEqual({
      ...SECURE_WEB_PREFERENCES,
      partition: WEB_PARTITION
    })
    // zero bridge surface for remote content — asserted, not assumed
    expect('preload' in prefs).toBe(false)
    expect(WEB_PARTITION.startsWith('persist:')).toBe(true)
  })

  it('the web session may hold exactly two permissions', () => {
    expect([...WEB_ALLOWED_PERMISSIONS].sort()).toEqual([
      'clipboard-sanitized-write',
      'fullscreen'
    ])
  })

  it('the view browses the web and nothing else', () => {
    expect(isAllowedWebUrl('https://colab.research.google.com/')).toBe(true)
    expect(isAllowedWebUrl('http://localhost:8888/tree')).toBe(true)
    expect(isAllowedWebUrl('about:blank')).toBe(true)
    expect(isAllowedWebUrl('file:///etc/passwd')).toBe(false)
    expect(isAllowedWebUrl('javascript:alert(1)')).toBe(false)
    expect(isAllowedWebUrl('data:text/html,<h1>x</h1>')).toBe(false)
    expect(isAllowedWebUrl('chrome://gpu')).toBe(false)
    expect(isAllowedWebUrl('not a url')).toBe(false)
    expect(isAllowedWebUrl('')).toBe(false)
    expect(isAllowedWebUrl(42)).toBe(false)
    expect(isAllowedWebUrl(`https://x.example/${'a'.repeat(9000)}`)).toBe(false)
  })

  it('view ids are opaque tokens, never pathy', () => {
    expect(isWebViewId('7f3b2c1e-9d4a-4b8e-a1c2-3d4e5f607182')).toBe(true)
    expect(isWebViewId('tab_1')).toBe(true)
    expect(isWebViewId('')).toBe(false)
    expect(isWebViewId('a/b')).toBe(false)
    expect(isWebViewId('x'.repeat(65))).toBe(false)
    expect(isWebViewId(7)).toBe(false)
  })

  it('control actions are a closed set', () => {
    for (const action of ['back', 'forward', 'reload', 'stop']) {
      expect(isWebViewControlAction(action)).toBe(true)
    }
    expect(isWebViewControlAction('devtools')).toBe(false)
    expect(isWebViewControlAction(null)).toBe(false)
  })

  it('bounds are rounded, clamped, and garbage moves nothing', () => {
    expect(clampedViewBounds({ x: 10.6, y: -4, width: 640.2, height: 480 })).toEqual({
      x: 11,
      y: 0,
      width: 640,
      height: 480
    })
    expect(clampedViewBounds({ x: 0, y: 0, width: 99999, height: 10 })).toEqual({
      x: 0,
      y: 0,
      width: 32000,
      height: 10
    })
    expect(clampedViewBounds({ x: 0, y: 0, width: Number.NaN, height: 10 })).toBeNull()
    expect(clampedViewBounds({ x: 0, y: 0, width: 10 })).toBeNull()
    expect(clampedViewBounds(null)).toBeNull()
    expect(clampedViewBounds('rect')).toBeNull()
  })

  it('the session UA reads as plain Chrome (the login-wall mitigation, dated)', () => {
    const stock =
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) atomik-desktop/0.1.0 Chrome/140.0.0.0 Electron/43.0.0 Safari/537.36'
    const normalized = normalizeChromeUserAgent(stock, 'atomik-desktop')
    expect(normalized).toBe(
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'
    )
    // idempotent on an already-clean UA
    expect(normalizeChromeUserAgent(normalized, 'atomik-desktop')).toBe(normalized)
  })

  it('only the exact Google auth hosts get the Firefox presentation (S03c)', () => {
    expect(isGoogleAuthUrl('https://accounts.google.com/v3/signin')).toBe(true)
    expect(isGoogleAuthUrl('https://accounts.youtube.com/accounts/x')).toBe(true)
    expect(isGoogleAuthUrl('https://colab.research.google.com/')).toBe(false)
    expect(isGoogleAuthUrl('https://www.google.com/')).toBe(false)
    // exact hostname: a lookalike suffix domain stays out
    expect(isGoogleAuthUrl('https://accounts.google.com.evil.example/')).toBe(false)
    expect(isGoogleAuthUrl('not a url')).toBe(false)
  })

  it('auth requests present as Firefox with client hints REMOVED (S03c)', () => {
    expect(FIREFOX_UA).toContain('Firefox/')
    expect(FIREFOX_UA).not.toContain('Chrome')
    expect(FIREFOX_UA).not.toContain('Electron')
    const rewritten = authRequestHeaders({
      'User-Agent': 'Mozilla/5.0 (...) Chrome/150.0.0.0 Safari/537.36',
      'sec-ch-ua': '"Not;A=Brand";v="8", "Chromium";v="150"',
      'Sec-CH-UA-Mobile': '?0',
      'sec-ch-ua-platform': '"Linux"',
      Accept: 'text/html',
      Cookie: 'x=1'
    })
    expect(rewritten['User-Agent']).toBe(FIREFOX_UA)
    expect(Object.keys(rewritten).some((k) => k.toLowerCase().startsWith('sec-ch-ua'))).toBe(false)
    expect(rewritten['Accept']).toBe('text/html')
    expect(rewritten['Cookie']).toBe('x=1')
  })
})

describe('snapshot preview gates (S07e-c)', () => {
  it('snapshotWebPreferences: four required settings, EPHEMERAL partition', () => {
    const prefs = snapshotWebPreferences()
    expect(prefs.sandbox).toBe(true)
    expect(prefs.contextIsolation).toBe(true)
    expect(prefs.nodeIntegration).toBe(false)
    expect(prefs.webSecurity).toBe(true)
    expect(prefs.partition).toBe(SNAPSHOT_PARTITION)
    expect(prefs.partition!.startsWith('persist:')).toBe(false)
    expect(prefs.partition).not.toBe(WEB_PARTITION)
    expect(prefs.preload).toBeUndefined()
  })

  it('isSnapshotRelPath: only clean vault-relative snapshot.mhtml paths', () => {
    expect(isSnapshotRelPath('sources/web/page/snapshot.mhtml')).toBe(true)
    expect(isSnapshotRelPath('deep/nested/bundle/snapshot.mhtml')).toBe(true)
    expect(isSnapshotRelPath('snapshot.mhtml')).toBe(true)
    expect(isSnapshotRelPath('sources/web/page/other.mhtml')).toBe(false)
    expect(isSnapshotRelPath('sources/web/page/source.md')).toBe(false)
    expect(isSnapshotRelPath('../escape/snapshot.mhtml')).toBe(false)
    expect(isSnapshotRelPath('a/./b/snapshot.mhtml')).toBe(false)
    expect(isSnapshotRelPath('/abs/snapshot.mhtml')).toBe(false)
    expect(isSnapshotRelPath('a\\b\\snapshot.mhtml')).toBe(false)
    expect(isSnapshotRelPath('a//snapshot.mhtml')).toBe(false)
    expect(isSnapshotRelPath('')).toBe(false)
    expect(isSnapshotRelPath(42)).toBe(false)
  })
})
