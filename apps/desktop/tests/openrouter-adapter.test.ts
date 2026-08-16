import { describe, expect, it } from 'vitest'
import type { AiOperation } from '../shared/ipc-contract'
import { GenerationError } from '../electron-main/generation'
import { createOpenRouterGenerationAdapter } from '../electron-main/openrouter-generation-adapter'
import { PROVIDER_CATALOG } from '../shared/generation-params'

const SELECTION_TEXT = 'Quantum entanglement connects distant states.'

function operation(
  destination: AiOperation['target']['destination'] = { kind: 'append' },
  model?: string
): AiOperation {
  return {
    id: 'op-openrouter-1',
    input: [
      {
        relPath: 'notes/physics.md',
        kind: 'text',
        content: SELECTION_TEXT,
        range: { from: 0, to: SELECTION_TEXT.length }
      }
    ],
    instruction: 'Explain this in one sentence.',
    params: model ? { model } : undefined,
    target: { relPath: 'notes/physics.md', destination }
  }
}

function okResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200 })
}

function openRouterCompletion(
  content: string,
  model = 'mistralai/mistral-small-24b-instruct-2501'
): Record<string, unknown> {
  return {
    id: 'gen-or-123',
    model,
    choices: [{ message: { content }, finish_reason: 'stop' }],
    usage: { prompt_tokens: 140, completion_tokens: 35 }
  }
}

const signal = (): AbortSignal => new AbortController().signal

describe('OpenRouter generation adapter (CP-PROVIDERS S02)', () => {
  it('sends required headers, strict privacy flags and transforms disabled', async () => {
    let capturedUrl = ''
    let capturedHeaders: HeadersInit | undefined
    let capturedBody: Record<string, unknown> = {}

    const customFetch: typeof fetch = (input, init) => {
      capturedUrl = String(input)
      capturedHeaders = init?.headers
      capturedBody = JSON.parse(String(init?.body))
      return Promise.resolve(
        okResponse(openRouterCompletion('Entanglement links quantum states.'))
      )
    }

    const adapter = createOpenRouterGenerationAdapter('sk-or-test-key', customFetch)
    const result = await adapter.generate(operation(), { signal: signal() })

    expect(capturedUrl).toBe('https://openrouter.ai/api/v1/chat/completions')
    const headers = capturedHeaders as Record<string, string>
    expect(headers['authorization']).toBe('Bearer sk-or-test-key')
    expect(headers['HTTP-Referer']).toBe('https://github.com/4tom1k/atomik')
    expect(headers['X-Title']).toBe('Atomik')

    expect(capturedBody['require_parameters']).toBe(true)
    expect(capturedBody['allow_fallbacks']).toBe(false)
    expect(capturedBody['data_collection']).toBe('deny')
    expect(capturedBody['zdr']).toBe(true)
    expect(capturedBody['transforms']).toEqual([])

    expect(result.providerMeta.provider).toBe('openrouter')
    expect(result.providerMeta.location).toBe('cloud-model')
    expect(result.providerMeta.model).toBe(PROVIDER_CATALOG.openrouter.defaultModel)
    expect(result.bundle.blocks[0]!.content).toBe('Entanglement links quantum states.')
  })

  it('respects custom model parameter override', async () => {
    let capturedBody: Record<string, unknown> = {}
    const customFetch: typeof fetch = (_input, init) => {
      capturedBody = JSON.parse(String(init?.body))
      return Promise.resolve(
        okResponse(
          openRouterCompletion(
            'Answer from claude.',
            'anthropic/claude-3.5-haiku'
          )
        )
      )
    }

    const adapter = createOpenRouterGenerationAdapter('sk-or-test-key', customFetch)
    const result = await adapter.generate(
      operation({ kind: 'append' }, 'anthropic/claude-3.5-haiku'),
      { signal: signal() }
    )

    expect(capturedBody['model']).toBe('anthropic/claude-3.5-haiku')
    expect(result.providerMeta.model).toBe('anthropic/claude-3.5-haiku')
  })

  it('maps HTTP 401/403 to auth error without silent fallback', async () => {
    const errorFetch: typeof fetch = () =>
      Promise.resolve(new Response('Unauthorized', { status: 401 }))

    const adapter = createOpenRouterGenerationAdapter('bad-key', errorFetch)
    await expect(
      adapter.generate(operation(), { signal: signal() })
    ).rejects.toThrowError(GenerationError)

    try {
      await adapter.generate(operation(), { signal: signal() })
    } catch (e) {
      expect((e as GenerationError).kind).toBe('auth')
    }
  })

  it('maps HTTP 429 to rate-limit error with retryAfter', async () => {
    const rateLimitFetch: typeof fetch = () =>
      Promise.resolve(
        new Response('Too Many Requests', {
          status: 429,
          headers: { 'retry-after': '15' }
        })
      )

    const adapter = createOpenRouterGenerationAdapter('key', rateLimitFetch)
    try {
      await adapter.generate(operation(), { signal: signal() })
      expect.unreachable('expected rate-limit throw')
    } catch (e) {
      const err = e as GenerationError
      expect(err.kind).toBe('rate-limit')
      expect(err.retryAfterSeconds).toBe(15)
    }
  })

  it('maps HTTP 500 to provider-server error', async () => {
    const serverErrorFetch: typeof fetch = () =>
      Promise.resolve(new Response('Internal Error', { status: 500 }))

    const adapter = createOpenRouterGenerationAdapter('key', serverErrorFetch)
    try {
      await adapter.generate(operation(), { signal: signal() })
      expect.unreachable('expected provider-server throw')
    } catch (e) {
      expect((e as GenerationError).kind).toBe('provider-server')
    }
  })

  it('throws cancelled when abort signal fires', async () => {
    const controller = new AbortController()
    controller.abort()
    const adapter = createOpenRouterGenerationAdapter('key', fetch)

    await expect(
      adapter.generate(operation(), { signal: controller.signal })
    ).rejects.toThrow('operation cancelled')
  })
})
