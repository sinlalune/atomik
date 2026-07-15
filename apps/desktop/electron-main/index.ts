import { app, BrowserWindow, dialog, ipcMain, nativeImage, screen, session, shell, utilityProcess, WebContentsView } from 'electron'
import { execFile } from 'node:child_process'
import { copyFileSync, existsSync, mkdtempSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import { runAiOperation } from './ai-mock'
import { ActionTraceLedger } from './action-trace'
import { importCaptureUpload } from './capture-import'
import { CaptureSessionManager } from './capture-session'
import {
  mockTranscriptionAdapter,
  recordTranscriptCorrection,
  resetTranscription,
  routeByMedia,
  transcribeSource,
  type TranscriptionAdapter
} from './transcription'
import { createWhisperCppAdapter, whisperSeatReady } from './whisper-adapter'
import { createQwenVlOcrAdapter, ocrSeatReady, type ImageResizer } from './ocr-adapter'
import { createMistralOcrAdapter, createVoxtralTranscribeAdapter } from './mistral-ocr-adapter'
import { publicAiSettings, readMistralKey, writeMistralKey } from './ai-settings'
import { importPdfFromPath } from './pdf-import'
import { importWebSource, type WebPageMeta } from './web-import'
import {
  extractWebReaderAsync,
  readerFromHtml,
  readerFromSnapshot,
  resetWebReader,
  type ReaderComputeResult,
  type ReaderJob
} from './web-reader'
import { extractPdfSource, resetExtraction } from './pdf-extract'
import { pdftoppmRasterizer, readPdfTextWithPdfjs } from './pdf-text'
import { rotateRgba, scanCleanRgba } from './scan-filter'
import { listDevDocs, readDevDoc, resolveDocsRoot } from './dev-docs'
import { searchVault } from './search'
import { buildMainWindowOptions } from './security'
import { createProject, listProjects } from './project'
import {
  createNote,
  listVaultFiles,
  persistLastVaultRoot,
  readLastVaultRoot,
  readNote,
  readSourceAsset,
  resolveSourceAssetAbs,
  writeNote
} from './vault'
import {
  readWorkspaceState,
  resolveStateDir,
  writeWorkspaceState
} from './workspace-state'
import {
  parseWindowsScreens,
  WINDOWS_SCREENS_PS_COMMAND,
  wslgWorkAreaFor,
  type WindowsScreens
} from './wslg-workarea'
import {
  authRequestHeaders,
  clampedViewBounds,
  FIREFOX_UA,
  guestWebPreferences,
  isAllowedWebUrl,
  isGoogleAuthUrl,
  isWebViewControlAction,
  isWebViewId,
  normalizeChromeUserAgent,
  WEB_ALLOWED_PERMISSIONS,
  WEB_PARTITION
} from './web-view'
import {
  ATOMIK_CHANNELS,
  type AiOperation,
  type VaultInfo,
  type WebViewState
} from '../shared/ipc-contract'

// Linux: 'auto' prefers native Wayland where it can initialize and falls
// back to X11 otherwise. REALITY CHECK 2026-07-15 on the owner's WSLg:
// auto resolves to X11 (XWayland) — forcing --ozone-platform=wayland
// crashes outright (no DRM render node under this WSL), so X11 is the
// live path and the WSLg maximize handling below is probed against it.
// The switch stays for real Linux desktops. Must be set before ready.
if (process.platform === 'linux') {
  app.commandLine.appendSwitch('ozone-platform-hint', 'auto')
  // NOTE: forcing PULSE_LATENCY_MSEC here broke device discovery on the
  // owner's WSLg (NotFoundError) — libpulse rejected the stream config.
  // Reverted; opt in explicitly via the shell env if ever re-tested.
  // WSLg's RDP audio path underruns under sustained streaming with
  // Chromium's default buffer: UNMUTED playback froze at ~15 s while a
  // muted run reached the end (probe-proven on the owner's machine,
  // 2026-07-07). 8× buffers ride over the bridge's hiccups — playback
  // verified smooth to the end with this switch alone.
  if (process.env['WSL_DISTRO_NAME']) {
    app.commandLine.appendSwitch('audio-buffer-size', '16384')
  }
}

/** Current vault root — main-process state; the renderer only ever sees
 *  VaultInfo and vault-relative paths. */
let vaultRoot: string | null = null

function vaultInfo(): VaultInfo | null {
  return vaultRoot ? { root: vaultRoot, name: basename(vaultRoot) } : null
}

function requireVault(): string {
  if (!vaultRoot) throw new Error('vault: no vault open')
  return vaultRoot
}

/** Startup restore: ATOMIK_VAULT_DIR (tests/smoke/dev) wins over the
 *  remembered last vault; both must exist and be directories. */
function restoreVault(stateDir: string): void {
  const fromEnv = process.env['ATOMIK_VAULT_DIR']
  if (fromEnv) {
    try {
      if (statSync(fromEnv).isDirectory()) {
        vaultRoot = fromEnv
        return
      }
    } catch {
      /* fall through to settings */
    }
  }
  vaultRoot = readLastVaultRoot(stateDir)
}

function registerVaultHandlers(stateDir: string): void {
  ipcMain.handle(ATOMIK_CHANNELS.openVault, async (event) => {
    const result = await dialog.showOpenDialog({
      title: 'Open vault folder',
      properties: ['openDirectory', 'createDirectory']
    })
    const chosen = result.filePaths[0]
    if (result.canceled || !chosen) return null
    vaultRoot = chosen
    persistLastVaultRoot(stateDir, chosen)
    // Every mounted vault-backed view must drop previous-vault state
    // (stale writes stay safe regardless: the mtime handshake refuses
    // them against same-named files in the new vault).
    event.sender.send(ATOMIK_CHANNELS.vaultChanged, vaultInfo())
    return vaultInfo()
  })
  ipcMain.handle(ATOMIK_CHANNELS.getVault, () => vaultInfo())
  ipcMain.handle(ATOMIK_CHANNELS.listVaultFiles, () =>
    listVaultFiles(requireVault())
  )
  ipcMain.handle(
    ATOMIK_CHANNELS.searchVault,
    (_event, query: unknown, scope: unknown) =>
      searchVault(
        requireVault(),
        query,
        scope === undefined || scope === null ? undefined : scope
      )
  )
  ipcMain.handle(ATOMIK_CHANNELS.readNote, (_event, relPath: unknown) =>
    readNote(requireVault(), relPath)
  )
  ipcMain.handle(ATOMIK_CHANNELS.readSourceAsset, (_event, relPath: unknown) =>
    readSourceAsset(requireVault(), relPath)
  )
  // Escape hatch for WSLg's capricious audio output: hand the ORIGINAL
  // to the OS default player. Same validation as the asset read.
  ipcMain.handle(
    ATOMIK_CHANNELS.openSourceExternally,
    async (_event, relPath: unknown) => {
      const original = resolveSourceAssetAbs(requireVault(), relPath)
      // EVIDENCE PROTECTION (owner incident: Windows Photos' ReplaceFile
      // dance renamed original.jpg to ~RF….TMP through the WSL bridge).
      // External apps get a TEMP COPY — the original is never theirs to
      // touch.
      const copyDir = mkdtempSync(join(tmpdir(), 'atomik-open-'))
      const asset = join(copyDir, basename(original))
      copyFileSync(original, asset)
      if (process.env['WSL_DISTRO_NAME']) {
        // No xdg-open inside WSL: convert to a Windows path and let the
        // WINDOWS default player open it (native audio — no WSLg bridge).
        const winPath = await new Promise<string>((res, rej) =>
          execFile('wslpath', ['-w', asset], (e, out) =>
            e ? rej(e) : res(out.trim())
          )
        )
        // explorer.exe's exit code is meaningless; fire and forget.
        execFile('explorer.exe', [winPath], () => {})
        return
      }
      const outcome = await shell.openPath(asset)
      if (outcome) throw new Error(`open externally: ${outcome}`)
    }
  )
  ipcMain.handle(
    ATOMIK_CHANNELS.writeNote,
    (_event, relPath: unknown, content: unknown, expectedMtimeMs: unknown) => {
      const result = writeNote(
        requireVault(),
        relPath,
        content,
        expectedMtimeMs === undefined || expectedMtimeMs === null
          ? undefined
          : expectedMtimeMs
      )
      // S07: saving a bundle's transcript IS the human correction — the
      // dossier flips to human-corrected. Bookkeeping must never fail
      // the user's save; a racing dossier retries on the next save
      // (the state is still model-output until the flip lands).
      if (typeof relPath === 'string') {
        try {
          recordTranscriptCorrection(requireVault(), relPath)
        } catch {
          /* dossier busy — the next transcript save retries */
        }
      }
      return result
    }
  )
  ipcMain.handle(
    ATOMIK_CHANNELS.createNote,
    (_event, relPath: unknown, content: unknown) =>
      createNote(requireVault(), relPath, content)
  )
  ipcMain.handle(ATOMIK_CHANNELS.listProjects, () =>
    listProjects(requireVault())
  )
  ipcMain.handle(
    ATOMIK_CHANNELS.createProject,
    (_event, relPath: unknown, title: unknown) =>
      createProject(requireVault(), relPath, title)
  )
  ipcMain.handle(ATOMIK_CHANNELS.runAiOperation, (_event, operation: unknown) => {
    const started = Date.now()
    try {
      const bundle = runAiOperation(operation)
      const traceId = traces.draftFor(
        operation as AiOperation,
        bundle,
        Date.now() - started
      )
      return { ...bundle, actionTraceIds: [traceId] }
    } catch (error) {
      const operationId =
        typeof operation === 'object' &&
        operation !== null &&
        typeof (operation as Record<string, unknown>)['id'] === 'string'
          ? ((operation as Record<string, unknown>)['id'] as string)
          : 'unknown'
      traces.recordFailure(operationId, Date.now() - started)
      throw error
    }
  })
  ipcMain.handle(
    ATOMIK_CHANNELS.resolveAiTrace,
    (_event, bundleId: unknown, decision: unknown) =>
      traces.resolve(bundleId, decision)
  )
  ipcMain.handle(ATOMIK_CHANNELS.getAiTraceSummary, (_event, bundleId: unknown) =>
    traces.summary(bundleId)
  )
}

/** S09 ledger; constructed at startup with the resolved state dir. */
let traces: ActionTraceLedger

/** Capture session server (S02); inbox lives under the state dir, never
 *  the vault — the inbox→vault import is S04's explicitly confirmed step. */
let capture: CaptureSessionManager

/** The seats (S05 speech; CP-MVP-005 S03 OCR): real runtimes when their
 *  pieces exist, the honest mock otherwise — capture never blocks on a
 *  runtime. `transcriptionAdapter` routes by media family. */
let transcriptionAdapter: TranscriptionAdapter = mockTranscriptionAdapter

/** The REAL OCR seat when its pieces exist (null otherwise) — shared by
 *  the media router and the PDF extraction fallback (S05). */
let ocrAdapter: TranscriptionAdapter | null = null

/** THE PROVEN OCR HARNESS (S07 addendum 5): pre-resize to the token
 *  budget in main — pixels/784 tokens, dimensions multiples of 28,
 *  never upscale — via Electron's own nativeImage (15: no new image
 *  dependency), THEN the bench's scan filter (S05b, owner directive):
 *  illumination flattening + contrast stretch, the treatment that put
 *  the clean-scan tier's quality on the table. llama.cpp's flag-based
 *  cap is broken for this model and is never used. */
const nativeImageResizer: ImageResizer = (srcAbs, dstAbs, budgetTokens, rotationDegrees) => {
  const img = nativeImage.createFromPath(srcAbs)
  const size = img.getSize()
  if (size.width === 0 || size.height === 0) {
    return Promise.reject(new Error(`ocr: unreadable image — ${basename(srcAbs)}`))
  }
  const scale = Math.min(1, Math.sqrt((budgetTokens * 784) / (size.width * size.height)))
  const width = Math.max(28, Math.round((size.width * scale) / 28) * 28)
  const height = Math.max(28, Math.round((size.height * scale) / 28) * 28)
  const resized = img.resize({ width, height, quality: 'best' })
  // upright per the dossier's recorded rotation (S07 note), then flatten
  const upright = rotateRgba(resized.toBitmap(), width, height, rotationDegrees)
  const cleaned = scanCleanRgba(upright.pixels, upright.width, upright.height)
  writeFileSync(
    dstAbs,
    nativeImage
      .createFromBitmap(cleaned, { width: upright.width, height: upright.height })
      .toJPEG(95)
  )
  return Promise.resolve({ width: upright.width, height: upright.height })
}

function registerCaptureHandlers(stateDir: string): void {
  ipcMain.handle(ATOMIK_CHANNELS.startCaptureSession, () => capture.start())
  ipcMain.handle(ATOMIK_CHANNELS.stopCaptureSession, () => capture.stop())
  ipcMain.handle(ATOMIK_CHANNELS.getCaptureSession, () => capture.inspect())
  // The explicit confirmation (08): inbox → vault runs HERE, in main, on
  // a per-item renderer request — never as a side effect of an upload.
  ipcMain.handle(
    ATOMIK_CHANNELS.importCaptureUpload,
    (_event, uploadId: unknown, destination: unknown) => {
      const vaultRoot = requireVault()
      const upload = capture.getUpload(uploadId)
      if (!upload) throw new Error('capture: unknown or already resolved upload')
      const result = importCaptureUpload(vaultRoot, destination, upload)
      capture.resolveUpload(upload.info.id, 'imported', result.dossierPath)
      return result
    }
  )
  ipcMain.handle(
    ATOMIK_CHANNELS.discardCaptureUpload,
    (_event, uploadId: unknown) => {
      const upload = capture.getUpload(uploadId)
      if (!upload) throw new Error('capture: unknown or already resolved upload')
      capture.resolveUpload(upload.info.id, 'discarded')
    }
  )
  // S06: the replaceable transcription seat, mock-first. The adapter is
  // chosen HERE (main); a real runtime swaps in behind the same contract
  // only through a dated capability evaluation (34).
  ipcMain.handle(
    ATOMIK_CHANNELS.transcribeSource,
    async (event, dossierPath: unknown) => {
      const result = await transcribeSource(requireVault(), dossierPath, transcriptionAdapter, traces)
      // new files landed (transcript, scan, segments) — trees refresh
      event.sender.send(ATOMIK_CHANNELS.vaultFilesChanged)
      return result
    }
  )
  // CP-MVP-005 S05: the cloud OCR rung — EXPLICIT per-capture action,
  // never a silent fallback (13). Key stays main-process; absent key =
  // explanatory refusal and nothing leaves the machine.
  ipcMain.handle(
    ATOMIK_CHANNELS.transcribeSourceCloud,
    async (event, dossierPath: unknown) => {
      // S05b: the AI settings store is the user path; env = dev override
      const key = readMistralKey(stateDir) ?? process.env['MISTRAL_API_KEY']?.trim() ?? null
      if (!key) {
        throw new Error(
          'cloud ocr: no Mistral API key configured (Settings → AI) — nothing was sent'
        )
      }
      // S06f: the cloud rung routes by media like the local one —
      // images → Mistral OCR, audio → Voxtral. One button, honest twice.
      const cloudSeat = routeByMedia(
        createVoxtralTranscribeAdapter(key),
        createMistralOcrAdapter(key)
      )
      const result = await transcribeSource(requireVault(), dossierPath, cloudSeat, traces)
      event.sender.send(ATOMIK_CHANNELS.vaultFilesChanged)
      return result
    }
  )
  // CP-MVP-003 S03: PDF as source — explicit file pick, gated bytes.
  ipcMain.handle(ATOMIK_CHANNELS.importPdfSource, async (event) => {
    const picked = await dialog.showOpenDialog({
      title: 'Import PDF as source',
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
      properties: ['openFile']
    })
    const chosen = picked.filePaths[0]
    if (picked.canceled || !chosen) return null
    const result = importPdfFromPath(requireVault(), chosen)
    event.sender.send(ATOMIK_CHANNELS.vaultFilesChanged)
    return result
  })
  // CP-MVP-003 S05: PDF extraction — text layer in main; image-only
  // pages ride the REAL OCR seat when the system can rasterize.
  ipcMain.handle(
    ATOMIK_CHANNELS.extractPdfSource,
    async (event, dossierPath: unknown) => {
      const rasterize = pdftoppmRasterizer(
        process.env['ATOMIK_PDFTOPPM'] ?? '/usr/bin/pdftoppm'
      )
      const result = await extractPdfSource(
        requireVault(),
        dossierPath,
        readPdfTextWithPdfjs,
        ocrAdapter,
        rasterize,
        traces
      )
      event.sender.send(ATOMIK_CHANNELS.vaultFilesChanged)
      return result
    }
  )
  // extraction lifecycle (owner feedback: ship delete with create)
  ipcMain.handle(
    ATOMIK_CHANNELS.resetExtraction,
    (event, dossierPath: unknown) => {
      resetExtraction(requireVault(), dossierPath)
      event.sender.send(ATOMIK_CHANNELS.vaultFilesChanged)
    }
  )
  // CP-MVP-006 S05: web reader extraction — snapshot.mhtml → reader.md
  // (text + images), deterministic, one trace. Validation, file writes,
  // dossier handshake, and the trace stay in MAIN over the on-disk
  // snapshot (never a re-fetch, never the display path); the CPU slab
  // rides the utility-process worker (perf audit 2026-07-15).
  ipcMain.handle(
    ATOMIK_CHANNELS.extractWebReader,
    async (event, dossierPath: unknown) => {
      const result = await extractWebReaderAsync(
        requireVault(),
        dossierPath,
        traces,
        runReaderJob
      )
      event.sender.send(ATOMIK_CHANNELS.vaultFilesChanged)
      return result
    }
  )
  ipcMain.handle(
    ATOMIK_CHANNELS.resetWebReader,
    (event, dossierPath: unknown) => {
      resetWebReader(requireVault(), dossierPath)
      event.sender.send(ATOMIK_CHANNELS.vaultFilesChanged)
    }
  )
  // S05h: the explicit re-run affordance — renderer confirms first.
  ipcMain.handle(
    ATOMIK_CHANNELS.resetTranscription,
    (event, dossierPath: unknown) => {
      resetTranscription(requireVault(), dossierPath)
      event.sender.send(ATOMIK_CHANNELS.vaultFilesChanged)
    }
  )
  // S05b: AI settings — the raw key never returns to the renderer.
  ipcMain.handle(ATOMIK_CHANNELS.getAiSettings, () => publicAiSettings(stateDir))
  ipcMain.handle(ATOMIK_CHANNELS.setMistralApiKey, (_event, key: unknown) => {
    if (key !== null && typeof key !== 'string') {
      throw new Error('ai settings: key must be a string or null')
    }
    writeMistralKey(stateDir, key)
    return publicAiSettings(stateDir)
  })
  // Desktop mic (owner request): same inbox, same gates, no endpoint.
  ipcMain.handle(
    ATOMIK_CHANNELS.addLocalCapture,
    (_event, bytes: unknown, mimeType: unknown, fileName: unknown) =>
      capture.addLocalUpload(bytes, mimeType, fileName)
  )
  ipcMain.handle(
    ATOMIK_CHANNELS.getCaptureUploadData,
    (_event, uploadId: unknown) => capture.readUploadData(uploadId)
  )
}

/**
 * Reader jobs (mhtml/HTML → markdown) run in a short-lived
 * utilityProcess so their DOM+turndown slab never blocks main — the
 * perf audit (2026-07-15) measured 834 ms for a 650 KB page, during
 * which every IPC call and window verb froze. One fork per job:
 * extraction is user-initiated and rare, so memory returns to zero
 * between jobs; a 120 s timeout kills a wedged worker; if the fork
 * itself fails (packaging gap), the job honestly runs in-process — the
 * old behavior, slow but correct.
 */
const READER_WORKER_TIMEOUT_MS = 120_000

function computeReaderJobInProcess(job: ReaderJob): ReaderComputeResult {
  return job.kind === 'snapshot'
    ? readerFromSnapshot(Buffer.from(job.snapshot), job.pageUrl)
    : readerFromHtml(job.html, job.pageUrl, new Map())
}

function runReaderJob(job: ReaderJob): Promise<ReaderComputeResult> {
  return new Promise((resolve, reject) => {
    let child: Electron.UtilityProcess
    try {
      child = utilityProcess.fork(join(__dirname, 'reader-worker.js'), [], {
        serviceName: 'atomik-reader'
      })
    } catch {
      try {
        resolve(computeReaderJobInProcess(job))
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)))
      }
      return
    }
    let settled = false
    let timer: NodeJS.Timeout | null = null
    const settle = (fn: () => void): void => {
      if (settled) return
      settled = true
      if (timer) clearTimeout(timer)
      fn()
    }
    timer = setTimeout(() => {
      settle(() => {
        child.kill()
        reject(new Error('web-reader: extraction timed out (120s)'))
      })
    }, READER_WORKER_TIMEOUT_MS)
    child.on('message', (message: unknown) => {
      const answer = message as
        | ({ ok: true } & ReaderComputeResult)
        | { ok: false; error: string }
      settle(() => {
        child.kill()
        if (answer.ok) {
          resolve({ title: answer.title, markdown: answer.markdown, media: answer.media })
        } else {
          reject(new Error(answer.error))
        }
      })
    })
    child.on('exit', (code) => {
      settle(() =>
        reject(new Error(`web-reader: worker exited before answering (code ${code})`))
      )
    })
    child.postMessage(job)
  })
}

