import { parseHTML } from 'linkedom'
import { describe, expect, it, vi } from 'vitest'
import { noteMarkdown } from '../renderer/src/editor/note-markdown'
import {
  DEFAULT_RICH_LIMITS,
  type RichRenderHandle,
  type RichRendererAdapter
} from '../renderer/src/editor/rich-markdown/contracts'
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
