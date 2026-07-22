import { describe, expect, it } from 'vitest'
import type { AiOperation } from '../shared/ipc-contract'
import { GenerationError, mockGenerationAdapter } from '../electron-main/generation'
import {
  buildMessages,
  createMistralGenerationAdapter,
  estimateCostUsd,
  extractClaimCandidates,
  GENERATION_PRICE_SNAPSHOT,
  MISTRAL_SMALL_MODEL
} from '../electron-main/mistral-generation-adapter'

/**
 * CP-MVP-008 S02: the Mistral adapter on FIXTURES ONLY — request
 * building, response → bundle mapping, the error taxonomy. No live API
 * call ever runs here; the env-gated ATOMIK_SMOKE_AI_LIVE rung proves
 * the live chain.
 */

const SELECTION_TEXT = 'Attention compares queries with keys.'

function operation(
  destination: AiOperation['target']['destination'] = { kind: 'append' }
): AiOperation {
  return {
    id: 'op-1',
    input: [
      {
        relPath: 'notes/attention.md',
        kind: 'text',
        content: SELECTION_TEXT,
        range: { from: 0, to: SELECTION_TEXT.length }
      }
    ],
    instruction: 'Explain this simply.',
    target: { relPath: 'notes/attention.md', destination }
  }
}

type FetchStub = typeof fetch

function okResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200 })
}

function completion(
  content: string,
  extras: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    model: MISTRAL_SMALL_MODEL,
    choices: [{ message: { content }, finish_reason: 'stop' }],
    usage: { prompt_tokens: 120, completion_tokens: 40 },
    ...extras
  }
}

const fetchReturning =
  (response: Response): FetchStub =>
  () =>
    Promise.resolve(response)

const signal = (): AbortSignal => new AbortController().signal

