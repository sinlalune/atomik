import type { BrowserWindowConstructorOptions, WebPreferences } from 'electron'

/**
 * Required settings from 13_13-electron-security.md §Required settings and
 * docs/contracts/electron_security_contract_v0_2.json. Electron's defaults
 * already match most of these; they are pinned explicitly so the contract is
 * enforced by code and tests rather than by upstream defaults.
 *
 * tests/security-contract.test.ts asserts this object exactly — adding any
 * extra webPreferences key (e.g. a forbidden shortcut) fails the suite and
 * forces a reviewed decision.
 */
export const SECURE_WEB_PREFERENCES = {
  nodeIntegration: false,
  contextIsolation: true,
  sandbox: true,
  webSecurity: true
} as const satisfies WebPreferences

/**
 * Options for the trusted Atomik UI window. The preload path is the only
 * per-call input; everything security-relevant comes from
 * SECURE_WEB_PREFERENCES. The platform is injectable for tests only.
 *
 * frame:false — the window is chromeless (owner feedback on MVP-001:
 * tabs ARE the top row; no native title bar, no brand row). The renderer
 * supplies drag regions via CSS and frame verbs through the validated
 * `window-control` channel; nothing about the trust boundary changes.
 *
 * hasShadow:false on Linux — Chromium draws frameless windows with a
 * client-side shadow whose invisible frame margins WSLg keeps honoring
 * when maximized: transparent gap around the content, window offset
 * right (owner report; fullscreen looked correct because it drops the
 * margins). The OS side of WSLg draws window shadows itself, so the
 * client-side one is pure liability there. macOS keeps its native
 * shadow; Windows ignores the flag for normal windows.
 */
export function buildMainWindowOptions(
  preloadPath: string,
  platform: NodeJS.Platform = process.platform
): BrowserWindowConstructorOptions {
  return {
    width: 1200,
    height: 800,
    show: false,
    frame: false,
    ...(platform === 'linux' ? { hasShadow: false } : {}),
    autoHideMenuBar: true,
    webPreferences: {
      ...SECURE_WEB_PREFERENCES,
      preload: preloadPath
    }
  }
}
