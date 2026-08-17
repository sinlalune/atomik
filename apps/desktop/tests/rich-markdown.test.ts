import { parseHTML } from 'linkedom'
import { describe, expect, it, vi } from 'vitest'
import { noteMarkdown } from '../renderer/src/editor/note-markdown'
import {
  DEFAULT_RICH_LIMITS,
  type RichRenderHandle,
  type RichRenderRequest,
  type RichRendererAdapter
} from '../renderer/src/editor/rich-markdown/contracts'
import {
  createMermaidAdapter,
  estimateMermaidEdges,
  mermaidConfigFor,
  type MermaidRuntime
} from '../renderer/src/editor/rich-markdown/adapters/mermaid-core'
import {
  createVegaLiteAdapter,
  validateVegaLiteSource,
  type VegaLiteRuntime,
  type VegaView
} from '../renderer/src/editor/rich-markdown/adapters/vega-lite-core'
import { safeSvgNode } from '../renderer/src/editor/rich-markdown/adapters/safe-svg'
import { hydrateRichMarkdown } from '../renderer/src/editor/rich-markdown/hydration'
import { createRichRendererRegistry } from '../renderer/src/editor/rich-markdown/registry'
import {
  discoverDollarMath,
  displayMathOnLine,
  inlineMathClose,
  richKindForFence
} from '../renderer/src/editor/rich-markdown/syntax'

function domFor(markdown: string): HTMLElement {
  const { document } = parseHTML('<html><body><main id="root"></main></body></html>')
  const root = document.querySelector('#root')!
  root.innerHTML = noteMarkdown().render(markdown)
  return root as unknown as HTMLElement
}

function emptyHost(): HTMLElement {
  const { document } = parseHTML('<html><body><main id="host"></main></body></html>')
  return document.querySelector('#host') as unknown as HTMLElement
}

function deferred<T>(): {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (reason: unknown) => void
} {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((ok, fail) => {
    resolve = ok
    reject = fail
  })
  return { promise, resolve, reject }
}

function handle(onDispose = () => {}): RichRenderHandle {
  return { diagnostics: [], dispose: onDispose }
}

function mermaidRequest(
  source = 'flowchart LR\nA --> B',
  overrides: Partial<RichRenderRequest> = {}
): RichRenderRequest {
  return {
    id: 'rich-test-mermaid-0-a1',
    kind: 'mermaid',
    source,
    info: 'mermaid',
    theme: { name: 'system', scheme: 'light' },
    limits: DEFAULT_RICH_LIMITS,
    signal: new AbortController().signal,
    ...overrides
  }
}

function fakeMermaid(svg = '<svg xmlns="http://www.w3.org/2000/svg"><path /></svg>'):
  {
    runtime: MermaidRuntime
    initialize: ReturnType<typeof vi.fn>
    updateSiteConfig: ReturnType<typeof vi.fn>
    render: ReturnType<typeof vi.fn>
    bindFunctions: ReturnType<typeof vi.fn>
  } {
  const initialize = vi.fn()
  const updateSiteConfig = vi.fn((config) => config)
  const bindFunctions = vi.fn()
  const render = vi.fn(async () => ({
    svg,
    diagramType: 'flowchart-v2',
    bindFunctions
  }))
  return {
    runtime: {
      initialize,
      render,
      mermaidAPI: { updateSiteConfig }
    } as MermaidRuntime,
    initialize,
    updateSiteConfig,
    render,
    bindFunctions
  }
}

const VALID_VEGA_SOURCE = JSON.stringify({
  title: 'Quarterly total',
  description: 'A bar chart of quarterly totals.',
  data: {
    values: [
      { quarter: 'Q1', total: 3 },
      { quarter: 'Q2', total: 7 }
    ]
  },
  mark: 'bar',
  encoding: {
    x: { field: 'quarter', type: 'nominal' },
    y: { field: 'total', type: 'quantitative' }
  }
})

function vegaRequest(
  source = VALID_VEGA_SOURCE,
  overrides: Partial<RichRenderRequest> = {}
): RichRenderRequest {
  return {
    id: 'rich-test-vega-lite-0-b2',
    kind: 'vega-lite',
    source,
    info: 'vega-lite',
    theme: { name: 'system', scheme: 'light' },
    limits: DEFAULT_RICH_LIMITS,
    signal: new AbortController().signal,
    ...overrides
  }
}

function fakeVega(
  svg = '<svg xmlns="http://www.w3.org/2000/svg"><rect id="bar" /></svg>'
): {
  runtime: VegaLiteRuntime
  compile: ReturnType<typeof vi.fn>
  parse: ReturnType<typeof vi.fn>
  createView: ReturnType<typeof vi.fn>
  runAsync: ReturnType<typeof vi.fn>
  toSVG: ReturnType<typeof vi.fn>
  finalize: ReturnType<typeof vi.fn>
  view: VegaView
} {
  const compile = vi.fn((spec: Record<string, unknown>) => ({
    spec: { compiled: spec }
  }))
  const parse = vi.fn((spec: unknown) => ({ runtime: spec }))
  const runAsync = vi.fn(async () => undefined)
  const toSVG = vi.fn(async () => svg)
  const finalize = vi.fn()
  const view: VegaView = { runAsync, toSVG, finalize }
  const createView = vi.fn(() => view)
  return {
    runtime: { compile, parse, createView },
    compile,
    parse,
    createView,
    runAsync,
    toSVG,
    finalize,
    view
  }
}

