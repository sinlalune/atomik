import { describe, expect, it } from 'vitest'
import {
  composeGenerationParams,
  defaultGenOptionDrafts
} from '../renderer/src/editor/gen-params'
import { DEFAULT_GENERATION_MODEL } from '../shared/generation-params'

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