/** Frame verbs for the chromeless window (13 §IPC: allowlist-validated;
 *  scoped to the calling window — only the trusted UI has this preload). */
const WINDOW_CONTROL_ACTIONS = new Set([
  'minimize',
  'toggle-maximize',
  'close',
  'get-state'
])

/**
 * Maximize: the native WM maximize everywhere EXCEPT WSLg. WSLg cannot
 * maximize borderless windows (microsoft/wslg#1015) — Windows-side
 * screenshots (2026-07-15, both monitors) measured the maximized RAIL
 * host window presenting the CONTENT +32px right/down (the client-side
 * shadow margin WSLg forgets to subtract) while INPUT stays unshifted:
 * everything visible sits 32px away from where it clicks, with a
 * transparent band at left/top and content clipped at right/bottom.
 * Electron's logical bounds read correct the whole time, which is why
 * every bounds-level probe said "fixed" while the owner kept seeing the
 * offset. The same probe showed a plain setBounds to the true work area
 * renders AND clicks pixel-perfect, shadow untouched, in 0-1 ms (the
 * old "lag" was the setHasShadow toggle, not setBounds).
 *
 * So under WSLg: maximize = OUR bounds over the Windows work area
 * (powershell-queried per monitor — Electron's screen.workArea lies:
 * full 1080, no taskbar), restore = the saved stable bounds, and the
 * WeakMap doubles as the maximized flag. OS-initiated maximize (snap,
 * Win+Up, drag-region double-click) is converted on the 'maximize'
 * event, but the manual fit is applied only AFTER 'unmaximize' settles:
 * the WM's async restore beats a synchronous setBounds (probe-measured
 * — the naive convert ended 4px inset all around). Accepted quirks of
 * never entering the WM state, dev-env only: Win+Down on a
 * WSLg-maximized window minimizes instead of restoring, and an edge
 * resize while WSLg-maximized keeps the flag until the next toggle.
 * Fullscreen (F11) is its own separate thing.
 */
