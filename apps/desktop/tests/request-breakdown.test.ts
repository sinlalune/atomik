import { describe, expect, it } from 'vitest'
import type { AiOperation } from '../shared/ipc-contract'
import {
  composeSystemPrompt,
  composeUserMessage,
  requestAsText
} from '../shared/prompt-composition'
import { requestBreakdown } from '../renderer/src/editor/request-breakdown'

/** A chat-shaped operation (append destination, one context note). */
function operation(overrides: Partial<AiOperation> = {}): AiOperation {
  return {
    id: 'op-1',
    input: [
      {
        relPath: 'philosophy/stoicism.md',
        kind: 'text',
        content: 'Stoicism teaches the dichotomy of control.',
        range: { from: 0, to: 42 }
      }
    ],
    instruction: 'Explain this simply.',
    target: {
      relPath: 'chats/2026-08-03/chat.md',
      destination: { kind: 'append' }
    },
    ...overrides
  }
}

describe('requestBreakdown (S07b4 — the input total, explained)', () => {
  it('one pill per part: system, instruction, context, template', () => {
    const breakdown = requestBreakdown(operation())
    expect(breakdown.parts.map((part) => part.kind)).toEqual([
      'system',
      'instruction',
      'context',
      'template'
    ])
    const context = breakdown.parts.find((part) => part.kind === 'context')!
    expect(context.label).toBe('stoicism')
    expect(context.chars).toBe('Stoicism teaches the dichotomy of control.'.length)
    expect(context.tokensEst).toBe(Math.ceil(context.chars / 4))
  })

  it('history, extra documents, and note context join as their own pills', () => {
    const breakdown = requestBreakdown(
      operation({
        thread: [
          { role: 'user', content: 'Earlier question' },
          { role: 'assistant', content: 'Earlier answer' }
        ],
        input: [
          {
            relPath: 'philosophy/stoicism.md',
            kind: 'text',
            content: 'Subject text.',
            range: { from: 0, to: 13 }
          },
          {
            relPath: 'sources/pdf/meditations/source.md',
            kind: 'text',
            content: 'Quoted document text.',
            range: { from: 0, to: 21 }
          }
        ],
        noteContext: { kind: 'append', tail: 'The note ends here.' }
      })
    )
    const kinds = breakdown.parts.map((part) => part.kind)
    expect(kinds).toEqual([
      'system',
      'history',
      'instruction',
      'context',
      'document',
      'note-context',
      'template'
    ])
    const history = breakdown.parts.find((part) => part.kind === 'history')!
    expect(history.label).toBe('history · 2 turns')
    expect(history.chars).toBe('Earlier question'.length + 'Earlier answer'.length)
    expect(breakdown.parts.find((part) => part.kind === 'document')!.label).toBe(
      'source'
    )
  })

  it('accounts for the whole wire request: total ≈ system + history + user', () => {
    const op = operation({
      thread: [{ role: 'user', content: 'Prior turn.' }]
    })
    const breakdown = requestBreakdown(op)
    const systemText = composeSystemPrompt(undefined, 'append')
    const userText = composeUserMessage('Explain this simply.', [
      {
        content: 'Stoicism teaches the dichotomy of control.',
        relPath: 'philosophy/stoicism.md'
      }
    ])
    expect(breakdown.totalTokensEst).toBe(
      Math.ceil((systemText.length + 'Prior turn.'.length + userText.length) / 4)
    )
    // template pill = exactly the user-message scaffolding
    const template = breakdown.parts.find((part) => part.kind === 'template')!
    expect(template.chars).toBe(
      userText.length -
        'Explain this simply.'.length -
        'Stoicism teaches the dichotomy of control.'.length
    )
  })

  it('copy text is the inline inspector format, built-in overrides included (display = sent)', () => {
    const op = operation({ builtins: { identity: 'You are Juju.' } })
    const breakdown = requestBreakdown(op)
    expect(breakdown.requestText).toBe(
      requestAsText(
        composeSystemPrompt(undefined, 'append', { identity: 'You are Juju.' }),
        composeUserMessage('Explain this simply.', [
          {
            content: 'Stoicism teaches the dichotomy of control.',
            relPath: 'philosophy/stoicism.md'
          }
        ])
      )
    )
    expect(breakdown.requestText).toContain('You are Juju.')
  })
})
