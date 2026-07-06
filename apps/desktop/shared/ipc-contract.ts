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
  writeWorkspaceState: 'atomik:write-workspace-state',
  openVault: 'atomik:open-vault',
  getVault: 'atomik:get-vault',
  listVaultFiles: 'atomik:list-vault-files',
  readNote: 'atomik:read-note',
  writeNote: 'atomik:write-note',
  createNote: 'atomik:create-note',
  listProjects: 'atomik:list-projects',
  createProject: 'atomik:create-project',
  runAiOperation: 'atomik:run-ai-operation'
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

/**
 * The vault (04): the durable local root holding the user's Markdown
 * knowledge. All paths are vault-relative and validated in main; the
 * renderer never names an absolute path.
 */
export type VaultInfo = {
  /** Absolute root, for display only. */
  root: string
  /** Folder basename, for labels. */
  name: string
}

export type VaultNoteRef = { name: string; relPath: string }

export type VaultFolder = {
  name: string
  /** ''-rooted, '/'-separated path of this folder inside the vault. */
  relPath: string
  folders: VaultFolder[]
  notes: VaultNoteRef[]
}

export type VaultNoteFile = {
  relPath: string
  content: string
  /** Modification time at read, for future conflict checks (S07). */
  mtimeMs: number
}

/**
 * Project bundle (04): a vault folder holding index.md, log.md, and the
 * `project.atomik-project.json` manifest. Detection is manifest-based;
 * createProject also ADOPTS an existing folder by creating only the
 * missing pieces (existing files are never touched).
 */
export type ProjectInfo = {
  /** Vault-relative folder path of the bundle. */
  relPath: string
  id: string
  title: string
}

/**
 * AI operation pipeline (06), S08 slice. The channel is PURE COMPUTE:
 * selection in, structured bundle out — it can never write. Accepted
 * patches are applied by the user through the editor buffer and the
 * existing vault verbs, so every AI write inherits the S05/S07
 * guarantees (preview, byte fidelity, mtime handshake).
 */

/** What the user points at (05, MVP slice: text in one note). */
export type AiSelection = {
  /** Vault-relative path of the note the selection lives in. */
  relPath: string
  kind: 'text'
  content: string
  /** Character offsets in the note's current buffer. */
  range: { from: number; to: number }
}

export type AiDestination =
  | { kind: 'replace-selection' }
  | { kind: 'append' }
  | { kind: 'new-note'; newNotePath: string }

export type AiOperation = {
  id: string
  input: AiSelection[]
  /** Free text stays first-class (06); presets only scaffold it. */
  instruction: string
  preset?: string
  target: { relPath: string; destination: AiDestination }
}

/** Open kind/role strings (06): renderers degrade unknown kinds to text. */
export type AiOutputBlock = {
  id: string
  kind: string
  role?: string
  content: string
}

export type ProposedFileChange =
  | { relPath: string; kind: 'replace-range'; range: { from: number; to: number }; newText: string }
  | { relPath: string; kind: 'append'; newText: string }
  | { relPath: string; kind: 'create'; newText: string }

export type PatchProposal = {
  id: string
  operationId: string
  files: ProposedFileChange[]
  status: 'pending' | 'accepted' | 'edited' | 'rejected'
}

/**
 * 06's response bundle. Lightweight operations keep the truth arrays
 * empty, but the shapes ship from the first mock so S09 (traces) and
 * S10 (mechanical labels) extend without reshaping.
 */
export type AiResponseBundle = {
  id: string
  operationId: string
  blocks: AiOutputBlock[]
  patchProposals: PatchProposal[]
  claims: unknown[]
  evidence: unknown[]
  verification: unknown[]
  uncertainties: Array<{ message: string; severity?: string }>
  actionTraceIds: string[]
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
  /** Native folder picker in main; null when cancelled. Remembered. */
  openVault: () => Promise<VaultInfo | null>
  /** Currently open vault (restored across restarts); null when none. */
  getVault: () => Promise<VaultInfo | null>
  /** Markdown tree of the open vault (dot-dirs and node_modules skipped). */
  listVaultFiles: () => Promise<VaultFolder>
  /** Reads one note; validated vault-relative .md path. */
  readNote: (relPath: string) => Promise<VaultNoteFile>
  /**
   * Overwrites an EXISTING note atomically, byte-exact (27). Passing the
   * mtime received from readNote enables optimistic conflict detection
   * ("changed on disk since read"); omit it to write unconditionally.
   * Resolves with the new mtime for the next save.
   */
  writeNote: (
    relPath: string,
    content: string,
    expectedMtimeMs?: number
  ) => Promise<{ mtimeMs: number }>
  /** Creates a NEW note (parents made, exclusive — never clobbers). */
  createNote: (relPath: string, content?: string) => Promise<void>
  /** Project bundles found in the open vault (manifest-detected). */
  listProjects: () => Promise<ProjectInfo[]>
  /** Creates or adopts a bundle: writes only the missing pieces. */
  createProject: (relPath: string, title: string) => Promise<ProjectInfo>
  /** Mocked AI operation (S08): pure compute, never writes. */
  runAiOperation: (operation: AiOperation) => Promise<AiResponseBundle>
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
  'writeWorkspaceState',
  'openVault',
  'getVault',
  'listVaultFiles',
  'readNote',
  'writeNote',
  'createNote',
  'listProjects',
  'createProject',
  'runAiOperation'
] as const satisfies readonly (keyof AtomikApi)[]