const IS_WSLG =
  process.platform === 'linux' && Boolean(process.env['WSL_DISTRO_NAME'])

/** True Windows-side screen geometry under WSLg — null until the first
 *  query answers; refreshed (debounced) on display changes. */
let windowsScreens: WindowsScreens | null = null

function refreshWindowsScreens(): void {
  if (!IS_WSLG) return
  execFile(
    'powershell.exe',
    ['-NoProfile', '-Command', WINDOWS_SCREENS_PS_COMMAND],
    { timeout: 15000 },
    (error, stdout) => {
      if (!error) {
        windowsScreens = parseWindowsScreens(String(stdout)) ?? windowsScreens
      }
    }
  )
}

/** Bounds to restore to, present ONLY while WSLg-maximized (doubles as
 *  the "are we maximized" flag under WSLg). */
const wslgRestoreBounds = new WeakMap<BrowserWindow, Electron.Rectangle>()

/** Last STABLE un-maximized bounds (debounced in createMainWindow): the
 *  WM maximize dance emits transient junk rects (probe: 1208×804), so
 *  the restore target is recorded well before any conversion starts. */
const wslgStableBounds = new WeakMap<BrowserWindow, Electron.Rectangle>()

/** Windows whose WM maximize is being converted to the manual fit. */
const wslgPendingConversion = new WeakSet<BrowserWindow>()

