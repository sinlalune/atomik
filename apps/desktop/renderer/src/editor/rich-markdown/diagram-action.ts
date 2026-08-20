/**
 * ONE CONTROL SHAPE FOR EVERY DIAGRAM ACTION (CP-RENDER-REPAIRS S05).
 *
 * Owner directive at the second bench: icon, with the label on hover. Four
 * text buttons above a diagram read as a sentence competing with the note;
 * four icons read as a toolbar and get out of the way until wanted.
 *
 * The label is never the accessible name. `aria-label` carries it on the
 * button itself, the visible label is `aria-hidden`, and the icon is
 * decorative — so a screen reader hears one name, not the name twice plus a
 * drawing. The label appears on hover AND on focus, or it would exist only for
 * people using a mouse (36).
 */

export type DiagramActionIcon = 'zoom-out' | 'zoom-in' | 'fit' | 'expand'

/** 16px, currentColor, no fill — they inherit the button's own colours. */
const PATHS: Record<DiagramActionIcon, string> = {
  'zoom-out': '<circle cx="7" cy="7" r="4.5"/><path d="M5 7h4"/><path d="M10.5 10.5 14 14"/>',
  'zoom-in':
    '<circle cx="7" cy="7" r="4.5"/><path d="M5 7h4M7 5v4"/><path d="M10.5 10.5 14 14"/>',
  fit: '<path d="M2 5.5V2.5h3"/><path d="M14 5.5V2.5h-3"/><path d="M2 10.5v3h3"/><path d="M14 10.5v3h-3"/>',
  expand:
    '<path d="M9.5 2.5H13.5V6.5"/><path d="M6.5 13.5H2.5V9.5"/><path d="M13.5 2.5 9 7"/><path d="M2.5 13.5 7 9"/>'
}

function iconSvg(document: Document, icon: DiagramActionIcon): SVGElement {
  const svg = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'svg'
  ) as SVGElement
  svg.setAttribute('viewBox', '0 0 16 16')
  svg.setAttribute('width', '16')
  svg.setAttribute('height', '16')
  svg.setAttribute('fill', 'none')
  svg.setAttribute('stroke', 'currentColor')
  svg.setAttribute('stroke-width', '1.4')
  svg.setAttribute('stroke-linecap', 'round')
  svg.setAttribute('stroke-linejoin', 'round')
  svg.setAttribute('aria-hidden', 'true')
  svg.setAttribute('focusable', 'false')
  // Static, authored-here markup — never user or model content.
  svg.innerHTML = PATHS[icon]
  return svg
}

export function diagramActionButton(
  document: Document,
  icon: DiagramActionIcon,
  label: string,
  title: string
): HTMLButtonElement {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'rich-code-action rich-diagram-action'
  button.dataset['richInteractive'] = ''
  // The accessible name lives here, once.
  button.setAttribute('aria-label', title)
  button.title = title

  const text = document.createElement('span')
  text.className = 'rich-diagram-action-label'
  text.setAttribute('aria-hidden', 'true')
  text.textContent = label

  button.append(iconSvg(document, icon), text)
  return button
}
