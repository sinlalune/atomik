/**
 * The single source of truth for the renderer-facing API surface.
 *
 * 13_13-electron-security.md §IPC rule: channels are named, narrow, typed,
 * documented, and input-validated. Anything exposed to the renderer MUST be
 * declared here; tests/preload-surface.test.ts fails on any drift between
 * this contract and what the preload actually exposes.
 */

/** The one key the preload publishes on `window`. */
export const ATOMIK_API_KEY = 'atomik' as const

/** Named IPC channels. One entry per channel; no generic bridge. */
export const ATOMIK_CHANNELS = {
  getAppInfo: 'atomik:get-app-info'
} as const

/** Read-only identity of the running shell. No vault paths, no secrets. */
export type AppInfo = {
  name: string
  version: string
  electron: string
  chrome: string
  /** Node version of the main process; the renderer itself has no Node. */
  node: string
  platform: string
}

/** The complete API the renderer may call. */
export type AtomikApi = {
  getAppInfo: () => Promise<AppInfo>
}

/**
 * The documented preload surface. Kept as a runtime constant so tests can
 * compare it against the object actually handed to contextBridge.
 */
export const DOCUMENTED_PRELOAD_SURFACE = [
  'getAppInfo'
] as const satisfies readonly (keyof AtomikApi)[]