function isWindowMaximized(window: BrowserWindow): boolean {
  return IS_WSLG ? wslgRestoreBounds.has(window) : window.isMaximized()
}

/** Maximize state is PUSHED so the custom controls track OS-initiated
 *  changes too, and CSS can drop the drag regions while maximized. */
function sendWindowState(window: BrowserWindow): void {
  if (window.isDestroyed()) return
  window.webContents.send(ATOMIK_CHANNELS.windowStateChanged, {
    maximized: isWindowMaximized(window)
  })
}

function wslgApplyMaximizeBounds(
  window: BrowserWindow,
  anchor: Electron.Rectangle
): void {
  const target = wslgWorkAreaFor(
    screen.getDisplayMatching(anchor).bounds,
    windowsScreens
  )
  window.setBounds(target)
  // One guarded re-assert: a WM configure racing ours can still land
  // late (probe-measured on the snap conversion).
  setTimeout(() => {
    if (window.isDestroyed() || !wslgRestoreBounds.has(window)) return
    const b = window.getBounds()
    if (
      b.x !== target.x ||
      b.y !== target.y ||
      b.width !== target.width ||
      b.height !== target.height
    ) {
      window.setBounds(target)
    }
  }, 250)
}

function wslgMaximize(window: BrowserWindow): void {
  if (!wslgRestoreBounds.has(window)) {
    wslgRestoreBounds.set(
      window,
      wslgStableBounds.get(window) ?? window.getBounds()
    )
  }
  const anchor = wslgRestoreBounds.get(window) ?? window.getBounds()
  wslgApplyMaximizeBounds(window, anchor)
  sendWindowState(window)
}

function wslgRestore(window: BrowserWindow): void {
  const bounds = wslgRestoreBounds.get(window)
  if (!bounds) return
  wslgRestoreBounds.delete(window)
  window.setBounds(bounds)
  sendWindowState(window)
}

function toggleMaximize(window: BrowserWindow): void {
  if (IS_WSLG) {
    if (wslgRestoreBounds.has(window)) wslgRestore(window)
    else wslgMaximize(window)
    return
  }
  if (window.isMaximized()) window.unmaximize()
  else window.maximize()
}

function registerIpcHandlers(docsRoot: string, stateDir: string): void {
  ipcMain.handle(ATOMIK_CHANNELS.windowControl, (event, action: unknown) => {
    if (typeof action !== 'string' || !WINDOW_CONTROL_ACTIONS.has(action)) {
      throw new Error('window-control: rejected action')
    }
    const window = BrowserWindow.fromWebContents(event.sender)
    if (!window) return { maximized: false }
    if (action === 'minimize') window.minimize()
    else if (action === 'toggle-maximize') toggleMaximize(window)
    else if (action === 'close') window.close()
    return {
      maximized: window.isDestroyed() ? false : isWindowMaximized(window)
    }
  })
  ipcMain.handle(ATOMIK_CHANNELS.listDevDocs, () => listDevDocs(docsRoot))
  ipcMain.handle(ATOMIK_CHANNELS.readDevDoc, (_event, relPath: unknown) =>
    readDevDoc(docsRoot, relPath)
  )
  ipcMain.handle(ATOMIK_CHANNELS.searchDevDocs, (_event, query: unknown) =>
    searchVault(docsRoot, query)
  )
  ipcMain.handle(ATOMIK_CHANNELS.readWorkspaceState, () =>
    readWorkspaceState(stateDir)
  )
  ipcMain.handle(
    ATOMIK_CHANNELS.writeWorkspaceState,
    (_event, state: unknown) => writeWorkspaceState(stateDir, state)
  )
}

