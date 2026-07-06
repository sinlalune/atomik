/** Tiny inline SVG icons — self-contained (CSP: no external assets). */

/** Panel with a bottom band — "dock the panel at the bottom". */
export function DockBottomIcon(): React.JSX.Element {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      aria-hidden="true"
    >
      <rect x="1.5" y="2.5" width="13" height="11" rx="1.5" />
      <line x1="1.5" y1="9.5" x2="14.5" y2="9.5" />
    </svg>
  )
}

/** Panel with a right band — "dock the panel on the right". */
export function DockRightIcon(): React.JSX.Element {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      aria-hidden="true"
    >
      <rect x="1.5" y="2.5" width="13" height="11" rx="1.5" />
      <line x1="10" y1="2.5" x2="10" y2="13.5" />
    </svg>
  )
}

/** Window frame verbs for the chromeless window. */
export function WindowMinimizeIcon(): React.JSX.Element {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.1"
      aria-hidden="true"
    >
      <line x1="2" y1="6.5" x2="10" y2="6.5" />
    </svg>
  )
}

export function WindowMaximizeIcon(): React.JSX.Element {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.1"
      aria-hidden="true"
    >
      <rect x="2.5" y="2.5" width="7" height="7" rx="1" />
    </svg>
  )
}

/** Two offset squares — "restore the un-maximized size". */
export function WindowRestoreIcon(): React.JSX.Element {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.1"
      aria-hidden="true"
    >
      <rect x="2" y="4" width="6" height="6" rx="1" />
      <path d="M4.5 2.5h4.5a1 1 0 0 1 1 1V8" />
    </svg>
  )
}

export function WindowCloseIcon(): React.JSX.Element {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.1"
      aria-hidden="true"
    >
      <line x1="2.5" y1="2.5" x2="9.5" y2="9.5" />
      <line x1="9.5" y1="2.5" x2="2.5" y2="9.5" />
    </svg>
  )
}

/** Panel-with-sidebar pictogram; used for both collapse and expand, the
 *  button title carries the direction. */
export function SidebarToggleIcon(): React.JSX.Element {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      aria-hidden="true"
    >
      <rect x="1.5" y="2.5" width="13" height="11" rx="1.5" />
      <line x1="6" y1="2.5" x2="6" y2="13.5" />
    </svg>
  )
}
