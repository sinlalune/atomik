import { app, BrowserWindow, ipcMain } from 'electron'
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { buildAppInfo } from './app-info'
import { listDevDocs, readDevDoc, resolveDocsRoot } from './dev-docs'
import { buildMainWindowOptions } from './security'
import { ATOMIK_CHANNELS } from '../shared/ipc-contract'

function registerIpcHandlers(docsRoot: string): void {
  ipcMain.handle(ATOMIK_CHANNELS.getAppInfo, () =>
    buildAppInfo({
      name: app.getName(),
      version: app.getVersion(),
      versions: process.versions,
      platform: process.platform
    })
  )
  ipcMain.handle(ATOMIK_CHANNELS.listDevDocs, () => listDevDocs(docsRoot))
  ipcMain.handle(ATOMIK_CHANNELS.readDevDoc, (_event, relPath: unknown) =>
    readDevDoc(docsRoot, relPath)
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
  const shotPath = process.env['ATOMIK_SMOKE_SHOT']
  if (rendered && shotPath) {
    const image = await window.webContents.capturePage()
    await writeFile(shotPath, image.toPNG())
  }
  if (rendered) {
    const groups = listDevDocs(docsRoot)
    const docCount = groups.reduce((n, g) => n + g.entries.length, 0)
    console.log(
      `ATOMIK_SMOKE_OK ${app.getName()} ${app.getVersion()} devdocs=${groups.length}groups/${docCount}files`
    )
    app.quit()
  } else {
    console.error('ATOMIK_SMOKE_TIMEOUT dev docs never rendered')
    app.exit(1)
  }
}

app.whenReady().then(() => {
  const docsRoot = resolveDocsRoot(app.getAppPath())
  registerIpcHandlers(docsRoot)

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