/**
 * The embedded web views (CP-MVP-006 S03, bedrock 09/13; engine decision
 * sessions/2026-07-13-web-engine-decision.md): one isolated
 * WebContentsView per web tab, owned here in MAIN. The guest gets the
 * four required settings and NO preload; the persist:web-sources session
 * is deny-by-default; the trusted UI only ever exchanges typed snapshots
 * and geometry with it. The live page can never reach the vault: there
 * is no bridge to reach it with (13 source security rule).
 */
function registerWebViewHandlers(getWindow: () => BrowserWindow | null): void {
  const views = new Map<string, WebContentsView>()
  let sessionConfigured = false

  const webSession = (): Electron.Session => {
    const ses = session.fromPartition(WEB_PARTITION)
    if (!sessionConfigured) {
      sessionConfigured = true
      // The Google-login-wall mitigation (S02, recorded): the UA reads
      // as plain Chrome — Electron and app tokens dropped.
      ses.setUserAgent(normalizeChromeUserAgent(ses.getUserAgent(), app.getName()))
      ses.setPermissionRequestHandler((_contents, permission, callback) => {
        callback(WEB_ALLOWED_PERMISSIONS.has(permission))
      })
      ses.setPermissionCheckHandler((_contents, permission) =>
        WEB_ALLOWED_PERMISSIONS.has(permission)
      )
      // Downloads are out of MVP scope — cancelled, not dropped silently
      // into the filesystem (S02 decision; save-to-inbox is future work).
      ses.on('will-download', (event) => event.preventDefault())
      // Google-login compatibility (S03c, dated in web-view.ts): requests
      // to the auth hosts present as Firefox — client hints stripped —
      // so the embedded-Chromium fingerprint that walled the owner's
      // login disappears; every other request keeps the Chrome UA.
      ses.webRequest.onBeforeSendHeaders((details, callback) => {
        if (isGoogleAuthUrl(details.url)) {
          callback({ requestHeaders: authRequestHeaders(details.requestHeaders) })
        } else {
          callback({})
        }
      })
    }
    return ses
  }

  const stateOf = (
    id: string,
    view: WebContentsView,
    failure: string | null
  ): WebViewState => ({
    id,
    url: view.webContents.getURL(),
    title: view.webContents.getTitle(),
    loading: view.webContents.isLoading(),
    canGoBack: view.webContents.navigationHistory.canGoBack(),
    canGoForward: view.webContents.navigationHistory.canGoForward(),
    failure
  })

  const push = (
    id: string,
    view: WebContentsView,
    failure: string | null = null
  ): void => {
    const window = getWindow()
    if (!window || window.isDestroyed() || view.webContents.isDestroyed()) return
    window.webContents.send(ATOMIK_CHANNELS.webViewState, stateOf(id, view, failure))
  }

  const requireView = (id: unknown): { id: string; view: WebContentsView } => {
    if (!isWebViewId(id)) throw new Error('web-view: rejected id')
    const view = views.get(id)
    if (!view) throw new Error('web-view: unknown id')
    return { id, view }
  }

  ipcMain.handle(
    ATOMIK_CHANNELS.webViewEnsure,
    (_event, id: unknown, url: unknown) => {
      if (!isWebViewId(id)) throw new Error('web-view: rejected id')
      const existing = views.get(id)
      if (existing) return { state: stateOf(id, existing, null), created: false }
      const window = getWindow()
      if (!window || window.isDestroyed()) throw new Error('web-view: no window')
      const target = url === undefined ? 'about:blank' : url
      if (!isAllowedWebUrl(target)) throw new Error('web-view: rejected url')
      webSession()
      const view = new WebContentsView({ webPreferences: guestWebPreferences() })
      views.set(id, view)
      view.setVisible(false)
      view.setBounds({ x: 0, y: 0, width: 0, height: 0 })
      window.contentView.addChildView(view)
      const contents = view.webContents
      // Popups denied; the destination browses IN PLACE (S02 decision).
      contents.setWindowOpenHandler(({ url: popupUrl }) => {
        if (isAllowedWebUrl(popupUrl)) void contents.loadURL(popupUrl)
        return { action: 'deny' }
      })
      contents.on('will-navigate', (event, nextUrl) => {
        if (!isAllowedWebUrl(nextUrl)) event.preventDefault()
      })
      // navigator.userAgent must match the wire (S03c): page scripts on
      // the auth hosts read Firefox too; everywhere else, Chrome.
      contents.on('did-start-navigation', (event) => {
        if (!event.isMainFrame || event.isSameDocument) return
        contents.setUserAgent(
          isGoogleAuthUrl(event.url) ? FIREFOX_UA : webSession().getUserAgent()
        )
      })
      contents.on('did-start-loading', () => push(id, view))
      contents.on('did-stop-loading', () => push(id, view))
      contents.on('did-navigate', () => push(id, view))
      contents.on('did-navigate-in-page', () => push(id, view))
      contents.on('page-title-updated', () => push(id, view))
      contents.on(
        'did-fail-load',
        (_event, errorCode, errorDescription, _validatedUrl, isMainFrame) => {
          // -3 is an aborted load (redirects, stop) — not a failure
          if (isMainFrame && errorCode !== -3) {
            push(id, view, `${errorDescription || 'load failed'} (${errorCode})`)
          }
        }
      )
      contents.on('render-process-gone', (_event, details) => {
        push(id, view, `page crashed (${details.reason})`)
      })
      void contents.loadURL(target).catch(() => {
        /* did-fail-load already reported it */
      })
      return { state: stateOf(id, view, null), created: true }
    }
  )

  ipcMain.handle(
    ATOMIK_CHANNELS.webViewNavigate,
    (_event, id: unknown, url: unknown) => {
      const { view } = requireView(id)
      if (!isAllowedWebUrl(url)) throw new Error('web-view: rejected url')
      void view.webContents.loadURL(url).catch(() => {
        /* did-fail-load already reported it */
      })
    }
  )

  ipcMain.handle(
    ATOMIK_CHANNELS.webViewControl,
    (_event, id: unknown, action: unknown) => {
      const { view } = requireView(id)
      if (!isWebViewControlAction(action)) {
        throw new Error('web-view: rejected action')
      }
      const contents = view.webContents
      if (action === 'back' && contents.navigationHistory.canGoBack()) {
        contents.navigationHistory.goBack()
      } else if (action === 'forward' && contents.navigationHistory.canGoForward()) {
        contents.navigationHistory.goForward()
      } else if (action === 'reload') {
        contents.reload()
      } else if (action === 'stop') {
        contents.stop()
      }
    }
  )

  // Geometry channels are TOLERANT of unknown ids: the renderer reports
  // rects around the async ensure; a report that races creation is noise,
  // not a bug.
  ipcMain.handle(
    ATOMIK_CHANNELS.webViewSetBounds,
    (_event, id: unknown, bounds: unknown) => {
      if (!isWebViewId(id)) throw new Error('web-view: rejected id')
      const view = views.get(id)
      const clamped = clampedViewBounds(bounds)
      if (view && clamped) view.setBounds(clamped)
    }
  )

  ipcMain.handle(
    ATOMIK_CHANNELS.webViewSetVisible,
    (_event, id: unknown, visible: unknown) => {
      if (!isWebViewId(id)) throw new Error('web-view: rejected id')
      if (typeof visible !== 'boolean') throw new Error('web-view: rejected flag')
      views.get(id)?.setVisible(visible)
    }
  )

  // CP-MVP-006 S04: the EXPLICIT Import-as-source action (09 — never
  // automatic). Snapshot + metadata come from the page the user SAW;
  // every page-controlled string is sanitized in web-import.ts before
  // it touches a file. The renderer chooses nothing but the tab.
  ipcMain.handle(
    ATOMIK_CHANNELS.webViewImportSource,
    async (event, id: unknown) => {
      const { view } = requireView(id)
      const contents = view.webContents
      const url = contents.getURL()
      // read-only metadata probe; a hostile/hung page must not block the
      // import — 3 s and we fall back to title+url only
      let meta: Partial<WebPageMeta> | null = null
      try {
        const probed = (await Promise.race([
          contents.executeJavaScript(
            `(() => { try { return JSON.stringify({
              canonical: document.querySelector('link[rel="canonical"]')?.href ?? null,
              author: document.querySelector('meta[name="author"]')?.getAttribute('content') ?? null,
              publisher: document.querySelector('meta[property="og:site_name"]')?.getAttribute('content') ?? null,
              published: document.querySelector('meta[property="article:published_time"]')?.getAttribute('content') ?? null,
              modified: document.querySelector('meta[property="article:modified_time"]')?.getAttribute('content') ?? null,
              description: document.querySelector('meta[name="description"]')?.getAttribute('content') ?? null
            }) } catch { return null } })()`
          ),
          new Promise((resolve) => setTimeout(() => resolve(null), 3000))
        ])) as string | null
        meta = probed ? (JSON.parse(probed) as Partial<WebPageMeta>) : null
      } catch {
        meta = null
      }
      const result = await importWebSource(
        requireVault(),
        { url, title: contents.getTitle(), meta },
        (absPath) => contents.savePage(absPath, 'MHTML')
      )
      event.sender.send(ATOMIK_CHANNELS.vaultFilesChanged)
      return result
    }
  )

  // Live reader mode (CP-MVP-006 S06): extract the tab's CURRENT page to
  // reader markdown IN MEMORY — no file, no images (transient read; the
  // durable path with local media is Import-as-source). Same engine as
  // the snapshot extraction, fed the live post-JS DOM; the conversion
  // slab rides the worker so a heavy page never freezes the app.
  ipcMain.handle(
    ATOMIK_CHANNELS.webViewReaderText,
    async (_event, id: unknown) => {
      const { view } = requireView(id)
      const contents = view.webContents
      const url = contents.getURL()
      const pageHtml = (await contents.executeJavaScript(
        'document.documentElement.outerHTML'
      )) as string
      const { title, markdown } = await runReaderJob({
        kind: 'html',
        html: pageHtml,
        pageUrl: url
      })
      return { title, markdown }
    }
  )

  ipcMain.handle(ATOMIK_CHANNELS.webViewDestroy, (_event, id: unknown) => {
    if (!isWebViewId(id)) throw new Error('web-view: rejected id')
    const view = views.get(id)
    if (!view) return
    views.delete(id)
    const window = getWindow()
    if (window && !window.isDestroyed()) window.contentView.removeChildView(view)
    if (!view.webContents.isDestroyed()) view.webContents.close()
  })
}

