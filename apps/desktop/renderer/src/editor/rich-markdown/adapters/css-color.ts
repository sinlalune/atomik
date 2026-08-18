/**
 * Resolving app theme tokens into colors a renderer library can read.
 *
 * The design system states every color as `light-dark(...)` (36), and derives
 * shades with `color-mix(...)`. Both are CSS-level forms: reading them as
 * custom properties hands back the UNRESOLVED text, which no JavaScript color
 * parser accepts. Owner bench, 2026-08-17 — Mermaid refused outright
 * (`Unsupported color format: "light-dark(#fbfbf9, #1e1e23)"`) and Vega
 * quietly ignored every token, so charts drew in built-in colors regardless of
 * theme. Only the engine can resolve these forms, so we ask it.
 */

export type ColorResolver = {
  /** Resolves any CSS color expression, or returns `fallback`. */
  resolve(expression: string, fallback: string): string
  dispose(): void
}

/** `rgb()`/`rgba()`/`#hex`/`color()` — the resolved forms a library accepts.
 * `light-dark()`, `color-mix()` and `var()` are deliberately absent. */
const CONCRETE_COLOR = /^(?:#[0-9a-f]{3,8}|rgba?\(|color\()/i

/**
 * Resolves colors through a hidden probe inside the host, where the theme's
 * `color-scheme` and `[data-theme]` actually apply — resolving against the
 * document root instead would silently use the wrong theme inside a themed
 * subtree.
 */
export function createColorResolver(host: HTMLElement): ColorResolver {
  const document = host.ownerDocument
  const view = document.defaultView
  let probe: HTMLElement | null = null

  const mount = (): HTMLElement | null => {
    if (!view?.getComputedStyle || !host.isConnected) return null
    if (probe) return probe
    const element = document.createElement('span')
    element.setAttribute('aria-hidden', 'true')
    element.style.cssText =
      'position:absolute;width:0;height:0;overflow:hidden;' +
      'visibility:hidden;pointer-events:none;'
    host.appendChild(element)
    probe = element
    return element
  }

  return {
    resolve(expression, fallback) {
      const element = mount()
      if (!element) return fallback
      element.style.color = ''
      element.style.color = expression
      // A value the engine rejects never lands on the property at all.
      if (!element.style.color) return fallback
      const computed = view?.getComputedStyle(element).color.trim()
      // An engine that does not resolve these forms (linkedom, in tests) hands
      // the text straight back. Only a concrete color may reach a library.
      return computed && CONCRETE_COLOR.test(computed) ? computed : fallback
    },
    dispose() {
      probe?.remove()
      probe = null
    }
  }
}

/** `var(--name, fallback)`, the form that lets the engine do the substitution
 * and still yields something usable when the token is absent. */
export function tokenExpression(name: string, fallback: string): string {
  return `var(${name}, ${fallback})`
}

function expandShortHex(value: string): string {
  return `#${value
    .slice(1)
    .split('')
    .map((part) => `${part}${part}`)
    .join('')}`
}

function channel(part: string): number | null {
  const raw = part.endsWith('%')
    ? (Number.parseFloat(part) * 255) / 100
    : Number.parseFloat(part)
  if (!Number.isFinite(raw)) return null
  return Math.min(255, Math.max(0, Math.round(raw)))
}

/**
 * Narrows a resolved color to `#rrggbb`. Vega's palette is mixed with integer
 * arithmetic over hex pairs, so it needs hex specifically rather than whatever
 * form the engine happened to compute. Alpha is dropped: these are opaque
 * surface colors, and a library that cannot read the form must not receive it.
 */
export function toHexColor(value: string, fallback: string): string {
  const trimmed = value.trim()
  if (/^#[0-9a-f]{3}$/i.test(trimmed)) return expandShortHex(trimmed).toLowerCase()
  if (/^#[0-9a-f]{6}$/i.test(trimmed)) return trimmed.toLowerCase()
  if (/^#[0-9a-f]{8}$/i.test(trimmed)) return trimmed.slice(0, 7).toLowerCase()

  const match = /^rgba?\(([^)]+)\)$/i.exec(trimmed)
  if (!match?.[1]) return fallback
  const parts = match[1].split(/[,\s/]+/).filter(Boolean).slice(0, 3)
  if (parts.length < 3) return fallback
  const channels = parts.map(channel)
  if (channels.some((value) => value === null)) return fallback
  return `#${channels.map((value) => value!.toString(16).padStart(2, '0')).join('')}`
}
