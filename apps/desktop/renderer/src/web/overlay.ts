/**
 * Native web views composite ABOVE the entire UI page (the S02 named
 * cost of WebContentsView): any overlay that could open above a web
 * pane (the settings panel) takes this guard while open, and every
 * WebView hides itself while a guard is held. Module-level pub-sub —
 * disposable UI coordination, never persisted.
 */

type Listener = (covered: boolean) => void

let holds = 0
const listeners = new Set<Listener>()

/** Take the guard; returns the (idempotent) release. */
export function acquireWebOverlay(): () => void {
  holds += 1
  if (holds === 1) for (const listener of listeners) listener(true)
  let released = false
  return () => {
    if (released) return
    released = true
    holds -= 1
    if (holds === 0) for (const listener of listeners) listener(false)
  }
}

export function onWebOverlayChange(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function webOverlayCovered(): boolean {
  return holds > 0
}
