import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import { mkdtempSync, statSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import { runAiOperation } from './ai-mock'
import { ActionTraceLedger } from './action-trace'
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
  ipcMain.handle(ATOMIK_CHANNELS.openVault, async () => {
    const result = await dialog.showOpenDialog({
      title: 'Open vault folder',
      properties: ['openDirectory', 'createDirectory']
    })
    const chosen = result.filePaths[0]
    if (result.canceled || !chosen) return null
    vaultRoot = chosen
    persistLastVaultRoot(stateDir, chosen)
    return vaultInfo()
  })
  ipcMain.handle(ATOMIK_CHANNELS.getVault, () => vaultInfo())
  ipcMain.handle(ATOMIK_CHANNELS.listVaultFiles, () =>
    listVaultFiles(requireVault())
  )
  ipcMain.handle(ATOMIK_CHANNELS.searchVault, (_event, query: unknown) =>
    searchVault(requireVault(), query)
  )
  ipcMain.handle(ATOMIK_CHANNELS.readNote, (_event, relPath: unknown) =>
    readNote(requireVault(), relPath)
  )
  ipcMain.handle(
    ATOMIK_CHANNELS.writeNote,
    (_event, relPath: unknown, content: unknown, expectedMtimeMs: unknown) =>
      writeNote(
        requireVault(),
        relPath,
        content,
        expectedMtimeMs === undefined || expectedMtimeMs === null
          ? undefined
          : expectedMtimeMs
      )
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

function registerIpcHandlers(docsRoot: string, stateDir: string): void {
  ipcMain.handle(ATOMIK_CHANNELS.listDevDocs, () => listDevDocs(docsRoot))
  ipcMain.handle(ATOMIK_CHANNELS.readDevDoc, (_event, relPath: unknown) =>
    readDevDoc(docsRoot, relPath)
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
  const docsRoot = resolveDocsRoot(app.getAppPath())
  // Smoke is a deterministic check: without an explicit ATOMIK_STATE_DIR
  // fixture it must not restore whatever layout live dogfooding left in
  // the repo's .atomik/ (a saved state would win over the #dev-docs hash).
  if (process.env['ATOMIK_SMOKE'] === '1' && !process.env['ATOMIK_STATE_DIR']) {
    process.env['ATOMIK_STATE_DIR'] = mkdtempSync(join(tmpdir(), 'atomik-smoke-'))
  }
  const stateDir = resolveStateDir(app.getAppPath(), process.env)
  traces = new ActionTraceLedger(stateDir)
  app.on('before-quit', () => traces.flush())
  restoreVault(stateDir)
  registerIpcHandlers(docsRoot, stateDir)
  registerVaultHandlers(stateDir)

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