describe('buildMessages (operation → chat completions)', () => {
  it('sends system first, then instruction + fenced selection with its relPath', () => {
    const messages = buildMessages(operation())
    expect(messages).toHaveLength(2)
    expect(messages[0]!.role).toBe('system')
    expect(messages[0]!.content).toContain('APPENDED')
    expect(messages[1]!.role).toBe('user')
    // S04k/S04l: the instruction travels BLOCKQUOTED inside the
    // layered template — its markdown reads as quoted guidance
    expect(messages[1]!.content).toContain('# Request')
    expect(messages[1]!.content).toContain(
      '## Instruction — style and behavior guidance (quoted)'
    )
    expect(messages[1]!.content).toContain('> Explain this simply.')
    expect(messages[1]!.content).toContain('notes/attention.md')
    expect(messages[1]!.content).toContain(SELECTION_TEXT)
  })

  it('both messages follow the layered template (S04l): # sections, ## subsections', () => {
    const messages = buildMessages(operation())
    const system = messages[0]!.content
    expect(system).toContain('# Role')
    expect(system).toContain('# Rules')
    expect(system).toContain('## Grounding')
    expect(system).toContain('## Output')
    const user = messages[1]!.content
    expect(user).toContain('## Subject')
    expect(user).toContain('### Selection 1')
    expect(user).toContain('## Steps')
  })

  it('append/replace carry the note context with a landing point (S04l)', () => {
    const appendOp = operation()
    appendOp.noteContext = { kind: 'append', tail: '## Existing section\nOld text.' }
    const appendUser = buildMessages(appendOp)[1]!.content
    expect(appendUser).toContain('## Note context — read-only')
    expect(appendUser).toContain('### The note currently ends with')
    expect(appendUser).toContain('## Existing section')
    expect(appendUser).toContain('APPENDED right after the ending shown above')
    expect(appendUser).toContain('do NOT duplicate')

    const replaceOp = operation({ kind: 'replace-selection' })
    replaceOp.noteContext = {
      kind: 'replace',
      before: 'Text before.',
      after: 'Text after.'
    }
    const replaceUser = buildMessages(replaceOp)[1]!.content
    expect(replaceUser).toContain('### Content immediately BEFORE the replaced passage')
    expect(replaceUser).toContain('Text before.')
    expect(replaceUser).toContain('### Content immediately AFTER the replaced passage')
    expect(replaceUser).toContain('read seamlessly')
    // integration step appears only when context travels
    expect(replaceUser).toContain('3. Check the note context')
    expect(buildMessages(operation())[1]!.content).not.toContain('3. Check the note context')
  })

  it('the selection is the SUBJECT; the path is trailing provenance (S04d)', () => {
    const messages = buildMessages(operation())
    const user = messages[1]!.content
    // subject-first block: the header carries no path; the path rides
    // a trailing provenance line AFTER the content
    expect(user).toContain('### Selection 1')
    expect(user).not.toContain('Selection 1 — from')
    expect(user.indexOf(SELECTION_TEXT)).toBeLessThan(
      user.indexOf('provenance: `notes/attention.md`')
    )
    // and the system prompt pins the rule
    expect(messages[0]!.content).toContain('never infer the topic from a path')
  })

  it('the shared composer IS the wire — display/copy equal what travels (S04h/i)', async () => {
    const { composeSystemPrompt, composeUserMessage, requestAsText } = await import(
      '../shared/prompt-composition'
    )
    const messages = buildMessages(operation())
    expect(messages[0]!.content).toBe(composeSystemPrompt(undefined, 'append'))
    expect(messages[1]!.content).toBe(
      composeUserMessage('Explain this simply.', [
        { content: SELECTION_TEXT, relPath: 'notes/attention.md' }
      ])
    )
    const custom = operation()
    custom.systemPrompt = 'Custom identity.'
    expect(buildMessages(custom)[0]!.content).toBe(
      composeSystemPrompt('Custom identity.', 'append')
    )
    // the portable copy carries both halves verbatim
    const portable = requestAsText(messages[0]!.content, messages[1]!.content)
    expect(portable).toContain('=== SYSTEM ===')
    expect(portable).toContain('=== USER ===')
    expect(portable).toContain(SELECTION_TEXT)
  })

  it('a prompt-file system prompt replaces the identity, never the grounding rules (S03)', () => {
    const custom = operation()
    custom.systemPrompt = 'You are a terse research assistant.'
    const system = buildMessages(custom)[0]!.content
    expect(system).toContain('You are a terse research assistant.')
    expect(system).not.toContain('AI assistant inside Atomik')
    // the mechanical contract survives any prompt file
    expect(system).toContain('EXACTLY')
    expect(system).toContain('APPENDED')
  })

  it('phrases the destination brief per kind', () => {
    expect(
      buildMessages(operation({ kind: 'replace-selection' }))[0]!.content
    ).toContain('REPLACES')
    expect(
      buildMessages(
        operation({ kind: 'new-note', newNotePath: 'notes/new.md' })
      )[0]!.content
    ).toContain('NEW standalone note')
  })
})

describe('extractClaimCandidates (deterministic, form-only)', () => {
  it('splits prose sentences, drops fences and short fragments, caps at 32', () => {
    const answer = [
      'The selection describes how attention compares queries with keys.',
      '',
      '```',
      'code that must never become a claim candidate sentence here',
      '```',
      'Short.',
      'A second real sentence that is long enough to matter for labeling.'
    ].join('\n')
    const candidates = extractClaimCandidates(answer, 'block-1')
    expect(candidates.map((candidate) => candidate.text)).toEqual([
      'The selection describes how attention compares queries with keys.',
      'A second real sentence that is long enough to matter for labeling.'
    ])
    expect(candidates.every((candidate) => candidate.blockId === 'block-1')).toBe(true)
    const many = Array.from(
      { length: 50 },
      (_, index) => `Sentence number ${index} padded to pass the length floor easily.`
    ).join(' ')
    expect(extractClaimCandidates(many, 'b').length).toBe(32)
  })
})

