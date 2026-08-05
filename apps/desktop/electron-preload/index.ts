import { contextBridge, ipcRenderer } from 'electron'
import {
  ATOMIK_API_KEY,
  ATOMIK_CHANNELS,
  type AiEngine,
  type AiOperation,
  type AiTraceDecision,
  type AtomikApi,
  type CaptureImportDestination,
  type VaultInfo,
  type WebViewBounds,
  type WebViewControlAction,
  type WebViewState,
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
  saveWorkspaceSnapshot: (name: string, state: WorkspaceState) =>
    ipcRenderer.invoke(ATOMIK_CHANNELS.saveWorkspaceSnapshot, name, state),
  listWorkspaceSnapshots: () =>
    ipcRenderer.invoke(ATOMIK_CHANNELS.listWorkspaceSnapshots),
  readWorkspaceSnapshot: (name: string) =>
    ipcRenderer.invoke(ATOMIK_CHANNELS.readWorkspaceSnapshot, name),
  deleteWorkspaceSnapshot: (name: string) =>
    ipcRenderer.invoke(ATOMIK_CHANNELS.deleteWorkspaceSnapshot, name),
  openVault: () => ipcRenderer.invoke(ATOMIK_CHANNELS.openVault),
  onVaultChanged: (listener: (vault: VaultInfo | null) => void) => {
    const wrapped = (_event: unknown, vault: VaultInfo | null): void =>
      listener(vault)
    ipcRenderer.on(ATOMIK_CHANNELS.vaultChanged, wrapped)
    return () => {
      ipcRenderer.removeListener(ATOMIK_CHANNELS.vaultChanged, wrapped)
    }
  },
  onVaultFilesChanged: (listener: () => void) => {
    const wrapped = (): void => listener()
    ipcRenderer.on(ATOMIK_CHANNELS.vaultFilesChanged, wrapped)
    return () => {
      ipcRenderer.removeListener(ATOMIK_CHANNELS.vaultFilesChanged, wrapped)
    }
  },
  getVault: () => ipcRenderer.invoke(ATOMIK_CHANNELS.getVault),
  listVaultFiles: () => ipcRenderer.invoke(ATOMIK_CHANNELS.listVaultFiles),
  readGraphIndex: () => ipcRenderer.invoke(ATOMIK_CHANNELS.readGraphIndex),
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
  createFolder: (relPath: string) =>
    ipcRenderer.invoke(ATOMIK_CHANNELS.createFolder, relPath),
  deleteNote: (relPath: string) =>
    ipcRenderer.invoke(ATOMIK_CHANNELS.deleteNote, relPath),
  deleteFolder: (relPath: string) =>
    ipcRenderer.invoke(ATOMIK_CHANNELS.deleteFolder, relPath),
  relocatePreview: (from: string, to: string) =>
    ipcRenderer.invoke(ATOMIK_CHANNELS.relocatePreview, from, to),
  relocateApply: (from: string, to: string) =>
    ipcRenderer.invoke(ATOMIK_CHANNELS.relocateApply, from, to),
  relocateFolderPreview: (from: string, to: string) =>
    ipcRenderer.invoke(ATOMIK_CHANNELS.relocateFolderPreview, from, to),
  relocateFolderApply: (from: string, to: string) =>
    ipcRenderer.invoke(ATOMIK_CHANNELS.relocateFolderApply, from, to),
  onNoteRelocated: (listener: (move: { from: string; to: string }) => void) => {
    const wrapped = (_event: unknown, move: { from: string; to: string }): void =>
      listener(move)
    ipcRenderer.on(ATOMIK_CHANNELS.noteRelocated, wrapped)
    return () => {
      ipcRenderer.removeListener(ATOMIK_CHANNELS.noteRelocated, wrapped)
    }
  },
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
  transcribeSourceCloud: (dossierPath: string) =>
    ipcRenderer.invoke(ATOMIK_CHANNELS.transcribeSourceCloud, dossierPath),
  resetTranscription: (dossierPath: string) =>
    ipcRenderer.invoke(ATOMIK_CHANNELS.resetTranscription, dossierPath),
  importPdfSource: () => ipcRenderer.invoke(ATOMIK_CHANNELS.importPdfSource),
  extractPdfSource: (dossierPath: string) =>
    ipcRenderer.invoke(ATOMIK_CHANNELS.extractPdfSource, dossierPath),
  resetExtraction: (dossierPath: string) =>
    ipcRenderer.invoke(ATOMIK_CHANNELS.resetExtraction, dossierPath),
  addLocalCapture: (bytes: Uint8Array, mimeType: string, fileName: string) =>
    ipcRenderer.invoke(ATOMIK_CHANNELS.addLocalCapture, bytes, mimeType, fileName),
  getCaptureUploadData: (uploadId: string) =>
    ipcRenderer.invoke(ATOMIK_CHANNELS.getCaptureUploadData, uploadId),
  openSourceExternally: (relPath: string) =>
    ipcRenderer.invoke(ATOMIK_CHANNELS.openSourceExternally, relPath),
  runAiOperation: (operation: AiOperation) =>
    ipcRenderer.invoke(ATOMIK_CHANNELS.runAiOperation, operation),
  cancelAiOperation: (operationId: string) =>
    ipcRenderer.invoke(ATOMIK_CHANNELS.cancelAiOperation, operationId),
  resolveAiTrace: (bundleId: string, decision: AiTraceDecision) =>
    ipcRenderer.invoke(ATOMIK_CHANNELS.resolveAiTrace, bundleId, decision),
  getAiTraceSummary: (bundleId: string) =>
    ipcRenderer.invoke(ATOMIK_CHANNELS.getAiTraceSummary, bundleId),
  getAiSettings: () => ipcRenderer.invoke(ATOMIK_CHANNELS.getAiSettings),
  setMistralApiKey: (key: string | null) =>
    ipcRenderer.invoke(ATOMIK_CHANNELS.setMistralApiKey, key),
  setAiEngine: (engine: AiEngine) =>
    ipcRenderer.invoke(ATOMIK_CHANNELS.setAiEngine, engine),
  webViewEnsure: (id: string, url?: string) =>
    ipcRenderer.invoke(ATOMIK_CHANNELS.webViewEnsure, id, url),
  webViewNavigate: (id: string, url: string) =>
    ipcRenderer.invoke(ATOMIK_CHANNELS.webViewNavigate, id, url),
  webViewControl: (id: string, action: WebViewControlAction) =>
    ipcRenderer.invoke(ATOMIK_CHANNELS.webViewControl, id, action),
  webViewSetBounds: (id: string, bounds: WebViewBounds) =>
    ipcRenderer.invoke(ATOMIK_CHANNELS.webViewSetBounds, id, bounds),
  webViewSetVisible: (id: string, visible: boolean) =>
    ipcRenderer.invoke(ATOMIK_CHANNELS.webViewSetVisible, id, visible),
  webViewDestroy: (id: string) =>
    ipcRenderer.invoke(ATOMIK_CHANNELS.webViewDestroy, id),
  webViewImportSource: (id: string) =>
    ipcRenderer.invoke(ATOMIK_CHANNELS.webViewImportSource, id),
  importWebUrl: (url: string) =>
    ipcRenderer.invoke(ATOMIK_CHANNELS.importWebUrl, url),
  webViewShowSnapshot: (id: string, snapshotRelPath: string) =>
    ipcRenderer.invoke(ATOMIK_CHANNELS.webViewShowSnapshot, id, snapshotRelPath),
  webViewReaderText: (id: string) =>
    ipcRenderer.invoke(ATOMIK_CHANNELS.webViewReaderText, id),
  extractWebReader: (dossierPath: string) =>
    ipcRenderer.invoke(ATOMIK_CHANNELS.extractWebReader, dossierPath),
  resetWebReader: (dossierPath: string) =>
    ipcRenderer.invoke(ATOMIK_CHANNELS.resetWebReader, dossierPath),
  onWebViewState: (listener: (state: WebViewState) => void) => {
    const wrapped = (_event: unknown, state: WebViewState): void =>
      listener(state)
    ipcRenderer.on(ATOMIK_CHANNELS.webViewState, wrapped)
    return () => {
      ipcRenderer.removeListener(ATOMIK_CHANNELS.webViewState, wrapped)
    }
  }
}

contextBridge.exposeInMainWorld(ATOMIK_API_KEY, api)