function createMainWindow(hash?: string): BrowserWindow {
  const window = new BrowserWindow(
    buildMainWindowOptions(join(__dirname, '../preload/index.js'))
  )

  // The trusted UI window never hosts remote content (13). Until a dedicated
  // isolated source view exists (M5), deny every escape hatch outright.
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  window.webContents.on('will-navigate', (event, url) => {
    if (url !== window.webContents.getURL()) event.preventDefault()
  })

  if (IS_WSLG) {
    // Record the restore target only when the geometry is STABLE — the
    // WM maximize dance emits transient rects that must never become
    // the bounds we restore to.
    let stableTimer: NodeJS.Timeout | null = null
    const recordStable = (): void => {
      if (stableTimer) clearTimeout(stableTimer)
      stableTimer = setTimeout(() => {
        stableTimer = null
        if (window.isDestroyed() || window.isMaximized()) return
        if (wslgRestoreBounds.has(window)) return
        wslgStableBounds.set(window, window.getBounds())
      }, 300)
    }
    window.on('resize', recordStable)
    window.on('move', recordStable)
    window.once('ready-to-show', recordStable)

    // wslg#1015: never present the WM-maximized state — convert snap /
    // Win+Up / drag-region double-click to the manual work-area fit,
    // applied only after the WM's own restore settles (it beats a
    // synchronous setBounds).
    window.on('maximize', () => {
      wslgPendingConversion.add(window)
      window.unmaximize()
    })
    window.on('unmaximize', () => {
      if (wslgPendingConversion.has(window)) {
        wslgPendingConversion.delete(window)
        setTimeout(() => {
          if (!window.isDestroyed()) wslgMaximize(window)
        }, 150)
      } else {
        sendWindowState(window)
      }
    })
  } else {
    window.on('maximize', () => sendWindowState(window))
    window.on('unmaximize', () => sendWindowState(window))
  }

  window.once('ready-to-show', () => window.show())

  const devServerUrl = process.env['ELECTRON_RENDERER_URL']
  if (devServerUrl) {
    void window.loadURL(hash ? `${devServerUrl}#${hash}` : devServerUrl)
  } else {
    void window.loadFile(
      join(__dirname, '../renderer/index.html'),
      hash ? { hash } : undefined
    )
  }

  return window
}

/** Polls the renderer for the Dev Docs rendered marker (smoke mode only). */
async function waitForDevDocsRender(
  window: BrowserWindow,
  timeoutMs: number
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const found = (await window.webContents.executeJavaScript(
      'Boolean(document.querySelector("[data-devdocs-rendered]"))'
    )) as boolean
    if (found) return true
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  return false
}

/**
 * Deterministic "app starts and Dev Docs opens the bundle" check (M0
 * acceptance). ATOMIK_SMOKE=1 opens the Dev Docs view, waits for it to
 * render, optionally captures ATOMIK_SMOKE_SHOT as PNG, prints a marker,
 * exits 0 (or 1 on timeout).
 */
