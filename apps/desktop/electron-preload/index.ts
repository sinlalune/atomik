import { contextBridge, ipcRenderer } from 'electron'
import {
  ATOMIK_API_KEY,
  ATOMIK_CHANNELS,
  type AtomikApi
} from '../shared/ipc-contract'

/**
 * The entire renderer-facing API. Narrow and typed (13 §IPC rule): each
 * method wraps exactly one named channel; the raw ipcRenderer is never
 * exposed. Every addition here must also extend AtomikApi and
 * DOCUMENTED_PRELOAD_SURFACE in shared/ipc-contract.ts, and re-read
 * 13_13-electron-security.md §IPC first (CP-MVP-001 conditional trigger).
 */
const api: AtomikApi = {
  getAppInfo: () => ipcRenderer.invoke(ATOMIK_CHANNELS.getAppInfo),
  listDevDocs: () => ipcRenderer.invoke(ATOMIK_CHANNELS.listDevDocs),
  readDevDoc: (relPath: string) =>
    ipcRenderer.invoke(ATOMIK_CHANNELS.readDevDoc, relPath)
}

contextBridge.exposeInMainWorld(ATOMIK_API_KEY, api)