describe('rich Markdown syntax discovery (ADR-014)', () => {
  it('normalizes the accepted fence aliases and rejects unknown DSLs', () => {
    for (const alias of ['math', 'LATEX', 'tex', 'katex']) {
      expect(richKindForFence(`${alias} title=demo`)).toBe('math')
    }
    expect(richKindForFence('mermaid')).toBe('mermaid')
    for (const alias of ['vega-lite', 'VEGALITE', 'vl']) {
      expect(richKindForFence(alias)).toBe('vega-lite')
    }
    expect(richKindForFence('graphviz')).toBeNull()
    expect(richKindForFence('typescript')).toBeNull()
  })

  it('finds strict single-dollar pairs without eating currency or whitespace', () => {
    expect(inlineMathClose('$x + y$', 0)).toBe(6)
    expect(inlineMathClose('$ x$', 0)).toBe(-1)
    expect(inlineMathClose('$x $', 0)).toBe(-1)
    expect(inlineMathClose('$$x$$', 0)).toBe(-1)
    expect(inlineMathClose('$x\ny$', 0)).toBe(-1)
    expect(inlineMathClose('\\$x$', 1)).toBe(-1)
    expect(inlineMathClose('price $5 and tax', 6)).toBe(-1)
  })

  it('accepts only complete, non-empty one-line display forms', () => {
    expect(displayMathOnLine(' $$ x^2 $$ ')).toBe(' x^2 ')
    expect(displayMathOnLine('$$  $$')).toBeNull()
    expect(displayMathOnLine('before $$x$$')).toBeNull()
    expect(displayMathOnLine('$$x')).toBeNull()
  })

  it('maps inline and display source ranges while protected code stays literal', () => {
    const source = '`$code$` then $x + y$\n\n$$\n\\int_0^1 x dx\n$$\n'
    const codeTo = source.indexOf(' then')
    const spans = discoverDollarMath(source, [{ from: 0, to: codeTo }])
    expect(spans).toEqual([
      {
        from: source.indexOf('$x + y$'),
        to: source.indexOf('$x + y$') + '$x + y$'.length,
        source: 'x + y',
        display: false
      },
      {
        from: source.indexOf('$$'),
        to: source.lastIndexOf('$$') + 2,
        source: '\\int_0^1 x dx',
        display: true
      }
    ])
  })

  it('leaves unclosed display delimiters and ordinary currency literal', () => {
    expect(discoverDollarMath('price $5 and tax\n$$\nno close\n')).toEqual([])
  })
})

describe('rich renderer registry', () => {
  it('loads one adapter once and validates its declared kind', async () => {
    const loader = vi.fn(async (): Promise<RichRendererAdapter> => ({
      kind: 'math',
      async render() {
        return handle()
      }
    }))
    const registry = createRichRendererRegistry({ math: loader })
    expect(registry.has('math')).toBe(true)
    expect(registry.has('mermaid')).toBe(false)
    expect(await registry.load('math')).toBe(await registry.load('math'))
    expect(loader).toHaveBeenCalledTimes(1)
    expect(registry.load('mermaid')).toBeNull()
  })

  it('drops a rejected or mismatched cache entry so an explicit retry can work', async () => {
    let attempt = 0
    const registry = createRichRendererRegistry({
      math: async () => {
        attempt += 1
        if (attempt === 1) {
          return {
            kind: 'mermaid',
            async render() {
              return handle()
            }
          }
        }
        return {
          kind: 'math',
          async render() {
            return handle()
          }
        }
      }
    })
    await expect(registry.load('math')).rejects.toThrow('returned mermaid')
    await expect(registry.load('math')).resolves.toMatchObject({ kind: 'math' })
    expect(attempt).toBe(2)
  })
})

