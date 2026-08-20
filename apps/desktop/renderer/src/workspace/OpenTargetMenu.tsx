import { useEffect, useRef } from 'react'
import { OPEN_TARGET_SPECS, type OpenTarget } from './open-target'

/**
 * The open-as popover (CP-OPEN-DOCK S02, contract 6): the four open
 * targets in one menu, each showing its keyboard equivalent. Opened by
 * Mod+click on a tree row or a link pill; fully keyboard operable
 * (Escape closes, arrows move, Enter picks — 36 keyboard floors).
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
        style={{ left: x, top: y }}
        role="menu"
        aria-label={`Open ${noteLabel} as`}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault()
            onClose()
          } else if (event.key === 'ArrowDown') {
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
          >
            <span>{spec.label}</span>
            <kbd className="open-target-kbd">{spec.kbd}</kbd>
          </button>
        ))}
      </div>
    </div>
  )
}
