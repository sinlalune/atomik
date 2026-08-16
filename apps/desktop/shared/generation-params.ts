/**
 * Generation params & provider catalog (CP-MVP-008, CP-PROVIDERS S01/S02)
 *
 * Provider-neutral catalog of selectable generation models and sampling bounds.
 * Models stay PINNED dated IDs (never aliases). Pricing snapshots dated 2026-08-16
 * (USD per 1M tokens, labeled estimated in telemetry).
 */

export type AiEngine =
  | 'mock'
  | 'mistral'
  | 'openrouter'
  | 'openai'
  | 'anthropic'
  | 'deepseek'
  | 'google'

export type AiProviderKeyId =
  | 'mistral'
  | 'openrouter'
  | 'openai'
  | 'anthropic'
  | 'deepseek'
  | 'google'

export type ModelDescriptor = {
  readonly id: string
  readonly label: string
  readonly inputUsdPerMTok: number
  readonly outputUsdPerMTok: number
  readonly contextWindow: number
  readonly description?: string
}

export type ProviderDescriptor = {
  readonly id: AiEngine
  readonly name: string
  readonly defaultModel: string
  readonly models: readonly ModelDescriptor[]
}

export const PROVIDER_CATALOG: Record<AiEngine, ProviderDescriptor> = {
  mock: {
    id: 'mock',
    name: 'Offline Mock',
    defaultModel: 'mock',
    models: [
      {
        id: 'mock',
        label: 'Mock (deterministic)',
        inputUsdPerMTok: 0,
        outputUsdPerMTok: 0,
        contextWindow: 128_000,
        description: 'Deterministic offline fixture generator'
      }
    ]
  },
  mistral: {
    id: 'mistral',
    name: 'Mistral AI',
    defaultModel: 'mistral-small-2603',
    models: [
      {
        id: 'mistral-small-2603',
        label: 'small',
        inputUsdPerMTok: 0.15,
        outputUsdPerMTok: 0.60,
        contextWindow: 128_000
      },
      {
        id: 'mistral-medium-2604',
        label: 'medium',
        inputUsdPerMTok: 1.50,
        outputUsdPerMTok: 7.50,
        contextWindow: 128_000
      },
      {
        id: 'mistral-large-2411',
        label: 'large',
        inputUsdPerMTok: 2.00,
        outputUsdPerMTok: 6.00,
        contextWindow: 128_000
      },
      {
        id: 'codestral-2501',
        label: 'codestral',
        inputUsdPerMTok: 0.30,
        outputUsdPerMTok: 0.90,
        contextWindow: 256_000
      },
      {
        id: 'ministral-8b-2410',
        label: 'ministral-8b',
        inputUsdPerMTok: 0.10,
        outputUsdPerMTok: 0.10,
        contextWindow: 128_000
      },
      {
        id: 'ministral-3b-2410',
        label: 'ministral-3b',
        inputUsdPerMTok: 0.04,
        outputUsdPerMTok: 0.04,
        contextWindow: 128_000
      }
    ]
  },
  openrouter: {
    id: 'openrouter',
    name: 'OpenRouter Gateway',
    defaultModel: 'mistralai/mistral-small-24b-instruct-2501',
    models: [
      {
        id: 'mistralai/mistral-small-24b-instruct-2501',
        label: 'Mistral Small 24B',
        inputUsdPerMTok: 0.10,
        outputUsdPerMTok: 0.30,
        contextWindow: 32_768
      },
      {
        id: 'anthropic/claude-3.5-haiku',
        label: 'Claude 3.5 Haiku',
        inputUsdPerMTok: 0.80,
        outputUsdPerMTok: 4.00,
        contextWindow: 200_000
      },
      {
        id: 'openai/gpt-4o-mini',
        label: 'GPT-4o mini',
        inputUsdPerMTok: 0.15,
        outputUsdPerMTok: 0.60,
        contextWindow: 128_000
      },
      {
        id: 'deepseek/deepseek-chat',
        label: 'DeepSeek V3',
        inputUsdPerMTok: 0.14,
        outputUsdPerMTok: 0.28,
        contextWindow: 64_000
      },
      {
        id: 'google/gemini-2.0-flash-001',
        label: 'Gemini 2.0 Flash',
        inputUsdPerMTok: 0.10,
        outputUsdPerMTok: 0.40,
        contextWindow: 1_048_576
      },
      {
        id: 'meta-llama/llama-3.3-70b-instruct',
        label: 'Llama 3.3 70B',
        inputUsdPerMTok: 0.12,
        outputUsdPerMTok: 0.30,
        contextWindow: 131_072
      },
      {
        id: 'qwen/qwen-2.5-72b-instruct',
        label: 'Qwen 2.5 72B',
        inputUsdPerMTok: 0.35,
        outputUsdPerMTok: 0.40,
        contextWindow: 131_072
      }
    ]
  },
  openai: {
    id: 'openai',
    name: 'OpenAI',
    defaultModel: 'gpt-4o-mini',
    models: [
      {
        id: 'gpt-4o-mini',
        label: 'GPT-4o mini',
        inputUsdPerMTok: 0.15,
        outputUsdPerMTok: 0.60,
        contextWindow: 128_000
      },
      {
        id: 'gpt-4o',
        label: 'GPT-4o',
        inputUsdPerMTok: 2.50,
        outputUsdPerMTok: 10.00,
        contextWindow: 128_000
      },
      {
        id: 'o3-mini',
        label: 'o3-mini',
        inputUsdPerMTok: 1.10,
        outputUsdPerMTok: 4.40,
        contextWindow: 200_000
      }
    ]
  },
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic',
    defaultModel: 'claude-3-5-haiku-20241022',
    models: [
      {
        id: 'claude-3-5-haiku-20241022',
        label: 'Claude 3.5 Haiku',
        inputUsdPerMTok: 0.80,
        outputUsdPerMTok: 4.00,
        contextWindow: 200_000
      },
      {
        id: 'claude-3-5-sonnet-20241022',
        label: 'Claude 3.5 Sonnet',
        inputUsdPerMTok: 3.00,
        outputUsdPerMTok: 15.00,
        contextWindow: 200_000
      },
      {
        id: 'claude-3-opus-20240229',
        label: 'Claude 3 Opus',
        inputUsdPerMTok: 15.00,
        outputUsdPerMTok: 75.00,
        contextWindow: 200_000
      }
    ]
  },
  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek',
    defaultModel: 'deepseek-chat',
    models: [
      {
        id: 'deepseek-chat',
        label: 'DeepSeek-V3',
        inputUsdPerMTok: 0.14,
        outputUsdPerMTok: 0.28,
        contextWindow: 64_000
      },
      {
        id: 'deepseek-reasoner',
        label: 'DeepSeek-R1',
        inputUsdPerMTok: 0.55,
        outputUsdPerMTok: 2.19,
        contextWindow: 64_000
      }
    ]
  },
  google: {
    id: 'google',
    name: 'Google Gemini',
    defaultModel: 'gemini-2.0-flash',
    models: [
      {
        id: 'gemini-2.0-flash',
        label: 'Gemini 2.0 Flash',
        inputUsdPerMTok: 0.10,
        outputUsdPerMTok: 0.40,
        contextWindow: 1_048_576
      },
      {
        id: 'gemini-2.0-flash-lite',
        label: 'Gemini 2.0 Flash Lite',
        inputUsdPerMTok: 0.075,
        outputUsdPerMTok: 0.30,
        contextWindow: 1_048_576
      },
      {
        id: 'gemini-1.5-pro',
        label: 'Gemini 1.5 Pro',
        inputUsdPerMTok: 1.25,
        outputUsdPerMTok: 5.00,
        contextWindow: 2_097_152
      },
      {
        id: 'gemini-1.5-flash',
        label: 'Gemini 1.5 Flash',
        inputUsdPerMTok: 0.075,
        outputUsdPerMTok: 0.30,
        contextWindow: 1_048_576
      }
    ]
  }
}

