import { app, BrowserWindow, dialog, ipcMain, session, shell } from 'electron'
import { mkdtempSync, statSync } from 'node:fs'
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
  transcribeSource,
  type TranscriptionAdapter
} from './transcription'
import { createWhisperCppAdapter, whisperSeatReady } from './whisper-adapter'
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
  ATOMIK_CHANNELS,
  type AiOperation,
  type VaultInfo
} from '../shared/ipc-contract'

// Linux: prefer native Wayland over XWayland when a compositor is there
// ('auto' falls back to X11 otherwise). Under WSLg the XWayland path kept
// stale frame margins on maximized frameless windows — transparent gap,
// window offset right (owner report; hasShadow:false alone didn't cure
// it). Must be set before app is ready.
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
      const asset = resolveSourceAssetAbs(requireVault(), relPath)
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

/** The seat (S05): whisper.cpp-small when binary+model+ffmpeg exist,
 *  the honest mock otherwise — capture never blocks on a runtime. */
let transcriptionAdapter: TranscriptionAdapter = mockTranscriptionAdapter

function registerCaptureHandlers(): void {
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
    (_event, dossierPath: unknown) =>
      transcribeSource(requireVault(), dossierPath, transcriptionAdapter, traces)
  )
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

/** Frame verbs for the chromeless window (13 §IPC: allowlist-validated;
 *  scoped to the calling window — only the trusted UI has this preload). */
const WINDOW_CONTROL_ACTIONS = new Set([
  'minimize',
  'toggle-maximize',
  'close',
  'get-state'
])

/**
 * WSLg cannot maximize borderless windows correctly — the window keeps a
 * transparent gap, sits offset, and clicks land offset by the gap
 * (microsoft/wslg#1015, unfixed since 2023; reproduces with plain
 * Chrome). Fullscreen avoids that code path entirely and renders like a
 * proper maximized window there (owner-validated via F11). So under
 * WSLg, "maximize" MEANS fullscreen.
 */
const FULLSCREEN_IS_MAXIMIZE =
  process.platform === 'linux' && Boolean(process.env['WSL_DISTRO_NAME'])

/** The one boolean the renderer needs: "is the window filling the
 *  screen" — by either mechanism. */
function isWindowMaximized(window: BrowserWindow): boolean {
  return window.isMaximized() || window.isFullScreen()
}

function toggleMaximize(window: BrowserWindow): void {
  if (FULLSCREEN_IS_MAXIMIZE) {
    window.setFullScreen(!window.isFullScreen())
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

  // Maximize state is PUSHED so the custom controls track OS-initiated
  // changes too, and CSS can drop the drag regions while maximized.
  // Fullscreen counts as maximized (WSLg mapping + the F11 path).
  const sendWindowState = (): void => {
    if (window.isDestroyed()) return
    window.webContents.send(ATOMIK_CHANNELS.windowStateChanged, {
      maximized: isWindowMaximized(window)
    })
  }
  window.on('maximize', sendWindowState)
  window.on('unmaximize', sendWindowState)
  window.on('enter-full-screen', sendWindowState)
  window.on('leave-full-screen', sendWindowState)

  // Under WSLg even OS-INITIATED maximize (snap, Win+Up) must convert:
  // the WM's own maximized state is the broken path (wslg#1015).
  if (FULLSCREEN_IS_MAXIMIZE) {
    window.on('maximize', () => {
      window.unmaximize()
      window.setFullScreen(true)
    })
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
    console.log(
      `ATOMIK_SMOKE_OK ${app.getName()} ${app.getVersion()} devdocs=${groups.length}groups/${docCount}files panes=${paneCount}${vaultCount}${searchReport}${vaultReport}`
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
    ffmpeg: process.env['ATOMIK_FFMPEG'] ?? '/usr/bin/ffmpeg'
  }
  if (whisperSeatReady(speechPaths)) {
    transcriptionAdapter = createWhisperCppAdapter(speechPaths)
  }
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
  restoreVault(stateDir)
  registerIpcHandlers(docsRoot, stateDir)
  registerVaultHandlers(stateDir)
  registerCaptureHandlers()

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
