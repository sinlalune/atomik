import { useSyncExternalStore } from 'react'

/**
 * Workspace-wide registry of AI CONTEXT candidates (CP-MVP-008 S06c,
 * owner redirect: the chat lives in its OWN pane and picks its context
 * from the open panes instead of binding to whichever editor shares a
 * pane). Every mounted note surface registers here — editable editors
 * with their full surface (selection/doc/insert through the buffer +
 * save path), read-mode notes as read-only content — and the chat
 * pane's picklist subscribes. Registration order is mount order; the
 * default pick prefers the most recent EDITABLE entry.
 *
 * Plain module store (useSyncExternalStore) — no new dependency, no
 * React context threading through the pane tree.
 */

export type AiContextEntry = {
  /** Stable per-mount id (unregister handle). */
  id: string
  /** Vault-relative note path this context reads. */
  notePath: string
  /** True when backed by a live editor buffer (insert possible). */
  editable: boolean
  getSelection: () => { from: number; to: number; text: string }
  getDoc: () => string
  /** Lands text in the buffer at the cursor + saves (editable only). */
  insert?: (text: string) => Promise<void>
}

let entries: readonly AiContextEntry[] = []
const listeners = new Set<() => void>()

const emit = (): void => {
  for (const listener of listeners) listener()
}

/** Registers a context; returns the unregister. Re-registering the
 *  same id replaces the entry in place (mode flips, note switches). */
export function registerAiContext(entry: AiContextEntry): () => void {
  entries = [...entries.filter((existing) => existing.id !== entry.id), entry]
  emit()
  return () => {
    entries = entries.filter((existing) => existing.id !== entry.id)
    emit()
  }
}

const getSnapshot = (): readonly AiContextEntry[] => entries

export function useAiContexts(): readonly AiContextEntry[] {
  return useSyncExternalStore((listener) => {
    listeners.add(listener)
    return () => listeners.delete(listener)
  }, getSnapshot)
}

/** Resolves a picked notePath against what is CURRENTLY open: the
 *  exact note when present (editable mount wins over read-only),
 *  otherwise the most recent editable entry, otherwise the most
 *  recent entry, otherwise null. */
export function resolveAiContext(
  open: readonly AiContextEntry[],
  pickedNotePath: string | null
): AiContextEntry | null {
  if (pickedNotePath) {
    const matches = open.filter((entry) => entry.notePath === pickedNotePath)
    const editable = matches.filter((entry) => entry.editable).at(-1)
    if (editable) return editable
    const match = matches.at(-1)
    if (match) return match
  }
  return open.filter((entry) => entry.editable).at(-1) ?? open.at(-1) ?? null
}
