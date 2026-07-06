import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import type { PaneNode, WorkspaceState, WorkspaceTab } from '../shared/ipc-contract'

/**
 * Persistence for the workspace layout (03): disposable machine-local UI
 * state under `.atomik/`, never knowledge. The renderer supplies only the
 * payload — the file path is fixed here, and the payload is structurally
 * validated with hard caps (13: renderer input crosses the trust boundary).
 * Writes are atomic (temp file + rename, 27) — the pattern vault IO reuses
 * at S05.
 */

export const WORKSPACE_STATE_FILE = 'local-workspace.json'

const MAX_BYTES = 256 * 1024
const MAX_DEPTH = 16
const MAX_TABS_PER_LEAF = 64
const MAX_PARAM_VALUE = 4096
const MAX_ID = 128

/** `.atomik/` beside the app's repo checkout; ATOMIK_STATE_DIR overrides
 *  (tests and smoke use a scratch directory). */
export function resolveStateDir(
  appPath: string,
  env: Record<string, string | undefined>
): string {
  return env['ATOMIK_STATE_DIR'] ?? resolve(appPath, '..', '..', '.atomik')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isValidTab(value: unknown): value is WorkspaceTab {
  if (!isRecord(value)) return false
  if (typeof value['id'] !== 'string' || value['id'].length === 0 || value['id'].length > MAX_ID) return false
  if (typeof value['view'] !== 'string' || value['view'].length === 0 || value['view'].length > 64) return false
  const params = value['params']
  if (params !== undefined) {
    if (!isRecord(params)) return false
    for (const [key, paramValue] of Object.entries(params)) {
      if (key.length === 0 || key.length > 64) return false
      if (typeof paramValue !== 'string' || paramValue.length > MAX_PARAM_VALUE) return false
    }
  }
  return true
}

function isValidPane(value: unknown, depth: number): value is PaneNode {
  if (depth > MAX_DEPTH || !isRecord(value)) return false
  if (typeof value['id'] !== 'string' || value['id'].length === 0 || value['id'].length > MAX_ID) return false
  if (value['kind'] === 'leaf') {
    const tabs = value['tabs']
    if (!Array.isArray(tabs) || tabs.length > MAX_TABS_PER_LEAF) return false
    if (!tabs.every(isValidTab)) return false
    const active = value['activeTabId']
    if (active === null) return true
    if (typeof active !== 'string') return false
    return tabs.some((tab) => (tab as WorkspaceTab).id === active)
  }
  if (value['kind'] === 'split') {
    if (value['direction'] !== 'horizontal' && value['direction'] !== 'vertical') return false
    const fraction = value['fraction']
    if (typeof fraction !== 'number' || !(fraction >= 0.1 && fraction <= 0.9)) return false
    return isValidPane(value['first'], depth + 1) && isValidPane(value['second'], depth + 1)
  }
  return false
}

export function isValidWorkspaceState(value: unknown): value is WorkspaceState {
  if (!isRecord(value)) return false
  if (value['version'] !== 1) return false
  if (typeof value['focusedPaneId'] !== 'string') return false
  return isValidPane(value['root'], 0)
}

/** Missing, corrupt, oversized, or invalid state reads as null — the app
 *  starts fresh instead of crashing on a disposable file (03). */
export function readWorkspaceState(stateDir: string): WorkspaceState | null {
  try {
    const raw = readFileSync(join(stateDir, WORKSPACE_STATE_FILE), 'utf8')
    if (Buffer.byteLength(raw, 'utf8') > MAX_BYTES) return null
    const parsed: unknown = JSON.parse(raw)
    return isValidWorkspaceState(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function writeWorkspaceState(stateDir: string, state: unknown): void {
  if (!isValidWorkspaceState(state)) {
    throw new Error('workspace-state: rejected payload')
  }
  const json = `${JSON.stringify(state, null, 2)}\n`
  if (Buffer.byteLength(json, 'utf8') > MAX_BYTES) {
    throw new Error('workspace-state: payload too large')
  }
  mkdirSync(stateDir, { recursive: true })
  const target = join(stateDir, WORKSPACE_STATE_FILE)
  const temp = `${target}.tmp-${process.pid}`
  writeFileSync(temp, json, 'utf8')
  try {
    renameSync(temp, target)
  } catch (error) {
    rmSync(temp, { force: true })
    throw error
  }
}
