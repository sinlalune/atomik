import { describe, expect, it } from 'vitest'
import {
  composeGenerationParams,
  defaultGenOptionDrafts
} from '../renderer/src/editor/gen-params'
import {
  DEFAULT_GENERATION_MODEL,
  PARAM_LIMITS
} from '../shared/generation-params'
import { DEFAULT_MAX_OUTPUT_TOKENS } from '../electron-main/mistral-generation-adapter'

describe('composeGenerationParams (shared S05d options, extracted S06b)', () => {
  it('all-default drafts travel as ABSENT params', () => {
    expect(composeGenerationParams(defaultGenOptionDrafts())).toBeUndefined()
  })

  it('set drafts compose; empty fields stay omitted', () => {
    expect(
      composeGenerationParams({
        model: DEFAULT_GENERATION_MODEL,
        temperature: '0.7',
        topP: '',
        maxTokens: '1000'
      })
    ).toEqual({ temperature: 0.7, maxTokens: 1000 })
  })

  it('clamps out-of-band values and drops garbage', () => {
    expect(
      composeGenerationParams({
        model: DEFAULT_GENERATION_MODEL,
        temperature: '99',
        topP: 'abc',
        maxTokens: '-5'
      })
    ).toEqual({ temperature: 1.5, maxTokens: 16 })
  })

  it('a non-default model rides as an override', () => {
    const drafts = defaultGenOptionDrafts()
    const other = { ...drafts, model: 'mistral-medium-2604' as const }
    expect(composeGenerationParams(other)).toEqual({
      model: 'mistral-medium-2604'
    })
  })
})

describe('output budget defaults (CP-AI-CAPABILITIES S03)', () => {
  it('main and the renderer agree on one number', () => {
    // The renderer's "absent field means this" and main's own ceiling are the
    // same budget seen from two sides. They drifted apart once already would
    // be invisible: a request composed with no maxTokens simply gets cut at
    // whatever main decided, and the reader sees an unclosed fence.
    expect(DEFAULT_MAX_OUTPUT_TOKENS).toBe(PARAM_LIMITS.maxTokens.default)
  })

  it('leaves room for a generation that reaches for a diagram', () => {
    // The S03 bench truncated a derivation mid-formula at 2000, leaving an
    // unclosed `$$` that rendered as raw source. Raised on owner directive.
    expect(PARAM_LIMITS.maxTokens.default).toBe(5000)
    expect(PARAM_LIMITS.maxTokens.default).toBeLessThanOrEqual(
      PARAM_LIMITS.maxTokens.max
    )
  })
})
