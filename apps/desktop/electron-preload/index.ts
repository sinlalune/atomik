import { contextBridge, ipcRenderer } from 'electron'
import {
  ATOMIK_API_KEY,
  ATOMIK_CHANNELS,
  type AiOperation,
  type AiTraceDecision,
  type AtomikApi,
  type CaptureImportDestination,
  type VaultInfo,
  type WindowControlAction,
  type WindowControlState,
  type WorkspaceState
} from '../shared/ipc-contract'

/**
 * The entire renderer-facing API. Narrow and typed (13 §IPC rule): each
 * method wraps exactly one named channel; the raw ipcRenderer is never
 * exposed. Every addition here must also extend AtomikApi and
 * DOCUMENTED_PRELOAD_SURFACE in shared/ipc-contract.ts, and re-read
 * 13_13-electron-security.md §IPC first (CP-MVP-001 conditional trigger).
 */
const api: AtomikApi = {
  windowControl: (action: WindowControlAction) =>
    ipcRenderer.invoke(ATOMIK_CHANNELS.windowControl, action),
  onWindowStateChanged: (listener: (state: WindowControlState) => void) => {
    const wrapped = (_event: unknown, state: WindowControlState): void =>
      listener(state)
    ipcRenderer.on(ATOMIK_CHANNELS.windowStateChanged, wrapped)
    return () => {
      ipcRenderer.removeListener(ATOMIK_CHANNELS.windowStateChanged, wrapped)
    }
  },
  listDevDocs: () => ipcRenderer.invoke(ATOMIK_CHANNELS.listDevDocs),
  readDevDoc: (relPath: string) =>
    ipcRenderer.invoke(ATOMIK_CHANNELS.readDevDoc, relPath),
  readWorkspaceState: () =>
    ipcRenderer.invoke(ATOMIK_CHANNELS.readWorkspaceState),
  writeWorkspaceState: (state: WorkspaceState) =>
    ipcRenderer.invoke(ATOMIK_CHANNELS.writeWorkspaceState, state),
  openVault: () => ipcRenderer.invoke(ATOMIK_CHANNELS.openVault),
  onVaultChanged: (listener: (vault: VaultInfo | null) => void) => {
    const wrapped = (_event: unknown, vault: VaultInfo | null): void =>
      listener(vault)
    ipcRenderer.on(ATOMIK_CHANNELS.vaultChanged, wrapped)
    return () => {
      ipcRenderer.removeListener(ATOMIK_CHANNELS.vaultChanged, wrapped)
    }
  },
  getVault: () => ipcRenderer.invoke(ATOMIK_CHANNELS.getVault),
  listVaultFiles: () => ipcRenderer.invoke(ATOMIK_CHANNELS.listVaultFiles),
  searchVault: (query: string, scope?: string) =>
    ipcRenderer.invoke(ATOMIK_CHANNELS.searchVault, query, scope),
  searchDevDocs: (query: string) =>
    ipcRenderer.invoke(ATOMIK_CHANNELS.searchDevDocs, query),
  readNote: (relPath: string) =>
    ipcRenderer.invoke(ATOMIK_CHANNELS.readNote, relPath),
  readSourceAsset: (relPath: string) =>
    ipcRenderer.invoke(ATOMIK_CHANNELS.readSourceAsset, relPath),
  writeNote: (relPath: string, content: string, expectedMtimeMs?: number) =>
    ipcRenderer.invoke(
      ATOMIK_CHANNELS.writeNote,
      relPath,
      content,
      expectedMtimeMs
    ),
  createNote: (relPath: string, content?: string) =>
    ipcRenderer.invoke(ATOMIK_CHANNELS.createNote, relPath, content),
  listProjects: () => ipcRenderer.invoke(ATOMIK_CHANNELS.listProjects),
  createProject: (relPath: string, title: string) =>
    ipcRenderer.invoke(ATOMIK_CHANNELS.createProject, relPath, title),
  startCaptureSession: () =>
    ipcRenderer.invoke(ATOMIK_CHANNELS.startCaptureSession),
  stopCaptureSession: () =>
    ipcRenderer.invoke(ATOMIK_CHANNELS.stopCaptureSession),
  getCaptureSession: () =>
    ipcRenderer.invoke(ATOMIK_CHANNELS.getCaptureSession),
  importCaptureUpload: (uploadId: string, destination: CaptureImportDestination) =>
    ipcRenderer.invoke(ATOMIK_CHANNELS.importCaptureUpload, uploadId, destination),
  discardCaptureUpload: (uploadId: string) =>
    ipcRenderer.invoke(ATOMIK_CHANNELS.discardCaptureUpload, uploadId),
  transcribeSource: (dossierPath: string) =>
    ipcRenderer.invoke(ATOMIK_CHANNELS.transcribeSource, dossierPath),
  runAiOperation: (operation: AiOperation) =>
    ipcRenderer.invoke(ATOMIK_CHANNELS.runAiOperation, operation),
  resolveAiTrace: (bundleId: string, decision: AiTraceDecision) =>
    ipcRenderer.invoke(ATOMIK_CHANNELS.resolveAiTrace, bundleId, decision),
  getAiTraceSummary: (bundleId: string) =>
    ipcRenderer.invoke(ATOMIK_CHANNELS.getAiTraceSummary, bundleId)
}

contextBridge.exposeInMainWorld(ATOMIK_API_KEY, api)