describe('rich Markdown hydration lifecycle', () => {
  it('passes source/theme/budgets to a lazy adapter, then restores source on teardown', async () => {
    const root = domFor('Inline $x + y$.')
    const dispose = vi.fn()
    const loader = vi.fn(async (): Promise<RichRendererAdapter> => ({
      kind: 'math',
      async render(host, request) {
        expect(request).toMatchObject({
          kind: 'math',
          source: 'x + y',
          info: 'inline',
          theme: { name: 'system', scheme: 'light' }
        })
        expect(request.signal.aborted).toBe(false)
        host.textContent = 'rendered math'
        return handle(dispose)
      }
    }))
    const hydration = hydrateRichMarkdown(root, {
      registry: createRichRendererRegistry({ math: loader })
    })
    await hydration.ready

    const block = root.querySelector<HTMLElement>('[data-rich-block]')!
    expect(block.dataset['richState']).toBe('ready')
    expect(block.querySelector<HTMLElement>('[data-rich-source]')!.hidden).toBe(true)
    expect(block.querySelector('[data-rich-output]')!.textContent).toBe('rendered math')
    expect(loader).toHaveBeenCalledTimes(1)

    hydration.dispose()
    expect(dispose).toHaveBeenCalledTimes(1)
    expect(block.querySelector<HTMLElement>('[data-rich-source]')!.hidden).toBe(false)
    expect(block.querySelector('[data-rich-output]')!.textContent).toBe('')
  })

  it('suppresses a stale render and disposes its late handle', async () => {
    const root = domFor('$old$')
    const oldResult = deferred<RichRenderHandle>()
    const oldStarted = deferred<void>()
    const oldDispose = vi.fn()
    const oldRegistry = createRichRendererRegistry({
      math: async () => ({
        kind: 'math',
        async render(host) {
          host.textContent = 'old'
          oldStarted.resolve()
          return oldResult.promise
        }
      })
    })
    const oldHydration = hydrateRichMarkdown(root, { registry: oldRegistry })
    await oldStarted.promise

    const currentRegistry = createRichRendererRegistry({
      math: async () => ({
        kind: 'math',
        async render(host) {
          host.textContent = 'current'
          return handle()
        }
      })
    })
    const currentHydration = hydrateRichMarkdown(root, {
      registry: currentRegistry
    })
    await currentHydration.ready
    oldResult.resolve(handle(oldDispose))
    await oldResult.promise
    await oldHydration.ready

    expect(root.querySelector('[data-rich-output]')!.textContent).toBe('current')
    expect(oldDispose).toHaveBeenCalledTimes(1)
    currentHydration.dispose()
  })

  it('fails oversized input before loading an adapter', async () => {
    const root = domFor(`$${'x'.repeat(20)}$`)
    const loader = vi.fn(async (): Promise<RichRendererAdapter> => ({
      kind: 'math',
      async render() {
        return handle()
      }
    }))
    const limits = {
      ...DEFAULT_RICH_LIMITS,
      math: { ...DEFAULT_RICH_LIMITS.math, maxSourceBytes: 4 }
    }
    const hydration = hydrateRichMarkdown(root, {
      registry: createRichRendererRegistry({ math: loader }),
      limits
    })
    await hydration.ready
    expect(loader).not.toHaveBeenCalled()
    expect(root.querySelector('[data-rich-status]')!.textContent).toContain(
      'exceeds the 4-byte render limit'
    )
  })

  it('keeps thrown markup as text and the escaped source visible', async () => {
    const root = domFor('```mermaid\ngraph TD; A-->B\n```')
    const registry = createRichRendererRegistry({
      mermaid: async () => ({
        kind: 'mermaid',
        async render() {
          throw new Error('<img src=x onerror=alert(1)>')
        }
      })
    })
    const hydration = hydrateRichMarkdown(root, { registry })
    await hydration.ready
    const status = root.querySelector<HTMLElement>('[data-rich-status]')!
    expect(status.textContent).toContain('<img src=x onerror=alert(1)>')
    expect(status.querySelector('img')).toBeNull()
    expect(root.querySelector<HTMLElement>('[data-rich-source]')!.hidden).toBe(false)
  })

  it('aborts a timed-out render and leaves a loud source fallback', async () => {
    const root = domFor('$slow$')
    const observed: { signal: AbortSignal | null } = { signal: null }
    const registry = createRichRendererRegistry({
      math: async () => ({
        kind: 'math',
        async render(_host, request) {
          observed.signal = request.signal
          return new Promise<RichRenderHandle>(() => {})
        }
      })
    })
    const hydration = hydrateRichMarkdown(root, {
      registry,
      limits: { ...DEFAULT_RICH_LIMITS, timeoutMs: 5 }
    })
    await hydration.ready
    expect(observed.signal?.aborted).toBe(true)
    expect(root.querySelector('[data-rich-status]')!.textContent).toContain(
      'exceeded 5 ms'
    )
    expect(root.querySelector<HTMLElement>('[data-rich-source]')!.hidden).toBe(false)
  })

  it('rejects generated output beyond the shared cap and disposes it', async () => {
    const root = domFor('$x$')
    const dispose = vi.fn()
    const registry = createRichRendererRegistry({
      math: async () => ({
        kind: 'math',
        async render(host) {
          host.textContent = 'too large'
          return handle(dispose)
        }
      })
    })
    const hydration = hydrateRichMarkdown(root, {
      registry,
      limits: { ...DEFAULT_RICH_LIMITS, maxOutputBytes: 2 }
    })
    await hydration.ready
    expect(dispose).toHaveBeenCalledTimes(1)
    expect(root.querySelector('[data-rich-output]')!.textContent).toBe('')
    expect(root.querySelector('[data-rich-status]')!.textContent).toContain(
      'output exceeds the 2-byte render limit'
    )
  })

  it('gives identical SVG-producing blocks distinct mount-generation ids', async () => {
    const ids: string[] = []
    const registry = createRichRendererRegistry({
      mermaid: async () => ({
        kind: 'mermaid',
        async render(host, request) {
          ids.push(request.id)
          host.textContent = 'diagram'
          return handle()
        }
      })
    })
    const first = domFor('```mermaid\nflowchart LR\nA --> B\n```')
    const second = domFor('```mermaid\nflowchart LR\nA --> B\n```')
    const firstHydration = hydrateRichMarkdown(first, { registry })
    const secondHydration = hydrateRichMarkdown(second, { registry })
    await Promise.all([firstHydration.ready, secondHydration.ready])

    expect(ids).toHaveLength(2)
    expect(ids[0]).not.toBe(ids[1])
    expect(ids.every((id) => /^rich-\d+-mermaid-0-[a-f0-9]+$/.test(id))).toBe(
      true
    )
    firstHydration.dispose()
    secondHydration.dispose()
  })
})

