import { describe, expect, it } from 'vitest'
import type { VaultFolder } from '../shared/ipc-contract'
import {
  appendChatTurn,
  chatRenameTarget,
  CHAT_THREAD_MAX_TURNS,
  chatHistoryOf,
  chatNotePathForMessage,
  chatRelPath,
  chatSlug,
  insertionChange,
  newChatFileContent,
  parseChatTurns,
  parseSentMeta,
  serializeSentMeta,
  threadFromTurns,
  withSentMetaOnLastYou
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

  it('builds per-date folder paths (S07b2: day = folder, title date-free); collisions retry with a numeric suffix', () => {
    expect(chatRelPath(DAY, 'What is attention?')).toBe(
      'chats/2026-07-23/what-is-attention.md'
    )
    expect(chatRelPath(DAY, 'What is attention?', 3)).toBe(
      'chats/2026-07-23/what-is-attention-3.md'
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

describe('chatRenameTarget (S06c3: double-click tab rename)', () => {
  it('sanitizes the draft and renames in place (same folder)', () => {
    expect(chatRenameTarget('chats/2026-07-23-q.md', 'Plato deep dive')).toBe(
      'chats/Plato deep dive.md'
    )
    expect(chatRenameTarget('chats/q.md', 'a/b:c.md')).toBe('chats/a b c.md')
  })

  it('returns null for empty, unusable, or unchanged drafts', () => {
    expect(chatRenameTarget('chats/q.md', '   ')).toBeNull()
    expect(chatRenameTarget('chats/q.md', '...')).toBeNull()
    expect(chatRenameTarget('chats/q.md', 'q')).toBeNull()
  })
})

describe('sent-breakdown persistence (S07b10 — pills survive reload in the file)', () => {
  const parts = [
    { kind: 'system', label: 'system', chars: 1372 },
    { kind: 'context', label: 'Braxton Hicks', chars: 2900 },
    { kind: 'template', label: 'template', chars: 780 }
  ]

  it('serialize → parse round-trips; labels sanitize; garbage reads as null', () => {
    const meta = serializeSentMeta(parts)
    expect(meta).toBe('system=1372|context=2900:Braxton Hicks|template=780')
    expect(parseSentMeta(meta)).toEqual(parts)
    expect(
      serializeSentMeta([{ kind: 'context', label: 'a|b=c:d', chars: 1 }])
    ).toBe('context=1:a/b/c/d')
    expect(parseSentMeta('not meta at all')).toBeNull()
    expect(parseSentMeta('')).toBeNull()
  })

  it('the ANSWER write stamps the LAST you heading; earlier ones stay', () => {
    let content = newChatFileContent('mistral', DAY, 'First question')
    content = appendChatTurn(content, 'atomik', 'First answer.')
    content = appendChatTurn(content, 'you', 'Second question')
    const stamped = withSentMetaOnLastYou(content, serializeSentMeta(parts))
    expect(stamped).toContain('## you <!-- sent: system=1372|')
    // only the LAST you-turn carries it
    expect(stamped.indexOf('<!-- sent:')).toBeGreaterThan(
      stamped.indexOf('First answer.')
    )
    // re-stamping replaces, never duplicates
    const restamped = withSentMetaOnLastYou(
      stamped,
      serializeSentMeta([{ kind: 'system', label: 'system', chars: 4 }])
    )
    expect(restamped.match(/<!-- sent:/g)).toHaveLength(1)
    expect(restamped).toContain('sent: system=4')
    // no you-turn = unchanged
    expect(withSentMetaOnLastYou('# just prose', 'system=1')).toBe('# just prose')
  })

  it('parseChatTurns reads the meta back and stays lenient', () => {
    let content = newChatFileContent('mistral', DAY, 'Question?')
    content = withSentMetaOnLastYou(content, serializeSentMeta(parts))
    content = appendChatTurn(content, 'atomik', 'Answer.')
    const turns = parseChatTurns(content)
    expect(turns).toHaveLength(2)
    expect(turns[0]!.sent).toEqual(parts)
    expect(turns[1]!.sent).toBeUndefined()
    // an unknown heading comment is ignored but still starts the turn
    const foreign = parseChatTurns(
      '## you <!-- some note -->\n\nHello\n\n## atomik\n\nHi\n'
    )
    expect(foreign.map((turn) => turn.role)).toEqual(['you', 'atomik'])
    expect(foreign[0]!.sent).toBeUndefined()
    // a mangled sent comment degrades to no meta, turn intact
    const mangled = parseChatTurns('## you <!-- sent: ??? -->\n\nHello\n')
    expect(mangled[0]!.text).toBe('Hello')
    expect(mangled[0]!.sent).toBeUndefined()
  })
})

describe('chatHistoryOf (S06b history menu; S07b2 per-date folders)', () => {
  const tree: VaultFolder = {
    name: '',
    relPath: '',
    notes: [],
    folders: [
      {
        name: 'chats',
        relPath: 'chats',
        folders: [
          {
            name: '2026-07-22',
            relPath: 'chats/2026-07-22',
            folders: [],
            notes: [
              { name: 'mid.md', relPath: 'chats/2026-07-22/mid.md' },
              { name: 'index.md', relPath: 'chats/2026-07-22/index.md' }
            ]
          },
          {
            name: '2026-07-24',
            relPath: 'chats/2026-07-24',
            folders: [],
            notes: [
              { name: 'newest.md', relPath: 'chats/2026-07-24/newest.md' }
            ]
          }
        ],
        notes: [
          { name: '2026-07-21-old.md', relPath: 'chats/2026-07-21-old.md' },
          { name: 'index.md', relPath: 'chats/index.md' },
          { name: '2026-07-23-new.md', relPath: 'chats/2026-07-23-new.md' },
          { name: 'log.md', relPath: 'chats/log.md' }
        ]
      }
    ]
  }

  it('interleaves flat-era and per-date transcripts newest first, convention files excluded at both levels', () => {
    expect(chatHistoryOf(tree)).toEqual([
      { name: 'newest', relPath: 'chats/2026-07-24/newest.md' },
      { name: '2026-07-23-new', relPath: 'chats/2026-07-23-new.md' },
      { name: 'mid', relPath: 'chats/2026-07-22/mid.md' },
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
