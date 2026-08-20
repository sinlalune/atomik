/**
 * Five-zone drag-and-dock geometry (CP-OPEN-DOCK S04, contract 7).
 *
 * During a drag over a pane or tabstrip, hovering near an outer edge
 * (25% threshold) previews a split on that side; hovering the inner 50%
 * previews adding/moving the tab into the pane.
 *
 *   top:    split vertical, new pane above
 *   bottom: split vertical, new pane below
 *   left:   split horizontal, new pane left
 *   right:  split horizontal, new pane right
 *   center: tab destination inside current pane
 */

export type DockZone = 'center' | 'left' | 'right' | 'top' | 'bottom'
export type DockZoneEdge = 'left' | 'right' | 'top' | 'bottom'

/** Drag payload MIME for workspace tabs (CP-OPEN-DOCK S05). */
export const TAB_DRAG_MIME = 'application/x-atomik-workspace-tab'

export interface TabDragPayload {
  tabId: string
  paneId: string
  view?: string
  params?: Record<string, string>
}

export function serializeTabDrag(payload: TabDragPayload): string {
  return JSON.stringify(payload)
}

export function parseTabDrag(data: string): TabDragPayload | null {
  try {
    const parsed: unknown = JSON.parse(data)
    if (typeof parsed !== 'object' || parsed === null) return null
    const record = parsed as Record<string, unknown>
    if (typeof record['tabId'] !== 'string' || record['tabId'].length === 0) return null
    if (typeof record['paneId'] !== 'string' || record['paneId'].length === 0) return null
    const payload: TabDragPayload = {
      tabId: record['tabId'],
      paneId: record['paneId']
    }
    if (typeof record['view'] === 'string') payload.view = record['view']
    if (typeof record['params'] === 'object' && record['params'] !== null) {
      payload.params = record['params'] as Record<string, string>
    }
    return payload
  } catch {
    return null
  }
}

/** Drag payload MIME for whole workspace panes (CP-OPEN-DOCK S06). */
export const PANE_DRAG_MIME = 'application/x-atomik-workspace-pane'

export interface PaneDragPayload {
  paneId: string
}

export function serializePaneDrag(payload: PaneDragPayload): string {
  return JSON.stringify(payload)
}

export function parsePaneDrag(data: string): PaneDragPayload | null {
  try {
    const parsed: unknown = JSON.parse(data)
    if (typeof parsed !== 'object' || parsed === null) return null
    const record = parsed as Record<string, unknown>
    if (typeof record['paneId'] !== 'string' || record['paneId'].length === 0) return null
    return { paneId: record['paneId'] }
  } catch {
    return null
  }
}

export interface RectLike {
  left: number
  top: number
  width: number
  height: number
}

/** Fraction of width/height from the outer boundary that triggers edge splits. */
export const DOCK_EDGE_FRACTION = 0.25

/**
 * Computes the active docking zone from a container's bounding rect
 * and the cursor position. Pure and boundary-tested.
 */
export function computeDockZone(
  rect: RectLike,
  clientX: number,
  clientY: number,
  edgeFraction = DOCK_EDGE_FRACTION
): DockZone {
  const { left, top, width, height } = rect
  if (width <= 0 || height <= 0) return 'center'

  // Relative coordinates normalized to 0..1
  const relX = Math.max(0, Math.min(1, (clientX - left) / width))
  const relY = Math.max(0, Math.min(1, (clientY - top) / height))

  const dLeft = relX
  const dRight = 1 - relX
  const dTop = relY
  const dBottom = 1 - relY

  const minDistance = Math.min(dLeft, dRight, dTop, dBottom)
  if (minDistance > edgeFraction) {
    return 'center'
  }

  if (minDistance === dTop) return 'top'
  if (minDistance === dBottom) return 'bottom'
  if (minDistance === dLeft) return 'left'
  return 'right'
}

/** Human-readable zone label. */
export function dockZoneLabel(zone: DockZone): string {
  switch (zone) {
    case 'center':
      return 'Open as tab'
    case 'top':
      return 'Split pane top'
    case 'bottom':
      return 'Split pane below'
    case 'left':
      return 'Split pane left'
    case 'right':
      return 'Split pane right'
  }
}
