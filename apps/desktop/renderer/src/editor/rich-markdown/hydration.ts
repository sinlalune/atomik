import {
  DEFAULT_RICH_LIMITS,
  type RichLimits,
  type RichRenderHandle,
  type RichRendererKind,
  type RichTheme
} from './contracts'
import {
  defaultRichRendererRegistry,
  type RichRendererRegistry
} from './registry'

type BlockNodes = {
  element: HTMLElement
  source: HTMLElement
  output: HTMLElement
  status: HTMLElement
}

type ActiveBlock = BlockNodes & {
  controller: AbortController
  renderHost: HTMLElement
  handle: RichRenderHandle | null
  timer: ReturnType<typeof setTimeout> | null
}

export type RichHydration = {
  ready: Promise<void>
  dispose(): void
}

export type RichHydrationOptions = {
  registry?: RichRendererRegistry
  limits?: Readonly<RichLimits>
  theme?: RichTheme
}

const activeRoots = new WeakMap<HTMLElement, RichHydration>()

const DARK_THEMES = new Set(['dark', 'moss', 'biolum'])

function themeFor(root: HTMLElement): RichTheme {
  const doc = root.ownerDocument
  const name = doc.documentElement.dataset['theme'] ?? 'system'
  const systemDark =
    name === 'system' &&
    (doc.defaultView?.matchMedia?.('(prefers-color-scheme: dark)').matches ??
      false)
  return {
    name,
    scheme: DARK_THEMES.has(name) || systemDark ? 'dark' : 'light'
  }
}

function byteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength
}

function sourceCap(kind: RichRendererKind, limits: Readonly<RichLimits>): number {
  switch (kind) {
    case 'math':
      return limits.math.maxSourceBytes
    case 'mermaid':
      return limits.mermaid.maxSourceBytes
    case 'vega-lite':
      return limits.vegaLite.maxSourceBytes
    case 'code':
      return limits.code.maxSourceBytes
  }
}

function requestId(kind: RichRendererKind, index: number, source: string): string {
  let hash = 0x811c9dc5
  for (let at = 0; at < source.length; at += 1) {
    hash ^= source.charCodeAt(at)
    hash = Math.imul(hash, 0x01000193)
  }
  return `${kind}-${index}-${(hash >>> 0).toString(16)}`
}

function kindOf(element: HTMLElement): RichRendererKind | null {
  switch (element.dataset['richKind']) {
    case 'math':
    case 'mermaid':
    case 'vega-lite':
    case 'code':
      return element.dataset['richKind']
    default:
      return null
  }
}

function nodesOf(element: HTMLElement): BlockNodes | null {
  const source = element.querySelector<HTMLElement>('[data-rich-source]')
  const output = element.querySelector<HTMLElement>('[data-rich-output]')
  const status = element.querySelector<HTMLElement>('[data-rich-status]')
  return source && output && status
    ? { element, source, output, status }
    : null
}

function showSource(nodes: BlockNodes, message: string): void {
  nodes.element.dataset['richState'] = 'source'
  nodes.element.removeAttribute('aria-busy')
  nodes.source.hidden = false
  nodes.output.hidden = true
  nodes.output.replaceChildren()
  nodes.status.textContent = message
  nodes.status.hidden = message.length === 0
}

function showLoading(block: ActiveBlock, label: string): void {
  block.element.dataset['richState'] = 'loading'
  block.element.setAttribute('aria-busy', 'true')
  block.source.hidden = false
  block.output.hidden = false
  block.output.replaceChildren(block.renderHost)
  block.status.textContent = `Loading ${label}…`
  block.status.hidden = false
}

function showReady(block: ActiveBlock): void {
  block.element.dataset['richState'] = 'ready'
  block.element.removeAttribute('aria-busy')
  block.source.hidden = true
  block.output.hidden = false
  const diagnostic = block.handle?.diagnostics[0]
  if (diagnostic) {
    block.status.textContent = `${diagnostic.severity}: ${diagnostic.message}`
    block.status.hidden = false
  } else {
    block.status.textContent = ''
    block.status.hidden = true
  }
}

function errorText(reason: unknown): string {
  if (reason instanceof Error && reason.message.trim()) return reason.message
  const text = String(reason).trim()
  return text || 'Renderer failed'
}

