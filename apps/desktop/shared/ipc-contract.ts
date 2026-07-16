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
  /** Push (main -> renderer): fires on maximize/unmaximize, OS-initiated
   *  included. Payload is WindowControlState — a boolean, nothing more. */
  windowStateChanged: 'atomik:window-state-changed',
  listDevDocs: 'atomik:list-dev-docs',
  readDevDoc: 'atomik:read-dev-doc',
  readWorkspaceState: 'atomik:read-workspace-state',
  writeWorkspaceState: 'atomik:write-workspace-state',
  openVault: 'atomik:open-vault',
  /** Push (main -> renderer): the open vault changed. Every mounted
   *  vault-backed view must drop state from the previous vault. */
  vaultChanged: 'atomik:vault-changed',
  vaultFilesChanged: 'atomik:vault-files-changed',
  getVault: 'atomik:get-vault',
  listVaultFiles: 'atomik:list-vault-files',
  searchVault: 'atomik:search-vault',
  searchDevDocs: 'atomik:search-dev-docs',
  readNote: 'atomik:read-note',
  readSourceAsset: 'atomik:read-source-asset',
  writeNote: 'atomik:write-note',
  createNote: 'atomik:create-note',
  createFolder: 'atomik:create-folder',
  deleteNote: 'atomik:delete-note',
  deleteFolder: 'atomik:delete-folder',
  relocatePreview: 'atomik:relocate-preview',
  relocateApply: 'atomik:relocate-apply',
  relocateFolderPreview: 'atomik:relocate-folder-preview',
  relocateFolderApply: 'atomik:relocate-folder-apply',
  /** Push (main -> renderer): a note moved; tabs re-point their params. */
  noteRelocated: 'atomik:note-relocated',
  listProjects: 'atomik:list-projects',
  createProject: 'atomik:create-project',
  startCaptureSession: 'atomik:start-capture-session',
  stopCaptureSession: 'atomik:stop-capture-session',
  getCaptureSession: 'atomik:get-capture-session',
  importCaptureUpload: 'atomik:import-capture-upload',
  discardCaptureUpload: 'atomik:discard-capture-upload',
  transcribeSource: 'atomik:transcribe-source',
  transcribeSourceCloud: 'atomik:transcribe-source-cloud',
  resetTranscription: 'atomik:reset-transcription',
  importPdfSource: 'atomik:import-pdf-source',
  extractPdfSource: 'atomik:extract-pdf-source',
  resetExtraction: 'atomik:reset-extraction',
  addLocalCapture: 'atomik:add-local-capture',
  getCaptureUploadData: 'atomik:get-capture-upload-data',
  openSourceExternally: 'atomik:open-source-externally',
  runAiOperation: 'atomik:run-ai-operation',
  resolveAiTrace: 'atomik:resolve-ai-trace',
  getAiTraceSummary: 'atomik:get-ai-trace-summary',
  getAiSettings: 'atomik:get-ai-settings',
  setMistralApiKey: 'atomik:set-mistral-api-key',
  webViewEnsure: 'atomik:web-view-ensure',
  webViewNavigate: 'atomik:web-view-navigate',
  webViewControl: 'atomik:web-view-control',
  webViewSetBounds: 'atomik:web-view-set-bounds',
  webViewSetVisible: 'atomik:web-view-set-visible',
  webViewDestroy: 'atomik:web-view-destroy',
  webViewImportSource: 'atomik:web-view-import-source',
  webViewReaderText: 'atomik:web-view-reader-text',
  extractWebReader: 'atomik:extract-web-reader',
  resetWebReader: 'atomik:reset-web-reader',
  /** Push (main -> renderer): navigation state of one embedded web view. */
  webViewState: 'atomik:web-view-state'
} as const

/** What the renderer may know about AI settings (13): presence and a
 *  recognition hint — the raw key never crosses back. */
export type AiSettingsPublic = {
  mistralKeyPresent: boolean
  mistralKeyHint: string | null
}

/**
 * The embedded web view (M5, bedrock 09/13): remote content lives in an
 * isolated WebContentsView owned by MAIN (persist:web-sources partition,
 * the four required settings, NO preload — zero bridge surface). Only
 * this typed navigation snapshot ever crosses to the trusted UI.
 */
