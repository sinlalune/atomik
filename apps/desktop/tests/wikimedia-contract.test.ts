import { describe, expect, it } from 'vitest'
import {
  createGenerationToolPolicy,
  GENERATION_TOOL_LIMITS,
  GenerationToolContractError,
  parseGenerationToolCall,
  parseGenerationToolPreference
} from '../shared/generation-tools'
import {
  parseSearchWikiRequest,
  WIKIDATA_PROPERTY_ALLOWLIST,
  WIKIMEDIA_FIXTURE_CASES,
  WIKIMEDIA_LIMITS,
  wikimediaActionApiBase,
  wikimediaCoreRestBase,
  wikimediaHostOf
} from '../shared/wikimedia'
import { mockGenerationAdapter } from '../electron-main/generation'
import { createMistralGenerationAdapter } from '../electron-main/mistral-generation-adapter'
import { createOpenRouterGenerationAdapter } from '../electron-main/openrouter-generation-adapter'
import { createOpenAiGenerationAdapter } from '../electron-main/openai-generation-adapter'
import { createAnthropicGenerationAdapter } from '../electron-main/anthropic-generation-adapter'
import { createDeepSeekGenerationAdapter } from '../electron-main/deepseek-generation-adapter'
import { createGoogleGenerationAdapter } from '../electron-main/google-generation-adapter'

describe('the fixed-host Wikimedia door', () => {
  it('normalizes safe edition codes and never accepts a caller URL', () => {
    expect(wikimediaHostOf('wikipedia', 'FR')).toBe('fr.wikipedia.org')
    expect(wikimediaHostOf('wiktionary', 'zh-min-nan')).toBe(
      'zh-min-nan.wiktionary.org'
    )
    expect(wikimediaHostOf('wikidata', 'fr')).toBe('www.wikidata.org')
    expect(wikimediaHostOf('commons', 'fr')).toBe('commons.wikimedia.org')

    for (const hostile of ['https://evil.test', '../evil', 'en..evil', '-en']) {
      expect(() => wikimediaHostOf('wikipedia', hostile)).toThrow('invalid language')
    }
  })

  it('pins MediaWiki Core REST for pages and Action API for structured seats', () => {
    expect(wikimediaCoreRestBase('wikipedia', 'en')).toBe(
      'https://en.wikipedia.org/w/rest.php/v1'
    )
    expect(wikimediaCoreRestBase('wiktionary', 'fr')).toBe(
      'https://fr.wiktionary.org/w/rest.php/v1'
    )
    expect(wikimediaActionApiBase('wikidata', 'en')).toBe(
      'https://www.wikidata.org/w/api.php'
    )
    expect(wikimediaActionApiBase('commons', 'en')).toBe(
      'https://commons.wikimedia.org/w/api.php'
    )
  })
})

describe('search_wiki request validation', () => {
  it('requires an explicit language and fills only bounded product defaults', () => {
    expect(
      parseSearchWikiRequest({ query: '  atom  ', language: 'EN' })
    ).toEqual({
      query: 'atom',
      language: 'en',
      corpus: 'auto',
      limit: WIKIMEDIA_LIMITS.defaultResults,
      includeMedia: true
    })
    expect(() => parseSearchWikiRequest({ query: 'atom' })).toThrow('language')
  })

  it('rejects malformed, oversized and widened requests instead of guessing', () => {
    const invalid = [
      null,
      { query: '', language: 'en' },
      { query: 'x'.repeat(WIKIMEDIA_LIMITS.maxQueryChars + 1), language: 'en' },
      { query: 'atom', language: 'en', corpus: 'web' },
      { query: 'atom', language: 'en', limit: WIKIMEDIA_LIMITS.maxResults + 1 },
      { query: 'atom', language: 'en', url: 'https://example.test' }
    ]
    for (const request of invalid) {
      expect(() => parseSearchWikiRequest(request)).toThrow()
    }
  })
})

describe('the Wikidata vocabulary and fixture obligations', () => {
  it('keeps P18 explicit and the claim vocabulary small and unique', () => {
    expect(WIKIDATA_PROPERTY_ALLOWLIST.P18).toEqual({
      label: 'image',
      valueKind: 'commons-media'
    })
    const labels = Object.values(WIKIDATA_PROPERTY_ALLOWLIST).map(
      (property) => property.label
    )
    expect(new Set(labels).size).toBe(labels.length)
    expect(labels.length).toBeLessThanOrEqual(24)
  })

  it('pins multilingual, ambiguity, attribution and failure fixtures up front', () => {
    const ids = WIKIMEDIA_FIXTURE_CASES.map((fixture) => fixture.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).toEqual(
      expect.arrayContaining([
        'wikipedia-fr-atome',
        'wikidata-atom-ambiguous',
        'commons-missing-attribution',
        'wiktionary-en-atom',
        'request-rate-limited',
        'response-oversize'
      ])
    )
  })
})

