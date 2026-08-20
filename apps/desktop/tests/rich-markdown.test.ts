import { readFileSync } from 'node:fs'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { ensureSyntaxTree } from '@codemirror/language'
import { EditorState } from '@codemirror/state'
import { parseHTML } from 'linkedom'
import { describe, expect, it, vi } from 'vitest'
import { noteMarkdown } from '../renderer/src/editor/note-markdown'
import {
  DEFAULT_RICH_LIMITS,
  type RichRenderHandle,
  type RichRenderRequest,
  type RichRendererAdapter
} from '../renderer/src/editor/rich-markdown/contracts'
import { copyText } from '../renderer/src/editor/clipboard'
import { toHexColor } from '../renderer/src/editor/rich-markdown/adapters/css-color'
import {
  DARK_THEME_NAMES,
  richThemeFor
} from '../renderer/src/editor/rich-markdown/theme'
import {
  createMermaidAdapter,
  estimateMermaidEdges,
  mermaidConfigFor,
  type MermaidRuntime
} from '../renderer/src/editor/rich-markdown/adapters/mermaid-core'
import {
  attachDiagramExpand,
  isExpandableKind
} from '../renderer/src/editor/rich-markdown/diagram-expand'
import {
  captureVegaLog,
  createVegaLiteAdapter,
  themedVegaLiteSpec,
  validateVegaLiteSource,
  type VegaLiteRuntime,
  type VegaLogger,
  type VegaView
} from '../renderer/src/editor/rich-markdown/adapters/vega-lite-core'
import {
  createCodeAdapter,
  type CodeHighlighterRuntime
} from '../renderer/src/editor/rich-markdown/adapters/code-core'
import {
  SHIKI_LANGUAGE_IDS,
  shikiLanguageForFence
} from '../renderer/src/editor/rich-markdown/adapters/code'
import { safeSvgNode } from '../renderer/src/editor/rich-markdown/adapters/safe-svg'
import {
  analyzeCodeSource,
  CODE_FEEDBACK_CAPABILITIES,
  codeDiagnosticsForMarkdownState,
  mapFenceDiagnostic
} from '../renderer/src/editor/rich-markdown/code-diagnostics'
import {
  codeLanguageForFence,
  codeMirrorFenceLanguage
} from '../renderer/src/editor/rich-markdown/code-languages'
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

function codeRequest(
  source = 'const answer: number = 42\n',
  overrides: Partial<RichRenderRequest> = {}
): RichRenderRequest {
  return {
    id: 'rich-test-code-0-c3',
    kind: 'code',
    source,
    info: 'typescript',
    theme: { name: 'system', scheme: 'light' },
    limits: DEFAULT_RICH_LIMITS,
    signal: new AbortController().signal,
    ...overrides
  }
}

function fakeCodeRuntime(): {
  runtime: CodeHighlighterRuntime
  highlight: ReturnType<typeof vi.fn>
  dispose: ReturnType<typeof vi.fn>
} {
  const highlight = vi.fn(async (source: string) => ({
    tokens: [
      [
        {
          content: source,
          offset: 0,
          color: '#cf222e',
          fontStyle: 2
        }
      ]
    ]
  }))
  const dispose = vi.fn()
  return { runtime: { highlight, dispose }, highlight, dispose }
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

  /**
   * CP-RENDER-REPAIRS S01. The delimiters no longer have to own their line.
   * The fixture is the owner's REAL note (vault-juju, 2026-08-17) — the shape
   * that rendered as raw text in front of them, not an invented one.
   */
  it('opens a display block on `$$` followed by content, LaTeX style', () => {
    const source = [
      '$$\\begin{aligned}',
      'a &= b \\\\',
      'c &= d',
      '\\end{aligned}$$'
    ].join('\n')
    const spans = discoverDollarMath(source).filter((span) => span.display)
    expect(spans).toHaveLength(1)
    expect(spans[0]!.from).toBe(0)
    expect(spans[0]!.to).toBe(source.length)
    expect(spans[0]!.source).toBe(
      '\\begin{aligned}\na &= b \\\\\nc &= d\n\\end{aligned}'
    )
  })

  it('still reads the delimiters-alone form, and reads it identically', () => {
    const inline = discoverDollarMath('$$\\begin{x}\nbody\n\\end{x}$$')
    const alone = discoverDollarMath('$$\n\\begin{x}\nbody\n\\end{x}\n$$')
    expect(alone[0]!.source).toBe(inline[0]!.source)
  })

  it('keeps prose inert: an opener must START its line and must close', () => {
    // `$$` mid-sentence is what the line-start rule protects, and it is the
    // only thing standing between this relaxation and a false positive.
    expect(discoverDollarMath('costs $$5 today\nand $$7 tomorrow\n')).toEqual(
      []
    )
    expect(discoverDollarMath('$$\\begin{aligned}\nnever closed\n')).toEqual([])
  })

  it('accepts an indented block inside a list item', () => {
    // The owner's note had it two spaces deep under a bullet.
    const source = '* **System (2.3):**\n  $$\\begin{aligned}\n  x &= 1\n  \\end{aligned}$$\n'
    const spans = discoverDollarMath(source).filter((span) => span.display)
    expect(spans).toHaveLength(1)
    expect(spans[0]!.source).toContain('\\begin{aligned}')
    expect(spans[0]!.source).toContain('\\end{aligned}')
  })
})

