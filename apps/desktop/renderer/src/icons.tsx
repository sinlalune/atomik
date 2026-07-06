/** Tiny inline SVG icons — self-contained (CSP: no external assets). */

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
