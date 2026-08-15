import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'electron-vite'
import { resolveLaneRuntime } from './electron-main/lane'

// Read once at config load: the build tool is not an Electron process, so
// it takes only the port half of the lane runtime (userData is claimed in
// electron-main/index.ts, which is the only place that can).
const lanePort = resolveLaneRuntime(process.env, '').rendererPort

// Directory names follow docs/bedrock/14_14-app-kernels.md (electron-main /
// electron-preload / renderer) instead of electron-vite's src/* defaults.
// The package stays CommonJS so the preload bundle remains loadable inside a
// sandboxed renderer (sandbox: true is contract, 13).
export default defineConfig({
  main: {
    build: {
      // Two entries: the app, and the reader-extraction worker forked as
      // a utilityProcess (perf audit 2026-07-15 — the mhtml→markdown
      // slab measured 834 ms in-main and must not block the event loop).
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'electron-main/index.ts'),
          'reader-worker': resolve(__dirname, 'electron-main/reader-worker.ts')
        }
      }
    }
  },
  preload: {
    build: {
      lib: { entry: resolve(__dirname, 'electron-preload/index.ts') }
    }
  },
  renderer: {
    root: resolve(__dirname, 'renderer'),
    // LANE ISOLATION (CP-OPS-001 S01): concurrent lanes run `dev` at the
    // same time from their own worktrees. ATOMIK_LANE_PORT pins this
    // lane's dev server so CDP pinning stays predictable; unset keeps
    // electron-vite's default. strictPort stays false — a busy port
    // should still start, just noisily.
    ...(lanePort ? { server: { port: lanePort } } : {}),
    build: {
      rollupOptions: {
        input: resolve(__dirname, 'renderer/index.html')
      }
    },
    plugins: [react()]
  }
})
