import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { PART_DESCRIPTIONS, toolRequestParts } from '../renderer/src/editor/request-breakdown'

const view = readFileSync(
  new URL('../renderer/src/workspace/ChatView.tsx', import.meta.url),
  'utf8'
)
const css = readFileSync(
  new URL('../renderer/src/styles.css', import.meta.url),
  'utf8'
)

const execution = (over: Record<string, unknown> = {}) => ({
  call: {
    id: 'call_1',
    name: 'search_wiki',
    arguments: { query: 'réforme des retraites', corpus: 'auto', language: 'fr' }
  },
  result: {
    ok: true,
    stats: { resultCount: 3, chars: 10012, bytes: 10236, wallMs: 5066 },
    ...over
  }
})

describe('the tool leg of the request (CP-MVP-011 S07k)', () => {
  it('accounts for what a tool sent BACK to the model', () => {
    // Owner bench 2026-08-18: the breakdown pills described the pre-pass
    // packet only, so an answer that read three corpora looked like it had
    // sent nothing but the packet.
    const parts = toolRequestParts([execution() as never])
    expect(parts).toEqual([
      {
        kind: 'tool',
        label: 'search_wiki · auto · 3 results',
        chars: 10012,
        tokensEst: 2503
      }
    ])
  })

  it('says so when a call failed instead of counting phantom results', () => {
    const parts = toolRequestParts([
      execution({ ok: false, stats: { resultCount: 0, chars: 0, bytes: 0, wallMs: 12 } }) as never
    ])
    expect(parts[0]!.label).toBe('search_wiki · failed')
    expect(parts[0]!.tokensEst).toBe(0)
  })

  it('names a vault call by its own verb', () => {
    const parts = toolRequestParts([
      {
        call: { id: 'c', name: 'search_vault', arguments: { query: 'x' } },
        result: { ok: true, stats: { resultCount: 2, chars: 400, bytes: 400, wallMs: 9 } }
      } as never
    ])
    expect(parts[0]!.label).toBe('search_vault · 2 results')
  })

  it('explains itself in the hover copy every other pill has', () => {
    expect(PART_DESCRIPTIONS.tool).toContain('DURING the answer')
    expect(PART_DESCRIPTIONS.tool).toContain('click the pill')
  })
})

describe('the inspector opens the calls (CP-MVP-011 S07k)', () => {
  it('adds the tool parts to the SAME breakdown the header totals', () => {
    expect(view).toContain('toolRequestParts(result.toolExecutions ?? [])')
    expect(view).toContain('parts: finalParts')
    // and they persist with the turn, like every other figure
    expect(view).toContain('finalParts ? serializeSentMeta(finalParts) : undefined')
  })

  it('opens the calls from the pill, like the vault packet', () => {
    expect(view).toContain('aria-expanded={openToolsTurn === index}')
    expect(view).toContain('className="chat-tool-calls"')
    expect(view).toContain('chat-tool-call-query')
    expect(css).toContain('.chat-request-pill.kind-tool')
  })

  it('attaches the calls to the QUESTION that provoked them', () => {
    // The consulted material belongs to the answer; the calls belong to the
    // request breakdown, because their results were sent back as input.
    expect(view).toContain(
      'toolCallsByTurn.current.set(priorTurns.length, result.toolExecutions)'
    )
  })
})
