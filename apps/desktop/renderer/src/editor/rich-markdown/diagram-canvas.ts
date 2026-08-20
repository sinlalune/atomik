/**
 * THE DIAGRAM BLOCK IS A CANVAS (CP-RENDER-REPAIRS S05).
 *
 * S04 gave a wide diagram its natural size and let the frame scroll. At the
 * bench the owner said what they had wanted from the start: an infinite canvas
 * inside the block — drag to pan, zoom about the pointer — with the expand
 * control kept. The path had zoom and pan in Deliberately excluded; the
 * exclusion was amended rather than quietly ignored.
 *
 * THE PAGE STILL SCROLLS. A bare wheel over a diagram scrolls the note exactly
 * as it does over any other block; zoom takes Ctrl or Cmd. A canvas that eats
 * the wheel makes a long note unreadable the moment a diagram is in the way,
 * and the reader has no way to know why. Inside the expand overlay there is no
 * page behind the diagram, so a bare wheel zooms there.
 *
 * Nothing here re-parses or re-renders anything. The sanitized SVG produced by
 * `safeSvgNode` is moved and CSS-transformed; pan and zoom are two numbers and
 * a matrix (13 — the reader is looking at the node that was approved).
 *
 * Charts are deliberately not canvases. Pan and zoom are for spatial content,
 * and a bar chart is not spatial — a vega-lite block keeps S04's behaviour.
 */

import { diagramActionButton } from './diagram-action'

const MIN_SCALE = 0.1
const MAX_SCALE = 8
/** A canvas never gets shorter than this, or the controls dwarf the diagram. */
const MIN_VIEWPORT_H = 140
/** …nor taller, or one diagram owns the whole note. */
const MAX_VIEWPORT_H = 460
const WHEEL_STEP = 0.0015
const BUTTON_STEP = 1.25
const KEY_PAN = 48

export type DiagramCanvas = {
  /** Fits the diagram to its viewport and re-centres it. */
  reset(): void
  /** Follows the diagram when it moves into or out of the expand overlay. */
  retarget(viewport: HTMLElement): void
  dispose(): void
}

type Transform = { x: number; y: number; k: number }

const clampScale = (k: number): number =>
  Math.min(MAX_SCALE, Math.max(MIN_SCALE, k))

/**
 * Natural size of the rendered diagram, in the units its transform works in.
 *
 * `getBBox` is the honest answer but needs layout, which linkedom does not
 * have; the `viewBox` is the same information written down by Mermaid itself.
 * When neither is available the canvas simply starts at 1:1 rather than
 * guessing — a wrong fit is worse than no fit.
 */
export function naturalSize(
  svg: Element
): { width: number; height: number } | null {
  const viewBox = svg.getAttribute('viewBox')
  if (viewBox) {
    const parts = viewBox.trim().split(/[\s,]+/).map(Number)
    if (parts.length === 4 && parts.every((part) => Number.isFinite(part))) {
      const [, , width, height] = parts as [number, number, number, number]
      if (width > 0 && height > 0) return { width, height }
    }
  }
  const rect = (svg as SVGGraphicsElement).getBoundingClientRect?.()
  if (rect && rect.width > 0 && rect.height > 0) {
    return { width: rect.width, height: rect.height }
  }
  return null
}

/**
 * A canvas is only as tall as the diagram needs (S05 bench).
 *
 * The first cut gave every diagram a fixed 460px viewport, so a two-node
 * flowchart sat in an acre of emptiness. The height follows the diagram at the
 * scale it will actually be drawn — width decides the scale, because a canvas
 * is as wide as its column either way — bounded so it can neither vanish nor
 * take the whole note.
 */
export function canvasHeight(
  frameWidth: number,
  content: { width: number; height: number }
): number {
  if (frameWidth <= 0 || content.width <= 0) return MIN_VIEWPORT_H
  const scale = Math.min(1, frameWidth / content.width)
  return Math.round(
    Math.max(MIN_VIEWPORT_H, Math.min(MAX_VIEWPORT_H, content.height * scale))
  )
}

/** The transform that centres `content` inside `frame`, never magnifying. */
export function fitTransform(
  frame: { width: number; height: number },
  content: { width: number; height: number }
): Transform {
  if (frame.width <= 0 || frame.height <= 0) return { x: 0, y: 0, k: 1 }
  const k = clampScale(
    Math.min(1, frame.width / content.width, frame.height / content.height)
  )
  return {
    x: (frame.width - content.width * k) / 2,
    y: (frame.height - content.height * k) / 2,
    k
  }
}