/** Standing Mistral models map for exact backward compatibility with M2 completion */
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

export const ALL_MODELS: Record<string, ModelDescriptor> = Object.fromEntries(
  Object.values(PROVIDER_CATALOG).flatMap((provider) =>
    provider.models.map((model) => [model.id, model])
  )
)

export type GenerationModelId = keyof typeof GENERATION_MODELS | string

export const DEFAULT_GENERATION_MODEL: GenerationModelId = 'mistral-small-2603'

export function findModelDescriptor(engine: AiEngine, modelId: string): ModelDescriptor | undefined {
  const provider = PROVIDER_CATALOG[engine]
  return provider?.models.find((m) => m.id === modelId) ?? ALL_MODELS[modelId]
}

export function defaultModelForEngine(engine: AiEngine): string {
  return PROVIDER_CATALOG[engine]?.defaultModel ?? 'mock'
}

export function estimateCostUsdForModel(
  usage: { inputTokens: number; outputTokens: number },
  engine: AiEngine,
  modelId: string
): number {
  const descriptor = findModelDescriptor(engine, modelId)
  if (!descriptor) return 0
  const amount =
    (usage.inputTokens / 1e6) * descriptor.inputUsdPerMTok +
    (usage.outputTokens / 1e6) * descriptor.outputUsdPerMTok
  return Number(amount.toFixed(6))
}

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
    !(
      typeof record['model'] === 'string' &&
      (record['model'] in GENERATION_MODELS || record['model'] in ALL_MODELS)
    )
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
