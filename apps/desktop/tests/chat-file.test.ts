import { describe, expect, it } from 'vitest'
import {
  appendChatTurn,
  CHAT_THREAD_MAX_TURNS,
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
