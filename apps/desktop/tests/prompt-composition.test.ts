import { describe, expect, it } from 'vitest'
import {
  BUILTIN_BLOCK_DEFAULTS,
  DEFAULT_CHAT_SYSTEM_PLAN,
  DEFAULT_SYSTEM_PLAN,
  NOTE_CONVENTIONS,
  RENDERING_CAPABILITIES,
  composeSystemFromPlan
} from '../shared/prompt-composition'
import { DEFAULT_RICH_LIMITS } from '../renderer/src/editor/rich-markdown/contracts'
import { richKindForFence } from '../renderer/src/editor/rich-markdown/syntax'

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
    expect(rendering).toBeLessThan(1_400)
    expect(conventions).toBeLessThan(700)
    expect(RENDERING_CAPABILITIES.length).toBeGreaterThan(0)
    expect(NOTE_CONVENTIONS.length).toBeGreaterThan(0)
  })
})
