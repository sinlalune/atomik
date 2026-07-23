import {
  DEFAULT_GENERATION_MODEL,
  PARAM_LIMITS,
  type GenerationModelId,
  type GenerationParams
} from '../../../shared/generation-params'

/**
 * The S05d generation options (model + bounded sampling overrides),
 * generalized at S06b (the NotePxRow precedent): ONE foldable fields
 * block + ONE pure draft→params composer, consumed by the selection
 * menu and the chat column so every AI surface offers the same knobs.
 * Empty drafts mean "the default" and travel as ABSENT params.
 */

export type GenOptionDrafts = {
  model: GenerationModelId
  temperature: string
  topP: string
  maxTokens: string
}

export const defaultGenOptionDrafts = (): GenOptionDrafts => ({
  model: DEFAULT_GENERATION_MODEL,
  temperature: '',
  topP: '',
  maxTokens: ''
})

const clamp = (
  raw: string,
  limits: { min: number; max: number }
): number | undefined => {
  if (raw.trim().length === 0) return undefined
  const parsed = Number(raw)
  if (!Number.isFinite(parsed)) return undefined
  return Math.min(limits.max, Math.max(limits.min, parsed))
}

/** Drafts → validated overrides; undefined when everything is default
 *  (the operation then carries no params at all). */
export function composeGenerationParams(
  drafts: GenOptionDrafts
): GenerationParams | undefined {
  const params: GenerationParams = {
    ...(drafts.model !== DEFAULT_GENERATION_MODEL ? { model: drafts.model } : {}),
    ...(clamp(drafts.temperature, PARAM_LIMITS.temperature) !== undefined
      ? { temperature: clamp(drafts.temperature, PARAM_LIMITS.temperature) }
      : {}),
    ...(clamp(drafts.topP, PARAM_LIMITS.topP) !== undefined
      ? { topP: clamp(drafts.topP, PARAM_LIMITS.topP) }
      : {}),
    ...(clamp(drafts.maxTokens, PARAM_LIMITS.maxTokens) !== undefined
      ? { maxTokens: clamp(drafts.maxTokens, PARAM_LIMITS.maxTokens) }
      : {})
  }
  return Object.keys(params).length > 0 ? params : undefined
}

