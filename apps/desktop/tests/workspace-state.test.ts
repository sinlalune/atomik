import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { WorkspaceState } from '../shared/ipc-contract'
import {
  WORKSPACE_STATE_FILE,
  deleteWorkspaceSnapshot,
  isValidWorkspaceState,
  listWorkspaceSnapshots,
  readWorkspaceSnapshot,
  readWorkspaceState,
  resolveStateDir,
  sanitizeSnapshotName,
  saveWorkspaceSnapshot,
  windowBackgroundFor,
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

describe('pane chat column (S06: optional string map on the leaf)', () => {
  it('accepts a leaf with a valid chat map — and without one (pre-S06 states)', () => {
    const state = validState()
    const leaf = state.root.kind === 'split' ? state.root.first : state.root
    if (leaf.kind === 'leaf') {
      leaf.chat = { on: '1', w: '320', file: 'chats/2026-07-23-question.md' }
    }
    expect(isValidWorkspaceState(state)).toBe(true)
    expect(isValidWorkspaceState(validState())).toBe(true)
  })

  it('rejects non-map chat shapes and non-string values', () => {
    const withChat = (chat: unknown): WorkspaceState => {
      const state = validState()
      const leaf = state.root.kind === 'split' ? state.root.first : state.root
      ;(leaf as unknown as Record<string, unknown>)['chat'] = chat
      return state
    }
    expect(isValidWorkspaceState(withChat('on'))).toBe(false)
    expect(isValidWorkspaceState(withChat(['on']))).toBe(false)
    expect(isValidWorkspaceState(withChat({ on: 1 }))).toBe(false)
    expect(isValidWorkspaceState(withChat({ file: 'x'.repeat(5000) }))).toBe(false)
  })
})

describe('app-wide settings (optional string map)', () => {
  it('round-trips settings and stays valid without them', () => {
    const withSettings = { ...validState(), settings: { saveMode: 'manual' } }
    writeWorkspaceState(dir, withSettings)
    expect(readWorkspaceState(dir)).toEqual(withSettings)
    expect(isValidWorkspaceState(validState())).toBe(true)
  })

  it('rejects non-record settings and non-string values', () => {
    expect(
      isValidWorkspaceState({ ...validState(), settings: 'auto' })
    ).toBe(false)
    expect(
      isValidWorkspaceState({ ...validState(), settings: { saveMode: 7 } })
    ).toBe(false)
    expect(
      isValidWorkspaceState({
        ...validState(),
        settings: { saveMode: 'x'.repeat(5000) }
      })
    ).toBe(false)
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

describe('pane tree (S07d — optional string map on leaves)', () => {
  it('round-trips a leaf tree and stays valid without one', () => {
    const state = validState()
    const first = (state.root as { first: { tree?: Record<string, string> } })
      .first
    first.tree = { kind: 'project', projectPath: 'projects/x', w: '300' }
    writeWorkspaceState(dir, state)
    expect(readWorkspaceState(dir)).toEqual(state)
    expect(isValidWorkspaceState(validState())).toBe(true)
  })

  it('rejects non-record trees and non-string values', () => {
    const badShape = validState()
    ;(badShape.root as { first: { tree?: unknown } }).first.tree = 'vault'
    expect(isValidWorkspaceState(badShape)).toBe(false)
    const badValue = validState()
    ;(badValue.root as { first: { tree?: unknown } }).first.tree = { w: 300 }
    expect(isValidWorkspaceState(badValue)).toBe(false)
  })
})

describe('windowBackgroundFor (S07q — the native band color)', () => {
  const withTheme = (theme: string): WorkspaceState => ({
    ...validState(),
    settings: { theme }
  })

  it('maps every named theme to its chrome --bg', () => {
    expect(windowBackgroundFor(withTheme('moss'), false)).toBe('#171915')
    expect(windowBackgroundFor(withTheme('biolum'), false)).toBe('#101418')
    expect(windowBackgroundFor(withTheme('sage-stone'), true)).toBe('#e7e9e2')
    expect(windowBackgroundFor(withTheme('light'), true)).toBe('#ecece6')
    expect(windowBackgroundFor(withTheme('dark'), false)).toBe('#141418')
    // S05v warm family — coupled by hand to the styles.css --bg values
    expect(windowBackgroundFor(withTheme('terracotta'), false)).toBe('#ecdfd5')
    expect(windowBackgroundFor(withTheme('ember'), false)).toBe('#1b1512')
    expect(windowBackgroundFor(withTheme('sunset'), false)).toBe('#f0e5d8')
    expect(windowBackgroundFor(withTheme('hearth'), false)).toBe('#191214')
  })

  it('system and unknown themes follow the OS scheme; no state too', () => {
    expect(windowBackgroundFor(withTheme('system'), true)).toBe('#141418')
    expect(windowBackgroundFor(withTheme('system'), false)).toBe('#ecece6')
    expect(windowBackgroundFor(withTheme('someday-theme'), true)).toBe('#141418')
    expect(windowBackgroundFor(null, false)).toBe('#ecece6')
  })
})

describe('named workspace snapshots (S06c18)', () => {
  it('sanitizeSnapshotName drops fs-hostile characters and caps length', () => {
    expect(sanitizeSnapshotName('  my research / stoicism  ')).toBe(
      'my research stoicism'
    )
    expect(sanitizeSnapshotName('..\\evil')).toBe('evil')
    expect(sanitizeSnapshotName('')).toBeNull()
    expect(sanitizeSnapshotName('///')).toBeNull()
    expect(sanitizeSnapshotName(42)).toBeNull()
    expect(sanitizeSnapshotName('x'.repeat(200))!.length).toBeLessThanOrEqual(60)
  })

  it('save → list → read round-trips a validated snapshot', () => {
    const state = validState()
    saveWorkspaceSnapshot(dir, 'stoicism', state)
    const listed = listWorkspaceSnapshots(dir)
    expect(listed.map((entry) => entry.name)).toContain('stoicism')
    expect(readWorkspaceSnapshot(dir, 'stoicism')).toEqual(state)
  })

  it('rejects invalid names and payloads; unknown reads are null', () => {
    expect(() => saveWorkspaceSnapshot(dir, '', validState())).toThrow()
    expect(() => saveWorkspaceSnapshot(dir, 'ok', { junk: true })).toThrow()
    expect(readWorkspaceSnapshot(dir, 'never-saved')).toBeNull()
    expect(readWorkspaceSnapshot(dir, '')).toBeNull()
  })

  it('delete removes the snapshot; deleting twice is a no-op', () => {
    saveWorkspaceSnapshot(dir, 'ephemeral', validState())
    expect(readWorkspaceSnapshot(dir, 'ephemeral')).not.toBeNull()
    deleteWorkspaceSnapshot(dir, 'ephemeral')
    expect(readWorkspaceSnapshot(dir, 'ephemeral')).toBeNull()
    deleteWorkspaceSnapshot(dir, 'ephemeral')
    expect(
      listWorkspaceSnapshots(dir).map((entry) => entry.name)
    ).not.toContain('ephemeral')
  })

  it('a corrupt snapshot file reads as null instead of crashing', () => {
    saveWorkspaceSnapshot(dir, 'corrupt-me', validState())
    writeFileSync(join(dir, 'workspaces', 'corrupt-me.json'), 'not json')
    expect(readWorkspaceSnapshot(dir, 'corrupt-me')).toBeNull()
  })
})
