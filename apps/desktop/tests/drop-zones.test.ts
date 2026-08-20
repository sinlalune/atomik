import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  computeDockZone,
  dockZoneLabel,
  DOCK_EDGE_FRACTION,
  PANE_DRAG_MIME,
  parsePaneDrag,
  parseTabDrag,
  serializePaneDrag,
  serializeTabDrag,
  TAB_DRAG_MIME,
  type DockZone
} from '../renderer/src/workspace/drop-zones'

describe('computeDockZone — five-zone geometry (CP-OPEN-DOCK S04)', () => {
  const rect = { left: 100, top: 100, width: 400, height: 400 }

  it('default DOCK_EDGE_FRACTION is 0.25', () => {
    expect(DOCK_EDGE_FRACTION).toBe(0.25)
  })

  it('dead center (0.5, 0.5) maps to center', () => {
    expect(computeDockZone(rect, 300, 300)).toBe('center')
  })

  it('inner region within (0.26..0.74) maps to center', () => {
    // 100 + 400 * 0.3 = 220, 100 + 400 * 0.7 = 380
    expect(computeDockZone(rect, 220, 220)).toBe('center')
    expect(computeDockZone(rect, 380, 220)).toBe('center')
    expect(computeDockZone(rect, 220, 380)).toBe('center')
    expect(computeDockZone(rect, 380, 380)).toBe('center')
  })

  it('left edge zone (x <= 25%) maps to left', () => {
    // x = 100 + 400 * 0.1 = 140, y = 300 (middle)
    expect(computeDockZone(rect, 140, 300)).toBe('left')
    // right on the boundary edge
    expect(computeDockZone(rect, 100, 300)).toBe('left')
  })

  it('right edge zone (x >= 75%) maps to right', () => {
    // x = 100 + 400 * 0.9 = 460, y = 300 (middle)
    expect(computeDockZone(rect, 460, 300)).toBe('right')
    // right on the boundary edge
    expect(computeDockZone(rect, 500, 300)).toBe('right')
  })

  it('top edge zone (y <= 25%) maps to top', () => {
    // x = 300 (middle), y = 100 + 400 * 0.1 = 140
    expect(computeDockZone(rect, 300, 140)).toBe('top')
    expect(computeDockZone(rect, 300, 100)).toBe('top')
  })

  it('bottom edge zone (y >= 75%) maps to bottom', () => {
    // x = 300 (middle), y = 100 + 400 * 0.9 = 460
    expect(computeDockZone(rect, 300, 460)).toBe('bottom')
    expect(computeDockZone(rect, 300, 500)).toBe('bottom')
  })

  it('resolves corners deterministically to the closest edge', () => {
    // Top-left: closer to top than left (relX=0.1, relY=0.05) -> top
    expect(computeDockZone(rect, 140, 120)).toBe('top')
    // Top-left: closer to left than top (relX=0.05, relY=0.1) -> left
    expect(computeDockZone(rect, 120, 140)).toBe('left')
    // Bottom-right: closer to right than bottom (relX=0.95, relY=0.9) -> right
    expect(computeDockZone(rect, 480, 460)).toBe('right')
    // Bottom-right: closer to bottom than right (relX=0.9, relY=0.95) -> bottom
    expect(computeDockZone(rect, 460, 480)).toBe('bottom')
  })

  it('clamps coordinates outside the bounding box gracefully', () => {
    // Far left
    expect(computeDockZone(rect, 0, 300)).toBe('left')
    // Far right
    expect(computeDockZone(rect, 1000, 300)).toBe('right')
    // Far top
    expect(computeDockZone(rect, 300, 0)).toBe('top')
    // Far bottom
    expect(computeDockZone(rect, 300, 1000)).toBe('bottom')
  })

  it('handles degenerate 0-width or 0-height rects without throwing', () => {
    expect(computeDockZone({ left: 0, top: 0, width: 0, height: 100 }, 10, 10)).toBe('center')
    expect(computeDockZone({ left: 0, top: 0, width: 100, height: 0 }, 10, 10)).toBe('center')
    expect(computeDockZone({ left: 0, top: 0, width: -10, height: -10 }, 10, 10)).toBe('center')
  })

  it('honors custom edgeFraction thresholds', () => {
    // With 10% threshold, 20% distance falls into center
    expect(computeDockZone(rect, 180, 300, 0.1)).toBe('center')
    // With 30% threshold, 20% distance falls into left
    expect(computeDockZone(rect, 180, 300, 0.3)).toBe('left')
  })

  it('provides readable labels for all 5 zones', () => {
    const zones: DockZone[] = ['center', 'left', 'right', 'top', 'bottom']
    for (const zone of zones) {
      const label = dockZoneLabel(zone)
      expect(typeof label).toBe('string')
      expect(label.length).toBeGreaterThan(0)
    }
  })
})

