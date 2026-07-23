import { describe, expect, it } from 'vitest'
import type { VaultFolder } from '../shared/ipc-contract'
import {
  appendChatTurn,
  CHAT_THREAD_MAX_TURNS,
  chatHistoryOf,
  chatNotePathForMessage,
  chatRelPath,
  chatSlug,
  insertionChange,
  newChatFileContent,
  parseChatTurns,
  threadFromTurns
} from '../renderer/src/editor/chat-file'

const DAY = new Date('2026-07-23T14:05:00Z')

describe('chat file naming (S01 pin: chats/YYYY-MM-DD-<slug>.md)', () => {
  it('slugs the first message: lowercased, dashed, hostile chars dropped', () => {
    expect(chatSlug('What is  Attention?')).toBe('what-is-attention')
    expect(chatSlug('a/b\\c:d.md #x')).toBe('a-b-c-d-md-x')
    expect(chatSlug('   ')).toBe('chat')
    expect(chatSlug('x'.repeat(120)).length).toBeLessThanOrEqual(40)
    // an @-quoted link collapses to its label (S06b)
    expect(chatSlug('Compare with [plato](<plato.md>)')).toBe(
      'compare-with-plato'
    )
  })

  it('builds dated paths; collisions retry with a numeric suffix', () => {
    expect(chatRelPath(DAY, 'What is attention?')).toBe(
      'chats/2026-07-23-what-is-attention.md'
    )
    expect(chatRelPath(DAY, 'What is attention?', 3)).toBe(
      'chats/2026-07-23-what-is-attention-3.md'
    )
  })
})

describe('transcript round-trip (a chat IS a note)', () => {
  it('birth content carries the frontmatter pin and the first turn', () => {
    const content = newChatFileContent('mistral', DAY, 'Why softmax?')
    expect(content).toContain('type: Atomik Chat')
    expect(content).toContain('engine: mistral')
    expect(content).toContain('timestamp: 2026-07-23T14:05:00.000Z')
    expect(parseChatTurns(content)).toEqual([
      { role: 'you', text: 'Why softmax?' }
    ])
  })

  it('append → parse recovers every turn in order', () => {
    let content = newChatFileContent('mock', DAY, 'First question')
    content = appendChatTurn(content, 'atomik', 'First answer.\n\nWith two paragraphs.')
    content = appendChatTurn(content, 'you', 'Follow-up?')
    content = appendChatTurn(content, 'atomik', 'Follow-up answer.')
    expect(parseChatTurns(content)).toEqual([
      { role: 'you', text: 'First question' },
      { role: 'atomik', text: 'First answer.\n\nWith two paragraphs.' },
      { role: 'you', text: 'Follow-up?' },
      { role: 'atomik', text: 'Follow-up answer.' }
    ])
  })

  it('parses leniently: preamble ignored, unknown headings stay inside turns, empty turns dropped', () => {
    const edited = [
      '---',
      'type: Atomik Chat',
      '---',
      '',
      'A hand-written intro line.',
      '',
      '## you',
      '',
      'Question with a subsection:',
      '',
      '### details',
      'more',
      '',
      '## atomik',
      '',
      '',
      '## you',
      '',
      'Second question'
    ].join('\n')
    expect(parseChatTurns(edited)).toEqual([
      {
        role: 'you',
        text: 'Question with a subsection:\n\n### details\nmore'
      },
      { role: 'you', text: 'Second question' }
    ])
  })
})

describe('threadFromTurns (wire thread from file turns)', () => {
  it('maps you→user / atomik→assistant', () => {
    expect(
      threadFromTurns([
        { role: 'you', text: 'q' },
        { role: 'atomik', text: 'a' }
      ])
    ).toEqual([
      { role: 'user', content: 'q' },
      { role: 'assistant', content: 'a' }
    ])
  })

  it('caps to the main-side bounds: most recent turns win, oversize turns truncate', () => {
    const many = Array.from({ length: 40 }, (_, index) => ({
      role: (index % 2 === 0 ? 'you' : 'atomik') as 'you' | 'atomik',
      text: `turn ${index}`
    }))
    const thread = threadFromTurns(many)
    expect(thread.length).toBe(CHAT_THREAD_MAX_TURNS)
    expect(thread[thread.length - 1]!.content).toBe('turn 39')
    const big = threadFromTurns([{ role: 'you', text: 'x'.repeat(9000) }])
    expect(big[0]!.content.length).toBe(8000)
  })
})

describe('chatNotePathForMessage (S06b: an answer becomes its own note)', () => {
  it('the first heading names the file, beside the source note', () => {
    const message = "Intro line.\n\n## Discovering Plato's Work\n\nBody."
    expect(chatNotePathForMessage('notes/plato.md', message)).toBe(
      "notes/Discovering Plato's Work.md"
    )
  })

  it('no heading falls back to the first words of the prose', () => {
    const message = '```js\ncode()\n```\nThe most effective way to discover his work is through dialogues.'
    expect(chatNotePathForMessage('notes/plato.md', message)).toBe(
      'notes/The most effective way to discover his work.md'
    )
  })
})

describe('chatHistoryOf (S06b history menu)', () => {
  const tree: VaultFolder = {
    name: '',
    relPath: '',
    notes: [],
    folders: [
      {
        name: 'chats',
        relPath: 'chats',
        folders: [],
        notes: [
          { name: '2026-07-21-old.md', relPath: 'chats/2026-07-21-old.md' },
          { name: 'index.md', relPath: 'chats/index.md' },
          { name: '2026-07-23-new.md', relPath: 'chats/2026-07-23-new.md' },
          { name: 'log.md', relPath: 'chats/log.md' }
        ]
      }
    ]
  }

  it('lists transcripts newest first, convention files excluded', () => {
    expect(chatHistoryOf(tree)).toEqual([
      { name: '2026-07-23-new', relPath: 'chats/2026-07-23-new.md' },
      { name: '2026-07-21-old', relPath: 'chats/2026-07-21-old.md' }
    ])
  })

  it('no chats/ folder reads as an empty history', () => {
    expect(chatHistoryOf({ name: '', relPath: '', notes: [], folders: [] })).toEqual([])
  })
})

describe('insertionChange (the chat → note insert path)', () => {
  it('inserts as its own block mid-document', () => {
    // cursor at the end of 'alpha': a blank line opens before the
    // insertion; the existing newline ahead only needs one more
    const change = insertionChange('alpha\nbeta', 5, 'answer')
    expect(change).toEqual({
      kind: 'replace-range',
      range: { from: 5, to: 5 },
      newText: '\n\nanswer\n'
    })
  })

  it('reuses existing blank separation instead of doubling it', () => {
    const doc = 'alpha\n\nbeta'
    const change = insertionChange(doc, 7, 'answer')
    // cursor at the start of 'beta': blank line already behind, one
    // newline ahead of beta is enough separation to add
    expect(change.kind).toBe('replace-range')
    expect(change.newText).toBe('answer\n\n')
  })

  it('clamps the position and pads a document edge', () => {
    expect(insertionChange('', 99, ' answer ')).toEqual({
      kind: 'replace-range',
      range: { from: 0, to: 0 },
      newText: 'answer\n'
    })
    const atEnd = insertionChange('alpha', 5, 'answer')
    expect(atEnd.newText).toBe('\n\nanswer\n')
  })
})