/**
 * Zooms about a fixed point, so whatever is under the pointer stays under it.
 * Pure, and the only piece of arithmetic here worth testing directly.
 */
export function zoomAbout(
  current: Transform,
  point: { x: number; y: number },
  factor: number
): Transform {
  const k = clampScale(current.k * factor)
  if (k === current.k) return current
  const ratio = k / current.k
  return {
    k,
    x: point.x - (point.x - current.x) * ratio,
    y: point.y - (point.y - current.y) * ratio
  }
}

export function attachDiagramCanvas(
  document: Document,
  tools: HTMLElement,
  initialViewport: HTMLElement
): DiagramCanvas {
  let viewport = initialViewport
  let transform: Transform = { x: 0, y: 0, k: 1 }
  let dragging: { pointerId: number; x: number; y: number } | null = null

  const svgOf = (): SVGElement | null =>
    viewport.querySelector('svg') as SVGElement | null

  const paint = (): void => {
    const svg = svgOf()
    if (!svg) return
    svg.style.transformOrigin = '0 0'
    svg.style.transform = `translate(${transform.x}px, ${transform.y}px) scale(${transform.k})`
  }

  const frameSize = (): { width: number; height: number } => {
    const rect = viewport.getBoundingClientRect?.()
    return rect && rect.width > 0
      ? { width: rect.width, height: rect.height }
      : { width: 0, height: 0 }
  }

  /**
   * Mermaid emits `width="100%"` with `style="max-width: Npx"`, so the SVG
   * ELEMENT fills its container while the drawing sits inside it under the
   * viewBox. Centring the element therefore centres a full-width box and
   * shoves the drawing sideways — which is exactly what the bench saw. Pinning
   * the element to its intrinsic size makes the element box and the drawing
   * box the same thing, which is what the transform arithmetic assumes.
   */
  const normalize = (svg: SVGElement, content: { width: number; height: number }): void => {
    svg.style.maxWidth = 'none'
    svg.style.width = `${content.width}px`
    svg.style.height = `${content.height}px`
    // `margin-inline: auto` from the S04 rule CENTRES the element on its own,
    // and its selector outranks any this module could write, so the transform's
    // centring landed on top of it and put the diagram against the right edge,
    // clipped. Every property the transform depends on is therefore set INLINE,
    // where no stylesheet can reach it. Found by reading specificity after the
    // second bench round — the arithmetic was never wrong.
    svg.style.margin = '0'
    svg.style.display = 'block'
  }

  const reset = (): void => {
    const svg = svgOf()
    const content = svg ? naturalSize(svg) : null
    if (!svg || !content) {
      transform = { x: 0, y: 0, k: 1 }
      paint()
      return
    }
    normalize(svg, content)
    // A block canvas takes the diagram's height; the overlay fills the pane.
    if (viewport.dataset['richCanvasFill'] !== '') {
      viewport.style.height = `${canvasHeight(frameSize().width, content)}px`
    }
    transform = fitTransform(frameSize(), content)
    paint()
  }

  const zoomBy = (factor: number, point?: { x: number; y: number }): void => {
    const frame = frameSize()
    transform = zoomAbout(
      transform,
      point ?? { x: frame.width / 2, y: frame.height / 2 },
      factor
    )
    paint()
  }

  const onWheel = (event: WheelEvent): void => {
    // The note keeps its scroll unless the reader asks for zoom. Inside the
    // expand overlay there is no page behind the diagram, so a bare wheel
    // zooms there — the flag rides on the viewport itself.
    const bare = viewport.dataset['richCanvasBareWheel'] === ''
    if (!bare && !event.ctrlKey && !event.metaKey) return
    event.preventDefault()
    const rect = viewport.getBoundingClientRect?.()
    zoomBy(
      Math.exp(-event.deltaY * WHEEL_STEP),
      rect
        ? { x: event.clientX - rect.left, y: event.clientY - rect.top }
        : undefined
    )
  }

  const onPointerDown = (event: PointerEvent): void => {
    if (event.button !== 0) return
    const target = event.target as HTMLElement | null
    if (target?.closest?.('[data-rich-interactive]')) return
    dragging = { pointerId: event.pointerId, x: event.clientX, y: event.clientY }
    viewport.dataset['richCanvasDragging'] = ''
    viewport.setPointerCapture?.(event.pointerId)
  }

  const onPointerMove = (event: PointerEvent): void => {
    if (!dragging || dragging.pointerId !== event.pointerId) return
    transform = {
      ...transform,
      x: transform.x + (event.clientX - dragging.x),
      y: transform.y + (event.clientY - dragging.y)
    }
    dragging = { ...dragging, x: event.clientX, y: event.clientY }
    paint()
  }

  const endDrag = (event: PointerEvent): void => {
    if (!dragging || dragging.pointerId !== event.pointerId) return
    viewport.releasePointerCapture?.(event.pointerId)
    delete viewport.dataset['richCanvasDragging']
    dragging = null
  }

  /** Keyboard equivalents for every pointer gesture (36). */
  const onKeyDown = (event: KeyboardEvent): void => {
    const pan = (dx: number, dy: number): void => {
      event.preventDefault()
      transform = { ...transform, x: transform.x + dx, y: transform.y + dy }
      paint()
    }
    switch (event.key) {
      case 'ArrowLeft':
        return pan(KEY_PAN, 0)
      case 'ArrowRight':
        return pan(-KEY_PAN, 0)
      case 'ArrowUp':
        return pan(0, KEY_PAN)
      case 'ArrowDown':
        return pan(0, -KEY_PAN)
      case '+':
      case '=':
        event.preventDefault()
        return zoomBy(BUTTON_STEP)
      case '-':
        event.preventDefault()
        return zoomBy(1 / BUTTON_STEP)
      case '0':
        event.preventDefault()
        return reset()
      default:
    }
  }

  const listen = (element: HTMLElement): void => {
    element.addEventListener('wheel', onWheel as EventListener, {
      passive: false
    })
    element.addEventListener('pointerdown', onPointerDown as EventListener)
    element.addEventListener('pointermove', onPointerMove as EventListener)
    element.addEventListener('pointerup', endDrag as EventListener)
    element.addEventListener('pointercancel', endDrag as EventListener)
    element.addEventListener('keydown', onKeyDown as EventListener)
  }

  const unlisten = (element: HTMLElement): void => {
    element.removeEventListener('wheel', onWheel as EventListener)
    element.removeEventListener('pointerdown', onPointerDown as EventListener)
    element.removeEventListener('pointermove', onPointerMove as EventListener)
    element.removeEventListener('pointerup', endDrag as EventListener)
    element.removeEventListener('pointercancel', endDrag as EventListener)
    element.removeEventListener('keydown', onKeyDown as EventListener)
  }

  const zoomOut = diagramActionButton(document, 'zoom-out', 'Zoom out', 'Zoom out (−)')
  const zoomIn = diagramActionButton(document, 'zoom-in', 'Zoom in', 'Zoom in (+)')
  const fit = diagramActionButton(document, 'fit', 'Fit', 'Fit the diagram (0)')
  zoomOut.addEventListener('click', () => zoomBy(1 / BUTTON_STEP))
  zoomIn.addEventListener('click', () => zoomBy(BUTTON_STEP))
  fit.addEventListener('click', () => reset())
  tools.append(zoomOut, zoomIn, fit)

  viewport.dataset['richCanvas'] = ''
  // setAttribute rather than `.tabIndex =`: the property is not reflected by
  // every DOM implementation, and the attribute is what the browser reads.
  viewport.setAttribute('tabindex', '0')
  viewport.setAttribute('role', 'application')
  viewport.setAttribute(
    'aria-label',
    'Diagram canvas — drag or use arrow keys to pan, Ctrl with the wheel or + and − to zoom, 0 to fit'
  )
  listen(viewport)
  reset()

  return {
    reset,
    retarget(next: HTMLElement) {
      unlisten(viewport)
      delete viewport.dataset['richCanvas']
      viewport = next
      viewport.dataset['richCanvas'] = ''
      // The block canvas keeps no stale inline height once its diagram leaves.
      if (viewport !== initialViewport) initialViewport.style.height = ''
      listen(viewport)
      reset()
    },
    dispose() {
      unlisten(viewport)
      delete viewport.dataset['richCanvas']
      delete viewport.dataset['richCanvasDragging']
      viewport.removeAttribute('tabindex')
      viewport.removeAttribute('role')
      viewport.removeAttribute('aria-label')
      const svg = svgOf()
      if (svg) {
        svg.style.transform = ''
        svg.style.transformOrigin = ''
        svg.style.maxWidth = ''
        svg.style.width = ''
        svg.style.height = ''
        svg.style.margin = ''
        svg.style.display = ''
      }
      viewport.style.height = ''
      zoomOut.remove()
      zoomIn.remove()
      fit.remove()
    }
  }
}
