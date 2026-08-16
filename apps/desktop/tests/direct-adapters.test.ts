import { describe, expect, it } from 'vitest'
import type { AiOperation } from '../shared/ipc-contract'
import { GenerationError } from '../electron-main/generation'
import { createOpenAiGenerationAdapter } from '../electron-main/openai-generation-adapter'
import {
  createAnthropicGenerationAdapter,
  buildAnthropicPayload
} from '../electron-main/anthropic-generation-adapter'
import { createDeepSeekGenerationAdapter } from '../electron-main/deepseek-generation-adapter'
import { createGoogleGenerationAdapter } from '../electron-main/google-generation-adapter'

const SELECTION_TEXT = 'Transformers use self-attention mechanism.'

function operation(
  destination: AiOperation['target']['destination'] = { kind: 'append' },
  model?: string
): AiOperation {
  return {
    id: 'op-direct-1',
    input: [
      {
        relPath: 'notes/nlp.md',
        kind: 'text',
        content: SELECTION_TEXT,
        range: { from: 0, to: SELECTION_TEXT.length }
      }
    ],
    instruction: 'Summarize briefly.',
    params: model ? { model } : undefined,
    target: { relPath: 'notes/nlp.md', destination }
  }
}

function okResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200 })
}

const signal = (): AbortSignal => new AbortController().signal

describe('OpenAI direct generation adapter (CP-PROVIDERS S03)', () => {
  it('generates completion with bearer auth and OpenAI format', async () => {
    let capturedUrl = ''
    let capturedHeaders: HeadersInit | undefined
    let capturedBody: Record<string, unknown> = {}

    const customFetch: typeof fetch = (input, init) => {
      capturedUrl = String(input)
      capturedHeaders = init?.headers
      capturedBody = JSON.parse(String(init?.body))
      return Promise.resolve(
        okResponse({
          model: 'gpt-4o-mini',
          choices: [{ message: { content: 'Self-attention powers transformers.' } }],
          usage: { prompt_tokens: 50, completion_tokens: 15 }
        })
      )
    }

    const adapter = createOpenAiGenerationAdapter('sk-openai-test-key', customFetch)
    const result = await adapter.generate(operation(), { signal: signal() })

    expect(capturedUrl).toBe('https://api.openai.com/v1/chat/completions')
    expect((capturedHeaders as Record<string, string>)['authorization']).toBe(
      'Bearer sk-openai-test-key'
    )
    expect(capturedBody['model']).toBe('gpt-5.6')
    expect(result.providerMeta.provider).toBe('openai')
    expect(result.providerMeta.location).toBe('cloud-model')
    expect(result.bundle.blocks[0]!.content).toBe('Self-attention powers transformers.')
    expect(result.usage?.inputTokens).toBe(50)
  })

  it('maps HTTP 401 to auth error', async () => {
    const errorFetch: typeof fetch = () =>
      Promise.resolve(new Response('Unauthorized', { status: 401 }))
    const adapter = createOpenAiGenerationAdapter('bad-key', errorFetch)
    await expect(adapter.generate(operation(), { signal: signal() })).rejects.toThrowError(
      GenerationError
    )
  })
})

describe('Anthropic direct generation adapter (CP-PROVIDERS S03)', () => {
  it('formats payload with top-level system and messages array', () => {
    const payload = buildAnthropicPayload(
      operation(),
      'claude-3-5-haiku-20241022',
      2000,
      0.2
    )
    expect(payload.system).toBeDefined()
    expect(payload.system).toContain('APPENDED')
    expect(payload.messages[0]!.role).toBe('user')
    expect(payload.messages[0]!.content).toContain('Summarize briefly.')
  })

  it('generates completion via Messages API with x-api-key', async () => {
    let capturedUrl = ''
    let capturedHeaders: HeadersInit | undefined

    const customFetch: typeof fetch = (input, init) => {
      capturedUrl = String(input)
      capturedHeaders = init?.headers
      return Promise.resolve(
        okResponse({
          id: 'msg_123',
          model: 'claude-3-5-haiku-20241022',
          content: [{ type: 'text', text: 'Transformers compute self-attention.' }],
          stop_reason: 'end_turn',
          usage: { input_tokens: 60, output_tokens: 20 }
        })
      )
    }

    const adapter = createAnthropicGenerationAdapter('sk-ant-test-key', customFetch)
    const result = await adapter.generate(operation(), { signal: signal() })

    expect(capturedUrl).toBe('https://api.anthropic.com/v1/messages')
    const headers = capturedHeaders as Record<string, string>
    expect(headers['x-api-key']).toBe('sk-ant-test-key')
    expect(headers['anthropic-version']).toBe('2023-06-01')
    expect(result.providerMeta.provider).toBe('anthropic')
    expect(result.bundle.blocks[0]!.content).toBe('Transformers compute self-attention.')
    expect(result.usage?.inputTokens).toBe(60)
  })
})

describe('DeepSeek direct generation adapter (CP-PROVIDERS S03)', () => {
  it('generates completion via DeepSeek chat endpoint', async () => {
    let capturedUrl = ''
    const customFetch: typeof fetch = (input) => {
      capturedUrl = String(input)
      return Promise.resolve(
        okResponse({
          model: 'deepseek-chat',
          choices: [{ message: { content: 'DeepSeek summary result.' } }],
          usage: { prompt_tokens: 45, completion_tokens: 12 }
        })
      )
    }

    const adapter = createDeepSeekGenerationAdapter('sk-deepseek-test-key', customFetch)
    const result = await adapter.generate(operation(), { signal: signal() })

    expect(capturedUrl).toBe('https://api.deepseek.com/chat/completions')
    expect(result.providerMeta.provider).toBe('deepseek')
    expect(result.bundle.blocks[0]!.content).toBe('DeepSeek summary result.')
  })
})

describe('Google Gemini direct generation adapter (CP-PROVIDERS S03)', () => {
  it('generates completion via Gemini OpenAI-compatible endpoint', async () => {
    let capturedUrl = ''
    let capturedHeaders: HeadersInit | undefined

    const customFetch: typeof fetch = (input, init) => {
      capturedUrl = String(input)
      capturedHeaders = init?.headers
      return Promise.resolve(
        okResponse({
          model: 'gemini-2.0-flash',
          choices: [{ message: { content: 'Gemini flash output.' } }],
          usage: { prompt_tokens: 30, completion_tokens: 10 }
        })
      )
    }

    const adapter = createGoogleGenerationAdapter('AIza-test-key', customFetch)
    const result = await adapter.generate(operation(), { signal: signal() })

    expect(capturedUrl).toBe(
      'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions'
    )
    const headers = capturedHeaders as Record<string, string>
    expect(headers['x-goog-api-key']).toBe('AIza-test-key')
    expect(result.providerMeta.provider).toBe('google')
    expect(result.bundle.blocks[0]!.content).toBe('Gemini flash output.')
  })
})
