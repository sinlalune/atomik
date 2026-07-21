import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type { AiEngine, AiSettingsPublic } from '../shared/ipc-contract'

/**
 * AI settings (CP-MVP-005 S05b, owner directive): provider keys live in
 * a MAIN-ONLY file in the state dir — never the vault (27), never the
 * renderer (13). The renderer gets a typed channel that accepts a key
 * and returns only presence + a masked hint; the raw key never crosses
 * back. File mode 0600.
 *
 * CP-MVP-008 S02 adds the generation-engine choice beside the key:
 * explicit when the owner picked one; otherwise 'mistral' when a key is
 * configured (the PROPOSED default — the S07 owner bench confirms it),
 * 'mock' when none is.
 */

type AiSettingsFile = { mistralApiKey?: string; generationEngine?: AiEngine }

const ENGINES: ReadonlySet<string> = new Set(['mock', 'mistral'])

function settingsAbs(stateDir: string): string {
  return join(stateDir, 'ai-settings.json')
}

function readFile(stateDir: string): AiSettingsFile {
  try {
    return JSON.parse(readFileSync(settingsAbs(stateDir), 'utf8')) as AiSettingsFile
  } catch {
    return {}
  }
}

function writeFile(stateDir: string, next: AiSettingsFile): void {
  const abs = settingsAbs(stateDir)
  if (!existsSync(dirname(abs))) mkdirSync(dirname(abs), { recursive: true })
  writeFileSync(abs, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 })
}

export function readMistralKey(stateDir: string): string | null {
  const key = readFile(stateDir).mistralApiKey?.trim()
  return key && key.length > 0 ? key : null
}

export function writeMistralKey(stateDir: string, key: string | null): void {
  const next = readFile(stateDir)
  if (key && key.trim().length > 0) next.mistralApiKey = key.trim()
  else delete next.mistralApiKey
  writeFile(stateDir, next)
}

export function writeAiEngine(stateDir: string, engine: unknown): void {
  if (typeof engine !== 'string' || !ENGINES.has(engine)) {
    throw new Error('ai settings: rejected engine')
  }
  const next = readFile(stateDir)
  next.generationEngine = engine as AiEngine
  writeFile(stateDir, next)
}

/** Explicit choice first; else the proposed key-present default. */
export function resolveGenerationEngine(stateDir: string): AiEngine {
  const file = readFile(stateDir)
  if (file.generationEngine && ENGINES.has(file.generationEngine)) {
    return file.generationEngine
  }
  return readMistralKey(stateDir) !== null ? 'mistral' : 'mock'
}

export function publicAiSettings(stateDir: string): AiSettingsPublic {
  const key = readMistralKey(stateDir)
  return {
    mistralKeyPresent: key !== null,
    mistralKeyHint: key ? `••••${key.slice(-4)}` : null,
    generationEngine: resolveGenerationEngine(stateDir)
  }
}
