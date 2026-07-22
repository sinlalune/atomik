import { EditorState } from '@codemirror/state'
import { describe, expect, it } from 'vitest'
import {
  computeInlineAiDecorations,
  inlineAiField,
  setInlineAi,
  type InlineAiHandlers,
  type InlineAiState
} from '../renderer/src/editor/inline-ai'

/**
 * S05b: the inline preview is a StateField — the whole lifecycle is
 * computable from EditorState alone, headless. The buffer-untouched
 * invariant and the anchor mapping are the load-bearing properties.
 */

const handlers: InlineAiHandlers = {
  onAccept: () => undefined,
  onReject: () => undefined,
  onCancel: () => undefined
}

const DOC = 'Intro line.\nThe subject phrase sits here.\nOutro line.'

function stateOf(inline: InlineAiState | null): EditorState {
  let state = EditorState.create({ doc: DOC, extensions: [inlineAiField] })
  if (inline) {
    state = state.update({
      effects: setInlineAi.of({ state: inline, handlers })
    }).state
  }
  return state
}

const review = (overrides: Partial<InlineAiState> = {}): InlineAiState => ({
  phase: 'review',
  anchor: { from: 12, to: 41 },
  destination: 'replace-selection',
  proposal: 'A rewritten phrase.',
  claims: [],
  trace: null,
  selectedText: 'The subject phrase sits here.',
  bundleId: 'b1',
  version: 1,
  ...overrides
})

function decorationKinds(state: EditorState): Array<{ kind: string; from: number; to: number }> {
  const value = state.field(inlineAiField)
  if (!value) return []
  const set = computeInlineAiDecorations(value)
  const out: Array<{ kind: string; from: number; to: number }> = []
  const iter = set.iter()
  while (iter.value) {
    out.push({
      kind: (iter.value.spec as { inlineAi: string }).inlineAi,
      from: iter.from,
      to: iter.to
    })
    iter.next()
  }
  return out
}

describe('inline AI preview field (S05b)', () => {
  it('running: the widget sits after the anchor; the buffer is untouched', () => {
    const state = stateOf(review({ phase: 'running', proposal: '' }))
    expect(state.doc.toString()).toBe(DOC) // visual only
    const kinds = decorationKinds(state)
    expect(kinds).toEqual([
      { kind: 'target', from: 12, to: 41 },
      { kind: 'panel', from: 41, to: 41 }
    ])
  })

  it('append anchors at the end without a target highlight', () => {
    const state = stateOf(
      review({ destination: 'append', anchor: { from: DOC.length, to: DOC.length } })
    )
    expect(decorationKinds(state)).toEqual([
      { kind: 'panel', from: DOC.length, to: DOC.length }
    ])
  })

  it('the anchor maps through edits elsewhere — never stale offsets', () => {
    let state = stateOf(review())
    state = state.update({ changes: { from: 0, to: 0, insert: 'XX' } }).state
    const value = state.field(inlineAiField)!
    expect(value.state.anchor).toEqual({ from: 14, to: 43 })
    expect(decorationKinds(state)[0]).toEqual({ kind: 'target', from: 14, to: 43 })
  })

  it('reject/clear leaves zero trace in the buffer', () => {
    let state = stateOf(review())
    state = state.update({ effects: setInlineAi.of(null) }).state
    expect(state.field(inlineAiField)).toBeNull()
    expect(state.doc.toString()).toBe(DOC)
  })

  it('accept-path byte fidelity: the replace change carries the edited text exactly', () => {
    // what the accept handler dispatches, simulated at the state level
    const edited = 'A rewritten — and hand-edited — phrase.'
    let state = stateOf(review())
    const anchor = state.field(inlineAiField)!.state.anchor
    state = state.update({
      changes: { from: anchor.from, to: anchor.to, insert: edited }
    }).state
    expect(state.doc.toString()).toBe(
      `Intro line.\n${edited}\nOutro line.`
    )
  })
})
