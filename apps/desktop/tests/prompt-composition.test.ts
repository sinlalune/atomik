import { describe, expect, it } from 'vitest'
import {
  BUILTIN_BLOCK_DEFAULTS,
  DEFAULT_CHAT_SYSTEM_PLAN,
  DEFAULT_SYSTEM_PLAN,
  NOTE_CONVENTIONS,
  RENDERING_CAPABILITIES,
  composeSystemFromPlan
} from '../shared/prompt-composition'
import { parseHTML } from 'linkedom'
import { DEFAULT_RICH_LIMITS } from '../renderer/src/editor/rich-markdown/contracts'
import { safeSvgNode } from '../renderer/src/editor/rich-markdown/adapters/safe-svg'
import {
  discoverDollarMath,
  richKindForFence
} from '../renderer/src/editor/rich-markdown/syntax'

/**
 * CP-AI-CAPABILITIES S01 — the drift tests the CP-RICH-MARKDOWN coherence
 * audit asked for.
 *
 * The renderer limits now exist in THREE places: `DEFAULT_RICH_LIMITS`,
 * ADR-014 §6, and this prompt block — and the third is read by a model that
 * believes it. A wrong number here fails no build on its own; it quietly
 * teaches the model to write blocks the app refuses, which the reader sees as
 * a visible error. So the block is pinned to the source of truth, not to prose.
 */
describe('rendering-capabilities block (CP-AI-CAPABILITIES S01)', () => {
  const block = BUILTIN_BLOCK_DEFAULTS['rendering-capabilities']

  it('names every fence identifier the renderer actually accepts', () => {
    // The identifiers `richKindForFence` resolves. If a renderer gains an
    // alias, this fails until the model is told about it.
    const accepted = [
      'math',
      'latex',
      'tex',
      'katex',
      'mermaid',
      'vega-lite',
      'vegalite',
      'vl'
    ]
    for (const identifier of accepted) {
      expect(richKindForFence(identifier)).not.toBeNull()
      expect(block).toContain(`\`${identifier}\``)
    }
  })

  it('claims no fence the renderer would refuse', () => {
    // Anything in backticks that LOOKS like a fence id must really be one.
    // `$inline$`, `$$display$$` and prose in backticks are not fence ids.
    const quoted = [...block.matchAll(/`([a-z][a-z0-9-]*)`/g)].map((m) => m[1]!)
    const notFences = new Set([
      'data.values',
      'url',
      'click',
      'init',
      'vega-lite',
      'vegalite',
      'vl',
      'math',
      'latex',
      'tex',
      'katex',
      'mermaid'
    ])
    for (const candidate of quoted) {
      if (notFences.has(candidate)) continue
      // Everything else must either be a real fence id or plainly not one.
      if (richKindForFence(candidate)) continue
      expect(['data', 'json']).not.toContain(candidate)
    }
  })

  it('states the real limits, not remembered ones', () => {
    expect(block).toContain(String(DEFAULT_RICH_LIMITS.vegaLite.maxRows))
    expect(block).toContain(String(DEFAULT_RICH_LIMITS.mermaid.maxEdges))
  })

  it('tells the model what is REFUSED, not only what is possible', () => {
    // The half that stops a model writing a chart the reader never sees.
    expect(block).toContain('refused')
    expect(block).toContain('inline values only')
    expect(block).toContain('url')
  })
})

/**
 * CP-AI-CAPABILITIES S03 — the traps the owner bench found.
 *
 * Each of these renders NOTHING from source that looks valid, and the first
 * two were produced by the model itself on the bench. They are stated in the
 * prompt block, so they are pinned to the code that causes them: when a trap
 * is fixed, the test fails and the block must stop describing it. A prompt
 * that keeps warning about a fixed defect is drift in the other direction —
 * it costs tokens on every request to teach the model something untrue.
 */
