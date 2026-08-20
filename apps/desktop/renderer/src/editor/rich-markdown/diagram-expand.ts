/**
 * ROOM TO LOOK AT A DIAGRAM (CP-RENDER-REPAIRS S04).
 *
 * A wide Mermaid diagram arrived in a 560px note column scaled to about a
 * fifth of legible size, with nothing to grab. The scroll affordance was
 * already there and switched off by the rule beside it: `overflow: auto` on
 * the output container, `max-width: 100%` on the SVG, so the SVG never
 * overflowed and the container never had anything to scroll. Dropping the cap
 * buys panning for nothing; this module adds the second half the owner chose
 * — an expand control that gives the diagram the whole pane.
 *
 * THE NODE IS MOVED, NEVER COPIED OR RE-PARSED. `safeSvgNode` already
 * sanitized it and rewrote its ids to be unique in the document; a clone would
 * put two elements carrying the same marker and clip-path ids into one
 * document, where `url(#id)` resolves to whichever comes first. Moving the one
 * node into the overlay and back out again cannot drift from what was
 * approved, and cannot collide with itself (13).
 *
 * Focus: a native `<dialog>` opened with `showModal()` contains focus while it
 * is open — which is what a modal is for — and returns it to the button that
 * opened it on close. Escape dismisses. The requirement was that the reader is
 * never stranded, not that focus is unmanaged.
 */

const EXPANDABLE = new Set(['mermaid', 'vega-lite'])

export function isExpandableKind(kind: string): boolean {
  return EXPANDABLE.has(kind)
}

export type DiagramExpander = {
  /** The control the reader clicks. Already in the DOM. */
  button: HTMLButtonElement
  /** Closes any open overlay and returns the diagram to the block. */
  dispose(): void
}

function overlayFor(
  document: Document,
  label: string,
  onDismiss: () => void
): { dialog: HTMLDialogElement; body: HTMLElement } {
  const dialog = document.createElement('dialog')
  dialog.className = 'rich-diagram-overlay'
  dialog.setAttribute('aria-label', label)

  const bar = document.createElement('div')
  bar.className = 'rich-diagram-overlay-bar'

  const close = document.createElement('button')
  close.type = 'button'
  close.className = 'rich-code-action'
  close.dataset['richInteractive'] = ''
  close.textContent = 'Close'
  close.setAttribute('aria-label', 'Close the expanded diagram')
  close.title = 'Close (Esc)'
  bar.append(close)

  const body = document.createElement('div')
  body.className = 'rich-diagram-overlay-body'

  dialog.append(bar, body)
  close.addEventListener('click', onDismiss)
  return { dialog, body }
}

/**
 * Attaches an expand control to one rendered diagram block.
 *
 * `host` is the element holding the rendered SVG; `mountPoint` is where the
 * control is inserted — OUTSIDE the scrolling container on purpose, so it does
 * not slide away with the diagram it belongs to.
 */
export function attachDiagramExpand(
  document: Document,
  mountPoint: HTMLElement,
  host: HTMLElement,
  kind: string
): DiagramExpander {
  const tools = document.createElement('div')
  tools.className = 'rich-diagram-tools'

  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'rich-code-action'
  button.dataset['richInteractive'] = ''
  button.textContent = 'Expand'
  button.setAttribute('aria-label', `Expand the ${kind} diagram`)
  button.title = `Expand the ${kind} diagram`
  tools.append(button)
  mountPoint.append(tools)

  let open: { dialog: HTMLDialogElement; anchor: Comment } | null = null

  /**
   * One way out, whoever asks for it — the Close button, `dispose()`, or the
   * browser's own Escape handling. Where `<dialog>` is real, closing it fires
   * `close` and that restores; where it is not (linkedom in tests, any host
   * without dialog support), `restore` runs directly. Both paths land in the
   * same place, and `restore` is idempotent because it clears `open` first.
   */
  const dismiss = (): void => {
    if (!open) return
    const { dialog } = open
    if (typeof dialog.close === 'function' && dialog.hasAttribute('open')) {
      dialog.close()
      return
    }
    restore()
  }

  const restore = (): void => {
    if (!open) return
    const { dialog, anchor } = open
    open = null
    // The node goes back exactly where it was, marked by a comment that held
    // its place — not appended to the end of a host that may hold siblings.
    const moved = dialog.querySelector('svg')
    if (moved && anchor.parentNode) {
      anchor.parentNode.insertBefore(moved, anchor)
    }
    anchor.remove()
    dialog.remove()
    if (typeof button.focus === 'function') button.focus()
  }

  button.addEventListener('click', () => {
    if (open) return
    const svg = host.querySelector('svg')
    if (!svg) return

    const { dialog, body } = overlayFor(
      document,
      `Expanded ${kind} diagram`,
      () => dismiss()
    )
    const anchor = document.createComment('rich-diagram-expanded')
    svg.parentNode?.insertBefore(anchor, svg)
    body.append(svg)
    document.body.append(dialog)
    dialog.addEventListener('close', restore, { once: true })

    if (typeof dialog.showModal === 'function') {
      dialog.showModal()
    } else {
      // linkedom and any host without dialog support: the overlay still
      // mounts and still closes, it simply is not modal.
      dialog.setAttribute('open', '')
    }
    open = { dialog, anchor }
  })

  return {
    button,
    dispose() {
      dismiss()
      restore()
      tools.remove()
    }
  }
}
