import { useCallback } from 'react'
import { clampTreeWidth } from './workspace/model'
import { frameCoalesced } from './workspace/frame-coalesce'

/**
 * Drag handle on a tree panel's right edge (owner feedback on MVP-001:
 * resizable tree width). Self-contained: measures its parent panel at
 * pointerdown and reports clamped pixel widths; the host persists them
 * as tab params like every other piece of recoverable layout (03).
 */
export function TreeResizeHandle({
  onResize
}: {
  onResize: (px: number) => void
}): React.JSX.Element {
  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault()
      const handle = event.currentTarget
      const panel = handle.parentElement
      if (!panel) return
      const left = panel.getBoundingClientRect().left
      handle.setPointerCapture(event.pointerId)
      // reports at paint rate, not event rate (S07j — see frame-coalesce)
      const applyWidth = frameCoalesced(onResize)
      const onMove = (move: PointerEvent): void => {
        applyWidth(clampTreeWidth(move.clientX - left))
      }
      const onUp = (): void => {
        handle.removeEventListener('pointermove', onMove)
        handle.removeEventListener('pointerup', onUp)
      }
      handle.addEventListener('pointermove', onMove)
      handle.addEventListener('pointerup', onUp)
    },
    [onResize]
  )

  return (
    <div
      className="tree-resize"
      role="separator"
      aria-orientation="vertical"
      onPointerDown={onPointerDown}
    />
  )
}
