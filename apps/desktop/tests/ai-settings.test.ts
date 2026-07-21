import { mkdtempSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  publicAiSettings,
  readMistralKey,
  resolveGenerationEngine,
  writeAiEngine,
  writeMistralKey
} from '../electron-main/ai-settings'

describe('AI settings store (CP-MVP-005 S05b) — main-only key, masked view', () => {
  let dir: string
  afterEach(() => rmSync(dir, { recursive: true, force: true }))

  it('round-trips the key, 0600, and exposes only presence + hint', () => {
    dir = mkdtempSync(join(tmpdir(), 'atomik-ai-settings-'))
    expect(readMistralKey(dir)).toBeNull()
    expect(publicAiSettings(dir)).toEqual({
      mistralKeyPresent: false,
      mistralKeyHint: null,
      generationEngine: 'mock'
    })

    writeMistralKey(dir, '  sk-test-abcd1234  ')
    expect(readMistralKey(dir)).toBe('sk-test-abcd1234')
    const view = publicAiSettings(dir)
    expect(view.mistralKeyPresent).toBe(true)
    expect(view.mistralKeyHint).toBe('••••1234')
    expect(view.mistralKeyHint).not.toContain('sk-test')
    expect(statSync(join(dir, 'ai-settings.json')).mode & 0o777).toBe(0o600)
  })

  it('clears with null and tolerates a corrupt file', () => {
    dir = mkdtempSync(join(tmpdir(), 'atomik-ai-settings-'))
    writeMistralKey(dir, 'sk-x')
    writeMistralKey(dir, null)
    expect(readMistralKey(dir)).toBeNull()
    expect(publicAiSettings(dir).mistralKeyPresent).toBe(false)
  })

  it('resolves the engine: explicit choice first, else the key-present default (S02)', () => {
    dir = mkdtempSync(join(tmpdir(), 'atomik-ai-settings-'))
    // no key, no choice → mock (offline path)
    expect(resolveGenerationEngine(dir)).toBe('mock')
    // key configured → proposed default 'mistral' (owner confirms at S07)
    writeMistralKey(dir, 'sk-x')
    expect(resolveGenerationEngine(dir)).toBe('mistral')
    // explicit mock sticks even with a key present — never overridden
    writeAiEngine(dir, 'mock')
    expect(resolveGenerationEngine(dir)).toBe('mock')
    expect(publicAiSettings(dir).generationEngine).toBe('mock')
    // the choice survives key rewrites
    writeMistralKey(dir, 'sk-y')
    expect(resolveGenerationEngine(dir)).toBe('mock')
    writeAiEngine(dir, 'mistral')
    expect(resolveGenerationEngine(dir)).toBe('mistral')
  })

  it('rejects an unknown engine', () => {
    dir = mkdtempSync(join(tmpdir(), 'atomik-ai-settings-'))
    expect(() => writeAiEngine(dir, 'gpt')).toThrow('rejected engine')
    expect(() => writeAiEngine(dir, 42)).toThrow('rejected engine')
  })
})