async function runSmoke(window: BrowserWindow, docsRoot: string): Promise<void> {
  const rendered = await waitForDevDocsRender(window, 15000)
  if (rendered) {
    const groups = listDevDocs(docsRoot)
    const docCount = groups.reduce((n, g) => n + g.entries.length, 0)
    const paneCount = (await window.webContents.executeJavaScript(
      'document.querySelectorAll(".pane").length'
    )) as number
    // Optional vault write proof: drives create+write through the real
    // renderer world -> preload -> main -> disk chain (S05 e2e check).
    let vaultReport = ''
    if (process.env['ATOMIK_SMOKE_VAULT_WRITE'] === '1' && vaultRoot) {
      const outcome = (await window.webContents.executeJavaScript(
        `(async () => {
          try {
            await window.atomik.createNote('smoke/created-by-smoke.md')
            await window.atomik.writeNote('welcome.md', '# Welcome\\n\\nedited by smoke, no trailing newline')
            return 'ok'
          } catch (e) { return 'fail:' + String(e) }
        })()`
      )) as string
      vaultReport = ` vaultWrite=${outcome}`
    }
    // Optional project proof: create + list through the renderer world.
    if (process.env['ATOMIK_SMOKE_PROJECT'] === '1' && vaultRoot) {
      const outcome = (await window.webContents.executeJavaScript(
        `(async () => {
          try {
            const project = await window.atomik.createProject('projects/smoke-demo', 'Smoke Demo')
            const list = await window.atomik.listProjects()
            return 'ok:' + project.id + ':' + list.length
          } catch (e) { return 'fail:' + String(e) }
        })()`
      )) as string
      vaultReport += ` project=${outcome}`
    }
    // Optional AI proof: run a mocked operation through the renderer world
    // and check the bundle shape (S08).
    if (process.env['ATOMIK_SMOKE_AI'] === '1') {
      const outcome = (await window.webContents.executeJavaScript(
        `(async () => {
          try {
            const bundle = await window.atomik.runAiOperation({
              id: crypto.randomUUID(),
              input: [{ relPath: 'welcome.md', kind: 'text', content: 'First note of this vault.', range: { from: 11, to: 36 } }],
              instruction: 'Explain this simply.',
              preset: 'explain',
              target: { relPath: 'welcome.md', destination: { kind: 'append' } }
            })
            const summary = await window.atomik.getAiTraceSummary(bundle.id)
            await window.atomik.resolveAiTrace(bundle.id, 'accepted')
            const shape = [bundle.blocks.length, bundle.patchProposals.length, bundle.claims.length, bundle.actionTraceIds.length].join('/')
            const labels = bundle.claims.map((c) => c.label).join(',')
            return 'ok:' + shape + ':' + bundle.patchProposals[0].files[0].kind + ':trace=' + (summary ? summary.location + '/' + summary.wallMs + 'ms' : 'none') + ':labels=' + labels
          } catch (e) { return 'fail:' + String(e) }
        })()`
      )) as string
      vaultReport += ` ai=${outcome}`
    }
    // Optional capture proof: session lifecycle through the renderer world
    // (S02). The HTTP surface itself is covered by unit tests; this checks
    // the typed channels end to end. When a capture tab is mounted (state
    // fixture), it also drives the REAL UI: start button → QR rendered.
    if (process.env['ATOMIK_SMOKE_CAPTURE'] === '1') {
      const outcome = (await window.webContents.executeJavaScript(
        `(async () => {
          try {
            const session = await window.atomik.startCaptureSession()
            const urlOk = /^http:\\/\\/[^/]+\\/c\\/[a-f0-9]{16}\\?t=[a-f0-9]{32}$/.test(session.uploadUrl)
            const seen = await window.atomik.getCaptureSession()
            await window.atomik.stopCaptureSession()
            const after = await window.atomik.getCaptureSession()
            let ui = 'no-panel'
            const startButton = document.querySelector('.capture-actions button')
            if (startButton) {
              startButton.click()
              const deadline = Date.now() + 5000
              while (Date.now() < deadline && !document.querySelector('img.capture-qr')) {
                await new Promise((r) => setTimeout(r, 100))
              }
              ui = document.querySelector('img.capture-qr') ? 'qr-rendered' : 'qr-missing'
            }
            return 'ok:' + [session.active, urlOk, seen && seen.id === session.id, after && !after.active, ui].join('/')
          } catch (e) { return 'fail:' + String(e) }
        })()`
      )) as string
      vaultReport += ` capture=${outcome}`
    }
    const shotPath = process.env['ATOMIK_SMOKE_SHOT']
    if (shotPath) {
      if (process.env['ATOMIK_SMOKE_MENU'] === '1') {
        await window.webContents.executeJavaScript(
          `document.querySelector('.app-menu-toggle')?.click()`
        )
        await new Promise((resolve) => setTimeout(resolve, 300))
      }
      const image = await window.webContents.capturePage()
      await writeFile(shotPath, image.toPNG())
    }
    const vaultCount = vaultRoot
      ? ` vault=${listVaultFiles(vaultRoot).notes.length}rootNotes`
      : ''
    const searchQuery = process.env['ATOMIK_SMOKE_SEARCH']
    let searchReport = ''
    if (searchQuery && vaultRoot) {
      const found = searchVault(vaultRoot, searchQuery)
      const kinds = found.flatMap((r) => r.matches.map((m) => m.kind))
      searchReport = ` search=${found.length}files/${[...new Set(kinds)].sort().join('+')}`
    }
    // Opt-in web-tab probe (CP-MVP-006 S03; network-dependent, so never
    // part of the default deterministic run): with a state fixture that
    // restores a source-web tab, ATOMIK_SMOKE_WEB=<url> waits for the
    // trusted UI's URL bar to reflect the REAL navigation — restore →
    // ensure → isolated view loads → typed push → renderer DOM, e2e.
    let webReport = ''
    const webProbeUrl = process.env['ATOMIK_SMOKE_WEB']
    if (webProbeUrl) {
      const host = new URL(webProbeUrl).hostname
      const deadline = Date.now() + 20000
      let navigated = false
      while (Date.now() < deadline && !navigated) {
        navigated = (await window.webContents.executeJavaScript(
          `[...document.querySelectorAll('.web-url input')].some((el) => el.value.includes(${JSON.stringify(host)}))`
        )) as boolean
        if (!navigated) await new Promise((resolve) => setTimeout(resolve, 500))
      }
      webReport = navigated ? ` web=navigated(${host})` : ' web=TIMEOUT'
      // Deeper opt-in rung: ATOMIK_SMOKE_WEB_IMPORT=1 clicks the REAL
      // Import-as-source button and waits for the bundle on disk —
      // renderer click → typed channel → savePage on the live view →
      // gates → vault files, the whole S04 chain.
      if (navigated && process.env['ATOMIK_SMOKE_WEB_IMPORT'] === '1' && vaultRoot) {
        // wait for the button to be ENABLED (loading settles), then click
        const clicked = await (async () => {
          const deadline = Date.now() + 15000
          while (Date.now() < deadline) {
            const hit = (await window.webContents.executeJavaScript(
              `(() => { const b = document.querySelector('.web-import:not([disabled])'); if (b) { b.click(); return true } return false })()`
            )) as boolean
            if (hit) return true
            await new Promise((resolve) => setTimeout(resolve, 500))
          }
          return false
        })()
        const importDeadline = Date.now() + 25000
        let bundle: string | null = null
        while (clicked && Date.now() < importDeadline && !bundle) {
          const webRoot = join(vaultRoot, 'sources', 'web')
          if (existsSync(webRoot)) {
            for (const slug of readdirSync(webRoot)) {
              const dir = join(webRoot, slug)
              if (
                existsSync(join(dir, 'source.md')) &&
                existsSync(join(dir, 'snapshot.mhtml')) &&
                statSync(join(dir, 'snapshot.mhtml')).size > 0
              ) {
                bundle = slug
                break
              }
            }
          }
          if (!bundle) await new Promise((resolve) => setTimeout(resolve, 500))
        }
        if (bundle) {
          webReport += ` webImport=ok(${bundle})`
        } else {
          const hint = (await window.webContents.executeJavaScript(
            `document.querySelector('.web-hint.error')?.textContent ?? ''`
          )) as string
          webReport += ` webImport=FAILED(clicked=${clicked}${hint ? ` err=${JSON.stringify(hint.slice(0, 160))}` : ''})`
        }
      }
      // Live reader-mode probe (S06): click "Aa reader" and wait for the
      // extracted markdown overlay to render with real headings.
      if (navigated && process.env['ATOMIK_SMOKE_WEB_READER'] === '1') {
        await window.webContents.executeJavaScript(
          `(() => { const b = [...document.querySelectorAll('.web-nav button')].find((el) => /reader/i.test(el.textContent)); if (b) b.click(); return Boolean(b) })()`
        )
        const readerDeadline = Date.now() + 15000
        let headings = 0
        while (Date.now() < readerDeadline && headings === 0) {
          headings = (await window.webContents.executeJavaScript(
            `document.querySelectorAll('.web-reader .markdown-body h2, .web-reader .markdown-body h3').length`
          )) as number
          if (headings === 0) await new Promise((resolve) => setTimeout(resolve, 500))
        }
        webReport += headings > 0 ? ` webReader=ok(${headings}h)` : ' webReader=TIMEOUT'
      }
    }
    console.log(
      `ATOMIK_SMOKE_OK ${app.getName()} ${app.getVersion()} devdocs=${groups.length}groups/${docCount}files panes=${paneCount}${vaultCount}${searchReport}${vaultReport}${webReport}`
    )
    app.quit()
  } else {
    console.error('ATOMIK_SMOKE_TIMEOUT dev docs never rendered')
    app.exit(1)
  }
}