/**
 * CP-RENDER-REPAIRS S04 — room to look at a diagram.
 */
describe('diagram expand control', () => {
  const svgFixture =
    '<svg xmlns="http://www.w3.org/2000/svg"><rect id="node" /></svg>'

  function mounted(): {
    document: Document
    element: HTMLElement
    output: HTMLElement
    host: HTMLElement
    expander: ReturnType<typeof attachDiagramExpand>
  } {
    const { document } = parseHTML(
      '<html><body><div id="block"><div data-rich-output><div data-rich-render-host></div></div></div></body></html>'
    )
    const element = document.querySelector('#block') as unknown as HTMLElement
    const output = document.querySelector(
      '[data-rich-output]'
    ) as unknown as HTMLElement
    const host = document.querySelector(
      '[data-rich-render-host]'
    ) as unknown as HTMLElement
    host.innerHTML = svgFixture
    const expander = attachDiagramExpand(
      document as unknown as Document,
      element,
      host,
      'mermaid'
    )
    return { document, element, output, host, expander }
  }

  it('only offers itself for diagrams', () => {
    expect(isExpandableKind('mermaid')).toBe(true)
    expect(isExpandableKind('vega-lite')).toBe(true)
    expect(isExpandableKind('math')).toBe(false)
    expect(isExpandableKind('code')).toBe(false)
  })

  it('MOVES the sanitized node into the overlay rather than copying it', () => {
    // A clone would put two elements carrying the same marker and clip-path
    // ids into one document, where url(#id) resolves to whichever comes
    // first. Moving the one node cannot collide with itself.
    const { document, host, expander } = mounted()
    const original = host.querySelector('svg')
    expander.button.dispatchEvent(new document.defaultView!.Event('click'))

    const dialog = document.querySelector('dialog.rich-diagram-overlay')
    expect(dialog).not.toBeNull()
    expect(document.querySelectorAll('svg')).toHaveLength(1)
    expect(dialog!.querySelector('svg')).toBe(original)
    expect(host.querySelector('svg')).toBeNull()
  })

  it('returns the node to where it was when the overlay closes', () => {
    const { document, host, expander } = mounted()
    const original = host.querySelector('svg')
    expander.button.dispatchEvent(new document.defaultView!.Event('click'))
    const dialog = document.querySelector(
      'dialog.rich-diagram-overlay'
    ) as unknown as HTMLDialogElement

    const close = dialog.querySelector('button') as unknown as HTMLElement
    close.dispatchEvent(new document.defaultView!.Event('click'))

    expect(host.querySelector('svg')).toBe(original)
    expect(document.querySelector('dialog.rich-diagram-overlay')).toBeNull()
    expect(document.querySelectorAll('svg')).toHaveLength(1)
  })

  it('mounts the control OUTSIDE the scrolling container', () => {
    // Inside it, the button would slide away with the diagram it belongs to.
    const { element, output, expander } = mounted()
    const tools = element.querySelector('.rich-diagram-tools')
    expect(tools).not.toBeNull()
    expect(output.contains(tools as unknown as Node)).toBe(false)
    expect(expander.button.getAttribute('aria-label')).toContain('mermaid')
  })

  it('disposing while expanded puts the diagram back and clears the control', () => {
    const { document, host, expander } = mounted()
    expander.button.dispatchEvent(new document.defaultView!.Event('click'))
    expander.dispose()
    expect(document.querySelector('dialog.rich-diagram-overlay')).toBeNull()
    expect(host.querySelector('svg')).not.toBeNull()
    expect(document.querySelector('.rich-diagram-tools')).toBeNull()
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

describe('rich code and diagnostic decorations (CP-RICH-MARKDOWN S06)', () => {
  it('resolves CodeMirror languages exactly across names, aliases, and extensions', () => {
    expect(codeLanguageForFence('JavaScript title=demo')?.name).toBe(
      'JavaScript'
    )
    expect(codeLanguageForFence('TS')?.name).toBe('TypeScript')
    expect(codeLanguageForFence('py')?.name).toBe('Python')
    expect(codeLanguageForFence('rs')?.name).toBe('Rust')
    expect(codeLanguageForFence('yml')?.name).toBe('YAML')
    expect(codeLanguageForFence('SQL')?.name).toBe('SQL')
    expect(codeMirrorFenceLanguage('cpp')?.name).toBe('C++')
    expect(codeLanguageForFence('script')).toBeNull()
    expect(codeLanguageForFence('typscript')).toBeNull()
    expect(codeLanguageForFence('')).toBeNull()
  })

  it('pins the reviewed Shiki language surface and leaves unknown DSLs plain', () => {
    expect(shikiLanguageForFence('js title=demo')).toEqual({
      id: 'javascript',
      label: 'JavaScript'
    })
    expect(shikiLanguageForFence('TS')).toEqual({
      id: 'typescript',
      label: 'TypeScript'
    })
    expect(shikiLanguageForFence('py')).toMatchObject({ id: 'python' })
    expect(shikiLanguageForFence('sh')).toMatchObject({ id: 'bash' })
    expect(shikiLanguageForFence('c++')).toMatchObject({ id: 'cpp' })
    expect(shikiLanguageForFence('cs')).toMatchObject({ id: 'csharp' })
    expect(shikiLanguageForFence('yml')).toMatchObject({ id: 'yaml' })
    expect(shikiLanguageForFence('gql')).toMatchObject({ id: 'graphql' })
    expect(shikiLanguageForFence('docker')).toMatchObject({ id: 'dockerfile' })
    expect(shikiLanguageForFence('patch')).toMatchObject({ id: 'diff' })
    expect(shikiLanguageForFence('graphviz')).toBeNull()
    expect(shikiLanguageForFence('script')).toBeNull()
    expect(new Set(SHIKI_LANGUAGE_IDS).size).toBe(SHIKI_LANGUAGE_IDS.length)
    expect(SHIKI_LANGUAGE_IDS).toEqual(
      expect.arrayContaining([
        'javascript',
        'typescript',
        'tsx',
        'html',
        'css',
        'json',
        'yaml',
        'markdown',
        'bash',
        'python',
        'sql',
        'graphql',
        'dockerfile',
        'cpp',
        'csharp',
        'java',
        'go',
        'rust',
        'ruby',
        'php',
        'swift',
        'diff',
        'vue',
        'svelte'
      ])
    )
  })

  it('hydrates an ordinary fence with real fine-grained Shiki output safely', async () => {
    const authored = 'const literal = "<img src=x onerror=alert(1)>"\n'
    const root = domFor(`\`\`\`typescript\n${authored}\`\`\``)
    const hydration = hydrateRichMarkdown(root)
    await hydration.ready

    const block = root.querySelector<HTMLElement>('[data-rich-block]')!
    const frame = root.querySelector<HTMLElement>('.rich-code-frame')!
    expect(block.dataset['richState']).toBe('ready')
    expect(frame).not.toBeNull()
    expect(frame.getAttribute('aria-label')).toBe('TypeScript code block')
    expect(frame.querySelector('.rich-code-language')?.textContent).toBe(
      'TypeScript'
    )
    expect(frame.querySelector('.rich-code-token')).not.toBeNull()
    expect(
      frame.querySelector('.rich-code-pre--source code')?.textContent
    ).toBe(authored)
    expect(frame.querySelector('img, script')).toBeNull()
    expect(frame.innerHTML).not.toContain('<img src=x')

    hydration.dispose()
    expect(block.querySelector<HTMLElement>('[data-rich-source]')!.hidden).toBe(
      false
    )
    expect(block.querySelector('[data-rich-output]')!.textContent).toBe('')
  })

  it('offers keyboard-native copy, source, wrap, and expand controls', async () => {
    const fixture = fakeCodeRuntime()
    const writeText = vi.fn(async (_document: Document, _text: string) => {})
    const adapter = createCodeAdapter({
      languageFor: shikiLanguageForFence,
      loadRuntime: async () => fixture.runtime,
      writeText
    })
    const host = emptyHost()
    const request = codeRequest('const answer: number = 42\n', {
      theme: { name: 'moss', scheme: 'dark' }
    })
    const rendered = await adapter.render(host, request)
    const frame = host.querySelector<HTMLElement>('.rich-code-frame')!
    const buttons = Array.from(
      frame.querySelectorAll<HTMLButtonElement>('button')
    )
    const button = (label: string): HTMLButtonElement =>
      buttons.find((candidate) => candidate.textContent === label)!
    const click = (target: HTMLButtonElement): void => {
      const ViewEvent = target.ownerDocument.defaultView!.Event
      target.dispatchEvent(new ViewEvent('click', { bubbles: true }))
    }

    expect(buttons.map((candidate) => candidate.textContent)).toEqual([
      'Copy',
      'Source',
      'Wrap',
      'Expand'
    ])
    expect(fixture.highlight).toHaveBeenCalledWith(
      request.source,
      'typescript',
      'dark'
    )
    expect(
      buttons.every(
        (candidate) =>
          candidate.type === 'button' &&
          candidate.title.length > 0 &&
          Boolean(candidate.getAttribute('aria-label')) &&
          candidate.hasAttribute('data-rich-interactive')
      )
    ).toBe(true)

    click(button('Copy'))
    await Promise.resolve()
    expect(writeText).toHaveBeenCalledWith(host.ownerDocument, request.source)
    expect(frame.querySelector('.rich-code-copy-status')?.textContent).toBe(
      'Copied'
    )

    click(button('Wrap'))
    expect(frame.dataset['codeWrap']).toBe('on')
    expect(button('Unwrap').getAttribute('aria-pressed')).toBe('true')
    expect(button('Unwrap').getAttribute('aria-label')).toBe(
      'Keep code on one line'
    )
    click(button('Expand'))
    expect(frame.dataset['codeExpanded']).toBe('true')
    expect(button('Collapse').getAttribute('aria-pressed')).toBe('true')

    const highlighted = frame.querySelector<HTMLElement>(
      '.rich-code-pre--highlighted'
    )!
    const plain = frame.querySelector<HTMLElement>('.rich-code-pre--source')!
    expect(highlighted.hidden).toBe(false)
    expect(plain.hidden).toBe(true)
    click(button('Source'))
    expect(highlighted.hidden).toBe(true)
    expect(plain.hidden).toBe(false)
    expect(button('Highlight').getAttribute('aria-pressed')).toBe('true')
    expect(button('Highlight').getAttribute('aria-label')).toBe(
      'Show syntax highlighting'
    )

    rendered.dispose()
    expect(host.querySelector('.rich-code-frame')).toBeNull()
    adapter.dispose?.()
    expect(fixture.dispose).toHaveBeenCalledTimes(1)
  })

  it('keeps unknown and over-budget code plain without loading Shiki', async () => {
    const fixture = fakeCodeRuntime()
    const loadRuntime = vi.fn(async () => fixture.runtime)
    const adapter = createCodeAdapter({
      languageFor: shikiLanguageForFence,
      loadRuntime
    })

    const unknownHost = emptyHost()
    const unknown = await adapter.render(
      unknownHost,
      codeRequest('digraph { a -> b }\n', { info: 'graphviz' })
    )
    expect(loadRuntime).not.toHaveBeenCalled()
    expect(unknownHost.querySelector('.rich-code-token')).toBeNull()
    expect(
      unknownHost.querySelector('.rich-code-pre--source code')?.textContent
    ).toBe('digraph { a -> b }\n')
    expect(unknown.diagnostics).toEqual([])

    const limitedHost = emptyHost()
    const limited = await adapter.render(
      limitedHost,
      codeRequest('const one = 1\nconst two = 2', {
        limits: {
          ...DEFAULT_RICH_LIMITS,
          code: { ...DEFAULT_RICH_LIMITS.code, maxLines: 1 }
        }
      })
    )
    expect(loadRuntime).not.toHaveBeenCalled()
    expect(limitedHost.querySelector('.rich-code-token')).toBeNull()
    expect(limited.diagnostics).toEqual([
      expect.objectContaining({
        severity: 'info',
        code: 'highlight-limit'
      })
    ])
    expect(
      limitedHost.querySelector('.rich-code-diagnostics summary')?.textContent
    ).toBe('1 diagnostic')
    unknown.dispose()
    limited.dispose()
  })

  it('falls back to escaped source with a visible diagnostic when Shiki fails', async () => {
    const adapter = createCodeAdapter({
      languageFor: shikiLanguageForFence,
      loadRuntime: async () => {
        throw new Error('highlighter unavailable')
      }
    })
    const host = emptyHost()
    const rendered = await adapter.render(host, codeRequest())
    expect(host.querySelector('.rich-code-token')).toBeNull()
    expect(
      host.querySelector('.rich-code-pre--source code')?.textContent
    ).toBe('const answer: number = 42\n')
    expect(rendered.diagnostics).toEqual([
      expect.objectContaining({
        severity: 'warning',
        code: 'highlight-unavailable'
      })
    ])
    expect(
      host.querySelector('.rich-code-diagnostics summary')?.textContent
    ).toBe('1 diagnostic')
    rendered.dispose()
  })

  it('emits bounded parser ranges and maps only decorations into note offsets', async () => {
    const invalidJson = await analyzeCodeSource('{"answer": }', 'json')
    const invalidJavaScript = await analyzeCodeSource('const = 1', 'javascript')
    expect(invalidJson).toEqual([
      expect.objectContaining({
        from: expect.any(Number),
        to: expect.any(Number),
        severity: 'error',
        source: 'JSON parser',
        code: 'syntax-error'
      })
    ])
    expect(invalidJavaScript).toEqual([
      expect.objectContaining({
        severity: 'error',
        source: 'JavaScript parser',
        code: 'syntax-error'
      })
    ])
    expect(invalidJson[0]!.to).toBeGreaterThan(invalidJson[0]!.from)
    expect(invalidJson[0]).not.toHaveProperty('actions')
    expect(await analyzeCodeSource('{"answer": 42}', 'json')).toEqual([])
    expect(await analyzeCodeSource('anything', 'graphviz')).toEqual([])

    expect(mapFenceDiagnostic(invalidJson[0]!, 20, 12, 40)).toEqual({
      ...invalidJson[0],
      from: 20 + invalidJson[0]!.from,
      to: 20 + invalidJson[0]!.to
    })
  })

  it('maps fence-relative parser errors to document decorations and skips DSLs', async () => {
    const doc = [
      '# Before',
      '',
      '```json',
      '{"answer": }',
      '```',
      '',
      '```mermaid',
      'not valid JavaScript',
      '```'
    ].join('\n')
    const state = EditorState.create({
      doc,
      extensions: [
        markdown({
          base: markdownLanguage,
          codeLanguages: codeMirrorFenceLanguage
        })
      ]
    })
    ensureSyntaxTree(state, state.doc.length, 5_000)
    const diagnostics = await codeDiagnosticsForMarkdownState(state)
    const sourceFrom = doc.indexOf('{"answer": }')
    expect(diagnostics).toEqual([
      expect.objectContaining({
        from: sourceFrom + 11,
        to: sourceFrom + 12,
        severity: 'error',
        source: 'JSON parser',
        code: 'syntax-error'
      })
    ])
    expect(
      diagnostics.every(
        (diagnostic) =>
          diagnostic.from >= sourceFrom &&
          diagnostic.to <= sourceFrom + '{"answer": }'.length &&
          !('actions' in diagnostic)
      )
    ).toBe(true)

    const valid = EditorState.create({
      doc: '```json\n{"answer": 42}\n```',
      extensions: [markdown({ base: markdownLanguage })]
    })
    ensureSyntaxTree(valid, valid.doc.length, 5_000)
    expect(await codeDiagnosticsForMarkdownState(valid)).toEqual([])
  })

  it('bounds analyzable fences and reports the first omitted block', async () => {
    const blocks = Array.from(
      { length: 65 },
      (_, index) => `\`\`\`json\n{"index": ${index}}\n\`\`\``
    )
    const doc = blocks.join('\n\n')
    const state = EditorState.create({
      doc,
      extensions: [markdown({ base: markdownLanguage })]
    })
    ensureSyntaxTree(state, state.doc.length, 5_000)
    const diagnostics = await codeDiagnosticsForMarkdownState(state)
    expect(diagnostics).toEqual([
      expect.objectContaining({
        from: doc.lastIndexOf('{"index": 64}'),
        severity: 'info',
        source: 'Atomik code diagnostics',
        code: 'diagnostic-limit',
        message: 'Diagnostics limited to the first 64 code blocks.'
      })
    ])
  })

  it('pins feedback to passive diagnostics with no LSP-shaped capability', () => {
    expect(CODE_FEEDBACK_CAPABILITIES.diagnostics).toBe(true)
    expect(
      Object.entries(CODE_FEEDBACK_CAPABILITIES)
        .filter(([capability]) => capability !== 'diagnostics')
        .every(([, enabled]) => enabled === false)
    ).toBe(true)
    expect(CODE_FEEDBACK_CAPABILITIES).toMatchObject({
      diagnosticActions: false,
      serverDiscovery: false,
      processSpawn: false,
      protocolTransport: false,
      virtualDocuments: false,
      virtualWorkspace: false,
      completion: false,
      signatureHelp: false,
      protocolHover: false,
      definition: false,
      references: false,
      documentSymbols: false,
      rename: false,
      formatting: false,
      codeActions: false,
      semanticTokens: false,
      inlayHints: false,
      callHierarchy: false,
      typeHierarchy: false,
      workspaceEdits: false,
      workspaceSymbols: false,
      workspaceIndexing: false
    })
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

  // linkedom ships no `getComputedStyle` at all, so a bare host exercises
  // neither the old token path nor the new probe — both just take the pinned
  // fallback. These two tests install the engine surface the adapter actually
  // talks to, which is the only way the defect below is expressible here.
  // linkedom hands every parsed document the SAME defaultView, so a stub must
  // be undone or it leaks into every later test in the file.
  function withEngine<T>(
    host: HTMLElement,
    engine: {
      tokens?: Record<string, string>
      resolve?: (expression: string) => string
    },
    run: () => T
  ): T {
    const view = host.ownerDocument.defaultView as unknown as {
      getComputedStyle?: (element: HTMLElement) => unknown
    }
    const original = view.getComputedStyle
    view.getComputedStyle = (element: HTMLElement) => ({
      getPropertyValue: (name: string) => engine.tokens?.[name] ?? '',
      color: engine.resolve
        ? engine.resolve(element.style.color)
        : element.style.color
    })
    try {
      return run()
    } finally {
      view.getComputedStyle = original
    }
  }

  const CSS_LEVEL_TOKENS: Record<string, string> = {
    '--surface': 'light-dark(#fbfbf9, #1e1e23)',
    '--fg': 'light-dark(#26261f, #e8e8e3)',
    '--accent': 'light-dark(#3d5a3d, #9ec49e)',
    '--border': 'light-dark(#e0e0d8, #33333a)',
    '--code-bg': 'light-dark(#f1f1ec, #26262c)'
  }

  it('never leaks CSS-level theme tokens into the Mermaid config', () => {
    // Owner bench, 2026-08-17: every themed diagram fell back to source with
    // `Unsupported color format: "light-dark(#fbfbf9, #1e1e23)"`. The design
    // system states all colors as `light-dark()` (36) and the derived accents
    // as `color-mix()` — forms only the engine resolves, never something
    // Mermaid's JS color parser can read. Reading them as custom properties
    // hands back that unresolved text, so nothing CSS-level may reach Mermaid.
    const host = emptyHost()
    const config = withEngine(host, { tokens: CSS_LEVEL_TOKENS }, () =>
      mermaidConfigFor(host, mermaidRequest('flowchart LR\nA --> B'))
    )
    const values = Object.values(
      config.themeVariables as Record<string, unknown>
    ).filter((value): value is string => typeof value === 'string')

    expect(values.length).toBeGreaterThan(0)
    for (const value of values) {
      expect(value).not.toMatch(/light-dark\(|color-mix\(|var\(/)
    }
    // The probe is an implementation detail and must never outlive the call.
    expect(host.querySelector('span[aria-hidden="true"]')).toBeNull()
  })

  it('uses the color the engine computed, not the authored expression', () => {
    const host = emptyHost()
    const config = withEngine(
      host,
      {
        tokens: CSS_LEVEL_TOKENS,
        // A real engine turns every accepted form — `var()`, `light-dark()`,
        // `color-mix()` — into a concrete color.
        resolve: () => 'rgb(30, 30, 35)'
      },
      () => mermaidConfigFor(host, mermaidRequest('flowchart LR\nA --> B'))
    )
    expect(config.themeVariables).toMatchObject({
      background: 'rgb(30, 30, 35)',
      primaryTextColor: 'rgb(30, 30, 35)',
      lineColor: 'rgb(30, 30, 35)'
    })
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

describe('read/live spacing parity (CP-RICH-MARKDOWN S07)', () => {
  const css = (): string =>
    readFileSync(new URL('../renderer/src/styles.css', import.meta.url), 'utf8')

  it('live rich blocks add no vertical padding the source does not contain', () => {
    // Owner bench, 2026-08-17: two fences with no blank line between them
    // TOUCH in read (`.md-tight`, S05o "read spacing IS the source") but
    // floated apart in live, because the live widget carried a fixed
    // padding-block. Blank lines are real lines in live and render their own
    // height, so any fixed padding here can only disagree with the source.
    const rule = /\.editor-host \.lp-rich-widget--display\s*\{([^}]*)\}/.exec(css())
    expect(rule).not.toBeNull()
    const padding = /padding-block:\s*([^;]+);/.exec(rule![1]!)
    expect(padding?.[1]?.trim()).toBe('0')
  })

  it('read mode still marks gapless blocks tight', () => {
    const html = noteMarkdown().render('```js\nconst a = 1\n```\n```js\nconst b = 2\n```\n')
    // The second fence has no blank line above it.
    expect(html).toContain('md-tight')
  })

  it('read mode leaves a single blank line at the default gap', () => {
    const html = noteMarkdown().render('```js\nconst a = 1\n```\n\n```js\nconst b = 2\n```\n')
    expect(html).not.toContain('md-tight')
  })
})

describe('clipboard (CP-RICH-MARKDOWN S07)', () => {
  // linkedom's `navigator` is immutable and rebuilt on every access, so the
  // clipboard cannot be stubbed through a real linkedom document. This stubs
  // exactly the surface `copyText` uses and lets the real document do the DOM.
  function docWith(clipboard: unknown, execCommand?: () => boolean): Document {
    const { document } = parseHTML('<html><body></body></html>')
    return {
      defaultView: { navigator: { clipboard } },
      createElement: (tag: string) => document.createElement(tag),
      get body() {
        return document.body
      },
      documentElement: document.documentElement,
      execCommand,
      querySelector: (selector: string) => document.querySelector(selector)
    } as unknown as Document
  }

  it('falls back to execCommand when the async API REJECTS', async () => {
    // Owner bench, 2026-08-17: "copy failed" on every code block. The async
    // clipboard exists in this Electron renderer and rejects (permission), and
    // the code frame's own copy fell back only when it was ABSENT. Rejection
    // is the case that actually happens.
    const writeText = vi.fn(async () => {
      throw new Error('NotAllowedError')
    })
    const copy = vi.fn(() => true)
    const doc = docWith({ writeText }, copy)

    await expect(copyText('const a = 1', doc)).resolves.toBe(true)
    expect(writeText).toHaveBeenCalledWith('const a = 1')
    expect(copy).toHaveBeenCalledWith('copy')
    // The scratch textarea never outlives the copy.
    expect(doc.querySelector('textarea')).toBeNull()
  })

  it('reports failure when neither path lands the text', async () => {
    const doc = docWith(
      {
        writeText: async () => {
          throw new Error('NotAllowedError')
        }
      },
      () => false
    )
    await expect(copyText('x', doc)).resolves.toBe(false)
  })

  it('uses the async API when it works', async () => {
    const writeText = vi.fn(async () => undefined)
    const copy = vi.fn(() => true)
    await expect(copyText('x', docWith({ writeText }, copy))).resolves.toBe(true)
    expect(copy).not.toHaveBeenCalled()
  })
})

describe('CSS color resolution (CP-RICH-MARKDOWN S07)', () => {
  it('narrows resolved engine colors to the hex Vega mixes with', () => {
    expect(toHexColor('rgb(30, 30, 35)', '#000000')).toBe('#1e1e23')
    expect(toHexColor('rgb(30 30 35)', '#000000')).toBe('#1e1e23')
    expect(toHexColor('rgba(30, 30, 35, 0.5)', '#000000')).toBe('#1e1e23')
    expect(toHexColor('rgb(30 30 35 / 50%)', '#000000')).toBe('#1e1e23')
    expect(toHexColor('#ABC', '#000000')).toBe('#aabbcc')
    expect(toHexColor('#1E1E23', '#000000')).toBe('#1e1e23')
    // Anything the engine could not resolve keeps the pinned fallback rather
    // than reaching a library that cannot read it.
    expect(toHexColor('light-dark(#fbfbf9, #1e1e23)', '#111111')).toBe('#111111')
    expect(toHexColor('color-mix(in srgb, red 50%, blue)', '#111111')).toBe('#111111')
    expect(toHexColor('', '#111111')).toBe('#111111')
  })

  it('charts follow the resolved theme instead of the pinned default', () => {
    // Owner bench, 2026-08-17: the palette accepted a token only when it was
    // already plain hex, so `light-dark()` tokens never matched and every
    // chart drew in defaults regardless of theme.
    const host = emptyHost()
    const view = host.ownerDocument.defaultView as unknown as {
      getComputedStyle?: (element: HTMLElement) => unknown
    }
    const original = view.getComputedStyle
    view.getComputedStyle = () => ({
      getPropertyValue: () => 'light-dark(#fbfbf9, #1e1e23)',
      color: 'rgb(18, 52, 86)'
    })
    try {
      const themed = themedVegaLiteSpec(
        host,
        { mark: 'bar' },
        { name: 'ember', scheme: 'dark' }
      )
      const config = themed['config'] as Record<string, unknown>
      expect(JSON.stringify(config)).toContain('#123456')
    } finally {
      view.getComputedStyle = original
    }
  })
})

describe('theme scheme (CP-RICH-MARKDOWN S07)', () => {
  it('dark-themes-match-stylesheet: the mirrored set equals the CSS truth', () => {
    // Owner bench, 2026-08-17: code rendered dark-on-dark in `ember` and
    // `hearth`. Dark-ness had three definitions — an allowlist of three here,
    // `appTheme === 'dark'` in EditorPane, and five `color-scheme: dark`
    // blocks in the stylesheet. The stylesheet is the truth; this pins the one
    // remaining mirror to it so adding a theme cannot silently break code
    // colors again.
    const css = readFileSync(
      new URL('../renderer/src/styles.css', import.meta.url),
      'utf8'
    )
    const declared = new Set<string>()
    const block = /:root\[data-theme='([^']+)'\]\s*\{([^}]*)\}/g
    for (const [, name, body] of css.matchAll(block)) {
      if (/color-scheme:\s*dark\s*;/.test(body!)) declared.add(name!)
    }

    expect(declared.size).toBeGreaterThan(0)
    expect([...DARK_THEME_NAMES].sort()).toEqual([...declared].sort())
  })

  it('prefers the engine color-scheme over the mirrored set', () => {
    const { document } = parseHTML(
      "<html data-theme='brand-new-dark'><body></body></html>"
    )
    const view = document.defaultView as unknown as {
      getComputedStyle?: () => unknown
    }
    const original = view.getComputedStyle
    // A theme the set has never heard of, forcing dark in CSS.
    view.getComputedStyle = () => ({ colorScheme: 'dark' })
    try {
      expect(richThemeFor(document as unknown as Document)).toEqual({
        name: 'brand-new-dark',
        scheme: 'dark'
      })
    } finally {
      view.getComputedStyle = original
    }
  })

  it('falls back to the mirrored set when no engine can be asked', () => {
    for (const name of DARK_THEME_NAMES) {
      const { document } = parseHTML(
        `<html data-theme='${name}'><body></body></html>`
      )
      expect(richThemeFor(document as unknown as Document).scheme).toBe('dark')
    }
    const { document } = parseHTML("<html data-theme='green'><body></body></html>")
    expect(richThemeFor(document as unknown as Document).scheme).toBe('light')
  })
})

describe('Vega-Lite adapter (CP-RICH-MARKDOWN S05)', () => {
  it('runs Vega inside the renderer CSP: AST parse plus interpreter', async () => {
    // Owner bench, 2026-08-17: every chart fell back to source with
    // "Evaluating a string as JavaScript violates ... 'unsafe-eval'". Vega's
    // default path compiles expressions through `Function(...)`, which the
    // renderer's `script-src 'self'` refuses (13) and which must NOT be
    // relaxed. Parsing to an AST and evaluating it with the official
    // interpreter is how a chart runs inside the policy instead of around it.
    // The fixtures below stand in for the real packages because a CSP is a
    // browser-level guarantee that neither linkedom nor Vitest enforces — the
    // wiring is what regresses, so the wiring is what is pinned.
    vi.resetModules()
    const parse = vi.fn(() => ({ runtime: true }))
    const viewOptions: Record<string, unknown>[] = []
    const expressionInterpreter = (): void => undefined
    vi.doMock('vega-lite', () => ({ compile: () => ({ spec: {} }) }))
    vi.doMock('vega', () => ({
      parse,
      View: class {
        constructor(_runtime: unknown, options: Record<string, unknown>) {
          viewOptions.push(options)
        }
      }
    }))
    vi.doMock('vega-interpreter', () => ({ expressionInterpreter }))

    const { loadVegaLiteRuntime } = await import(
      '../renderer/src/editor/rich-markdown/adapters/vega-lite'
    )
    const runtime = await loadVegaLiteRuntime()
    const spec = { mark: 'bar' }
    runtime.parse(spec)
    expect(parse).toHaveBeenCalledWith(spec, {}, { ast: true })

    const denyLoader = {
      load: async () => '',
      sanitize: async () => ({ href: '' }),
      http: async () => '',
      file: async () => ''
    }
    runtime.createView({}, { renderer: 'svg', loader: denyLoader, hover: false })
    expect(viewOptions[0]).toMatchObject({ expr: expressionInterpreter })

    vi.doUnmock('vega')
    vi.doUnmock('vega-lite')
    vi.doUnmock('vega-interpreter')
    vi.resetModules()
  })

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

  /**
   * CP-RENDER-REPAIRS S02 — Vega diagnoses its own broken charts and the
   * adapter used to throw the diagnosis away.
   */
  it('carries what Vega said into the block diagnostics', async () => {
    const fixture = fakeVega()
    // Both halves report: Vega-Lite at compile, Vega at run.
    fixture.compile.mockImplementation(
      (spec: Record<string, unknown>, options?: { logger?: VegaLogger }) => {
        options?.logger?.warn("y-scale's \"zero\" is dropped as it does not work with log scale.")
        return { spec: { compiled: spec } }
      }
    )
    fixture.createView.mockImplementation(
      (_runtime: unknown, options: { logger?: VegaLogger }) => {
        options.logger?.warn('Log scale domain includes zero: [0,1800]')
        // Vega repeats per pulse; the reader needs it once.
        options.logger?.warn('Log scale domain includes zero: [0,1800]')
        return fixture.view
      }
    )
    const handle = await createVegaLiteAdapter(async () => fixture.runtime).render(
      emptyHost(),
      vegaRequest()
    )
    expect(handle.diagnostics).toHaveLength(1)
    expect(handle.diagnostics[0]).toMatchObject({
      severity: 'warning',
      source: 'vega-lite'
    })
    expect(handle.diagnostics[0]!.message).toContain('Log scale domain includes zero')
    expect(handle.diagnostics[0]!.message).toContain('is dropped')
    // Deduplicated, not repeated once per pulse.
    expect(
      handle.diagnostics[0]!.message.match(/Log scale domain/g)
    ).toHaveLength(1)
    handle.dispose()
  })

  it('captures a Vega log sink without needing Vega', () => {
    // The sink is built in the pure half of the adapter precisely so this
    // needs no chart runtime. `level` doubles as getter and setter and
    // returns the logger when it sets, the way Vega's own factory behaves.
    const log = captureVegaLog()
    log.logger.warn('a', 1)
    log.logger.error('b')
    log.logger.warn('a', 1)
    log.logger.info('ignored')
    log.logger.debug('ignored')
    expect(log.messages).toEqual(['a 1', 'b'])
    expect(log.logger.level(2)).toBe(log.logger)
    expect(log.logger.level()).toBe(2)
  })

  it('stays silent when Vega has nothing to say, and still renders', async () => {
    const fixture = fakeVega()
    const handle = await createVegaLiteAdapter(async () => fixture.runtime).render(
      emptyHost(),
      vegaRequest()
    )
    // A warning is not a refusal: the chart mounts either way.
    expect(handle.diagnostics).toEqual([])
    handle.dispose()
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
