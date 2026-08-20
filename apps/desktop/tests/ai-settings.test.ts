import { mkdtempSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  maskApiKey,
  publicAiSettings,
  readMistralKey,
  readProviderKey,
  resolveGenerationEngine,
  resolveSelectedModel,
  writeAiEngine,
  writeMistralKey,
  writeProviderKey,
  writeSelectedModel
} from '../electron-main/ai-settings'

describe('AI settings store (CP-MVP-005, CP-PROVIDERS S04) — multi-provider, main-only keys', () => {
  let dir: string
  afterEach(() => rmSync(dir, { recursive: true, force: true }))

  it('round-trips keys, 0600 file mode, and exposes presence + masked hint', () => {
    dir = mkdtempSync(join(tmpdir(), 'atomik-ai-settings-'))
    expect(readProviderKey(dir, 'openrouter')).toBeNull()
    const initial = publicAiSettings(dir)
    expect(initial.generationEngine).toBe('mock')
    expect(initial.keys.openrouter).toEqual({ present: false, hint: null })
    expect(initial.keys.openai).toEqual({ present: false, hint: null })

    writeProviderKey(dir, 'openrouter', 'sk-or-v1-abcdef1234')
    writeMistralKey(dir, 'sk-mistral-5678')
    expect(readMistralKey(dir)).toBe('sk-mistral-5678')
    writeProviderKey(dir, 'openai', 'sk-proj-xyz9876')
    writeProviderKey(dir, 'anthropic', 'sk-ant-api03-uvw5555')
    writeProviderKey(dir, 'google', 'AIzaSyA12345678')

    expect(readProviderKey(dir, 'openrouter')).toBe('sk-or-v1-abcdef1234')
    expect(readProviderKey(dir, 'openai')).toBe('sk-proj-xyz9876')
    expect(readProviderKey(dir, 'anthropic')).toBe('sk-ant-api03-uvw5555')
    expect(readProviderKey(dir, 'google')).toBe('AIzaSyA12345678')

    const view = publicAiSettings(dir)
    expect(view.keys.openrouter.present).toBe(true)
    expect(view.keys.openrouter.hint).toBe('sk-or-••••1234')
    expect(view.keys.openai.present).toBe(true)
    expect(view.keys.openai.hint).toBe('sk-••••9876')
    expect(view.keys.anthropic.present).toBe(true)
    expect(view.keys.anthropic.hint).toBe('sk-ant-••••5555')
    expect(view.keys.google.present).toBe(true)
    expect(view.keys.google.hint).toBe('AIza••••5678')

    expect(statSync(join(dir, 'ai-settings.json')).mode & 0o777).toBe(0o600)
  })

  it('masks various key formats safely', () => {
    expect(maskApiKey(null)).toBeNull()
    expect(maskApiKey('')).toBeNull()
    expect(maskApiKey('12345')).toBe('••••')
    expect(maskApiKey('sk-or-v1-key9999')).toBe('sk-or-••••9999')
    expect(maskApiKey('sk-ant-key8888')).toBe('sk-ant-••••8888')
    expect(maskApiKey('sk-regular7777')).toBe('sk-••••7777')
    expect(maskApiKey('AIzaSySecret6666')).toBe('AIza••••6666')
  })

  it('persists and resolves selected models per provider engine', () => {
    dir = mkdtempSync(join(tmpdir(), 'atomik-ai-settings-'))
    expect(resolveSelectedModel(dir, 'openrouter')).toBe(
      'anthropic/claude-sonnet-5'
    )
    expect(resolveSelectedModel(dir, 'openai')).toBe('gpt-5.6')

    writeSelectedModel(dir, 'openrouter', 'anthropic/claude-3.5-haiku')
    expect(resolveSelectedModel(dir, 'openrouter')).toBe('anthropic/claude-3.5-haiku')

    const view = publicAiSettings(dir)
    expect(view.selectedModels.openrouter).toBe('anthropic/claude-3.5-haiku')
    expect(view.selectedModels.openai).toBe('gpt-5.6')
  })

  it('clears provider keys with null', () => {
    dir = mkdtempSync(join(tmpdir(), 'atomik-ai-settings-'))
    writeProviderKey(dir, 'deepseek', 'sk-ds-1234')
    expect(readProviderKey(dir, 'deepseek')).toBe('sk-ds-1234')
    writeProviderKey(dir, 'deepseek', null)
    expect(readProviderKey(dir, 'deepseek')).toBeNull()
    expect(publicAiSettings(dir).keys.deepseek.present).toBe(false)
  })

  it('resolves the engine among all supported providers', () => {
    dir = mkdtempSync(join(tmpdir(), 'atomik-ai-settings-'))
    expect(resolveGenerationEngine(dir)).toBe('mock')

    writeProviderKey(dir, 'anthropic', 'sk-ant-xxx')
    expect(resolveGenerationEngine(dir)).toBe('anthropic')

    // CP-AI-CAPABILITIES S03 (owner directive 2026-08-20): with two keys and
    // no explicit choice, google leads — the default engine is the one that
    // gets asked for a diagram on a first run.
    writeProviderKey(dir, 'google', 'AIza-xxx')
    expect(resolveGenerationEngine(dir)).toBe('google')

    writeAiEngine(dir, 'openai')
    expect(resolveGenerationEngine(dir)).toBe('openai')

    writeAiEngine(dir, 'google')
    expect(resolveGenerationEngine(dir)).toBe('google')

    writeAiEngine(dir, 'deepseek')
    expect(resolveGenerationEngine(dir)).toBe('deepseek')

    writeAiEngine(dir, 'openrouter')
    expect(resolveGenerationEngine(dir)).toBe('openrouter')
  })

  it('rejects an unknown engine', () => {
    dir = mkdtempSync(join(tmpdir(), 'atomik-ai-settings-'))
    expect(() => writeAiEngine(dir, 'llama-local')).toThrow('rejected engine')
    expect(() => writeAiEngine(dir, 42)).toThrow('rejected engine')
  })
})
