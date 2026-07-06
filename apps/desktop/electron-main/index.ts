import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'node:path'
import { buildAppInfo } from './app-info'
import { buildMainWindowOptions } from './security'
import { ATOMIK_CHANNELS } from '../shared/ipc-contract'

function registerIpcHandlers(): void {
  ipcMain.handle(ATOMIK_CHANNELS.getAppInfo, () =>
    buildAppInfo({
      name: app.getName(),
      version: app.getVersion(),
      versions: process.versions,
      platform: process.platform
    })
  )
}

function createMainWindow(): BrowserWindow {
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
    void window.loadURL(devServerUrl)
  } else {
    void window.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return window
}

app.whenReady().then(() => {
  registerIpcHandlers()
  const window = createMainWindow()

  // Deterministic "app starts" check (M0 acceptance): launch with
  // ATOMIK_SMOKE=1, wait for the renderer to load, print a marker, exit 0.
  if (process.env['ATOMIK_SMOKE'] === '1') {
    window.webContents.once('did-finish-load', () => {
      console.log(`ATOMIK_SMOKE_OK ${app.getName()} ${app.getVersion()}`)
      app.quit()
    })
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