function abortPromise(signal: AbortSignal): Promise<never> {
  return new Promise((_, reject) => {
    if (signal.aborted) {
      reject(signal.reason ?? new Error('Render cancelled'))
      return
    }
    signal.addEventListener(
      'abort',
      () => reject(signal.reason ?? new Error('Render cancelled')),
      { once: true }
    )
  })
}

export function hydrateRichMarkdown(
  root: HTMLElement,
  options: RichHydrationOptions = {}
): RichHydration {
  activeRoots.get(root)?.dispose()

  const registry = options.registry ?? defaultRichRendererRegistry
  const limits = options.limits ?? DEFAULT_RICH_LIMITS
  const theme = options.theme ?? themeFor(root)
  const blocks: ActiveBlock[] = []
  let disposed = false

  const placeholders = Array.from(
    root.querySelectorAll<HTMLElement>('[data-rich-block]')
  )

  const tasks = placeholders.map(async (element, index) => {
    const nodes = nodesOf(element)
    if (!nodes) return
    if (index >= limits.maxBlocks) {
      showSource(nodes, `Rich block limit reached (${limits.maxBlocks}); source shown.`)
      return
    }

    const kind = kindOf(element)
    if (!kind) {
      showSource(nodes, 'Unknown rich block; source shown.')
      return
    }
    const source = nodes.source.textContent ?? ''
    const cap = sourceCap(kind, limits)
    if (byteLength(source) > cap) {
      showSource(nodes, `${kind} source exceeds the ${cap}-byte render limit; source shown.`)
      return
    }

    const pendingAdapter = registry.load(kind)
    if (!pendingAdapter) {
      showSource(nodes, `${kind} renderer is unavailable; source shown.`)
      return
    }

    const controller = new AbortController()
    const renderHost = root.ownerDocument.createElement('div')
    renderHost.dataset['richRenderHost'] = ''
    const block: ActiveBlock = {
      ...nodes,
      controller,
      renderHost,
      handle: null,
      timer: null
    }
    blocks.push(block)
    showLoading(block, kind)

    const timeout = new Promise<never>((_, reject) => {
      block.timer = setTimeout(() => {
        const reason = new Error(
          `${kind} render exceeded ${limits.timeoutMs} ms`
        )
        controller.abort(reason)
        reject(reason)
      }, limits.timeoutMs)
    })

    try {
      const adapter = await Promise.race([
        pendingAdapter,
        abortPromise(controller.signal),
        timeout
      ])
      if (disposed || controller.signal.aborted) return
      const rendering = adapter.render(renderHost, {
          id: requestId(kind, index, source),
          kind,
          source,
          info: element.dataset['richInfo'] ?? '',
          theme,
          limits,
          signal: controller.signal
        })
      void rendering.then(
        (lateHandle) => {
          if (disposed || controller.signal.aborted) lateHandle.dispose()
        },
        () => undefined
      )
      const handle = await Promise.race([
        rendering,
        abortPromise(controller.signal),
        timeout
      ])
      if (disposed || controller.signal.aborted) {
        handle.dispose()
        return
      }
      block.handle = handle
      const outputBytes = byteLength(renderHost.innerHTML)
      if (outputBytes > limits.maxOutputBytes) {
        handle.dispose()
        block.handle = null
        showSource(
          nodes,
          `${kind} output exceeds the ${limits.maxOutputBytes}-byte render limit; source shown.`
        )
        return
      }
      showReady(block)
    } catch (reason) {
      if (!disposed && !controller.signal.aborted) {
        showSource(nodes, `${kind}: ${errorText(reason)}; source shown.`)
      } else if (!disposed && controller.signal.reason instanceof Error) {
        showSource(
          nodes,
          `${kind}: ${controller.signal.reason.message}; source shown.`
        )
      }
    } finally {
      if (block.timer !== null) clearTimeout(block.timer)
      block.timer = null
    }
  })

  const hydration: RichHydration = {
    ready: Promise.all(tasks).then(() => undefined),
    dispose() {
      if (disposed) return
      disposed = true
      for (const block of blocks) {
        if (block.timer !== null) clearTimeout(block.timer)
        block.timer = null
        block.controller.abort(new Error('Rich Markdown hydration disposed'))
        block.handle?.dispose()
        block.handle = null
        if (block.output.contains(block.renderHost)) {
          showSource(block, '')
        }
      }
      if (activeRoots.get(root) === hydration) activeRoots.delete(root)
    }
  }
  activeRoots.set(root, hydration)
  return hydration
}