describe('Mermaid adapter (CP-RICH-MARKDOWN S04)', () => {
  it('hydrates a strict, namespaced, accessible static SVG without bindings', async () => {
    const fixture = fakeMermaid(
      [
        '<svg xmlns="http://www.w3.org/2000/svg" id="diagram" onload="alert(1)">',
        '<defs><marker id="arrow"><path d="M0 0L4 2L0 4Z" /></marker></defs>',
        '<style>#diagram .edge{marker-end:url(#arrow)}</style>',
        '<path id="edge" class="edge" marker-end="url(#arrow)" onclick="alert(2)" />',
        '</svg>'
      ].join('')
    )
    const root = domFor('```mermaid\nflowchart LR\nA --> B\n```')
    const hydration = hydrateRichMarkdown(root, {
      registry: createRichRendererRegistry({
        mermaid: async () => createMermaidAdapter(fixture.runtime)
      })
    })
    await hydration.ready

    expect(fixture.initialize).toHaveBeenCalledTimes(1)
    expect(fixture.initialize.mock.calls[0]?.[0]).toMatchObject({
      startOnLoad: false,
      securityLevel: 'strict',
      htmlLabels: false,
      suppressErrorRendering: true,
      deterministicIds: true,
      maxTextSize: 20_000,
      maxEdges: 200,
      arrowMarkerAbsolute: false
    })
    const siteConfig = fixture.updateSiteConfig.mock.calls[0]?.[0]
    expect(siteConfig).toMatchObject({
      securityLevel: 'strict',
      deterministicIds: true,
      deterministicIDSeed: expect.stringMatching(/^rich-\d+-mermaid-0-/),
      theme: 'base'
    })
    expect(siteConfig.secure).toEqual(
      expect.arrayContaining([
        'securityLevel',
        'htmlLabels',
        'themeCSS',
        'deterministicIDSeed',
        'maxEdges'
      ])
    )
    expect(fixture.render.mock.calls[0]?.[0]).toMatch(
      /^atomik_mermaid_rich-\d+-mermaid-0-/
    )
    expect(fixture.bindFunctions).not.toHaveBeenCalled()

    const svg = root.querySelector<SVGElement>('[data-rich-output] svg')!
    expect(svg).not.toBeNull()
    expect(svg.getAttribute('role')).toBe('img')
    expect(svg.getAttribute('onload')).toBeNull()
    expect(svg.querySelector('path.edge')?.getAttribute('onclick')).toBeNull()
    expect(svg.querySelector('title')?.textContent).toBe(
      'Mermaid flowchart v2 diagram'
    )
    expect(svg.querySelector('desc')?.textContent).toContain(
      'flowchart LR A --> B'
    )
    const labelledBy = svg.getAttribute('aria-labelledby')!.split(' ')
    expect(labelledBy).toHaveLength(2)
    expect(labelledBy.every((id) => root.querySelector(`[id="${id}"]`))).toBe(
      true
    )
    const marker = svg.querySelector('marker')!
    expect(marker.id).toMatch(/^atomik-rich-\d+-mermaid-0-/)
    expect(svg.querySelector('path.edge')?.getAttribute('marker-end')).toBe(
      `url(#${marker.id})`
    )
    expect(svg.querySelector('style')?.textContent).toContain(`#${marker.id}`)
    expect(svg.querySelector('style')?.textContent).not.toContain('#arrow')

    hydration.dispose()
    expect(root.querySelector('[data-rich-output] svg')).toBeNull()
    expect((root.querySelector('[data-rich-source]') as HTMLElement).hidden).toBe(
      false
    )
  })

  it('rejects active syntax and resource floods before Mermaid runs', async () => {
    const fixture = fakeMermaid()
    const adapter = createMermaidAdapter(fixture.runtime)
    const edgeFlood = Array.from(
      { length: DEFAULT_RICH_LIMITS.mermaid.maxEdges + 1 },
      (_, index) => `A${index} --> A${index + 1}`
    ).join('\n')
    expect(estimateMermaidEdges(edgeFlood)).toBe(201)

    const rejected = [
      '%%{init: { securityLevel: "loose" }}%%\nflowchart LR\nA --> B',
      '---\nconfig:\n  securityLevel: loose\n---\nflowchart LR\nA --> B',
      'flowchart LR; click A href "https://evil.example"',
      'flowchart LR\nA[https://evil.example/x]',
      'flowchart LR\nA@{ img: "relative.png" }',
      'flowchart LR\nA[![alt](relative.png)]',
      edgeFlood,
      'x'.repeat(DEFAULT_RICH_LIMITS.mermaid.maxTextCharacters + 1)
    ]
    for (const source of rejected) {
      await expect(adapter.render(emptyHost(), mermaidRequest(source))).rejects.toThrow()
    }
    await expect(
      adapter.render(
        emptyHost(),
        mermaidRequest('flowchart LR\nA --> B', {
          limits: {
            ...DEFAULT_RICH_LIMITS,
            mermaid: { ...DEFAULT_RICH_LIMITS.mermaid, maxSourceBytes: 4 }
          }
        })
      )
    ).rejects.toThrow('exceeds 4 bytes')
    await expect(
      adapter.render(
        emptyHost(),
        mermaidRequest(edgeFlood, {
          limits: {
            ...DEFAULT_RICH_LIMITS,
            mermaid: {
              ...DEFAULT_RICH_LIMITS.mermaid,
              maxTextCharacters: 100_000,
              maxEdges: 10_000
            }
          }
        })
      )
    ).rejects.toThrow('exceeds 200 edges')
    expect(fixture.initialize).not.toHaveBeenCalled()
    expect(fixture.render).not.toHaveBeenCalled()
  })

  it('rejects foreign/scriptable SVG and non-fragment resource targets', () => {
    const document = emptyHost().ownerDocument
    const unsafe = [
      '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
      '<svg xmlns="http://www.w3.org/2000/svg"><foreignObject><div /></foreignObject></svg>',
      '<svg xmlns="http://www.w3.org/2000/svg"><image href="#local" /></svg>',
      '<svg xmlns="http://www.w3.org/2000/svg"><a href="https://evil.example"><text>x</text></a></svg>',
      '<svg xmlns="http://www.w3.org/2000/svg"><path style="fill:url(https://evil.example/x)" /></svg>',
      '<svg xmlns="http://www.w3.org/2000/svg"><style>@import "evil.css";</style></svg>',
      '<svg xmlns="http://www.w3.org/2000/svg" xml:base="https://evil.example"><path /></svg>',
      '<svg xmlns="http://www.w3.org/2000/svg"><g xmlns="http://www.w3.org/1999/xhtml"><div /></g></svg>',
      '<svg xmlns="http://www.w3.org/2000/svg"><g id="same" /><path id="same" /></svg>',
      '<svg xmlns="http://www.w3.org/2000/svg"><style>path{fill:u\\72l(https://evil.example/x)}</style></svg>',
      '<!DOCTYPE svg><svg xmlns="http://www.w3.org/2000/svg"><path /></svg>',
      '<?xml-stylesheet href="evil.css"?><svg xmlns="http://www.w3.org/2000/svg"><path /></svg>'
    ]
    for (const svg of unsafe) {
      expect(() =>
        safeSvgNode(document, svg, {
          requestId: 'unsafe-test',
          title: 'Diagram',
          description: 'Source'
        })
      ).toThrow('Unsafe generated SVG')
    }
  })

  it('preserves authored SVG accessibility text and disables fragment links', () => {
    const document = emptyHost().ownerDocument
    const svg = safeSvgNode(
      document,
      [
        '<svg xmlns="http://www.w3.org/2000/svg">',
        '<title>Authored process title</title>',
        '<desc>Authored process description</desc>',
        '<style>#fff{fill:#fff}#target{stroke:#fff}</style>',
        '<g id="fff" />',
        '<a id="jump" href="#target" target="_blank"><text>jump</text></a>',
        '<g id="target" onfocus="alert(1)" />',
        '</svg>'
      ].join(''),
      {
        requestId: 'a11y-test',
        title: 'Generated title',
        description: 'Generated description'
      }
    )
    expect(svg.querySelector('title')?.textContent).toBe('Authored process title')
    expect(svg.querySelector('desc')?.textContent).toBe(
      'Authored process description'
    )
    expect(svg.querySelector('a')?.getAttribute('href')).toBeNull()
    expect(svg.querySelector('a')?.getAttribute('target')).toBeNull()
    expect(svg.querySelectorAll('g')[1]?.getAttribute('onfocus')).toBeNull()
    const style = svg.querySelector('style')?.textContent ?? ''
    expect(style).toContain('fill:#fff')
    expect(style).toContain('stroke:#fff')
    expect(style).not.toMatch(/^#fff\{/)
  })

  it('maps each theme and request budget into immutable site configuration', () => {
    const host = emptyHost()
    const request = mermaidRequest('flowchart LR\nA --> B', {
      id: 'dark-seed',
      theme: { name: 'biolum', scheme: 'dark' },
      limits: {
        ...DEFAULT_RICH_LIMITS,
        mermaid: {
          ...DEFAULT_RICH_LIMITS.mermaid,
          maxTextCharacters: 1_234,
          maxEdges: 99
        }
      }
    })
    expect(mermaidConfigFor(host, request)).toMatchObject({
      deterministicIDSeed: 'dark-seed',
      darkMode: true,
      maxTextSize: 1_234,
      maxEdges: 99,
      themeVariables: {
        darkMode: true,
        background: '#1e1e23',
        primaryTextColor: '#e8e8e3',
        lineColor: '#9ec49e'
      }
    })
    const raised = mermaidConfigFor(host, {
      ...request,
      limits: {
        ...DEFAULT_RICH_LIMITS,
        mermaid: {
          ...DEFAULT_RICH_LIMITS.mermaid,
          maxTextCharacters: 100_000,
          maxEdges: 10_000
        }
      }
    })
    expect(raised.maxTextSize).toBe(20_000)
    expect(raised.maxEdges).toBe(200)
  })

  it('serializes global config changes across concurrent diagram requests', async () => {
    const firstResult = deferred<{
      svg: string
      diagramType: string
    }>()
    const firstStarted = deferred<void>()
    const seeds: string[] = []
    let currentSeed = ''
    const initialize = vi.fn()
    const updateSiteConfig = vi.fn((config) => {
      currentSeed = String(config.deterministicIDSeed)
      return config
    })
    const render = vi.fn(async () => {
      seeds.push(currentSeed)
      if (seeds.length === 1) {
        firstStarted.resolve()
        return firstResult.promise
      }
      return {
        svg: '<svg xmlns="http://www.w3.org/2000/svg"><path /></svg>',
        diagramType: 'flowchart-v2'
      }
    })
    const adapter = createMermaidAdapter({
      initialize,
      render,
      mermaidAPI: { updateSiteConfig }
    } as MermaidRuntime)
    const first = adapter.render(
      emptyHost(),
      mermaidRequest(undefined, { id: 'request-one' })
    )
    await firstStarted.promise
    const second = adapter.render(
      emptyHost(),
      mermaidRequest(undefined, { id: 'request-two' })
    )
    await Promise.resolve()
    expect(render).toHaveBeenCalledTimes(1)
    expect(updateSiteConfig).toHaveBeenCalledTimes(1)

    firstResult.resolve({
      svg: '<svg xmlns="http://www.w3.org/2000/svg"><path /></svg>',
      diagramType: 'flowchart-v2'
    })
    const [firstHandle, secondHandle] = await Promise.all([first, second])
    expect(seeds).toEqual(['request-one', 'request-two'])
    expect(initialize).toHaveBeenCalledTimes(1)
    firstHandle.dispose()
    secondHandle.dispose()
  })

  it('suppresses a completed Mermaid result after cancellation', async () => {
    const pending = deferred<{
      svg: string
      diagramType: string
    }>()
    const started = deferred<void>()
    const fixture = fakeMermaid()
    fixture.render.mockImplementationOnce(async () => {
      started.resolve()
      return pending.promise
    })
    const adapter = createMermaidAdapter(fixture.runtime)
    const host = emptyHost()
    const controller = new AbortController()
    const rendering = adapter.render(
      host,
      mermaidRequest(undefined, { signal: controller.signal })
    )
    await started.promise
    controller.abort(new Error('diagram cancelled'))
    expect(host.ownerDocument.body?.querySelector('[aria-hidden="true"]')).toBeNull()
    pending.resolve({
      svg: '<svg xmlns="http://www.w3.org/2000/svg"><path /></svg>',
      diagramType: 'flowchart-v2'
    })

    await expect(rendering).rejects.toThrow('diagram cancelled')
    expect(host.querySelector('svg')).toBeNull()
    expect(host.ownerDocument.body?.querySelector('[aria-hidden="true"]')).toBeNull()
  })

  it('drops oversized SVG before parsing or mounting it', async () => {
    const fixture = fakeMermaid(
      `<svg xmlns="http://www.w3.org/2000/svg"><text>${'x'.repeat(100)}</text></svg>`
    )
    const adapter = createMermaidAdapter(fixture.runtime)
    const host = emptyHost()
    await expect(
      adapter.render(
        host,
        mermaidRequest(undefined, {
          limits: { ...DEFAULT_RICH_LIMITS, maxOutputBytes: 32 }
        })
      )
    ).rejects.toThrow('output exceeds 32 bytes')
    expect(host.querySelector('svg')).toBeNull()
  })
})

describe('Vega-Lite adapter (CP-RICH-MARKDOWN S05)', () => {
  it('renders through the pinned Vega-Lite and Vega runtime', async () => {
    const root = domFor(`\`\`\`vega-lite\n${VALID_VEGA_SOURCE}\n\`\`\``)
    const hydration = hydrateRichMarkdown(root)
    await hydration.ready
    const svg = root.querySelector<SVGElement>('[data-rich-output] svg')!
    expect(svg).not.toBeNull()
    expect(svg.getAttribute('role')).toBe('img')
    expect(svg.querySelector('title')?.textContent).toBe('Quarterly total')
    expect(svg.querySelector('image')).toBeNull()
    expect(svg.querySelector('a')).toBeNull()
    expect(svg.querySelectorAll('rect, path')).not.toHaveLength(0)
    hydration.dispose()
    expect(root.querySelector('[data-rich-output] svg')).toBeNull()
  })

  it('renders a themed, static, accessible SVG through a deny-all loader', async () => {
    const fixture = fakeVega(
      [
        '<svg xmlns="http://www.w3.org/2000/svg" id="chart" onload="bad()">',
        '<rect id="bar" onclick="bad()" />',
        '</svg>'
      ].join('')
    )
    const root = domFor(`\`\`\`vl\n${VALID_VEGA_SOURCE}\n\`\`\``)
    const hydration = hydrateRichMarkdown(root, {
      registry: createRichRendererRegistry({
        'vega-lite': async () =>
          createVegaLiteAdapter(async () => fixture.runtime)
      })
    })
    await hydration.ready

    expect(fixture.compile).toHaveBeenCalledTimes(1)
    expect(fixture.compile.mock.calls[0]?.[0]).toMatchObject({
      title: 'Quarterly total',
      background: '#fbfbf9',
      config: {
        axis: {
          labelColor: '#26261f',
          gridColor: '#e0e0d8'
        },
        mark: { color: '#3d5a3d' }
      }
    })
    expect(fixture.parse).toHaveBeenCalledTimes(1)
    expect(fixture.createView).toHaveBeenCalledTimes(1)
    const viewOptions = fixture.createView.mock.calls[0]?.[1]
    expect(viewOptions).toMatchObject({ renderer: 'svg', hover: false })
    await expect(viewOptions.loader.load('https://evil.example')).rejects.toThrow(
      'resource loading is disabled'
    )
    await expect(viewOptions.loader.sanitize('file:///secret')).rejects.toThrow(
      'link sanitization is disabled'
    )
    await expect(viewOptions.loader.http('https://evil.example')).rejects.toThrow(
      'HTTP loading is disabled'
    )
    await expect(viewOptions.loader.file('/secret')).rejects.toThrow(
      'file loading is disabled'
    )
    expect(fixture.runAsync).toHaveBeenCalledTimes(1)
    expect(fixture.toSVG).toHaveBeenCalledTimes(1)
    expect(fixture.finalize).toHaveBeenCalledTimes(1)

    const svg = root.querySelector<SVGElement>('[data-rich-output] svg')!
    expect(svg.getAttribute('role')).toBe('img')
    expect(svg.getAttribute('onload')).toBeNull()
    expect(svg.querySelector('rect')?.getAttribute('onclick')).toBeNull()
    expect(svg.querySelector('title')?.textContent).toBe('Quarterly total')
    expect(svg.querySelector('desc')?.textContent).toBe(
      'A bar chart of quarterly totals.'
    )
    expect(svg.id).toMatch(/^atomik-rich-\d+-vega-lite-0-/)

    hydration.dispose()
    expect(root.querySelector('[data-rich-output] svg')).toBeNull()
  })

  it('accepts inline values and top-level named inline datasets only', () => {
    const named = {
      datasets: {
        table: [
          { url: 'ordinary field value', href: 'ordinary field value', data: 2 },
          { url: 'another value', href: 'another value', data: 4 }
        ]
      },
      data: { name: 'table' },
      mark: 'point',
      encoding: { x: { field: 'data', type: 'quantitative' } }
    }
    expect(validateVegaLiteSource(vegaRequest(JSON.stringify(named)))).toEqual(
      named
    )
    expect(
      validateVegaLiteSource(
        vegaRequest(
          JSON.stringify({
            data: {
              values: { records: [{ x: 1, y: 2 }] },
              format: { type: 'json', property: 'records' }
            },
            mark: 'point'
          })
        )
      )
    ).toMatchObject({ data: { values: { records: [{ x: 1, y: 2 }] } } })
  })

  it('maps dark app tokens into site-owned chart defaults', async () => {
    const fixture = fakeVega()
    const handle = await createVegaLiteAdapter(async () => fixture.runtime).render(
      emptyHost(),
      vegaRequest(undefined, {
        theme: { name: 'biolum', scheme: 'dark' }
      })
    )
    expect(fixture.compile.mock.calls[0]?.[0]).toMatchObject({
      background: '#1e1e23',
      config: {
        axis: { labelColor: '#e8e8e3', gridColor: '#44444c' },
        mark: { color: '#9ec49e' },
        title: { color: '#e8e8e3' }
      }
    })
    handle.dispose()
  })

  it('rejects external, generated, image, action, and missing-dataset inputs before import', async () => {
    const rejected = [
      { data: { url: 'https://evil.example/data.json' }, mark: 'bar' },
      { data: { sequence: { start: 0, stop: 10 } }, mark: 'line' },
      { data: { name: 'not-defined' }, mark: 'point' },
      { data: { values: [] }, mark: 'image' },
      { data: { values: [] }, mark: { type: 'image' } },
      {
        data: { values: [] },
        mark: 'point',
        encoding: { href: { value: 'https://evil.example' } }
      },
      {
        data: { values: [] },
        mark: 'point',
        encoding: { url: { field: 'photo' } }
      },
      { data: { values: [] }, mark: 'point', usermeta: { actions: true } },
      { data: { values: [] }, mark: 'point', config: { patch: [] } },
      {
        data: { values: 'x,y\\n1,2', format: { type: 'csv' } },
        mark: 'point'
      },
      {
        data: { values: [] },
        mark: 'point',
        params: [{ name: 'selection', bind: 'scales' }]
      },
      {
        data: { values: [] },
        layer: [{ datasets: { nested: [] }, mark: 'point' }]
      }
    ]
    const loadRuntime = vi.fn(async () => fakeVega().runtime)
    const adapter = createVegaLiteAdapter(loadRuntime)
    for (const spec of rejected) {
      await expect(
        adapter.render(emptyHost(), vegaRequest(JSON.stringify(spec)))
      ).rejects.toThrow('Vega-Lite')
    }
    expect(loadRuntime).not.toHaveBeenCalled()
  })

  it('rejects malformed roots and clamps every authored-data budget', () => {
    for (const source of ['', 'null', '[]', '42', '"chart"']) {
      expect(() => validateVegaLiteSource(vegaRequest(source))).toThrow(
        'Vega-Lite'
      )
    }

    expect(() =>
      validateVegaLiteSource(
        vegaRequest(VALID_VEGA_SOURCE, {
          limits: {
            ...DEFAULT_RICH_LIMITS,
            vegaLite: {
              ...DEFAULT_RICH_LIMITS.vegaLite,
              maxSourceBytes: 16
            }
          }
        })
      )
    ).toThrow('source exceeds 16 bytes')

    expect(() =>
      validateVegaLiteSource(
        vegaRequest(JSON.stringify({ a: { b: { c: true } } }), {
          limits: {
            ...DEFAULT_RICH_LIMITS,
            vegaLite: { ...DEFAULT_RICH_LIMITS.vegaLite, maxDepth: 2 }
          }
        })
      )
    ).toThrow('nesting depth 2')

    expect(() =>
      validateVegaLiteSource(
        vegaRequest(JSON.stringify({ a: 1, b: 2, c: 3 }), {
          limits: {
            ...DEFAULT_RICH_LIMITS,
            vegaLite: { ...DEFAULT_RICH_LIMITS.vegaLite, maxProperties: 2 }
          }
        })
      )
    ).toThrow('exceeds 2 properties')

    expect(() =>
      validateVegaLiteSource(
        vegaRequest(JSON.stringify({ data: { values: [{ a: 1 }, { a: 2 }] } }), {
          limits: {
            ...DEFAULT_RICH_LIMITS,
            vegaLite: { ...DEFAULT_RICH_LIMITS.vegaLite, maxRows: 1 }
          }
        })
      )
    ).toThrow('exceeds 1 rows')

    expect(() =>
      validateVegaLiteSource(
        vegaRequest(JSON.stringify({ data: { values: [{ a: 1, b: 2 }] } }), {
          limits: {
            ...DEFAULT_RICH_LIMITS,
            vegaLite: {
              ...DEFAULT_RICH_LIMITS.vegaLite,
              maxPrimitiveCells: 1
            }
          }
        })
      )
    ).toThrow('exceeds 1 primitive cells')

    const overHardCap = JSON.stringify({
      description: 'x'.repeat(DEFAULT_RICH_LIMITS.vegaLite.maxSourceBytes)
    })
    expect(() =>
      validateVegaLiteSource(
        vegaRequest(overHardCap, {
          limits: {
            ...DEFAULT_RICH_LIMITS,
            vegaLite: {
              ...DEFAULT_RICH_LIMITS.vegaLite,
              maxSourceBytes: 1_000_000
            }
          }
        })
      )
    ).toThrow(`source exceeds ${256 * 1024} bytes`)
  })

  it('finalizes exactly once across runtime errors, unsafe output, and output caps', async () => {
    const runFailure = fakeVega()
    runFailure.runAsync.mockRejectedValueOnce(new Error('dataflow failed'))
    await expect(
      createVegaLiteAdapter(async () => runFailure.runtime).render(
        emptyHost(),
        vegaRequest()
      )
    ).rejects.toThrow('dataflow failed')
    expect(runFailure.finalize).toHaveBeenCalledTimes(1)

    const unsafe = fakeVega(
      '<svg xmlns="http://www.w3.org/2000/svg"><image href="https://evil.example/x" /></svg>'
    )
    await expect(
      createVegaLiteAdapter(async () => unsafe.runtime).render(
        emptyHost(),
        vegaRequest()
      )
    ).rejects.toThrow('Unsafe generated SVG')
    expect(unsafe.finalize).toHaveBeenCalledTimes(1)

    const oversized = fakeVega(
      `<svg xmlns="http://www.w3.org/2000/svg"><text>${'x'.repeat(100)}</text></svg>`
    )
    await expect(
      createVegaLiteAdapter(async () => oversized.runtime).render(
        emptyHost(),
        vegaRequest(undefined, {
          limits: { ...DEFAULT_RICH_LIMITS, maxOutputBytes: 32 }
        })
      )
    ).rejects.toThrow('output exceeds 32 bytes')
    expect(oversized.finalize).toHaveBeenCalledTimes(1)
  })

  it('finalizes immediately when an in-flight dataflow is cancelled', async () => {
    const fixture = fakeVega()
    const pending = deferred<undefined>()
    const started = deferred<void>()
    fixture.runAsync.mockImplementationOnce(async () => {
      started.resolve()
      return pending.promise
    })
    const controller = new AbortController()
    const host = emptyHost()
    const rendering = createVegaLiteAdapter(async () => fixture.runtime).render(
      host,
      vegaRequest(undefined, { signal: controller.signal })
    )
    await started.promise
    controller.abort(new Error('chart cancelled'))
    expect(fixture.finalize).toHaveBeenCalledTimes(1)
    pending.resolve(undefined)

    await expect(rendering).rejects.toThrow('chart cancelled')
    expect(fixture.finalize).toHaveBeenCalledTimes(1)
    expect(host.querySelector('svg')).toBeNull()
  })
})

describe('KaTeX adapter (CP-RICH-MARKDOWN S03)', () => {
  it('hydrates inline and display expressions with visual HTML plus MathML', async () => {
    const root = domFor(
      [
        'Euler: $e^{i\\pi}+1=0$.',
        '',
        '$$ \\int_0^1 x^2 dx $$',
        '',
        '```math',
        '\\sum_{n=1}^N n',
        '```'
      ].join('\n')
    )
    const hydration = hydrateRichMarkdown(root)
    await hydration.ready

    const outputs = root.querySelectorAll<HTMLElement>('[data-rich-output]')
    expect(outputs).toHaveLength(3)
    expect(outputs[0]!.querySelector('.katex')).not.toBeNull()
    expect(outputs[0]!.querySelector('math')).not.toBeNull()
    expect(outputs[0]!.querySelector('.katex-display')).toBeNull()
    expect(outputs[1]!.querySelector('.katex-display')).not.toBeNull()
    expect(outputs[1]!.querySelector('math')).not.toBeNull()
    expect(outputs[2]!.querySelector('.katex-display')).not.toBeNull()
    expect(outputs[2]!.querySelector('math')).not.toBeNull()
    expect(
      Array.from(root.querySelectorAll<HTMLElement>('[data-rich-block]')).every(
        (block) => block.dataset['richState'] === 'ready'
      )
    ).toBe(true)
    hydration.dispose()
  })

  it('keeps trust disabled: resource commands cannot create links or images', async () => {
    const root = domFor(
      '$\\href{https://evil.example/x}{x}$ and $\\includegraphics{https://evil.example/x.png}$'
    )
    const hydration = hydrateRichMarkdown(root)
    await hydration.ready
    const outputs = Array.from(
      root.querySelectorAll<HTMLElement>('[data-rich-output]')
    )
    expect(outputs.every((node) => node.querySelector('a, img') === null)).toBe(
      true
    )
    expect(
      outputs.every(
        (node) => node.querySelector('[href^="https://evil.example"]') === null
      )
    ).toBe(true)
    hydration.dispose()
  })

  it('does not share macro definitions between expressions', async () => {
    const first = domFor('$\\gdef\\atomikmacro{x}\\atomikmacro$')
    const firstHydration = hydrateRichMarkdown(first)
    await firstHydration.ready
    expect(first.querySelector('[data-rich-block]')?.getAttribute('data-rich-state')).toBe(
      'ready'
    )

    const second = domFor('$\\atomikmacro$')
    const secondHydration = hydrateRichMarkdown(second)
    await secondHydration.ready
    expect(second.querySelector('[data-rich-block]')?.getAttribute('data-rich-state')).toBe(
      'source'
    )
    expect(second.querySelector('[data-rich-status]')?.textContent).toContain(
      'Undefined control sequence'
    )
    firstHydration.dispose()
    secondHydration.dispose()
  })

  it('fails visibly on runaway expansion and caps visual dimensions', async () => {
    const runaway = domFor('$\\def\\loop{\\loop}\\loop$')
    const runawayHydration = hydrateRichMarkdown(runaway)
    await runawayHydration.ready
    expect(runaway.querySelector('[data-rich-status]')?.textContent).toContain(
      'Too many expansions'
    )
    expect(
      (runaway.querySelector('[data-rich-source]') as HTMLElement).hidden
    ).toBe(false)

    const sized = domFor('$\\rule{999em}{999em}$')
    const sizedHydration = hydrateRichMarkdown(sized)
    await sizedHydration.ready
    const mspace = sized.querySelector('mspace')
    expect(mspace?.getAttribute('width')).toBe('20em')
    expect(mspace?.getAttribute('height')).toBe('20em')
    runawayHydration.dispose()
    sizedHydration.dispose()
  })

  it('keeps parse errors as text-only diagnostics with authored source visible', async () => {
    const root = domFor('$\\frac{1{$')
    const hydration = hydrateRichMarkdown(root)
    await hydration.ready
    const status = root.querySelector<HTMLElement>('[data-rich-status]')!
    expect(root.querySelector('[data-rich-block]')?.getAttribute('data-rich-state')).toBe(
      'source'
    )
    expect(status.textContent).toContain('KaTeX parse error')
    expect(status.querySelector('*')).toBeNull()
    expect((root.querySelector('[data-rich-source]') as HTMLElement).hidden).toBe(
      false
    )
    hydration.dispose()
  })
})
