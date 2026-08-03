import { describe, expect, it } from 'vitest'
import {
  BUILTIN_BLOCK_DEFAULTS,
  composeSystemFromPlan,
  composeSystemPrompt,
  DEFAULT_SYSTEM_PLAN,
  systemTextOf
} from '../shared/prompt-composition'
import {
  defaultSystemPlan,
  isDefaultSystemPlan,
  moveSystemPlanEntry,
  parseSystemPlan,
  serializeSystemPlan,
  systemPlanEntryBody,
  wireSystemPlan,
  type SystemPlanEntry
} from '../renderer/src/editor/system-plan'
import type { PromptFile } from '../renderer/src/editor/prompts'

const prompt = (relPath: string, body: string, title = relPath): PromptFile => ({
  relPath,
  name: relPath,
  kind: 'system',
  title,
  body,
  scopeFolder: ''
})

describe('composeSystemFromPlan (S07b8 — the system message as an ordered plan)', () => {
  it('the DEFAULT plan composes byte-identically to the pre-plan template', () => {
    for (const destination of ['append', 'replace-selection', 'new-note'] as const) {
      expect(composeSystemFromPlan(DEFAULT_SYSTEM_PLAN, destination)).toBe(
        composeSystemPrompt(undefined, destination)
      )
    }
  })

  it('deleting a block removes exactly its section; order is honored', () => {
    const noGrounding = composeSystemFromPlan(
      [{ block: 'identity' }, { block: 'output' }, { block: 'closing-rule' }],
      'append'
    )
    expect(noGrounding).not.toContain('## Grounding')
    expect(noGrounding).toContain('# Role')
    expect(noGrounding).toContain('## Output')
    const reordered = composeSystemFromPlan(
      [{ block: 'grounding-rules' }, { block: 'identity' }],
      'append'
    )
    expect(reordered.indexOf('## Grounding')).toBeLessThan(
      reordered.indexOf('# Role')
    )
  })

  it('prompt bodies join as their own paragraphs; overrides still apply to blocks', () => {
    const composed = composeSystemFromPlan(
      [{ block: 'identity' }, { body: 'You answer in French.' }],
      'append',
      { identity: 'You are Juju.' }
    )
    expect(composed).toContain('You are Juju.')
    expect(composed).toContain('You answer in French.')
    expect(composed).not.toContain('AI assistant inside Atomik')
  })

  it('systemTextOf: a plan outranks the legacy stack path', () => {
    const withPlan = systemTextOf({
      systemPlan: [{ block: 'identity' }],
      systemPrompt: 'Stack identity.',
      target: { destination: { kind: 'append' } }
    })
    expect(withPlan).toContain(BUILTIN_BLOCK_DEFAULTS.identity)
    expect(withPlan).not.toContain('Stack identity.')
    const withoutPlan = systemTextOf({
      systemPrompt: 'Stack identity.',
      target: { destination: { kind: 'append' } }
    })
    expect(withoutPlan).toContain('Stack identity.')
  })
})

describe('system plan UI model (serialize / parse / wire)', () => {
  it('round-trips through the tab param; garbage reads as the default', () => {
    const plan: SystemPlanEntry[] = [
      { kind: 'builtin', id: 'output' },
      { kind: 'prompt', relPath: 'prompts/tone.md' },
      { kind: 'builtin', id: 'identity' }
    ]
    expect(parseSystemPlan(serializeSystemPlan(plan))).toEqual(plan)
    expect(parseSystemPlan(undefined)).toEqual(defaultSystemPlan())
    expect(parseSystemPlan('')).toEqual(defaultSystemPlan())
    expect(parseSystemPlan('not json')).toEqual(defaultSystemPlan())
    expect(parseSystemPlan('["x:weird"]')).toEqual(defaultSystemPlan())
    // unknown block ids drop rather than wedge
    expect(parseSystemPlan('["b:identity","b:bogus"]')).toEqual([
      { kind: 'builtin', id: 'identity' }
    ])
  })

  it('isDefaultSystemPlan spots the untouched plan only', () => {
    expect(isDefaultSystemPlan(defaultSystemPlan())).toBe(true)
    expect(isDefaultSystemPlan(defaultSystemPlan().slice(1))).toBe(false)
    expect(
      isDefaultSystemPlan(moveSystemPlanEntry(defaultSystemPlan(), 0, 1))
    ).toBe(false)
  })

  it('wireSystemPlan resolves prompt refs to bodies; stale refs drop silently', () => {
    const prompts = [prompt('prompts/tone.md', 'Be warm.', 'Tone')]
    expect(
      wireSystemPlan(
        [
          { kind: 'builtin', id: 'identity' },
          { kind: 'prompt', relPath: 'prompts/tone.md' },
          { kind: 'prompt', relPath: 'prompts/deleted.md' }
        ],
        prompts
      )
    ).toEqual([
      { block: 'identity' },
      { body: 'Be warm.', label: 'Tone' }
    ])
  })

  it('entry bodies are override-aware and destination-resolved (display = sent)', () => {
    expect(
      systemPlanEntryBody({ kind: 'builtin', id: 'output' }, 'new-note', {}, [])
    ).toBe(BUILTIN_BLOCK_DEFAULTS['output-new-note'])
    expect(
      systemPlanEntryBody(
        { kind: 'builtin', id: 'identity' },
        'append',
        { identity: 'You are Juju.' },
        []
      )
    ).toBe('You are Juju.')
  })

  it('moveSystemPlanEntry moves in place, out-of-range is a no-op', () => {
    const plan = defaultSystemPlan()
    const moved = moveSystemPlanEntry(plan, 0, 1)
    expect(moved[1]).toEqual({ kind: 'builtin', id: 'identity' })
    expect(moveSystemPlanEntry(plan, 0, -1)).toBe(plan)
    expect(moveSystemPlanEntry(plan, plan.length - 1, 1)).toBe(plan)
  })
})