describe('provider-neutral model tool calls', () => {
  const policy = createGenerationToolPolicy({ mode: 'model', wikiLanguage: 'en' })

  it('parses the two allowed tools into discriminated, bounded calls', () => {
    expect(
      parseGenerationToolCall(
        {
          id: 'call_vault_1',
          name: 'search_vault',
          arguments: { query: '  rhetoric  ', sensitivity: 'full', limit: 4 }
        },
        policy
      )
    ).toEqual({
      id: 'call_vault_1',
      name: 'search_vault',
      arguments: { query: 'rhetoric', sensitivity: 'full', limit: 4 }
    })

    expect(
      parseGenerationToolCall(
        {
          id: 'toolu_wiki_1',
          name: 'search_wiki',
          arguments: {
            query: 'atome',
            language: 'fr',
            corpus: 'wikipedia',
            limit: 2,
            includeMedia: false
          }
        },
        createGenerationToolPolicy({ mode: 'model', wikiLanguage: 'fr' })
      )
    ).toMatchObject({
      id: 'toolu_wiki_1',
      name: 'search_wiki',
      arguments: { query: 'atome', language: 'fr', limit: 2 }
    })
  })

  it('strictly validates the renderer preference and pins the call language', () => {
    expect(
      parseGenerationToolPreference({ mode: 'model', wikiLanguage: 'FR' })
    ).toEqual({ mode: 'model', wikiLanguage: 'fr' })
    for (const invalid of [
      null,
      { mode: 'auto', wikiLanguage: 'en' },
      { mode: 'model', wikiLanguage: '../evil' },
      { mode: 'model', wikiLanguage: 'en', url: 'https://example.test' }
    ]) {
      expect(() => parseGenerationToolPreference(invalid)).toThrow(
        GenerationToolContractError
      )
    }
    expect(() =>
      parseGenerationToolCall(
        {
          id: 'call_wrong_language',
          name: 'search_wiki',
          arguments: { query: 'atome', language: 'fr' }
        },
        policy
      )
    ).toThrow('language must be en')
  })

  it('fails visibly on disabled, unknown, oversized and widened calls', () => {
    const off = createGenerationToolPolicy({ mode: 'off', wikiLanguage: 'en' })
    expect(() =>
      parseGenerationToolCall(
        { id: 'call_1', name: 'search_vault', arguments: { query: 'x' } },
        off
      )
    ).toThrow(GenerationToolContractError)
    expect(() =>
      parseGenerationToolCall(
        { id: 'call_1', name: 'search_web', arguments: { query: 'x' } },
        policy
      )
    ).toThrow('allowlist')
    expect(() =>
      parseGenerationToolCall(
        {
          id: 'call_1',
          name: 'search_vault',
          arguments: { query: 'x'.repeat(GENERATION_TOOL_LIMITS.maxArgumentsChars) }
        },
        policy
      )
    ).toThrow('arguments exceed')
    expect(() =>
      parseGenerationToolCall(
        {
          id: 'call_1',
          name: 'search_vault',
          arguments: { query: 'x', scope: { folder: '../outside' } }
        },
        policy
      )
    ).toThrow('unknown search_vault field')
  })

  it('opts in only the fixture-proven Mistral codec and keeps every other adapter final-only', () => {
    const adapters = [
      mockGenerationAdapter,
      createMistralGenerationAdapter('test-key'),
      createOpenRouterGenerationAdapter('test-key'),
      createOpenAiGenerationAdapter('test-key'),
      createAnthropicGenerationAdapter('test-key'),
      createDeepSeekGenerationAdapter('test-key'),
      createGoogleGenerationAdapter('test-key')
    ]
    expect(adapters.map((adapter) => adapter.id)).toEqual([
      'mock',
      'mistral',
      'openrouter',
      'openai',
      'anthropic',
      'deepseek',
      'google'
    ])
    expect(adapters.map((adapter) => adapter.tools.kind)).toEqual([
      'unsupported',
      'native',
      'unsupported',
      'unsupported',
      'unsupported',
      'unsupported',
      'unsupported'
    ])
    expect(adapters[1]?.startToolLoop).toBeTypeOf('function')
    expect(
      adapters
        .filter((adapter) => adapter.id !== 'mistral')
        .every(
          (adapter) =>
            adapter.tools.kind === 'unsupported' &&
            adapter.startToolLoop === undefined
        )
    ).toBe(true)
  })
})