export type WebViewControlAction = 'back' | 'forward' | 'reload' | 'stop'

/** DIP rect of the placeholder pane the native view covers. */
export type WebViewBounds = {
  x: number
  y: number
  width: number
  height: number
}

export type WebViewState = {
  /** The owning tab's id — the renderer filters pushes by it. */
  id: string
  url: string
  title: string
  loading: boolean
  canGoBack: boolean
  canGoForward: boolean
  /** Main-frame load failure, human-readable; null when healthy. */
  failure: string | null
}

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
      /** The pane's ONE tree panel (S07d, owner directive): pane chrome
       *  typed by the pane, never by the active tab — tabs are just views
       *  served from it. String map validated like tab params. Known keys:
       *  kind = 'vault' (default) | 'project'; projectPath/projectTitle
       *  (project kind); off = '1' hidden; w = width px; open = fold state. */
      tree?: Record<string, string>
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
   *  Known keys: saveMode = 'auto' (default) | 'manual';
   *  theme = 'system' (default) | 'light' | 'dark' | pastel names. */
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
 * A source ORIGINAL for viewers (07 evidence object; S05 image tab).
 * Read-only, image extensions only, base64 because the sandboxed renderer
 * has no file access — it becomes a data URL and nothing more.
 */
export type SourceAsset = {
  relPath: string
  mimeType: string
  base64: string
  /** Display rotation (0/90/180/270, clockwise) recorded in the sibling
   *  dossier — the original bytes are evidence and stay untouched;
   *  every viewer applies this at render time. */
  rotation: number
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

/** Relocate = rename AND move (CP-MVP-007 S04): the 27-sanctioned
 *  refactor — the note moves and inbound links update in one atomic,
 *  previewed operation. */
export type RelocateEdit = {
  relPath: string
  /** Link targets rewritten in this note. */
  count: number
}
export type RelocatePreview = {
  from: string
  to: string
  edits: RelocateEdit[]
  totalLinks: number
}
export type RelocateResult = { from: string; to: string; filesChanged: number }

/** Plain-folder creation result (CP-MVP-007, option D: a folder is
 *  born with its index.md map). */
export type FolderInfo = {
  /** Vault-relative folder path. */
  relPath: string
  /** The index.md that materialized the folder. */
  indexRelPath: string
}

/**
 * Capture session (08, 13 §capture upload security), S02 slice: a
 * short-lived local HTTP endpoint on the LAN interface that the owner's
 * phone uploads originals to. Uploads land in a temporary INBOX under the
 * state dir — NEVER the vault; importing into the vault is a separate,
 * explicitly confirmed step (S04) that runs in main. The QR payload is
 * `uploadUrl`: it carries the one-time token, which dies with the session
 * (stop, expiry, or app quit) and never authorizes a second session.
 */
export type CaptureUploadInfo = {
  id: string
  /** Sanitized client file name — display metadata only; names on disk
   *  are always server-chosen. */
  fileName: string
  /** Declared MIME, verified against the received bytes' magic numbers. */
  mimeType: string
  bytes: number
  receivedAtMs: number
  /** Set once the desktop decided (S04); the inbox file is gone then. */
  resolution?: 'imported' | 'discarded'
  /** Vault-relative dossier folder, when resolution = 'imported'. */
  importedTo?: string
}

/** Explicit desktop confirmation (S04): where an inbox item becomes a
 *  capture source bundle (07/08) inside the OPEN vault. */
export type CaptureImportDestination = {
  /** Vault-relative folder for the bundle, e.g.
   *  `sources/captures/2026-07-07-whiteboard`. Validated in main. */
  relPath: string
  /** Dossier title (frontmatter + index heading). */
  title: string
}

export type CaptureImportResult = {
  /** Vault-relative path of the created source.md dossier. */
  dossierPath: string
}

/**
 * Transcription (07/08, S06): a REPLACEABLE adapter turns a source
 * original into `transcript.md` — a visibly DERIVED representation. The
 * S06 adapter is a deterministic mock (no real OCR runs; the transcript
 * says so); a real local runtime arrives only through a dated capability
 * evaluation (34) behind the same contract. The dossier records model/
 * runtime/version and the correction state; the run emits an ActionTrace
 * with the transcription fields (33).
 */
export type TranscribeResult = {
  /** Vault-relative path of the created transcript.md. */
  transcriptPath: string
  /** ActionTrace id of the run (recorded in the dossier too). */
  traceId: string
}

export type CaptureSessionInfo = {
  id: string
  /** Phone-facing URL (LAN address; token included) — the QR payload.
   *  EMPTY for local-only records (desktop recordings; no endpoint). */
  uploadUrl: string
  expiresAtMs: number
  /** False once stopped or expired; uploads are refused from then on. */
  active: boolean
  uploads: CaptureUploadInfo[]
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

/**
 * URL provenance for evidence anchored in a web reader (09: notes carry
 * URL/provenance). The minimal slice of 28's evidence-source sketch:
 * url → externalUrl, dossierPath → sourceDossierPath, accessedAt, title.
 * Resolved main-side from the source dossier — never renderer-asserted.
 */
export type WebEvidenceProvenance = {
  /** The page the reader text was extracted from (dossier original_url). */
  url: string
  /** Vault-relative path of the source dossier (source.md). */
  dossierPath: string
  accessedAt?: string
  title?: string
}

export type EvidenceRecord = {
  id: string
  /** Where the supporting selection lives (05 anchor, MVP slice). Web
   *  provenance fields are present when that place is a web reader. */
  source: { relPath: string; range: { from: number; to: number } } & Partial<WebEvidenceProvenance>
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
  /** Subscribes to maximize/unmaximize pushes; returns the unsubscribe. */
  onWindowStateChanged: (
    listener: (state: WindowControlState) => void
  ) => () => void
  /** Enumerates the docs bundle (read-only; generated artifacts excluded). */
  listDevDocs: () => Promise<DevDocsGroup[]>
  /** Reads one doc file; the main process validates the path against docs/. */
  readDevDoc: (relPath: string) => Promise<DevDocFile>
  /** Restores the saved workspace layout; null when absent or invalid. */
  readWorkspaceState: () => Promise<WorkspaceState | null>
  /** Persists the layout; the main process validates shape and size. */
  writeWorkspaceState: (state: WorkspaceState) => Promise<void>
  /** Native folder picker in main; null when cancelled. Remembered.
   *  A successful pick also broadcasts onVaultChanged. */
  openVault: () => Promise<VaultInfo | null>
  /** Subscribes to vault switches; returns the unsubscribe. */
  onVaultChanged: (listener: (vault: VaultInfo | null) => void) => () => void
  /** Lightweight "files appeared/changed in the vault" push (S05f) —
   *  fired by main after operations that LAND files (transcription,
   *  cloud OCR); trees refresh without dropping any view state. */
  onVaultFilesChanged: (listener: () => void) => () => void
  /** Currently open vault (restored across restarts); null when none. */
  getVault: () => Promise<VaultInfo | null>
  /** Markdown tree of the open vault (dot-dirs and node_modules skipped). */
  listVaultFiles: () => Promise<VaultFolder>
  /**
   * Lexical search (filename/heading/full-text, no index). `scope` narrows
   * the perimeter to one root-relative folder (a project bundle);
   * validated in main.
   */
  searchVault: (query: string, scope?: string) => Promise<SearchResult[]>
  /** The same lexical scan over the docs bundle (dev docs perimeter). */
  searchDevDocs: (query: string) => Promise<SearchResult[]>
  /** Reads one note; validated vault-relative .md path. */
  readNote: (relPath: string) => Promise<VaultNoteFile>
  /** Reads one source original (image allowlist) for a viewer tab. */
  readSourceAsset: (relPath: string) => Promise<SourceAsset>
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
  createFolder: (relPath: string) => Promise<FolderInfo>
  /** Both send USER files to the OS trash (CP-MVP-007: recoverable
   *  outside the app) — never a hard delete. Bundle-internal notes
   *  are refused main-side; a bundle deletes as its whole folder. */
  deleteNote: (relPath: string) => Promise<{ relPath: string }>
  deleteFolder: (relPath: string) => Promise<{ relPath: string }>
  /** The preview is the acceptance gate (20/27): apply only after the
   *  user saw what changes. */
  relocatePreview: (from: string, to: string) => Promise<RelocatePreview>
  relocateApply: (from: string, to: string) => Promise<RelocateResult>
  /** Folder form (S05): prefix-wide refactor; bundle roots move as
   *  units, folders inside a bundle refuse. */
  relocateFolderPreview: (from: string, to: string) => Promise<RelocatePreview>
  relocateFolderApply: (from: string, to: string) => Promise<RelocateResult>
  onNoteRelocated: (
    listener: (move: { from: string; to: string }) => void
  ) => () => void
  /** Project bundles found in the open vault (manifest-detected). */
  listProjects: () => Promise<ProjectInfo[]>
  /** Creates or adopts a bundle: writes only the missing pieces. */
  createProject: (relPath: string, title: string) => Promise<ProjectInfo>
  /** Opens the LAN endpoint and mints a fresh one-time session (any
   *  previous session is invalidated first). */
  startCaptureSession: () => Promise<CaptureSessionInfo>
  /** Invalidates the session and closes the endpoint; inbox files stay
   *  for the S04 confirmation flow. */
  stopCaptureSession: () => Promise<void>
  /** Last session's state (uploads survive stop); null before any start. */
  getCaptureSession: () => Promise<CaptureSessionInfo | null>
  /** THE explicit confirmation (08): copies one inbox item into the open
   *  vault as a capture source bundle (original.* + source.md + index.md,
   *  wx — never clobbers), then clears it from the inbox. */
  importCaptureUpload: (
    uploadId: string,
    destination: CaptureImportDestination
  ) => Promise<CaptureImportResult>
  /** Rejects one inbox item: its files are deleted, nothing enters the
   *  vault. */
  discardCaptureUpload: (uploadId: string) => Promise<void>
  /** Runs the transcription adapter on a dossier's original; refuses to
   *  clobber an existing transcript (corrections live there, S07). */
  transcribeSource: (dossierPath: string) => Promise<TranscribeResult>
  /** EXPLICIT cloud OCR (CP-MVP-005 S05): sends the dossier's original
   *  image to the Mistral OCR API — only ever on this user action,
   *  never as a silent fallback; the result is visibly cloud-derived.
   *  Refuses without a configured key; same no-clobber rule. */
  transcribeSourceCloud: (dossierPath: string) => Promise<TranscribeResult>
  /** The explicit re-run affordance (S05h): deletes transcript.md (and
   *  segments/scan) and restores the dossier + index so a fresh run —
   *  local or cloud — can record cleanly. The renderer confirms first:
   *  human corrections live in the transcript and are lost. */
  resetTranscription: (dossierPath: string) => Promise<void>
  /** PDF as source (CP-MVP-003 S03): main opens a file dialog, validates
   *  the magic (bytes outrank labels), and lands a sources/pdf/<slug>/
   *  bundle — original.pdf untouched + dossier (sha256) + index. Null
   *  when the user cancels the dialog. */
  importPdfSource: () => Promise<CaptureImportResult | null>
  /** PDF text extraction (S05): text-layer pages parse locally; image-
   *  only pages ride the seated OCR when the system can rasterize.
   *  Lands extracted.md (derived, traced); refuses to clobber. */
  extractPdfSource: (dossierPath: string) => Promise<{ extractedPath: string; traceId: string }>
  /** Deletes extracted.md and restores the dossier/index so a fresh
   *  extraction can run — renderer confirms (corrections are lost). */
  resetExtraction: (dossierPath: string) => Promise<void>
  /** Desktop mic recording → the SAME inbox through the same gates
   *  (size/MIME/magic); the explicit import decides it like any phone
   *  upload. Opens no network endpoint. */
  addLocalCapture: (
    bytes: Uint8Array,
    mimeType: string,
    fileName: string
  ) => Promise<CaptureUploadInfo>
  /** Read-only bytes of an UNDECIDED inbox item — preview before the
   *  import decision (listen / look, re-record if bad). */
  getCaptureUploadData: (
    uploadId: string
  ) => Promise<{ mimeType: string; base64: string }>
  /** Opens a source ORIGINAL in the OS default player (WSLg audio
   *  escape hatch); same validation as readSourceAsset. */
  openSourceExternally: (relPath: string) => Promise<void>
  /** Mocked AI operation (S08): pure compute, never writes. */
  runAiOperation: (operation: AiOperation) => Promise<AiResponseBundle>
  /** Reports the user's decision; main appends the one trace line. */
  resolveAiTrace: (bundleId: string, decision: AiTraceDecision) => Promise<void>
  /** Badge data for a pending operation; null when unknown. */
  getAiTraceSummary: (bundleId: string) => Promise<TraceSummary | null>
  /** AI settings (S05b): presence + masked hint only. */
  getAiSettings: () => Promise<AiSettingsPublic>
  /** Stores (or clears, with null) the Mistral API key MAIN-SIDE; the
   *  response is the new public view, never the key. */
  setMistralApiKey: (key: string | null) => Promise<AiSettingsPublic>
  /** Ensures a tab's isolated web view exists (created on first call,
   *  loading `url`); idempotent — an existing view ignores `url`. */
  webViewEnsure: (
    id: string,
    url?: string
  ) => Promise<{ state: WebViewState; created: boolean }>
  /** Navigates a web view; http(s) only, re-validated in main. */
  webViewNavigate: (id: string, url: string) => Promise<void>
  /** back / forward / reload / stop. */
  webViewControl: (id: string, action: WebViewControlAction) => Promise<void>
  /** Positions the native view under the tab's placeholder rect. */
  webViewSetBounds: (id: string, bounds: WebViewBounds) => Promise<void>
  /** Shows/hides the native view (tab switches, overlay guard). */
  webViewSetVisible: (id: string, visible: boolean) => Promise<void>
  /** Tears the view down when its tab closes. */
  webViewDestroy: (id: string) => Promise<void>
  /** EXPLICIT Import-as-source (09): snapshots the tab's current page
   *  into a sources/web/<slug>/ bundle; returns the new dossier. */
  webViewImportSource: (id: string) => Promise<CaptureImportResult>
  /** Live reader mode (S06): extracts the tab's CURRENT page to reader
   *  markdown in memory — no file, no images (transient read). */
  webViewReaderText: (id: string) => Promise<{ title: string; markdown: string }>
  /** Reader extraction (S05): the web dossier's snapshot → derived
   *  reader.md (text + images in media/); returns the reader path. */
  extractWebReader: (
    dossierPath: string
  ) => Promise<{ readerPath: string; traceId: string; imageCount: number }>
  /** Deletes a reader extraction (reader.md + media/) so it can re-run. */
  resetWebReader: (dossierPath: string) => Promise<void>
  /** Push: navigation snapshots of every web view; filter by state.id. */
  onWebViewState: (listener: (state: WebViewState) => void) => () => void
}

/**
 * The documented preload surface. Kept as a runtime constant so tests can
 * compare it against the object actually handed to contextBridge.
 */
export const DOCUMENTED_PRELOAD_SURFACE = [
  'windowControl',
  'onWindowStateChanged',
  'listDevDocs',
  'readDevDoc',
  'readWorkspaceState',
  'writeWorkspaceState',
  'openVault',
  'onVaultChanged',
  'onVaultFilesChanged',
  'getVault',
  'listVaultFiles',
  'searchVault',
  'searchDevDocs',
  'readNote',
  'readSourceAsset',
  'writeNote',
  'createNote',
  'createFolder',
  'deleteNote',
  'deleteFolder',
  'relocatePreview',
  'relocateApply',
  'relocateFolderPreview',
  'relocateFolderApply',
  'onNoteRelocated',
  'listProjects',
  'createProject',
  'startCaptureSession',
  'stopCaptureSession',
  'getCaptureSession',
  'importCaptureUpload',
  'discardCaptureUpload',
  'transcribeSource',
  'transcribeSourceCloud',
  'resetTranscription',
  'importPdfSource',
  'extractPdfSource',
  'resetExtraction',
  'addLocalCapture',
  'getCaptureUploadData',
  'openSourceExternally',
  'runAiOperation',
  'resolveAiTrace',
  'getAiTraceSummary',
  'getAiSettings',
  'setMistralApiKey',
  'webViewEnsure',
  'webViewNavigate',
  'webViewControl',
  'webViewSetBounds',
  'webViewSetVisible',
  'webViewDestroy',
  'webViewImportSource',
  'webViewReaderText',
  'extractWebReader',
  'resetWebReader',
  'onWebViewState'
] as const satisfies readonly (keyof AtomikApi)[]
