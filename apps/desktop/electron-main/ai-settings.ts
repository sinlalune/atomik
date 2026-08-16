import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type {
  AiEngine,
  AiProviderKeyId,
  AiSettingsPublic,
  ProviderKeyInfo
} from '../shared/ipc-contract'
import {
  defaultModelForEngine,
  PROVIDER_CATALOG
} from '../shared/generation-params'

/**
 * AI multi-provider settings (CP-MVP-005, CP-PROVIDERS S04)
 *
 * Provider keys live in a MAIN-ONLY JSON file in the state dir — mode 0600.
 * Keys never cross into the vault (27) or the renderer (13).
 * The renderer receives a typed snapshot containing presence and masked hints
 * (`sk-••••1234`), active engine, and per-provider model selections.
 */

export type AiSettingsFile = {
  generationEngine?: AiEngine
  selectedModels?: Partial<Record<AiEngine, string>>
  mistralApiKey?: string
  openrouterApiKey?: string
  openaiApiKey?: string
  anthropicApiKey?: string
  deepseekApiKey?: string
  googleApiKey?: string
}

const ENGINES: ReadonlySet<string> = new Set([
  'mock',
  'mistral',
  'openrouter',
  'openai',
  'anthropic',
  'deepseek',
  'google'
])

const PROVIDER_KEY_MAP: Record<AiProviderKeyId, keyof AiSettingsFile> = {
  mistral: 'mistralApiKey',
  openrouter: 'openrouterApiKey',
  openai: 'openaiApiKey',
  anthropic: 'anthropicApiKey',
  deepseek: 'deepseekApiKey',
  google: 'googleApiKey'
}

const ENV_KEY_MAP: Record<AiProviderKeyId, string> = {
  mistral: 'MISTRAL_API_KEY',
  openrouter: 'OPENROUTER_API_KEY',
  openai: 'OPENAI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
  deepseek: 'DEEPSEEK_API_KEY',
  google: 'GOOGLE_API_KEY'
}

function settingsAbs(stateDir: string): string {
  return join(stateDir, 'ai-settings.json')
}

export function readSettingsFile(stateDir: string): AiSettingsFile {
  try {
    return JSON.parse(readFileSync(settingsAbs(stateDir), 'utf8')) as AiSettingsFile
  } catch {
    return {}
  }
}

export function writeSettingsFile(stateDir: string, next: AiSettingsFile): void {
  const abs = settingsAbs(stateDir)
  if (!existsSync(dirname(abs))) mkdirSync(dirname(abs), { recursive: true })
  writeFileSync(abs, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 })
}

export function maskApiKey(key: string | null | undefined): string | null {
  if (!key || key.trim().length === 0) return null
  const trimmed = key.trim()
  if (trimmed.length <= 8) return '••••'
  if (trimmed.startsWith('sk-or-')) {
    return `sk-or-••••${trimmed.slice(-4)}`
  }
  if (trimmed.startsWith('sk-ant-')) {
    return `sk-ant-••••${trimmed.slice(-4)}`
  }
  if (trimmed.startsWith('sk-')) {
    return `sk-••••${trimmed.slice(-4)}`
  }
  if (trimmed.startsWith('AIza')) {
    return `AIza••••${trimmed.slice(-4)}`
  }
  return `••••${trimmed.slice(-4)}`
}

export function readProviderKey(
  stateDir: string,
  provider: AiProviderKeyId
): string | null {
  const file = readSettingsFile(stateDir)
  const prop = PROVIDER_KEY_MAP[provider]
  const val = (file[prop] as string | undefined)?.trim()
  if (val && val.length > 0) return val
  const envVar = ENV_KEY_MAP[provider]
  const envVal = process.env[envVar]?.trim()
  return envVal && envVal.length > 0 ? envVal : null
}

export function writeProviderKey(
  stateDir: string,
  provider: AiProviderKeyId,
  key: string | null
): void {
  const next = readSettingsFile(stateDir)
  const prop = PROVIDER_KEY_MAP[provider]
  if (key && key.trim().length > 0) {
    ;(next as Record<string, unknown>)[prop] = key.trim()
  } else {
    delete next[prop]
  }
  writeSettingsFile(stateDir, next)
}

/** Legacy Mistral key helpers for backward compatibility */
export function readMistralKey(stateDir: string): string | null {
  return readProviderKey(stateDir, 'mistral')
}

export function writeMistralKey(stateDir: string, key: string | null): void {
  writeProviderKey(stateDir, 'mistral', key)
}

export function writeAiEngine(stateDir: string, engine: unknown): void {
  if (typeof engine !== 'string' || !ENGINES.has(engine)) {
    throw new Error('ai settings: rejected engine')
  }
  const next = readSettingsFile(stateDir)
  next.generationEngine = engine as AiEngine
  writeSettingsFile(stateDir, next)
}

export function writeSelectedModel(
  stateDir: string,
  engine: AiEngine,
  model: unknown
): void {
  if (typeof model !== 'string' || model.trim().length === 0) {
    throw new Error('ai settings: rejected model')
  }
  const next = readSettingsFile(stateDir)
  next.selectedModels = {
    ...(next.selectedModels ?? {}),
    [engine]: model.trim()
  }
  writeSettingsFile(stateDir, next)
}

export function resolveSelectedModel(stateDir: string, engine: AiEngine): string {
  const file = readSettingsFile(stateDir)
  const userChoice = file.selectedModels?.[engine]
  if (userChoice && userChoice.trim().length > 0) {
    return userChoice.trim()
  }
  return defaultModelForEngine(engine)
}

/** Explicit choice first; else first provider with an active key; else 'mock'. */
export function resolveGenerationEngine(stateDir: string): AiEngine {
  const file = readSettingsFile(stateDir)
  if (file.generationEngine && ENGINES.has(file.generationEngine)) {
    return file.generationEngine
  }
  const providers: AiProviderKeyId[] = [
    'mistral',
    'openrouter',
    'openai',
    'anthropic',
    'deepseek',
    'google'
  ]
  for (const provider of providers) {
    if (readProviderKey(stateDir, provider) !== null) {
      return provider
    }
  }
  return 'mock'
}

export function publicAiSettings(stateDir: string): AiSettingsPublic {
  const providers: AiProviderKeyId[] = [
    'mistral',
    'openrouter',
    'openai',
    'anthropic',
    'deepseek',
    'google'
  ]

  const keys = {} as Record<AiProviderKeyId, ProviderKeyInfo>
  for (const p of providers) {
    const key = readProviderKey(stateDir, p)
    keys[p] = {
      present: key !== null,
      hint: maskApiKey(key)
    }
  }

  const selectedModels: Partial<Record<AiEngine, string>> = {}
  for (const eng of Object.keys(PROVIDER_CATALOG) as AiEngine[]) {
    selectedModels[eng] = resolveSelectedModel(stateDir, eng)
  }

  const mistralKey = readProviderKey(stateDir, 'mistral')

  return {
    mistralKeyPresent: mistralKey !== null,
    mistralKeyHint: maskApiKey(mistralKey),
    generationEngine: resolveGenerationEngine(stateDir),
    keys,
    selectedModels
  }
}
