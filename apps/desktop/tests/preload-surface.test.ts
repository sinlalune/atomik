import { beforeAll, describe, expect, it, vi } from 'vitest'
import {
  ATOMIK_API_KEY,
  ATOMIK_CHANNELS,
  DOCUMENTED_PRELOAD_SURFACE
} from '../shared/ipc-contract'

/**
 * M0 acceptance: "preload exposes only documented typed methods."
 * The preload module runs against a mocked electron; the test then compares
 * what reached contextBridge with the documented surface in
 * shared/ipc-contract.ts. Any undocumented addition or raw ipcRenderer
 * exposure fails.
 */
const exposeInMainWorld = vi.fn<(key: string, api: unknown) => void>()
const invoke = vi.fn<(channel: string, ...args: unknown[]) => Promise<unknown>>()
const mockedIpcRenderer = { invoke }

vi.mock('electron', () => ({
  contextBridge: {
    exposeInMainWorld: (key: string, api: unknown) => exposeInMainWorld(key, api)
  },
  ipcRenderer: mockedIpcRenderer
}))

beforeAll(async () => {
  await import('../electron-preload/index')
})

function exposedApi(): Record<string, unknown> {
  return exposeInMainWorld.mock.calls[0]![1] as Record<string, unknown>
}

describe('preload surface (13 §IPC rule)', () => {
  it('publishes exactly one world key: atomik', () => {
    expect(exposeInMainWorld).toHaveBeenCalledTimes(1)
    expect(exposeInMainWorld.mock.calls[0]![0]).toBe(ATOMIK_API_KEY)
  })

  it('exposes exactly the documented methods, all functions', () => {
    const api = exposedApi()
    expect(Object.keys(api).sort()).toEqual(
      [...DOCUMENTED_PRELOAD_SURFACE].sort()
    )
    for (const value of Object.values(api)) {
      expect(typeof value).toBe('function')
    }
  })

  it('never leaks the raw ipcRenderer or a generic send bridge', () => {
    const api = exposedApi()
    expect(Object.values(api)).not.toContain(mockedIpcRenderer)
    expect(api).not.toHaveProperty('send')
    expect(api).not.toHaveProperty('invoke')
    expect(api).not.toHaveProperty('ipcRenderer')
  })

  it('routes every method through its named channel', async () => {
    const api = exposedApi() as {
      getAppInfo: () => Promise<unknown>
      listDevDocs: () => Promise<unknown>
      readDevDoc: (relPath: string) => Promise<unknown>
      readWorkspaceState: () => Promise<unknown>
      writeWorkspaceState: (state: unknown) => Promise<unknown>
      openVault: () => Promise<unknown>
      getVault: () => Promise<unknown>
      listVaultFiles: () => Promise<unknown>
      readNote: (relPath: string) => Promise<unknown>
      writeNote: (
        relPath: string,
        content: string,
        expectedMtimeMs?: number
      ) => Promise<unknown>
      createNote: (relPath: string, content?: string) => Promise<unknown>
      listProjects: () => Promise<unknown>
      createProject: (relPath: string, title: string) => Promise<unknown>
    }
    invoke.mockResolvedValue({})

    await api.getAppInfo()
    expect(invoke).toHaveBeenLastCalledWith(ATOMIK_CHANNELS.getAppInfo)

    await api.listDevDocs()
    expect(invoke).toHaveBeenLastCalledWith(ATOMIK_CHANNELS.listDevDocs)

    await api.readDevDoc('bedrock/00_00-orientation.md')
    expect(invoke).toHaveBeenLastCalledWith(
      ATOMIK_CHANNELS.readDevDoc,
      'bedrock/00_00-orientation.md'
    )

    await api.readWorkspaceState()
    expect(invoke).toHaveBeenLastCalledWith(ATOMIK_CHANNELS.readWorkspaceState)

    const payload = { version: 1 }
    await api.writeWorkspaceState(payload)
    expect(invoke).toHaveBeenLastCalledWith(
      ATOMIK_CHANNELS.writeWorkspaceState,
      payload
    )

    await api.openVault()
    expect(invoke).toHaveBeenLastCalledWith(ATOMIK_CHANNELS.openVault)

    await api.getVault()
    expect(invoke).toHaveBeenLastCalledWith(ATOMIK_CHANNELS.getVault)

    await api.listVaultFiles()
    expect(invoke).toHaveBeenLastCalledWith(ATOMIK_CHANNELS.listVaultFiles)

    await api.readNote('ideas/first.md')
    expect(invoke).toHaveBeenLastCalledWith(
      ATOMIK_CHANNELS.readNote,
      'ideas/first.md'
    )

    await api.writeNote('ideas/first.md', '# Edited\n')
    expect(invoke).toHaveBeenLastCalledWith(
      ATOMIK_CHANNELS.writeNote,
      'ideas/first.md',
      '# Edited\n',
      undefined
    )

    await api.writeNote('ideas/first.md', '# Edited\n', 123.45)
    expect(invoke).toHaveBeenLastCalledWith(
      ATOMIK_CHANNELS.writeNote,
      'ideas/first.md',
      '# Edited\n',
      123.45
    )

    await api.createNote('ideas/new.md', '# New\n')
    expect(invoke).toHaveBeenLastCalledWith(
      ATOMIK_CHANNELS.createNote,
      'ideas/new.md',
      '# New\n'
    )

    await api.listProjects()
    expect(invoke).toHaveBeenLastCalledWith(ATOMIK_CHANNELS.listProjects)

    await api.createProject('projects/demo', 'Demo')
    expect(invoke).toHaveBeenLastCalledWith(
      ATOMIK_CHANNELS.createProject,
      'projects/demo',
      'Demo'
    )
  })
})
