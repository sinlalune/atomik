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
 * SECURE_WEB_PREFERENCES.
 */
export function buildMainWindowOptions(
  preloadPath: string
): BrowserWindowConstructorOptions {
  return {
    width: 1200,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      ...SECURE_WEB_PREFERENCES,
      preload: preloadPath
    }
  }
}
