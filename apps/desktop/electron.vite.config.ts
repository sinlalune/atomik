import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'electron-vite'

// Directory names follow docs/bedrock/14_14-app-kernels.md (electron-main /
// electron-preload / renderer) instead of electron-vite's src/* defaults.
// The package stays CommonJS so the preload bundle remains loadable inside a
// sandboxed renderer (sandbox: true is contract, 13).
export default defineConfig({
  main: {
    build: {
      lib: { entry: resolve(__dirname, 'electron-main/index.ts') }
    }
  },
  preload: {
    build: {
      lib: { entry: resolve(__dirname, 'electron-preload/index.ts') }
    }
  },
  renderer: {
    root: resolve(__dirname, 'renderer'),
    build: {
      rollupOptions: {
        input: resolve(__dirname, 'renderer/index.html')
      }
    },
    plugins: [react()]
  }
})
