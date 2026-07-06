import { create } from 'zustand'
import type { WorkspaceState } from '../../../shared/ipc-contract'
import { createDefaultState, migrateRetiredViews } from './model'

/**
 * Thin stateful shell around the pure model: holds the current
 * WorkspaceState, applies pure operations, and debounces persistence
 * through the bridge. All layout logic lives in model.ts.
 */

type WorkspaceStore = {
  /** null until load() resolves. */
  state: WorkspaceState | null
  load: () => Promise<void>
  /** Applies a pure operation; persists when it changed the state. */
  dispatch: (operation: (state: WorkspaceState) => WorkspaceState) => void
}

const PERSIST_DELAY_MS = 500

let persistTimer: number | undefined

function schedulePersist(state: WorkspaceState): void {
  window.clearTimeout(persistTimer)
  persistTimer = window.setTimeout(() => {
    // Fire and forget: layout is disposable state; a lost write costs a
    // pane arrangement, never knowledge (03).
    void window.atomik.writeWorkspaceState(state).catch(() => undefined)
  }, PERSIST_DELAY_MS)
}

export const useWorkspace = create<WorkspaceStore>((set, get) => ({
  state: null,
  load: async () => {
    const saved = await window.atomik.readWorkspaceState()
    set({
      state: saved
        ? migrateRetiredViews(saved)
        : createDefaultState(window.location.hash)
    })
  },
  dispatch: (operation) => {
    const current = get().state
    if (!current) return
    const next = operation(current)
    if (next !== current) {
      set({ state: next })
      schedulePersist(next)
    }
  }
}))
