/**
 * Generation params & provider catalog (CP-MVP-008, CP-PROVIDERS)
 *
 * Provider-neutral catalog of selectable generation models and sampling bounds.
 * Models stay PINNED dated IDs. Pricing snapshots dated 2026-08-16
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
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic',
    defaultModel: 'claude-sonnet-5',
    models: [
      {
        id: 'claude-sonnet-5',
        label: 'Claude Sonnet 5',
        inputUsdPerMTok: 2.00,
        outputUsdPerMTok: 10.00,
        contextWindow: 1_000_000,
        description: 'Next-gen agentic flagship model with 1M context and adaptive thinking'
      },
      {
        id: 'claude-opus-5',
        label: 'Claude Opus 5',
        inputUsdPerMTok: 5.00,
        outputUsdPerMTok: 25.00,
        contextWindow: 1_000_000,
        description: 'Deep complex agentic reasoning and enterprise software engineering'
      },
      {
        id: 'claude-fable-5',
        label: 'Claude Fable 5',
        inputUsdPerMTok: 10.00,
        outputUsdPerMTok: 50.00,
        contextWindow: 1_000_000,
        description: 'Frontier reasoning and long-horizon autonomous agent intelligence'
      },
      {
        id: 'claude-opus-4-8',
        label: 'Claude Opus 4.8',
        inputUsdPerMTok: 5.00,
        outputUsdPerMTok: 25.00,
        contextWindow: 1_000_000,
        description: 'High-capability 1M context reasoning model'
      },
      {
        id: 'claude-sonnet-4-6',
        label: 'Claude Sonnet 4.6',
        inputUsdPerMTok: 3.00,
        outputUsdPerMTok: 15.00,
        contextWindow: 1_000_000,
        description: 'Balanced speed and intelligence with 1M context'
      },
      {
        id: 'claude-haiku-4-5-20251001',
        label: 'Claude Haiku 4.5',
        inputUsdPerMTok: 1.00,
        outputUsdPerMTok: 5.00,
        contextWindow: 200_000,
        description: 'Fastest lightweight model with near-frontier intelligence'
      },
      {
        id: 'claude-3-7-sonnet-20250219',
        label: 'Claude 3.7 Sonnet',
        inputUsdPerMTok: 3.00,
        outputUsdPerMTok: 15.00,
        contextWindow: 200_000,
        description: 'Hybrid reasoning model'
      },
      {
        id: 'claude-3-5-sonnet-20241022',
        label: 'Claude 3.5 Sonnet v2',
        inputUsdPerMTok: 3.00,
        outputUsdPerMTok: 15.00,
        contextWindow: 200_000,
        description: 'High performance coding and reasoning'
      },
      {
        id: 'claude-3-5-haiku-20241022',
        label: 'Claude 3.5 Haiku',
        inputUsdPerMTok: 0.80,
        outputUsdPerMTok: 4.00,
        contextWindow: 200_000,
        description: 'Fast lightweight model'
      }
    ]
  },
  openai: {
    id: 'openai',
    name: 'OpenAI',
    defaultModel: 'gpt-5.6',
    models: [
      {
        id: 'gpt-5.6',
        label: 'GPT-5.6 (Sol)',
        inputUsdPerMTok: 2.50,
        outputUsdPerMTok: 10.00,
        contextWindow: 1_000_000,
        description: 'Next-gen flagship model for complex production agent workflows'
      },
      {
        id: 'gpt-5.6-terra',
        label: 'GPT-5.6 Terra',
        inputUsdPerMTok: 2.50,
        outputUsdPerMTok: 15.00,
        contextWindow: 1_050_000,
        description: 'Reasoning sweet spot for complex research and synthesis'
      },
      {
        id: 'gpt-5.6-luna',
        label: 'GPT-5.6 Luna',
        inputUsdPerMTok: 1.00,
        outputUsdPerMTok: 6.00,
        contextWindow: 1_000_000,
        description: 'High-speed, cost-effective daily driver for high volume tasks'
      },
      {
        id: 'gpt-4.1',
        label: 'GPT-4.1',
        inputUsdPerMTok: 2.00,
        outputUsdPerMTok: 8.00,
        contextWindow: 1_000_000,
        description: 'Improved instruction following, coding, and 1M context'
      },
      {
        id: 'gpt-4.1-mini',
        label: 'GPT-4.1 mini',
        inputUsdPerMTok: 0.40,
        outputUsdPerMTok: 1.60,
        contextWindow: 1_000_000,
        description: 'Efficient 1M context model'
      },
      {
        id: 'o3',
        label: 'o3',
        inputUsdPerMTok: 10.00,
        outputUsdPerMTok: 40.00,
        contextWindow: 200_000,
        description: 'Frontier reasoning model for math, science, and technical coding'
      },
      {
        id: 'o4-mini',
        label: 'o4-mini',
        inputUsdPerMTok: 1.10,
        outputUsdPerMTok: 4.40,
        contextWindow: 200_000,
        description: 'High-throughput reasoning model for technical writing and coding'
      },
      {
        id: 'o3-mini',
        label: 'o3-mini',
        inputUsdPerMTok: 1.10,
        outputUsdPerMTok: 4.40,
        contextWindow: 200_000,
        description: 'Fast STEM reasoning model'
      },
      {
        id: 'gpt-4o',
        label: 'GPT-4o',
        inputUsdPerMTok: 2.50,
        outputUsdPerMTok: 10.00,
        contextWindow: 128_000,
        description: 'Multimodal intelligence'
      },
      {
        id: 'gpt-4o-mini',
        label: 'GPT-4o mini',
        inputUsdPerMTok: 0.15,
        outputUsdPerMTok: 0.60,
        contextWindow: 128_000,
        description: 'Fast lightweight model'
      }
    ]
  },
  google: {
    id: 'google',
    name: 'Google Gemini',
    defaultModel: 'gemini-3.7-flash',
    models: [
      {
        id: 'gemini-3.7-flash',
        label: 'Gemini 3.7 Flash',
        inputUsdPerMTok: 0.375,
        outputUsdPerMTok: 1.875,
        contextWindow: 1_048_576,
        description: 'Latest flagship Flash model with high-speed multi-step reasoning and 1M context'
      },
      {
        id: 'gemini-3.6-flash',
        label: 'Gemini 3.6 Flash',
        inputUsdPerMTok: 0.375,
        outputUsdPerMTok: 1.875,
        contextWindow: 1_048_576,
        description: 'Latest 3.x Flash model with improved token efficiency and agentic coding'
      },
      {
        id: 'gemini-3.5-flash',
        label: 'Gemini 3.5 Flash',
        inputUsdPerMTok: 0.16,
        outputUsdPerMTok: 0.63,
        contextWindow: 1_048_576,
        description: 'Fast, responsive multimodal model with 1M context'
      },
      {
        id: 'gemini-3.5-flash-lite',
        label: 'Gemini 3.5 Flash-Lite',
        inputUsdPerMTok: 0.075,
        outputUsdPerMTok: 0.30,
        contextWindow: 1_048_576,
        description: 'Ultra low-latency subagent model designed for high-volume automation'
      },
      {
        id: 'gemini-3.1-pro-preview',
        label: 'Gemini 3.1 Pro (Preview)',
        inputUsdPerMTok: 1.25,
        outputUsdPerMTok: 5.00,
        contextWindow: 2_097_152,
        description: 'Most intelligent Gemini model for multimodal understanding and reasoning'
      },
      {
        id: 'gemini-2.5-pro',
        label: 'Gemini 2.5 Pro',
        inputUsdPerMTok: 1.25,
        outputUsdPerMTok: 5.00,
        contextWindow: 2_097_152,
        description: '2M context model with adaptive thinking'
      },
      {
        id: 'gemini-2.5-flash',
        label: 'Gemini 2.5 Flash',
        inputUsdPerMTok: 0.10,
        outputUsdPerMTok: 0.40,
        contextWindow: 1_048_576,
        description: 'Fast 1M token context model'
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
        contextWindow: 64_000,
        description: '671B MoE frontier chat model with incredible value'
      },
      {
        id: 'deepseek-reasoner',
        label: 'DeepSeek-R1',
        inputUsdPerMTok: 0.55,
        outputUsdPerMTok: 2.19,
        contextWindow: 64_000,
        description: 'Open reasoning model with chain-of-thought verification'
      }
    ]
  },
  mistral: {
    id: 'mistral',
    name: 'Mistral AI',
    defaultModel: 'mistral-large-2411',
    models: [
      {
        id: 'mistral-large-2411',
        label: 'Mistral Large 2',
        inputUsdPerMTok: 2.00,
        outputUsdPerMTok: 6.00,
        contextWindow: 128_000,
        description: 'Top-tier reasoning and multilingual capacity'
      },
      {
        id: 'mistral-small-2603',
        label: 'Mistral Small 3',
        inputUsdPerMTok: 0.20,
        outputUsdPerMTok: 0.60,
        contextWindow: 128_000,
        description: '24B parameter dense model with low latency'
      },
      {
        id: 'codestral-2501',
        label: 'Codestral 2501',
        inputUsdPerMTok: 0.30,
        outputUsdPerMTok: 0.90,
        contextWindow: 256_000,
        description: 'State-of-the-art coding specialist with 256k window'
      },
      {
        id: 'pixtral-large-2411',
        label: 'Pixtral Large',
        inputUsdPerMTok: 2.00,
        outputUsdPerMTok: 6.00,
        contextWindow: 128_000,
        description: 'Multimodal vision + text flagship'
      },
      {
        id: 'ministral-8b-2410',
        label: 'Ministral 8B',
        inputUsdPerMTok: 0.10,
        outputUsdPerMTok: 0.10,
        contextWindow: 128_000,
        description: 'Edge model for on-device and lightweight tasks'
      },
      {
        id: 'ministral-3b-2410',
        label: 'Ministral 3B',
        inputUsdPerMTok: 0.04,
        outputUsdPerMTok: 0.04,
        contextWindow: 128_000,
        description: 'Ultra fast edge model'
      },
      {
        id: 'mistral-medium-2604',
        label: 'medium',
        inputUsdPerMTok: 1.50,
        outputUsdPerMTok: 7.50,
        contextWindow: 128_000
      }
    ]
  },
  openrouter: {
    id: 'openrouter',
    name: 'OpenRouter Gateway',
    defaultModel: 'anthropic/claude-sonnet-5',
    models: [
      {
        id: 'anthropic/claude-sonnet-5',
        label: 'Claude Sonnet 5',
        inputUsdPerMTok: 2.00,
        outputUsdPerMTok: 10.00,
        contextWindow: 1_000_000,
        description: 'Anthropic Claude Sonnet 5 agentic flagship (1M context)'
      },
      {
        id: 'anthropic/claude-fable-5',
        label: 'Claude Fable 5',
        inputUsdPerMTok: 10.00,
        outputUsdPerMTok: 50.00,
        contextWindow: 1_000_000,
        description: 'Anthropic Claude Fable 5 frontier intelligence (1M context)'
      },
      {
        id: 'anthropic/claude-opus-5',
        label: 'Claude Opus 5',
        inputUsdPerMTok: 5.00,
        outputUsdPerMTok: 25.00,
        contextWindow: 1_000_000,
        description: 'Anthropic Claude Opus 5 deep agentic coding'
      },
      {
        id: 'anthropic/claude-opus-4-8',
        label: 'Claude Opus 4.8',
        inputUsdPerMTok: 5.00,
        outputUsdPerMTok: 25.00,
        contextWindow: 1_000_000
      },
      {
        id: 'openai/gpt-5.6-sol',
        label: 'GPT-5.6 Sol',
        inputUsdPerMTok: 2.50,
        outputUsdPerMTok: 10.00,
        contextWindow: 1_000_000,
        description: 'OpenAI GPT-5.6 flagship'
      },
      {
        id: 'openai/gpt-5.6-terra',
        label: 'GPT-5.6 Terra',
        inputUsdPerMTok: 2.50,
        outputUsdPerMTok: 15.00,
        contextWindow: 1_050_000,
        description: 'OpenAI GPT-5.6 reasoning sweet spot'
      },
      {
        id: 'openai/gpt-5.6-luna',
        label: 'GPT-5.6 Luna',
        inputUsdPerMTok: 1.00,
        outputUsdPerMTok: 6.00,
        contextWindow: 1_000_000,
        description: 'OpenAI GPT-5.6 fast daily driver'
      },
      {
        id: 'deepseek/deepseek-v4-pro',
        label: 'DeepSeek V4-Pro',
        inputUsdPerMTok: 0.46,
        outputUsdPerMTok: 0.92,
        contextWindow: 128_000,
        description: 'DeepSeek V4-Pro coding & reasoning leader'
      },
      {
        id: 'deepseek/deepseek-v4-flash',
        label: 'DeepSeek V4 Flash',
        inputUsdPerMTok: 0.054,
        outputUsdPerMTok: 0.242,
        contextWindow: 128_000,
        description: 'DeepSeek V4 Flash ultra cost-efficient'
      },
      {
        id: 'deepseek/deepseek-r1',
        label: 'DeepSeek R1',
        inputUsdPerMTok: 0.55,
        outputUsdPerMTok: 2.19,
        contextWindow: 64_000,
        description: 'DeepSeek R1 reasoning'
      },
      {
        id: 'deepseek/deepseek-chat',
        label: 'DeepSeek V3',
        inputUsdPerMTok: 0.14,
        outputUsdPerMTok: 0.28,
        contextWindow: 64_000
      },
      {
        id: 'google/gemini-3.7-flash',
        label: 'Gemini 3.7 Flash',
        inputUsdPerMTok: 0.375,
        outputUsdPerMTok: 1.875,
        contextWindow: 1_048_576,
        description: 'Google Gemini 3.7 Flash multimodal reasoning'
      },
      {
        id: 'google/gemini-3.6-flash',
        label: 'Gemini 3.6 Flash',
        inputUsdPerMTok: 0.375,
        outputUsdPerMTok: 1.875,
        contextWindow: 1_048_576,
        description: 'Google Gemini 3.6 Flash multimodal'
      },
      {
        id: 'google/gemini-3.5-flash',
        label: 'Gemini 3.5 Flash',
        inputUsdPerMTok: 0.16,
        outputUsdPerMTok: 0.63,
        contextWindow: 1_048_576
      },
      {
        id: 'moonshotai/kimi-k3',
        label: 'Kimi K3',
        inputUsdPerMTok: 3.00,
        outputUsdPerMTok: 15.00,
        contextWindow: 1_000_000,
        description: 'Moonshot AI Kimi K3 2.8T parameter multimodal reasoner'
      },
      {
        id: 'moonshotai/kimi-k2.7-code',
        label: 'Kimi K2.7 Code',
        inputUsdPerMTok: 0.75,
        outputUsdPerMTok: 3.50,
        contextWindow: 262_000,
        description: 'Specialized agentic coding model'
      },
      {
        id: 'z-ai/glm-5.2',
        label: 'GLM 5.2',
        inputUsdPerMTok: 0.447,
        outputUsdPerMTok: 3.31,
        contextWindow: 1_000_000,
        description: 'Open weight leader for long-horizon agentic coding'
      },
      {
        id: 'minimax/minimax-m3',
        label: 'MiniMax M3',
        inputUsdPerMTok: 0.098,
        outputUsdPerMTok: 1.21,
        contextWindow: 1_000_000,
        description: 'Native multimodal (image/video/text) 1M context'
      },
      {
        id: 'nvidia/nemotron-3-ultra:free',
        label: 'Nemotron 3 Ultra (Free)',
        inputUsdPerMTok: 0,
        outputUsdPerMTok: 0,
        contextWindow: 128_000,
        description: 'NVIDIA open-weight reasoning model'
      },
      {
        id: 'meta-llama/llama-3.3-70b-instruct',
        label: 'Llama 3.3 70B',
        inputUsdPerMTok: 0.12,
        outputUsdPerMTok: 0.30,
        contextWindow: 131_072
      },
      {
        id: 'meta-llama/llama-3.1-405b-instruct',
        label: 'Llama 3.1 405B',
        inputUsdPerMTok: 2.00,
        outputUsdPerMTok: 2.00,
        contextWindow: 131_072
      },
      {
        id: 'qwen/qwen-2.5-coder-32b-instruct',
        label: 'Qwen 2.5 Coder 32B',
        inputUsdPerMTok: 0.07,
        outputUsdPerMTok: 0.16,
        contextWindow: 32_768
      },
      {
        id: 'mistralai/mistral-large-2411',
        label: 'Mistral Large 2411',
        inputUsdPerMTok: 2.00,
        outputUsdPerMTok: 6.00,
        contextWindow: 128_000
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
  maxTokens: { min: 16, max: 8192, default: 2000 }
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
      record['model'].length > 0 &&
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