describe('mistral adapter — response → bundle mapping', () => {
  it('maps a completion to answer block + append proposal + mechanical labels', async () => {
    const answer = `A summary of the note.\n\n${SELECTION_TEXT}`
    const adapter = createMistralGenerationAdapter(
      'sk-test',
      fetchReturning(okResponse(completion(answer)))
    )
    const result = await adapter.generate(operation(), { signal: signal() })

    expect(result.bundle.operationId).toBe('op-1')
    expect(result.bundle.blocks).toHaveLength(1)
    expect(result.bundle.blocks[0]!.role).toBe('answer')
    expect(result.bundle.blocks[0]!.content).toBe(answer)
    const file = result.bundle.patchProposals[0]!.files[0]!
    expect(file.kind).toBe('append')
    expect(file.newText).toContain(answer)
    // the exact quote of the selection is source-backed via the checker;
    // the paraphrase defaults model-only — the model never self-grades
    const labels = new Map(
      result.bundle.claims.map((claim) => [claim.text, claim.label])
    )
    expect(labels.get(SELECTION_TEXT)).toBe('source-backed')
    expect(labels.get('A summary of the note.')).toBeUndefined() // below length floor
    expect(result.bundle.uncertainties).toEqual([])
  })

  it('maps replace-selection and new-note destinations', async () => {
    const replace = await createMistralGenerationAdapter(
      'sk-test',
      fetchReturning(okResponse(completion('Rewritten.')))
    ).generate(operation({ kind: 'replace-selection' }), { signal: signal() })
    const replaceFile = replace.bundle.patchProposals[0]!.files[0]!
    expect(replaceFile.kind).toBe('replace-range')
    expect(replaceFile).toMatchObject({
      relPath: 'notes/attention.md',
      newText: 'Rewritten.'
    })

    const created = await createMistralGenerationAdapter(
      'sk-test',
      fetchReturning(okResponse(completion('# New note')))
    ).generate(operation({ kind: 'new-note', newNotePath: 'notes/new.md' }), {
      signal: signal()
    })
    const createdFile = created.bundle.patchProposals[0]!.files[0]!
    expect(createdFile.kind).toBe('create')
    expect(createdFile.relPath).toBe('notes/new.md')
  })

  it('reports provider usage + snapshot-estimated USD cost in providerMeta', async () => {
    const adapter = createMistralGenerationAdapter(
      'sk-test',
      fetchReturning(okResponse(completion('An answer that is fine.')))
    )
    const result = await adapter.generate(operation(), { signal: signal() })
    expect(result.usage).toEqual({
      inputTokens: 120,
      outputTokens: 40,
      basis: 'provider-reported'
    })
    expect(result.providerMeta).toMatchObject({
      location: 'cloud-model',
      provider: 'mistral',
      model: 'mistral-small',
      modelVersion: MISTRAL_SMALL_MODEL
    })
    expect(result.providerMeta.billing).toEqual({
      currency: 'USD',
      estimatedAmount: estimateCostUsd({ inputTokens: 120, outputTokens: 40 }),
      basis: 'estimated',
      priceSnapshotId: GENERATION_PRICE_SNAPSHOT.id
    })
    expect(estimateCostUsd({ inputTokens: 1_000_000, outputTokens: 1_000_000 })).toBe(
      GENERATION_PRICE_SNAPSHOT.inputUsdPerMTok +
        GENERATION_PRICE_SNAPSHOT.outputUsdPerMTok
    )
  })

  it('falls back to labeled estimated usage when the provider omits it', async () => {
    const adapter = createMistralGenerationAdapter(
      'sk-test',
      fetchReturning(okResponse(completion('An answer.', { usage: undefined })))
    )
    const result = await adapter.generate(operation(), { signal: signal() })
    expect(result.usage?.basis).toBe('estimated')
    expect(result.usage?.inputTokens).toBeGreaterThan(0)
  })

  it('flags a truncated completion as an uncertainty', async () => {
    const body = completion('A cut-off answer that still parses correctly here.')
    ;(body['choices'] as Array<Record<string, unknown>>)[0]!['finish_reason'] = 'length'
    const adapter = createMistralGenerationAdapter('sk-test', fetchReturning(okResponse(body)))
    const result = await adapter.generate(operation(), { signal: signal() })
    expect(result.bundle.uncertainties[0]?.message).toContain('token output budget')
  })
})

