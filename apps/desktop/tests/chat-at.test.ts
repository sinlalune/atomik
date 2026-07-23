import { describe, expect, it } from 'vitest'
import { applyChatAtPick, chatAtItems } from '../renderer/src/editor/chat-at'
import type { PromptFile } from '../renderer/src/editor/prompts'

const prompts: PromptFile[] = [
  {
    relPath: 'prompts/summarize.md',
    name: 'summarize',
    kind: 'message',
    title: 'Summarize',
    body: 'Summarize the selection.',
    scopeFolder: ''
  },
  {
    relPath: 'prompts/grounded.md',
    name: 'grounded',
    kind: 'system',
    title: 'Grounded',
    body: 'Stay grounded.',
    scopeFolder: ''
  }
] as PromptFile[]

const notes = [
  { name: 'plato', relPath: 'notes/plato.md' },
  { name: 'socrates', relPath: 'notes/socrates.md' }
]

const sources = [{ name: 'republic-scan', dossierPath: 'sources/republic-scan/source.md' }]

describe('chatAtItems (S06b: @ providers → one row list)', () => {
  it('orders prompts (message only) → notes → sources and caps', () => {
    const items = chatAtItems(prompts, notes, sources, '')
    expect(items.map((item) => `${item.kind}:${item.title}`)).toEqual([
      'prompt:Summarize',
      'note:plato',
      'note:socrates',
      'source:republic-scan'
    ])
  })

  it('filters across kinds by name/title, case-insensitive', () => {
    expect(
      chatAtItems(prompts, notes, sources, 'PLA').map((item) => item.title)
    ).toEqual(['plato'])
    expect(
      chatAtItems(prompts, notes, sources, 'summ').map((item) => item.kind)
    ).toEqual(['prompt'])
  })

  it('caps the row count', () => {
    const many = Array.from({ length: 20 }, (_, index) => ({
      name: `note-${index}`,
      relPath: `notes/note-${index}.md`
    }))
    expect(chatAtItems([], many, [], '').length).toBe(10)
  })
})

describe('applyChatAtPick (S06b: the token becomes a quote)', () => {
  it('a note pick replaces the token with a note-relative link', () => {
    const value = 'compare with @pla please'
    const next = applyChatAtPick(
      value,
      13,
      17,
      { kind: 'note', title: 'plato', relPath: 'notes/plato.md' },
      'notes/socrates.md'
    )
    expect(next.text).toBe('compare with [plato](<plato.md>) please')
    expect(next.caret).toBe(13 + '[plato](<plato.md>)'.length)
  })

  it('without an open note the link is vault-relative', () => {
    const next = applyChatAtPick(
      '@rep',
      0,
      4,
      {
        kind: 'source',
        title: 'republic-scan',
        relPath: 'sources/republic-scan/source.md'
      },
      null
    )
    expect(next.text).toBe(
      '[republic-scan](<sources/republic-scan/source.md>) '
    )
  })

  it('a prompt pick inserts the layer directive on its own line', () => {
    const next = applyChatAtPick(
      'explain @sum then stop',
      8,
      12,
      {
        kind: 'prompt',
        title: 'Summarize',
        relPath: 'prompts/summarize.md',
        name: 'summarize'
      },
      'notes/plato.md'
    )
    expect(next.text).toContain('{{prompt: summarize}}')
    // full-line rule: the directive is padded onto its own line
    expect(next.text).toMatch(/\n\{\{prompt: summarize\}\}\n/)
  })
})
