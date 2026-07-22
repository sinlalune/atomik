/**
 * Generation params (CP-MVP-008 S05d, owner directive: "add medium
 * latest model from mistral and add model, temperature, top p and max
 * tokens foldable options menu") — the selectable model allowlist and
 * the sampling knobs that may ride an operation. Models stay PINNED
 * dated ids (never aliases); prices from mistral.ai/pricing/api,
 * fetched 2026-07-22.
 */

export const GENERATION_MODELS = {
  'mistral-small-2603': {
    label: 'small',
    inputUsdPerMTok: 0.15,
    outputUsdPerMTok: 0.6
  },
  'mistral-medium-2604': {
    label: 'medium',
    inputUsdPerMTok: 1.5,
    outputUsdPerMTok: 7.5
  }
} as const

export type GenerationModelId = keyof typeof GENERATION_MODELS

export const DEFAULT_GENERATION_MODEL: GenerationModelId = 'mistral-small-2603'

/** UI + validation bounds; defaults are what an absent field means. */
export const PARAM_LIMITS = {
  temperature: { min: 0, max: 1.5, default: 0.2 },
  topP: { min: 0, max: 1, default: 1 },
  maxTokens: { min: 16, max: 4000, default: 2000 }
} as const

export type GenerationParams = {
  model?: GenerationModelId
  temperature?: number
  topP?: number
  maxTokens?: number
}

export function isValidGenerationParams(value: unknown): value is GenerationParams {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const record = value as Record<string, unknown>
  if (
    record['model'] !== undefined &&
    !(typeof record['model'] === 'string' && record['model'] in GENERATION_MODELS)
  ) {
    return false
  }
  const inRange = (
    key: 'temperature' | 'topP' | 'maxTokens'
  ): boolean =>
    record[key] === undefined ||
    (typeof record[key] === 'number' &&
      Number.isFinite(record[key]) &&
      (record[key] as number) >= PARAM_LIMITS[key].min &&
      (record[key] as number) <= PARAM_LIMITS[key].max)
  return inRange('temperature') && inRange('topP') && inRange('maxTokens')
}
