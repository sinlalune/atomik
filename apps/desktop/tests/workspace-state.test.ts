import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { WorkspaceState } from '../shared/ipc-contract'
import {
  WORKSPACE_STATE_FILE,
  isValidWorkspaceState,
  readWorkspaceState,
  resolveStateDir,
  writeWorkspaceState
} from '../electron-main/workspace-state'

let dir: string

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'atomik-workspace-'))
})

afterAll(() => {
  rmSync(dir, { recursive: true, force: true })
})

function validState(): WorkspaceState {
  return {
    version: 1,
    focusedPaneId: 'p1',
    root: {
      kind: 'split',
      id: 's1',
      direction: 'horizontal',
      fraction: 0.45,
      first: {
        kind: 'leaf',
        id: 'p1',
        tabs: [{ id: 't1', view: 'home' }],
        activeTabId: 't1'
      },
      second: {
        kind: 'leaf',
        id: 'p2',
        tabs: [
          {
            id: 't2',
            view: 'dev-docs',
            params: { docPath: 'bedrock/22_22-agent-handoff.md' }
          }
        ],
        activeTabId: 't2'
      }
    }
  }
}

describe('resolveStateDir', () => {
  it('defaults to the repo .atomik and honors ATOMIK_STATE_DIR', () => {
    expect(resolveStateDir(resolve('/repo/apps/desktop'), {})).toBe(
      resolve('/repo/.atomik')
    )
    expect(
      resolveStateDir(resolve('/repo/apps/desktop'), { ATOMIK_STATE_DIR: '/tmp/x' })
    ).toBe('/tmp/x')
  })
})

describe('write/read roundtrip', () => {
  it('persists atomically and reads back the same state', () => {
    const state = validState()
    writeWorkspaceState(dir, state)
    expect(readWorkspaceState(dir)).toEqual(state)
    // no temp residue after the rename
    expect(readdirSync(dir).filter((f) => f.includes('.tmp-'))).toEqual([])
    // pretty-printed, newline-terminated (diff-friendly if ever inspected)
    const raw = readFileSync(join(dir, WORKSPACE_STATE_FILE), 'utf8')
    expect(raw.endsWith('}\n')).toBe(true)
  })
})

describe('read is forgiving (disposable state)', () => {
  it('missing file reads as null', () => {
    const empty = mkdtempSync(join(tmpdir(), 'atomik-empty-'))
    expect(readWorkspaceState(empty)).toBeNull()
    rmSync(empty, { recursive: true, force: true })
  })

  it('corrupt JSON and invalid shapes read as null', () => {
    writeFileSync(join(dir, WORKSPACE_STATE_FILE), '{ not json', 'utf8')
    expect(readWorkspaceState(dir)).toBeNull()
    writeFileSync(join(dir, WORKSPACE_STATE_FILE), '{"version":2}', 'utf8')
    expect(readWorkspaceState(dir)).toBeNull()
  })
})

describe('write validation (renderer payloads are untrusted)', () => {
  it('rejects wrong version, bad fraction, and dangling activeTabId', () => {
    const state = validState()
    expect(() =>
      writeWorkspaceState(dir, { ...state, version: 2 })
    ).toThrow()

    const badFraction = validState()
    ;(badFraction.root as { fraction: number }).fraction = 0.05
    expect(() => writeWorkspaceState(dir, badFraction)).toThrow()

    const dangling = validState()
    ;(dangling.root as { first: { activeTabId: string } }).first.activeTabId = 'ghost'
    expect(() => writeWorkspaceState(dir, dangling)).toThrow()
  })

  it('rejects non-objects, oversized params, and absurd nesting', () => {
    expect(() => writeWorkspaceState(dir, 'hello')).toThrow()
    expect(() => writeWorkspaceState(dir, null)).toThrow()

    const oversized = validState()
    ;(oversized.root as { second: { tabs: Array<{ params: unknown }> } }).second.tabs[0]!.params =
      { docPath: 'x'.repeat(5000) }
    expect(() => writeWorkspaceState(dir, oversized)).toThrow()

    let node: unknown = {
      kind: 'leaf',
      id: 'deep',
      tabs: [],
      activeTabId: null
    }
    for (let i = 0; i < 20; i += 1) {
      node = {
        kind: 'split',
        id: `s${i}`,
        direction: 'horizontal',
        fraction: 0.5,
        first: node,
        second: { kind: 'leaf', id: `l${i}`, tabs: [], activeTabId: null }
      }
    }
    expect(
      isValidWorkspaceState({ version: 1, focusedPaneId: 'deep', root: node })
    ).toBe(false)
  })
})
