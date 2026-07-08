import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

/**
 * AI settings (CP-MVP-005 S05b, owner directive): provider keys live in
 * a MAIN-ONLY file in the state dir — never the vault (27), never the
 * renderer (13). The renderer gets a typed channel that accepts a key
 * and returns only presence + a masked hint; the raw key never crosses
 * back. File mode 0600.
 */

export type AiSettingsPublic = {
  mistralKeyPresent: boolean
  /** Last four characters, for "which key is this" recognition. */
  mistralKeyHint: string | null
}

type AiSettingsFile = { mistralApiKey?: string }

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

export function readMistralKey(stateDir: string): string | null {
  const key = readFile(stateDir).mistralApiKey?.trim()
  return key && key.length > 0 ? key : null
}

export function writeMistralKey(stateDir: string, key: string | null): void {
  const next = readFile(stateDir)
  if (key && key.trim().length > 0) next.mistralApiKey = key.trim()
  else delete next.mistralApiKey
  const abs = settingsAbs(stateDir)
  if (!existsSync(dirname(abs))) mkdirSync(dirname(abs), { recursive: true })
  writeFileSync(abs, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 })
}

export function publicAiSettings(stateDir: string): AiSettingsPublic {
  const key = readMistralKey(stateDir)
  return {
    mistralKeyPresent: key !== null,
    mistralKeyHint: key ? `••••${key.slice(-4)}` : null
  }
}
