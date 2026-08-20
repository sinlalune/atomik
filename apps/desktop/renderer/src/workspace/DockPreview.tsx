import type { JSX } from 'react'
import { dockZoneLabel, type DockZone } from './drop-zones'

/**
 * Translucent docking preview overlay (36 glass/tokens).
 * Rendered inside a pane container during dragover; pointer-events: none
 * ensures it never interferes with drag tracking.
 */
export function DockPreview({
  zone,
  label
}: {
  zone: DockZone
  label?: string
}): JSX.Element {
  const displayLabel = label ?? dockZoneLabel(zone)
  return (
    <div className="dock-preview-container" aria-hidden="true">
      <div className={`dock-preview dock-preview--${zone}`}>
        <span className="dock-preview-label">{displayLabel}</span>
      </div>
    </div>
  )
}