describe('bench traps stay pinned to the code (CP-AI-CAPABILITIES S03)', () => {
  const block = BUILTIN_BLOCK_DEFAULTS['rendering-capabilities']

  it('no longer warns about multi-line $$ — the parser was repaired', () => {
    // CP-RENDER-REPAIRS S01 discharged this one. The pin FIRED when the
    // parser was fixed, and the answer was to delete the clause rather than
    // loosen the assertion (CP-AI-CAPABILITIES coherence audit). This test is
    // what remains of it: proof that the warning went away with the defect,
    // so the block never keeps teaching the model something untrue.
    const repaired = ['$$\\begin{aligned}', 'a &= b', '\\end{aligned}$$'].join('\n')
    expect(
      discoverDollarMath(repaired).filter((span) => span.display)
    ).toHaveLength(1)

    expect(block).not.toContain('ALONE on its own line')
    expect(block).not.toContain('renders as raw text')
    expect(block).toContain('Two traps')
  })

  it('math in a Mermaid label really does refuse the whole diagram', () => {
    // Mermaid 11 force-enables HTML labels when it sees `$$…$$`
    // (`if (hasKatex(textContent)) { useHtmlLabels = true }`) and emits the
    // label inside a foreignObject — which safeSvgNode refuses outright, so
    // the reader loses the diagram, not just the formula.
    const { document } = parseHTML('<html><body><main></main></body></html>')
    expect(() =>
      safeSvgNode(
        document as unknown as Document,
        '<svg xmlns="http://www.w3.org/2000/svg"><foreignObject><div>x</div></foreignObject></svg>',
        { requestId: 'trap', title: 't', description: 'd' }
      )
    ).toThrow(/foreignobject/i)

    expect(block).toContain('refuses the WHOLE diagram')
  })

  it('a bar mark on a log scale really does collapse to nothing', async () => {
    // Pinned against Vega-Lite's own compiler rather than against the memory
    // of a bench: a bar baseline is zero, zero is illegal on a log scale, and
    // the scale takes the marks and the tick labels down with it.
    const [vegaLite, vega] = await Promise.all([import('vega-lite'), import('vega')])
    const bars = async (scale: Record<string, unknown>): Promise<string[]> => {
      const spec = {
        data: { values: [{ k: 'a', v: 0.1 }, { k: 'b', v: 1800 }] },
        mark: 'bar',
        encoding: {
          x: { field: 'k', type: 'nominal' },
          y: { field: 'v', type: 'quantitative', scale }
        }
      }
      const compiled = vegaLite.compile(spec as never)
      const view = new vega.View(vega.parse(compiled.spec, {}, { ast: true }), {
        renderer: 'none'
      })
      await view.runAsync()
      const svg = await view.toSVG()
      return [...svg.matchAll(/aria-roledescription="bar"[^>]*\bd="([^"]+)"/g)].map(
        (match) => match[1]!
      )
    }

    // `v0` is a zero-height rect: the bar is emitted and draws nothing.
    const onLog = await bars({ type: 'log' })
    expect(onLog).toHaveLength(2)
    expect(onLog.every((path) => /h\d+(?:\.\d+)?v0h/.test(path))).toBe(true)

    // Linear is the escape the block names, and it draws real bars.
    const onLinear = await bars({})
    expect(onLinear.some((path) => /h\d+(?:\.\d+)?v(?!0h)\d/.test(path))).toBe(true)

    expect(block).toContain('log scale')
  })
})

describe('note-conventions block (CP-AI-CAPABILITIES S01)', () => {
  const block = BUILTIN_BLOCK_DEFAULTS['note-conventions']

  it('carries the ADR-011 typed-edge grammar', () => {
    expect(block).toContain('[[Note title]]')
    expect(block).toContain('{depends-on}')
    expect(block).toContain('{^label}')
  })

  it('is absent from CHAT: authoring an edge is a note act', () => {
    const chat = composeSystemFromPlan(DEFAULT_CHAT_SYSTEM_PLAN, 'append')
    expect(chat).not.toContain('{^label}')
    expect(chat).not.toContain('inventing keys is not your call')
    // …while the rendering block IS there — chat renders rich markdown too.
    expect(chat).toContain('Your markdown is RENDERED')
  })

  it('is present in NOTE generation', () => {
    for (const destination of ['append', 'replace-selection', 'new-note'] as const) {
      const system = composeSystemFromPlan(DEFAULT_SYSTEM_PLAN, destination)
      expect(system).toContain('{^label}')
      expect(system).toContain('Your markdown is RENDERED')
    }
  })
})

describe('capability block cost (CP-AI-CAPABILITIES S01)', () => {
  it('stays small enough to ride on every request', () => {
    // These blocks are sent EVERY time. The ceiling is a decision, not a
    // measurement: if a future edit needs more room, that is a conversation
    // about cost, not a number to quietly raise.
    const rendering = BUILTIN_BLOCK_DEFAULTS['rendering-capabilities'].length
    const conventions = BUILTIN_BLOCK_DEFAULTS['note-conventions'].length
    expect(rendering).toBeLessThan(1_450)
    expect(conventions).toBeLessThan(700)
    expect(RENDERING_CAPABILITIES.length).toBeGreaterThan(0)
    expect(NOTE_CONVENTIONS.length).toBeGreaterThan(0)
  })
})