app.whenReady().then(() => {
  // Permission posture made EXPLICIT (13): the trusted UI may use the
  // microphone (desktop capture, owner request); every other permission
  // request — and any from future non-app content — is denied outright.
  session.defaultSession.setPermissionRequestHandler(
    (webContents, permission, callback) => {
      const url = webContents.getURL()
      const isAppContent =
        url.startsWith('file://') || url.startsWith('http://localhost')
      callback(isAppContent && permission === 'media')
    }
  )

  const docsRoot = resolveDocsRoot(app.getAppPath())
  // Smoke is a deterministic check: without an explicit ATOMIK_STATE_DIR
  // fixture it must not restore whatever layout live dogfooding left in
  // the repo's .atomik/ (a saved state would win over the #dev-docs hash).
  if (process.env['ATOMIK_SMOKE'] === '1' && !process.env['ATOMIK_STATE_DIR']) {
    process.env['ATOMIK_STATE_DIR'] = mkdtempSync(join(tmpdir(), 'atomik-smoke-'))
  }
  const stateDir = resolveStateDir(app.getAppPath(), process.env)
  traces = new ActionTraceLedger(stateDir)
  const capturePort = Number(process.env['ATOMIK_CAPTURE_PORT'])
  const speechPaths = {
    binary: process.env['ATOMIK_WHISPER_BIN'] ?? join(stateDir, 'speech', 'whisper-cli'),
    model: process.env['ATOMIK_WHISPER_MODEL'] ?? join(stateDir, 'speech', 'ggml-small.bin'),
    ffmpeg: process.env['ATOMIK_FFMPEG'] ?? '/usr/bin/ffmpeg',
    // optional CUDA tier (CP-MVP-005 S02) — adapter checks existence
    cudaBinary: process.env['ATOMIK_WHISPER_BIN_CUDA'] ?? join(stateDir, 'speech', 'cuda', 'whisper-cli')
  }
  const ocrPaths = {
    binary: process.env['ATOMIK_OCR_BIN'] ?? join(stateDir, 'ocr', 'cpu', 'llama-mtmd-cli'),
    model: process.env['ATOMIK_OCR_MODEL'] ?? join(stateDir, 'ocr', 'models', 'qwen3vl-4b-q4.gguf'),
    mmproj: process.env['ATOMIK_OCR_MMPROJ'] ?? join(stateDir, 'ocr', 'models', 'qwen3vl-4b-mmproj.gguf'),
    // optional CUDA tier — adapter checks existence, demotes on failure
    cudaBinary: process.env['ATOMIK_OCR_BIN_CUDA'] ?? join(stateDir, 'ocr', 'cuda', 'llama-mtmd-cli')
  }
  const audioSeat = whisperSeatReady(speechPaths)
    ? createWhisperCppAdapter(speechPaths)
    : mockTranscriptionAdapter
  ocrAdapter = ocrSeatReady(ocrPaths)
    ? createQwenVlOcrAdapter(ocrPaths, nativeImageResizer)
    : null
  transcriptionAdapter = routeByMedia(audioSeat, ocrAdapter ?? mockTranscriptionAdapter)
  capture = new CaptureSessionManager({
    inboxRoot: join(stateDir, 'capture-inbox'),
    // Stable default port so ONE firewall rule suffices (WSL2 mirrored
    // networking finding); env overrides, garbage is ignored.
    ...(Number.isInteger(capturePort) && capturePort >= 0 && capturePort <= 65535
      ? { port: capturePort }
      : {})
  })
  app.on('before-quit', () => {
    traces.flush()
    void capture.dispose()
  })
  // WSLg maximize needs the TRUE per-monitor work area (Windows-side);
  // query once now, re-query when the display layout changes.
  refreshWindowsScreens()
  if (IS_WSLG) {
    let displayTimer: NodeJS.Timeout | null = null
    const queueRefresh = (): void => {
      if (displayTimer) clearTimeout(displayTimer)
      displayTimer = setTimeout(() => {
        displayTimer = null
        refreshWindowsScreens()
      }, 1000)
    }
    screen.on('display-metrics-changed', queueRefresh)
    screen.on('display-added', queueRefresh)
    screen.on('display-removed', queueRefresh)
  }

  restoreVault(stateDir)
  registerIpcHandlers(docsRoot, stateDir)
  registerVaultHandlers(stateDir)
  registerCaptureHandlers(stateDir)
  registerWebViewHandlers(() => BrowserWindow.getAllWindows()[0] ?? null)

  const smoke = process.env['ATOMIK_SMOKE'] === '1'
  const smokeDoc = process.env['ATOMIK_SMOKE_DOC']
  const window = createMainWindow(
    smoke ? (smokeDoc ? `dev-docs:${smokeDoc}` : 'dev-docs') : undefined
  )
  if (smoke) {
    window.webContents.once('did-finish-load', () => {
      void runSmoke(window, docsRoot)
    })
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
