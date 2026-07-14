import { useEffect, useReducer, useRef } from 'react'

/**
 * Chronological note-navigation history (owner request: ‹ › through the
 * pages you consulted, like a browser). One stack PER TAB (keyed by the
 * tab id — it survives tab switches because the registry is
 * module-level, like the pdf pending-page registry), IN MEMORY only:
 * disposable UI state, never knowledge (03) — an app restart starts a
 * fresh trail. Pure operations, unit-tested; the hook below wires them
 * into a view.
 */

type Trail = { stack: string[]; cursor: number }

const MAX_ENTRIES = 100

const trails = new Map<string, Trail>()

function trailOf(key: string): Trail {
  let trail = trails.get(key)
  if (!trail) {
    trail = { stack: [], cursor: -1 }
    trails.set(key, trail)
  }
  return trail
}

/** Records a visit: no-op if it IS the current entry (back/forward
 *  re-opens and same-note refreshes must not grow the trail); a visit
 *  while back in the trail drops the forward branch (browser rule). */
export function recordVisit(key: string, relPath: string): void {
  const trail = trailOf(key)
  if (trail.stack[trail.cursor] === relPath) return
  trail.stack = trail.stack.slice(0, trail.cursor + 1)
  trail.stack.push(relPath)
  if (trail.stack.length > MAX_ENTRIES) {
    trail.stack = trail.stack.slice(trail.stack.length - MAX_ENTRIES)
  }
  trail.cursor = trail.stack.length - 1
}

export function canGoBack(key: string): boolean {
  const trail = trails.get(key)
  return trail !== undefined && trail.cursor > 0
}

export function canGoForward(key: string): boolean {
  const trail = trails.get(key)
  return trail !== undefined && trail.cursor < trail.stack.length - 1
}

export function goBack(key: string): string | null {
  const trail = trails.get(key)
  if (!trail || trail.cursor <= 0) return null
  trail.cursor -= 1
  return trail.stack[trail.cursor] ?? null
}

export function goForward(key: string): string | null {
  const trail = trails.get(key)
  if (!trail || trail.cursor >= trail.stack.length - 1) return null
  trail.cursor += 1
  return trail.stack[trail.cursor] ?? null
}

/** Test seam: drop every trail. */
export function resetTrails(): void {
  trails.clear()
}

/**
 * Wires a view's note navigation into its tab's trail: records the
 * currently displayed path, and returns ‹ › actions that re-open
 * without re-recording. `openPath` is the view's own navigation
 * (openNote / openFromTree) — history replays through the same door
 * the user walked through.
 */
export function useNavHistory(
  key: string | undefined,
  currentPath: string | null | undefined,
  openPath: (relPath: string) => void
): { back: () => void; forward: () => void; backOk: boolean; forwardOk: boolean } {
  const [, bump] = useReducer((n: number) => n + 1, 0)
  const opening = useRef<string | null>(null)
  useEffect(() => {
    if (!key || !currentPath) return
    if (opening.current === currentPath) {
      opening.current = null
    } else {
      recordVisit(key, currentPath)
    }
    bump()
  }, [key, currentPath])
  const step = (move: (key: string) => string | null) => (): void => {
    if (!key) return
    const target = move(key)
    if (target) {
      opening.current = target
      openPath(target)
      bump()
    }
  }
  return {
    back: step(goBack),
    forward: step(goForward),
    backOk: key !== undefined && canGoBack(key),
    forwardOk: key !== undefined && canGoForward(key)
  }
}
