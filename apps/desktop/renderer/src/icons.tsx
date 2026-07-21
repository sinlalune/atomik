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
export function MenuIcon(): React.JSX.Element {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <line x1="3" y1="4.5" x2="13" y2="4.5" />
      <line x1="3" y1="8" x2="13" y2="8" />
      <line x1="3" y1="11.5" x2="13" y2="11.5" />
    </svg>
  )
}

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

/** Folder with a swap arrow — "change the open vault". */
export function VaultSwitchIcon(): React.JSX.Element {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      aria-hidden="true"
    >
      <path d="M1.5 4.5a1 1 0 0 1 1-1h3l1.5 1.5h6a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-10.5a1 1 0 0 1-1-1z" />
      <path d="M6.5 9.5h4.5m0 0-1.5-1.5m1.5 1.5-1.5 1.5" />
    </svg>
  )
}

/** Double chevron down — "expand every folder". */
export function ExpandAllIcon(): React.JSX.Element {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      aria-hidden="true"
    >
      <path d="M4 3.5 8 7l4-3.5" />
      <path d="M4 9l4 3.5L12 9" />
    </svg>
  )
}

/** Double chevron up — "collapse every folder". */
export function CollapseAllIcon(): React.JSX.Element {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      aria-hidden="true"
    >
      <path d="M4 7l4-3.5L12 7" />
      <path d="M4 12.5 8 9l4 3.5" />
    </svg>
  )
}

/** Visibility toggle for the index/log files hidden behind their pills. */
export function EyeIcon(): React.JSX.Element {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      aria-hidden="true"
    >
      <path d="M1.5 8s2.5-4.5 6.5-4.5S14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8z" />
      <circle cx="8" cy="8" r="2" />
    </svg>
  )
}

export function EyeOffIcon(): React.JSX.Element {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      aria-hidden="true"
    >
      <path d="M1.5 8s2.5-4.5 6.5-4.5S14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8z" />
      <line x1="3" y1="13" x2="13" y2="3" />
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

/* ------------------------------------------------------------------ *
 * S07m icon pass (owner bench: "many interaction buttons are text
 * when it should be icons"): the chrome-verb vocabulary. Same house
 * style as above — stroke currentColor, 16 viewBox, aria-hidden; the
 * BUTTON carries aria-label + title, never the SVG.
 * ------------------------------------------------------------------ */

/** Generic close — tabs, panes, panels (window close keeps its own). */
export function CloseIcon(): React.JSX.Element {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <line x1="4.5" y1="4.5" x2="11.5" y2="11.5" />
      <line x1="11.5" y1="4.5" x2="4.5" y2="11.5" />
    </svg>
  )
}

/** Generic add/create. */
export function PlusIcon(): React.JSX.Element {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <line x1="8" y1="3.5" x2="8" y2="12.5" />
      <line x1="3.5" y1="8" x2="12.5" y2="8" />
    </svg>
  )
}

/** Two panes side by side — split horizontally (centered divider,
 *  distinct from SidebarToggleIcon's off-center line). */
export function SplitHorizontalIcon(): React.JSX.Element {
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
      <line x1="8" y1="2.5" x2="8" y2="13.5" />
    </svg>
  )
}

/** Two panes stacked — split vertically (centered divider, distinct
 *  from DockBottomIcon's bottom band). */
export function SplitVerticalIcon(): React.JSX.Element {
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
      <line x1="1.5" y1="8" x2="14.5" y2="8" />
    </svg>
  )
}

/** History back — full arrow (browser convention). */
export function ArrowLeftIcon(): React.JSX.Element {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="13" y1="8" x2="3.5" y2="8" />
      <polyline points="7.5 3.5 3 8 7.5 12.5" />
    </svg>
  )
}

/** History forward. */
export function ArrowRightIcon(): React.JSX.Element {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="3" y1="8" x2="12.5" y2="8" />
      <polyline points="8.5 3.5 13 8 8.5 12.5" />
    </svg>
  )
}

/** Pager previous — bare chevron (page semantics, vs history arrows). */
export function ChevronLeftIcon(): React.JSX.Element {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="10 3.5 5.5 8 10 12.5" />
    </svg>
  )
}

/** Pager next. */
export function ChevronRightIcon(): React.JSX.Element {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="6 3.5 10.5 8 6 12.5" />
    </svg>
  )
}

/** Reload — open circular arc with an arrowhead. */
export function ReloadIcon(): React.JSX.Element {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M13.2 8a5.2 5.2 0 1 1-1.7-3.85" />
      <polyline points="11.9 1.6 11.9 4.4 9.1 4.4" />
    </svg>
  )
}

/** Rotate counter-clockwise (photo correction). */
export function RotateCcwIcon(): React.JSX.Element {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2.8 8a5.2 5.2 0 1 0 1.7-3.85" />
      <polyline points="4.1 1.6 4.1 4.4 6.9 4.4" />
    </svg>
  )
}

/** Rotate clockwise. */
export function RotateCwIcon(): React.JSX.Element {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M13.2 8a5.2 5.2 0 1 1-1.7-3.85" />
      <polyline points="11.9 1.6 11.9 4.4 9.1 4.4" />
    </svg>
  )
}

/** Opens outside the pane/app — box with an out-arrow. */
export function ExternalLinkIcon(): React.JSX.Element {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 9.5V12a1.5 1.5 0 0 1-1.5 1.5h-6A1.5 1.5 0 0 1 3 12V6a1.5 1.5 0 0 1 1.5-1.5H7" />
      <polyline points="9.5 2.5 13.5 2.5 13.5 6.5" />
      <line x1="13.2" y1="2.8" x2="8" y2="8" />
    </svg>
  )
}

/** Reader mode — a page with text lines. */
export function ReaderIcon(): React.JSX.Element {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <rect x="3.5" y="2" width="9" height="12" rx="1.2" />
      <line x1="5.8" y1="5.5" x2="10.2" y2="5.5" />
      <line x1="5.8" y1="8" x2="10.2" y2="8" />
      <line x1="5.8" y1="10.5" x2="8.6" y2="10.5" />
    </svg>
  )
}

/** Page anchor — ring, shaft, curved base. */
export function AnchorIcon(): React.JSX.Element {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="8" cy="3.8" r="1.6" />
      <line x1="8" y1="5.4" x2="8" y2="13" />
      <path d="M3 9.5a5 5 0 0 0 10 0" />
      <line x1="5.8" y1="7.6" x2="10.2" y2="7.6" />
    </svg>
  )
}

/** Start recording — filled dot (accent-red via CSS on the button). */
export function RecordIcon(): React.JSX.Element {
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
      <circle cx="8" cy="8" r="4" fill="currentColor" stroke="none" />
    </svg>
  )
}

/** Stop recording — filled square. */
export function StopIcon(): React.JSX.Element {
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
      <rect x="4.5" y="4.5" width="7" height="7" rx="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

/** Confirm — the form-submit check. */
export function CheckIcon(): React.JSX.Element {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="3.5 8.5 6.5 11.5 12.5 4.5" />
    </svg>
  )
}
