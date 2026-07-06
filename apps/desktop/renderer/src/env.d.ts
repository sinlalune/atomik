/// <reference types="vite/client" />

import type { AtomikApi } from '../../shared/ipc-contract'

declare global {
  interface Window {
    /** Injected by electron-preload via contextBridge. See shared/ipc-contract.ts. */
    atomik: AtomikApi
  }
}

export {}
