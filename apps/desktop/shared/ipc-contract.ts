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
  windowControl: 'atomik:window-control',
  listDevDocs: 'atomik:list-dev-docs',
  readDevDoc: 'atomik:read-dev-doc',
  readWorkspaceState: 'atomik:read-workspace-state',
  writeWorkspaceState: 'atomik:write-workspace-state',
  openVault: 'atomik:open-vault',
  getVault: 'atomik:get-vault',
  listVaultFiles: 'atomik:list-vault-files',
  searchVault: 'atomik:search-vault',
  readNote: 'atomik:read-note',
  writeNote: 'atomik:write-note',
  createNote: 'atomik:create-note',
  listProjects: 'atomik:list-projects',
  createProject: 'atomik:create-project',
  runAiOperation: 'atomik:run-ai-operation',
  resolveAiTrace: 'atomik:resolve-ai-trace',
  getAiTraceSummary: 'atomik:get-ai-trace-summary'
} as const

/**
 * Frame verbs for the chromeless trusted window (the tabstrip is the top
 * row; custom controls replace the native title bar). One narrow channel,
 * allowlist-validated in main; 'get-state' only reports. Every action
 * resolves with the window's current maximized state for the icon.
 */
export type WindowControlAction =
  | 'minimize'
  | 'toggle-maximize'
  | 'close'
  | 'get-state'

export type WindowControlState = { maximized: boolean }

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
  /** App-wide UI preferences (string map, validated like tab params).
   *  Known key: saveMode = 'auto' (default) | 'manual'. */
  settings?: Record<string, string>
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
 * Lexical vault search (M1/S11): filename, heading, and full-text matches
 * from a plain scan — no embeddings, no index (ripgrep/FTS5 are M8).
 */
export type SearchMatch = {
  kind: 'filename' | 'heading' | 'text'
  /** 1-based line of the match; 0 for filename matches. */
  line: number
  excerpt: string
}

export type SearchResult = {
  relPath: string
  name: string
  matches: SearchMatch[]
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

/**
 * Truth labels, MVP set (06 minimal contract; web-checked arrives M7).
 * `source-backed` is assigned ONLY by the deterministic checker in main
 * (exact containment + quote hash) — never by provider self-report.
 * `interpretive`/`needs-citation` describe FORM and may be provider-
 * asserted; they carry no evidence weight.
 */
export type TruthLabel =
  | 'source-backed'
  | 'model-only'
  | 'needs-citation'
  | 'interpretive'

export type EvidenceRecord = {
  id: string
  /** Where the supporting selection lives (05 anchor, MVP slice). */
  source: { relPath: string; range: { from: number; to: number } }
  /** Exact quoted text and its hash — the reproducible derivation. */
  quote: string
  quoteSha256: string
}

export type ClaimRecord = {
  id: string
  /** Block the claim text appears in. */
  blockId: string
  text: string
  /** Mechanically computed; reproducible from operation + bundle. */
  label: TruthLabel
  /** Populated only for source-backed claims. */
  evidenceIds: string[]
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
  claims: ClaimRecord[]
  evidence: EvidenceRecord[]
  verification: unknown[]
  uncertainties: Array<{ message: string; severity?: string }>
  actionTraceIds: string[]
}

/**
 * Minimal ActionTrace (S09): ONE JSON line per resolved operation,
 * appended to `.atomik/usage/private/actions.jsonl` (append-only,
 * git-ignored, content-minimized — 27/33). The renderer only reports the
 * decision and reads a summary for the badge; the ledger lives in main.
 */
export type AiTraceDecision = 'accepted' | 'edited' | 'rejected'

export type TraceSummary = {
  traceId: string
  location: 'deterministic' | 'local-model' | 'cloud-model' | 'web'
  provider: string
  model: string
  wallMs: number
  estimatedInputTokens: number
  estimatedOutputTokens: number
  estimatedExternalCost: { currency: string; amount: number }
}

/** The complete API the renderer may call. */
export type AtomikApi = {
  /** Frame verbs for the chromeless window; validated allowlist in main. */
  windowControl: (action: WindowControlAction) => Promise<WindowControlState>
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
  /** Lexical search over the vault (filename/heading/full-text, no index). */
  searchVault: (query: string) => Promise<SearchResult[]>
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
  /** Reports the user's decision; main appends the one trace line. */
  resolveAiTrace: (bundleId: string, decision: AiTraceDecision) => Promise<void>
  /** Badge data for a pending operation; null when unknown. */
  getAiTraceSummary: (bundleId: string) => Promise<TraceSummary | null>
}

/**
 * The documented preload surface. Kept as a runtime constant so tests can
 * compare it against the object actually handed to contextBridge.
 */
export const DOCUMENTED_PRELOAD_SURFACE = [
  'windowControl',
  'listDevDocs',
  'readDevDoc',
  'readWorkspaceState',
  'writeWorkspaceState',
  'openVault',
  'getVault',
  'listVaultFiles',
  'searchVault',
  'readNote',
  'writeNote',
  'createNote',
  'listProjects',
  'createProject',
  'runAiOperation',
  'resolveAiTrace',
  'getAiTraceSummary'
] as const satisfies readonly (keyof AtomikApi)[]
