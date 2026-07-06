import type { AppInfo } from '../shared/ipc-contract'

export type AppInfoInput = {
  name: string
  version: string
  versions: Partial<Record<'electron' | 'chrome' | 'node', string>>
  platform: string
}

/**
 * Pure mapper behind the `atomik:get-app-info` handler, kept free of Electron
 * imports so it is unit-testable without an Electron runtime.
 */
export function buildAppInfo(input: AppInfoInput): AppInfo {
  return {
    name: input.name,
    version: input.version,
    electron: input.versions.electron ?? 'unknown',
    chrome: input.versions.chrome ?? 'unknown',
    node: input.versions.node ?? 'unknown',
    platform: input.platform
  }
}
