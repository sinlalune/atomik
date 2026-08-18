const SVG_NAMESPACE = 'http://www.w3.org/2000/svg'

const FORBIDDEN_ELEMENTS = new Set([
  'animate',
  'animatemotion',
  'animatetransform',
  'audio',
  'discard',
  'embed',
  'foreignobject',
  'iframe',
  'image',
  'link',
  'listener',
  'object',
  'script',
  'set',
  'source',
  'video'
])

const URI_ATTRIBUTES = new Set([
  'action',
  'cite',
  'formaction',
  'href',
  'poster',
  'src',
  'xlink:href'
])

const DANGEROUS_CSS = /@import|@font-face|expression\s*\(|javascript\s*:|vbscript\s*:|behavior\s*:|-moz-binding|(?:-webkit-)?image-set\s*\(/i
const CSS_URL = /url\(\s*(['"]?)(.*?)\1\s*\)/gi
const CSS_ESCAPE = /\\(?:[0-9a-f]{1,6}[\t\n\f\r ]?|.)/i

function fail(message: string): never {
  throw new Error(`Unsafe generated SVG: ${message}`)
}

function fragmentOnly(value: string): boolean {
  const trimmed = value.trim()
  return /^#[A-Za-z_][\w:.-]*$/.test(trimmed)
}

function guardCss(value: string): void {
  if (DANGEROUS_CSS.test(value)) fail('active CSS is not allowed')
  // Reject escaped spellings rather than attempting to duplicate a complete
  // CSS tokenizer around security-sensitive url/import keywords.
  if (CSS_ESCAPE.test(value)) fail('CSS escapes are not allowed')
  CSS_URL.lastIndex = 0
  for (let match = CSS_URL.exec(value); match; match = CSS_URL.exec(value)) {
    if (!fragmentOnly(match[2] ?? '')) {
      fail('CSS resources must use a local fragment')
    }
  }
}

function safeIdPart(value: string): string {
  const safe = value.replace(/[^A-Za-z0-9_.-]+/g, '-').replace(/^-+|-+$/g, '')
  return safe.slice(0, 80) || 'node'
}

function replaceUrlFragments(
  value: string,
  ids: ReadonlyMap<string, string>
): string {
  return value.replace(
    /url\(\s*(['"]?)#([A-Za-z_][\w:.-]*)\1\s*\)/gi,
    (original, _quote: string, oldId: string) => {
      const newId = ids.get(oldId)
      return newId ? `url(#${newId})` : original
    }
  )
}

function replaceCssSelectors(
  value: string,
  ids: ReadonlyMap<string, string>
): string {
  let replaced = replaceUrlFragments(value, ids)
  const ordered = [...ids.entries()].sort(
    (left, right) => right[0].length - left[0].length
  )
  for (const [oldId, newId] of ordered) {
    const escaped = oldId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    replaced = replaced.replace(
      new RegExp(`(^|[},])(\\s*)#${escaped}(?=[\\s.{:>+,~#])`, 'gm'),
      `$1$2#${newId}`
    )
  }
  return replaced
}

function replaceAttributeReferences(
  name: string,
  value: string,
  ids: ReadonlyMap<string, string>
): string {
  const lowerName = name.toLowerCase()
  if (URI_ATTRIBUTES.has(lowerName) && fragmentOnly(value)) {
    const newId = ids.get(value.trim().slice(1))
    return newId ? `#${newId}` : value
  }
  if (lowerName === 'aria-labelledby' || lowerName === 'aria-describedby') {
    return value
      .split(/\s+/)
      .filter(Boolean)
      .map((id) => ids.get(id) ?? id)
      .join(' ')
  }
  return replaceUrlFragments(value, ids)
}

function parserFor(document: Document): DOMParser {
  const Parser = document.defaultView?.DOMParser ?? globalThis.DOMParser
  if (!Parser) throw new Error('SVG parser is unavailable')
  return new Parser()
}

function svgElements(root: Element): Element[] {
  return [root, ...Array.from(root.querySelectorAll('*'))]
}

function directChild(root: Element, name: string): Element | null {
  return (
    Array.from(root.children).find(
      (child) => child.localName.toLowerCase() === name
    ) ?? null
  )
}

function hasSvgNamespace(element: Element, root: Element): boolean {
  let current: Element | null = element
  while (current) {
    const declared = current.getAttribute('xmlns')
    if (declared) return declared === SVG_NAMESPACE
    if (current === root) break
    current = current.parentElement
  }
  return element.namespaceURI === SVG_NAMESPACE
}

/**
 * Mermaid and Vega both return SVG strings. This postflight accepts only a
 * static, fragment-local SVG graph, namespaces every id to the host request,
 * and returns a DOM node for import. The unchecked string is never assigned to
 * the reading surface.
 */
export function safeSvgNode(
  document: Document,
  svgText: string,
  options: {
    requestId: string
    title: string
    description: string
  }
): Element {
  if (/<!DOCTYPE|<!ENTITY|<\?/i.test(svgText)) {
    fail('document types, entities, and processing instructions are not allowed')
  }
  const parsed = parserFor(document).parseFromString(svgText, 'image/svg+xml')
  const root = parsed.documentElement
  if (
    !root ||
    root.localName.toLowerCase() !== 'svg' ||
    !hasSvgNamespace(root, root) ||
    root.querySelector('parsererror')
  ) {
    fail('renderer did not return one valid SVG root')
  }

  const elements = svgElements(root)
  for (const element of elements) {
    const name = element.localName.toLowerCase()
    if (!hasSvgNamespace(element, root)) fail('foreign namespaces are not allowed')
    if (FORBIDDEN_ELEMENTS.has(name)) fail(`<${name}> is not allowed`)
    for (const attribute of Array.from(element.attributes)) {
      const attributeName = attribute.name.toLowerCase()
      const value = attribute.value
      if (attributeName.startsWith('on')) {
        element.removeAttribute(attribute.name)
        continue
      }
      if (attributeName === 'xml:base' || attributeName === 'base') {
        fail('base URL attributes are not allowed')
      }
      if (URI_ATTRIBUTES.has(attributeName) && !fragmentOnly(value)) {
        fail(`${attributeName} must use a local fragment`)
      }
      if (attributeName === 'style' || value.toLowerCase().includes('url(')) {
        guardCss(value)
      }
    }
    if (name === 'style') guardCss(element.textContent ?? '')
    if (name === 'a') {
      // Mermaid click directives are rejected before render. Remove residual
      // navigation affordances as defense in depth, including fragment jumps.
      element.removeAttribute('href')
      element.removeAttribute('xlink:href')
      element.removeAttribute('target')
      element.removeAttribute('tabindex')
    }
  }

  const namespace = `atomik-${safeIdPart(options.requestId)}`
  const ids = new Map<string, string>()
  let idIndex = 0
  for (const element of elements) {
    const oldId = element.getAttribute('id')
    if (!oldId) continue
    if (ids.has(oldId)) fail(`duplicate id ${oldId}`)
    const newId = `${namespace}-${idIndex}-${safeIdPart(oldId)}`
    idIndex += 1
    ids.set(oldId, newId)
    element.setAttribute('id', newId)
  }

  for (const element of elements) {
    for (const attribute of Array.from(element.attributes)) {
      const replaced = replaceAttributeReferences(
        attribute.name,
        attribute.value,
        ids
      )
      if (replaced !== attribute.value) element.setAttribute(attribute.name, replaced)
    }
    if (element.localName.toLowerCase() === 'style' && element.textContent) {
      element.textContent = replaceCssSelectors(element.textContent, ids)
    }
  }

  let title = directChild(root, 'title')
  if (!title) {
    title = parsed.createElementNS(SVG_NAMESPACE, 'title')
    title.textContent = options.title
    root.insertBefore(title, root.firstChild)
  }
  let description = directChild(root, 'desc')
  if (!description) {
    description = parsed.createElementNS(SVG_NAMESPACE, 'desc')
    description.textContent = options.description
    root.insertBefore(description, title.nextSibling)
  }
  if (!(title.textContent ?? '').trim()) title.textContent = options.title
  if (!(description.textContent ?? '').trim()) {
    description.textContent = options.description
  }
  const titleId = `${namespace}-title`
  const descriptionId = `${namespace}-description`
  title.setAttribute('id', titleId)
  description.setAttribute('id', descriptionId)
  root.setAttribute('role', 'img')
  root.setAttribute('aria-labelledby', `${titleId} ${descriptionId}`)
  root.removeAttribute('aria-describedby')
  root.removeAttribute('tabindex')

  return document.importNode(root, true) as unknown as Element
}