describe('drag payloads — MIME serialization & parsing (CP-OPEN-DOCK S05, S06)', () => {
  it('TAB_DRAG_MIME payload round-trips with full parameters', () => {
    expect(TAB_DRAG_MIME).toBe('application/x-atomik-workspace-tab')
    const payload = {
      tabId: 'tab_1',
      paneId: 'pane_1',
      view: 'vault',
      params: { notePath: 'notes/test.md' }
    }
    const serialized = serializeTabDrag(payload)
    const parsed = parseTabDrag(serialized)
    expect(parsed).toEqual(payload)
  })

  it('parseTabDrag safely rejects malformed or invalid inputs', () => {
    expect(parseTabDrag('')).toBeNull()
    expect(parseTabDrag('not json')).toBeNull()
    expect(parseTabDrag('123')).toBeNull()
    expect(parseTabDrag('{}')).toBeNull()
    expect(parseTabDrag(JSON.stringify({ tabId: '' }))).toBeNull()
    expect(parseTabDrag(JSON.stringify({ tabId: 't1' }))).toBeNull()
  })

  it('PANE_DRAG_MIME payload round-trips correctly', () => {
    expect(PANE_DRAG_MIME).toBe('application/x-atomik-workspace-pane')
    const payload = { paneId: 'pane_xyz' }
    const serialized = serializePaneDrag(payload)
    const parsed = parsePaneDrag(serialized)
    expect(parsed).toEqual(payload)
  })

  it('parsePaneDrag safely rejects malformed or invalid inputs', () => {
    expect(parsePaneDrag('')).toBeNull()
    expect(parsePaneDrag('[]')).toBeNull()
    expect(parsePaneDrag(JSON.stringify({}))).toBeNull()
    expect(parsePaneDrag(JSON.stringify({ paneId: '' }))).toBeNull()
  })
})

describe('drop-zones surfaces (source contracts, CP-OPEN-DOCK S04, S06)', () => {
  const tsxSource = readFileSync(
    new URL('../renderer/src/workspace/DockPreview.tsx', import.meta.url),
    'utf8'
  )
  const css = readFileSync(
    new URL('../renderer/src/styles.css', import.meta.url),
    'utf8'
  )
  const cssRule = (selector: string): string => {
    const start = css.indexOf(`${selector} {`)
    if (start < 0) throw new Error(`missing CSS rule: ${selector}`)
    const end = css.indexOf('\n}', start)
    if (end < 0) throw new Error(`unterminated CSS rule: ${selector}`)
    return css.slice(start, end)
  }

  it('DockPreview is an aria-hidden decorative overlay with pointer-events: none', () => {
    expect(tsxSource).toContain('export function DockPreview')
    expect(tsxSource).toContain('aria-hidden="true"')
    expect(tsxSource).toContain('className="dock-preview-container"')
    const container = cssRule('.dock-preview-container')
    expect(container).toContain('pointer-events: none')
    expect(container).toContain('position: absolute')
    expect(container).toContain('inset: 0')
  })

  it('dock-preview consumes bedrock 36 glass, border, and token rules', () => {
    const preview = cssRule('.dock-preview')
    expect(preview).toContain('var(--glass-pop)')
    expect(preview).toContain('var(--accent)')
    expect(preview).toContain('var(--radius-lg)')
    expect(preview).toContain('var(--shadow-pop)')
    expect(preview).toContain('backdrop-filter: blur(8px)')
  })

  it('defines distinct geometric positioning for all 5 zones', () => {
    const center = cssRule('.dock-preview--center')
    const left = cssRule('.dock-preview--left')
    const right = cssRule('.dock-preview--right')
    const top = cssRule('.dock-preview--top')
    const bottom = cssRule('.dock-preview--bottom')

    expect(center).toContain('inset: var(--space-2)')
    expect(left).toContain('width: calc(50% - var(--space-2))')
    expect(right).toContain('width: calc(50% - var(--space-2))')
    expect(top).toContain('height: calc(50% - var(--space-2))')
    expect(bottom).toContain('height: calc(50% - var(--space-2))')
  })

  it('tabstrip pane-grip has grab cursor and no-drag region', () => {
    const grip = cssRule('.tabstrip .pane-grip')
    expect(grip).toContain('cursor: grab')
    expect(grip).toContain('-webkit-app-region: no-drag')
  })
})
