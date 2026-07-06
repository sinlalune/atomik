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

  it('routes getAppInfo through its named channel with no arguments', async () => {
    invoke.mockResolvedValueOnce({})
    const api = exposedApi() as { getAppInfo: () => Promise<unknown> }
    await api.getAppInfo()
    expect(invoke).toHaveBeenCalledWith(ATOMIK_CHANNELS.getAppInfo)
  })
})
