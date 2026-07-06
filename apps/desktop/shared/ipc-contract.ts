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
  getAppInfo: 'atomik:get-app-info',
  listDevDocs: 'atomik:list-dev-docs',
  readDevDoc: 'atomik:read-dev-doc',
  readWorkspaceState: 'atomik:read-workspace-state',
  writeWorkspaceState: 'atomik:write-workspace-state'
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

/** One readable file of the documentation bundle (16_16-dev-docs-tab.md). */
export type DevDocKind = 'markdown' | 'svg' | 'json'

export type DevDocEntry = {
  /** Path relative to docs/, always '/'-separated. */
  relPath: string
  /** Display label within its group (path without the group prefix). */
  label: string
}

export type DevDocsGroup = {
  /** Top-level folder under docs/, or '.' for root files. */
  id: string
  label: string
  entries: DevDocEntry[]
}

export type DevDocFile = {
  relPath: string
  kind: DevDocKind
  content: string
}

/**
 * Workspace layout — recoverable UI state, never knowledge (03). Persisted
 * to `.atomik/local-workspace.json`; deleting it loses only the layout.
 */
export type PaneDirection = 'horizontal' | 'vertical'

export type WorkspaceTab = {
  id: string
  /** Open set of view kinds (03): 'home' and 'dev-docs' exist today. */
  view: string
  /** View parameters, e.g. { docPath: 'bedrock/00_....md' } for dev-docs. */
  params?: Record<string, string>
}

export type PaneNode =
  | {
      kind: 'leaf'
      id: string
      tabs: WorkspaceTab[]
      activeTabId: string | null
    }
  | {
      kind: 'split'
      id: string
      /** 'horizontal' = children side by side; 'vertical' = stacked. */
      direction: PaneDirection
      /** Share of the first child, clamped to 0.1–0.9. */
      fraction: number
      first: PaneNode
      second: PaneNode
    }

export type WorkspaceState = {
  version: 1
  root: PaneNode
  focusedPaneId: string
}

/** The complete API the renderer may call. */
export type AtomikApi = {
  getAppInfo: () => Promise<AppInfo>
  /** Enumerates the docs bundle (read-only; generated artifacts excluded). */
  listDevDocs: () => Promise<DevDocsGroup[]>
  /** Reads one doc file; the main process validates the path against docs/. */
  readDevDoc: (relPath: string) => Promise<DevDocFile>
  /** Restores the saved workspace layout; null when absent or invalid. */
  readWorkspaceState: () => Promise<WorkspaceState | null>
  /** Persists the layout; the main process validates shape and size. */
  writeWorkspaceState: (state: WorkspaceState) => Promise<void>
}

/**
 * The documented preload surface. Kept as a runtime constant so tests can
 * compare it against the object actually handed to contextBridge.
 */
export const DOCUMENTED_PRELOAD_SURFACE = [
  'getAppInfo',
  'listDevDocs',
  'readDevDoc',
  'readWorkspaceState',
  'writeWorkspaceState'
] as const satisfies readonly (keyof AtomikApi)[]
