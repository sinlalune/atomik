import { useEffect, useRef } from 'react'
import {
  OPEN_TARGET_SPECS,
  openTargetForKey,
  type OpenTarget
} from './open-target'

/**
 * The open-as popover (CP-OPEN-DOCK S02, contract 6): the four open
 * targets in one menu, each showing its keyboard equivalent. Opened by
 * Mod+click on a tree row or a link pill; fully keyboard operable:
 * - Escape closes
 * - ArrowDown / ArrowUp moves focus
 * - Enter / Space on a button picks it
 * - Mod+Enter / Mod+Shift+Enter / Mod+Alt+Enter picks directly via shortcut
 * - Number keys 1-4 pick the respective target directly
 *
 * Chrome idiom (36): --glass-pop overlay at --z-menu, tokens only.
 */
export function OpenTargetMenu({
  x,
  y,
  noteLabel,
  onPick,
  onClose
}: {
  x: number
  y: number
  /** The target's name — the menu head (full relPath on hover). */
  noteLabel: string
  onPick: (target: OpenTarget) => void
  onClose: () => void
}): React.JSX.Element {
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    // The first item gets focus so Enter is immediately available;
    // Tab moves within the menu like any dialog-free popover.
    menuRef.current?.querySelector<HTMLButtonElement>('button')?.focus()
  }, [])

  const moveFocus = (delta: 1 | -1): void => {
    const items = Array.from(
      menuRef.current?.querySelectorAll<HTMLButtonElement>('button') ?? []
    )
    const index = items.indexOf(document.activeElement as HTMLButtonElement)
    const next = items[(index + delta + items.length) % items.length]
    next?.focus()
  }

  // Keep menu on-screen if positioned near edges
  const safeX = typeof window !== 'undefined'
    ? Math.max(8, Math.min(x, window.innerWidth - 290))
    : x
  const safeY = typeof window !== 'undefined'
    ? Math.max(8, Math.min(y, window.innerHeight - 200))
    : y

  return (
    <div
      className="open-target-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
      onContextMenu={(event) => {
        event.preventDefault()
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        ref={menuRef}
        className="open-target-menu"
        style={{ left: safeX, top: safeY }}
        role="menu"
        aria-label={`Open ${noteLabel} as`}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault()
            onClose()
            return
          }
          const shortcutTarget = openTargetForKey(event)
          if (shortcutTarget !== null) {
            event.preventDefault()
            onPick(shortcutTarget)
            return
          }
          if (event.key >= '1' && event.key <= '4') {
            const idx = Number(event.key) - 1
            const spec = OPEN_TARGET_SPECS[idx]
            if (spec) {
              event.preventDefault()
              onPick(spec.id)
              return
            }
          }
          if (event.key === 'ArrowDown') {
            event.preventDefault()
            moveFocus(1)
          } else if (event.key === 'ArrowUp') {
            event.preventDefault()
            moveFocus(-1)
          }
        }}
      >
        <div className="open-target-head" title={noteLabel}>
          {noteLabel}
        </div>
        {OPEN_TARGET_SPECS.map((spec) => (
          <button
            key={spec.id}
            type="button"
            role="menuitem"
            onClick={() => onPick(spec.id)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onPick(spec.id)
              }
            }}
          >
            <span>{spec.label}</span>
            <kbd className="open-target-kbd">{spec.kbd}</kbd>
          </button>
        ))}
      </div>
    </div>
  )
}