describe('mistral adapter — error taxonomy (never a silent mock fallback)', () => {
  const kindOf = async (promise: Promise<unknown>): Promise<string> => {
    try {
      await promise
      return 'no-error'
    } catch (error) {
      expect(error).toBeInstanceOf(GenerationError)
      expect(String(error)).toContain(`ai(${(error as GenerationError).kind})`)
      return (error as GenerationError).kind
    }
  }

  it('maps 401/403 to auth', async () => {
    const adapter = createMistralGenerationAdapter(
      'sk-bad',
      fetchReturning(new Response('unauthorized', { status: 401 }))
    )
    expect(await kindOf(adapter.generate(operation(), { signal: signal() }))).toBe('auth')
  })

  it('maps 429 to rate-limit and surfaces retry-after without retrying', async () => {
    let calls = 0
    const stub: FetchStub = () => {
      calls += 1
      return Promise.resolve(
        new Response('slow down', { status: 429, headers: { 'retry-after': '7' } })
      )
    }
    const adapter = createMistralGenerationAdapter('sk-test', stub)
    try {
      await adapter.generate(operation(), { signal: signal() })
      expect.unreachable()
    } catch (error) {
      expect((error as GenerationError).kind).toBe('rate-limit')
      expect((error as GenerationError).retryAfterSeconds).toBe(7)
    }
    expect(calls).toBe(1)
  })

  it('maps other 4xx to provider-request and 5xx to provider-server', async () => {
    expect(
      await kindOf(
        createMistralGenerationAdapter(
          'sk-test',
          fetchReturning(new Response('bad request', { status: 422 }))
        ).generate(operation(), { signal: signal() })
      )
    ).toBe('provider-request')
    expect(
      await kindOf(
        createMistralGenerationAdapter(
          'sk-test',
          fetchReturning(new Response('boom', { status: 503 }))
        ).generate(operation(), { signal: signal() })
      )
    ).toBe('provider-server')
  })

  it('maps a network throw to offline', async () => {
    const stub: FetchStub = () => Promise.reject(new TypeError('fetch failed'))
    expect(
      await kindOf(
        createMistralGenerationAdapter('sk-test', stub).generate(operation(), {
          signal: signal()
        })
      )
    ).toBe('offline')
  })

  it('distinguishes timeout from a user cancel', async () => {
    const hangUntilAborted: FetchStub = (_url, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () =>
          reject(new DOMException('aborted', 'AbortError'))
        )
      })
    expect(
      await kindOf(
        createMistralGenerationAdapter('sk-test', hangUntilAborted, {
          maxWallMs: 10
        }).generate(operation(), { signal: signal() })
      )
    ).toBe('timeout')

    const controller = new AbortController()
    const pending = createMistralGenerationAdapter('sk-test', hangUntilAborted).generate(
      operation(),
      { signal: controller.signal }
    )
    controller.abort()
    expect(await kindOf(pending)).toBe('cancelled')
  })

  it('pre-checks the input token budget main-side', async () => {
    const never: FetchStub = () => {
      throw new Error('fetch must not run — the budget check comes first')
    }
    const huge = operation()
    huge.input = Array.from({ length: 5 }, (_, index) => ({
      relPath: `notes/big-${index}.md`,
      kind: 'text' as const,
      content: 'x'.repeat(100_000),
      range: { from: 0, to: 100_000 }
    }))
    expect(
      await kindOf(
        createMistralGenerationAdapter('sk-test', never).generate(huge, {
          signal: signal()
        })
      )
    ).toBe('budget-exceeded')
  })

  it('treats an empty completion as provider-request', async () => {
    const adapter = createMistralGenerationAdapter(
      'sk-test',
      fetchReturning(okResponse(completion('   ')))
    )
    expect(await kindOf(adapter.generate(operation(), { signal: signal() }))).toBe(
      'provider-request'
    )
  })
})

describe('mock engine behind the seam', () => {
  it('serves the S08 bundle with deterministic identity', async () => {
    const result = await mockGenerationAdapter.generate(operation(), {
      signal: signal()
    })
    expect(result.bundle.blocks.length).toBeGreaterThan(0)
    expect(result.usage).toBeUndefined()
    expect(result.providerMeta).toEqual({
      location: 'deterministic',
      provider: 'atomik',
      model: 'mock',
      modelVersion: 's08'
    })
  })
})
