import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  agentTraceRecordOf,
  parseAgentTraceNote,
  serializeAgentTraceNote,
  type AgentTraceInput
} from '../shared/agent-trace'
import { persistAgentTrace } from '../renderer/src/workspace/agent-trace-note'
import {
  chatTraceFolder,
  chatTracePath,
  chatHistoryOf,
  parseChatTurns,
  parseTraceMeta,
  serializeTraceMeta
} from '../renderer/src/editor/chat-file'

const view = readFileSync(
  new URL('../renderer/src/workspace/ChatView.tsx', import.meta.url),
  'utf8'
)

/** The prose a tool result carries to the model — the one thing the trace
 *  must never keep. Distinctive on purpose: the tests grep the whole note. */
const FETCHED_PROSE =
  'La biologie est la science qui etudie le vivant DISTINCTIVE-EXTRACT'
const PACKET_EXCERPT = 'a vault note excerpt DISTINCTIVE-EXCERPT'

const wikiExecution = {
  call: {
    id: 'call_1',
    name: 'search_wiki',
    arguments: { query: 'biologie', corpus: 'auto', language: 'fr', limit: 3 }
  },
  result: {
    callId: 'call_1',
    name: 'search_wiki',
    ok: true,
    untrusted: true as const,
    content: FETCHED_PROSE,
    stats: { resultCount: 3, chars: 4210, bytes: 3_400_000, wallMs: 11_800 }
  },
  payload: undefined
}

const failedExecution = {
  call: {
    id: 'call_2',
    name: 'search_vault',
    arguments: { query: 'biologie', sensitivity: 'linked', limit: 4 }
  },
  result: {
    callId: 'call_2',
    name: 'search_vault',
    ok: false,
    untrusted: true as const,
    content: '',
    stats: { resultCount: 0, chars: 0, bytes: 0, wallMs: 12 },
    error: { code: 'budget-exhausted' as const, message: 'call budget spent' }
  }
}

const packet = {
  id: 'packet_1',
  query: 'que sait-on de la biologie',
  scope: { kind: 'vault' } as never,
  strategy: 'lexical-first' as const,
  retrieval: {
    stages: ['direct', 'lexical'] as never,
    candidates: 12,
    selected: 2,
    contextTokens: 480
  },
  budget: { maxTokens: 2000, policy: 'balanced' },
  coverage: {
    verdict: 'thin' as const,
    matchedTerms: ['biologie'],
    missingTerms: ['cellule']
  },
  entries: [
    {
      path: 'notes/bio.md',
      title: 'Bio',
      stage: 'lexical' as never,
      reason: 'matched biologie',
      score: 4.2,
      excerpt: PACKET_EXCERPT,
      tokens: 240
    }
  ],
  omitted: [{ path: 'chats/2026-08-19/x.md', reason: 'dialogue' as const }]
}

const baseInput = (): AgentTraceInput => ({
  chat: 'chats/2026-08-19/biologie.md',
  turn: 1,
  timestamp: '2026-08-19T10:00:00.000Z',
  engine: 'gemini-3.7-flash',
  operationId: 'op_1',
  bundleId: 'bundle_1',
  grounding: { sensitivity: 'linked' },
  tools: {
    mode: 'model',
    wikiLanguage: 'fr',
    vault: true,
    wikiReach: 'standard',
    wikiSources: {
      wikipedia: true,
      wikidata: true,
      media: true,
      wiktionary: true
    }
  },
  threadTurns: 2,
  sent: [{ kind: 'message', label: 'message', chars: 26 }],
  packet: packet as never,
  executions: [wikiExecution as never, failedExecution as never],
  consulted: {
    sources: [
      {
        number: 1,
        url: 'https://fr.wikipedia.org/wiki/Biologie',
        kind: 'wikipedia-article',
        title: 'Biologie',
        project: 'wikipedia',
        language: 'fr',
        revision: '238521024',
        accessedAt: '2026-08-19T09:59:00.000Z',
        license: { name: 'CC BY-SA 4.0', url: 'https://example.org/l' }
      }
    ],
    media: [
      {
        url: 'https://upload.wikimedia.org/x.jpg',
        thumbnailUrl: 'https://upload.wikimedia.org/thumb.jpg',
        title: 'Cell.jpg',
        creator: 'A. Photographer',
        license: { name: 'CC BY 4.0', url: 'https://example.org/m' },
        sourcePage: 'https://commons.wikimedia.org/wiki/File:Cell.jpg',
        width: 800,
        height: 600
      }
    ],
    notes: [
      { path: 'notes/bio.md', title: 'Bio', stage: 'tool', reason: 'r', tokens: 240 }
    ],
    warnings: [{ kind: 'truncated', message: 'one page skipped' }]
  },
  usage: { inputTokens: 1200, outputTokens: 430, basis: 'provider-reported' },
  billing: { currency: 'USD', estimatedAmount: 0.0034, basis: 'estimated' },
  durationMs: 11_900,
  actionTraceIds: ['trace_a']
})

describe('the agent trace record (CP-MVP-011 S07g)', () => {
  it('records what the model ASKED — the query is the audit', () => {
    const record = agentTraceRecordOf(baseInput())
    expect(record.calls.map((call) => call.name)).toEqual([
      'search_wiki',
      'search_vault'
    ])
    expect(record.calls[0]!.arguments).toEqual({
      query: 'biologie',
      corpus: 'auto',
      language: 'fr',
      limit: 3
    })
    // A failed call is the one an audit most needs to see.
    expect(record.calls[1]!.ok).toBe(false)
    expect(record.calls[1]!.error).toEqual({
      code: 'budget-exhausted',
      message: 'call budget spent'
    })
    expect(record.calls[0]!.stats.bytes).toBe(3_400_000)
  })

  it('never keeps the fetched PUBLIC prose', () => {
    // ADR-015: consultation is transient. A durable copy of public material
    // is what Save as source exists to make, deliberately and with licence.
    const note = serializeAgentTraceNote(agentTraceRecordOf(baseInput()))
    expect(note).not.toContain(FETCHED_PROSE)
    expect(note).not.toContain('DISTINCTIVE-EXTRACT')
    // ...while the IDENTITIES that make it checkable are all there.
    expect(note).toContain('https://fr.wikipedia.org/wiki/Biologie')
    expect(note).toContain('238521024')
    expect(note).toContain('CC BY-SA 4.0')
    expect(note).toContain('A. Photographer')
    expect(note).toContain('notes/bio.md')
  })

  it('DOES keep the vault excerpt it sent — that note is already yours', () => {
    // S07h, the owner's question: the line falls the other way for the
    // packet. Quoting a note that lives one folder away duplicates nothing,
    // and it is the only way to see what was actually read of your own vault
    // once the tab is closed.
    const note = serializeAgentTraceNote(agentTraceRecordOf(baseInput()))
    expect(note).toContain(PACKET_EXCERPT)
  })

  it('keeps the coverage terms that explain why it went outside', () => {
    const record = agentTraceRecordOf(baseInput())
    expect(record.packet?.coverage).toEqual({
      verdict: 'thin',
      matchedTerms: ['biologie'],
      missingTerms: ['cellule']
    })
    expect(record.packet?.entries).toEqual([
      {
        path: 'notes/bio.md',
        stage: 'lexical',
        reason: 'matched biologie',
        tokens: 240,
        excerpt: PACKET_EXCERPT
      }
    ])
    expect(record.packet?.omitted).toEqual([
      { path: 'chats/2026-08-19/x.md', reason: 'dialogue' }
    ])
  })

  it('stays valid when the engine reports nothing and no packet was compiled', () => {
    const input = baseInput()
    delete input.packet
    delete input.usage
    delete input.billing
    delete input.durationMs
    const record = agentTraceRecordOf({ ...input, grounding: null, tools: null })
    expect(record.packet).toBeNull()
    expect(record.usage).toBeNull()
    expect(record.billing).toBeNull()
    expect(record.durationMs).toBeNull()
    expect(record.calls).toHaveLength(2)
  })

  it('names itself in plain text and links its chat as a wikilink', () => {
    // S07h: an H1 with a markdown link inside it became the note's TITLE in
    // every pill and relation sentence — `[chats/…](<chats/…>)` as a name.
    const note = serializeAgentTraceNote(agentTraceRecordOf(baseInput()))
    expect(note).toContain('# Agent trace — biologie · turn 1')
    expect(note).not.toContain('# Agent trace — [')
    expect(note).toContain('Chat: [[chats/2026-08-19/biologie]]')
  })

  it('round-trips through the note as one JSON block', () => {
    const record = agentTraceRecordOf(baseInput())
    const note = serializeAgentTraceNote(record)
    expect(note).toContain('type: Atomik Agent Trace')
    expect(note).toContain('chats/2026-08-19/biologie.md')
    expect(parseAgentTraceNote(note)).toEqual(record)
  })

  it('reads a mangled or foreign note as no record', () => {
    expect(parseAgentTraceNote('# just a note\n')).toBeNull()
    expect(parseAgentTraceNote('```json\n{ "version": 1\n```')).toBeNull()
    expect(parseAgentTraceNote('```json\n{ "version": 99 }\n```')).toBeNull()
  })
})

describe('where the trace lives (CP-MVP-011 S07g)', () => {
  it('sits in a folder named after the transcript, beside it', () => {
    expect(chatTraceFolder('chats/2026-08-19/biologie.md')).toBe(
      'chats/2026-08-19/biologie-traces'
    )
    expect(chatTracePath('chats/2026-08-19/biologie.md', 1)).toBe(
      'chats/2026-08-19/biologie-traces/turn-01.md'
    )
    // Zero-padded so the folder sorts the way the conversation ran.
    expect(chatTracePath('chats/2026-08-19/biologie.md', 12)).toBe(
      'chats/2026-08-19/biologie-traces/turn-12.md'
    )
    expect(chatTracePath('chats/2026-08-19/biologie.md', 1, 3)).toBe(
      'chats/2026-08-19/biologie-traces/turn-01-3.md'
    )
  })

  it('never shows up in the chat history menu', () => {
    const history = chatHistoryOf({
      name: 'vault',
      relPath: '',
      notes: [],
      folders: [
        {
          name: 'chats',
          relPath: 'chats',
          notes: [],
          folders: [
            {
              name: '2026-08-19',
              relPath: 'chats/2026-08-19',
              notes: [
                { name: 'biologie.md', relPath: 'chats/2026-08-19/biologie.md' }
              ],
              folders: [
                {
                  name: 'biologie-traces',
                  relPath: 'chats/2026-08-19/biologie-traces',
                  notes: [
                    {
                      name: 'turn-01.md',
                      relPath: 'chats/2026-08-19/biologie-traces/turn-01.md'
                    }
                  ],
                  folders: []
                }
              ]
            }
          ]
        }
      ]
    } as never)
    expect(history).toEqual([
      { name: 'biologie', relPath: 'chats/2026-08-19/biologie.md' }
    ])
  })
})

describe('the transcript links its trace (CP-MVP-011 S07g)', () => {
  it('carries the path as a heading comment, invisible in the render', () => {
    const turns = parseChatTurns(
      [
        '---',
        'type: Atomik Chat',
        '---',
        '',
        '## you',
        '',
        'question',
        '',
        '## atomik <!-- run: ms=1200 --> <!-- trace:chats/2026-08-19/biologie-traces/turn-01.md -->',
        '',
        'answer',
        ''
      ].join('\n')
    )
    expect(turns[1]?.trace).toBe('chats/2026-08-19/biologie-traces/turn-01.md')
    expect(turns[1]?.text).toBe('answer')
    expect(turns[1]?.run?.durationMs).toBe(1200)
  })

  it('reads a hand-mangled path as absent rather than following it', () => {
    expect(parseTraceMeta(' notes/ok.md ')).toBe('notes/ok.md')
    expect(parseTraceMeta('notes/not-a-note.txt')).toBeNull()
    expect(parseTraceMeta('two words.md')).toBeNull()
    expect(parseTraceMeta('a<script>.md')).toBeNull()
    expect(parseTraceMeta('')).toBeNull()
  })

  it('writes the link as a WIKILINK and still reads the S07g bare path', () => {
    // S07h (owner): a path is a string, `[[path]]` is an edge — parseEdges
    // skips fences and code spans, not HTML comments, so the trace becomes a
    // node the graph can reach while staying invisible in the transcript.
    expect(serializeTraceMeta('chats/2026-08-19/biologie-traces/turn-01.md')).toBe(
      '[[chats/2026-08-19/biologie-traces/turn-01]]'
    )
    expect(parseTraceMeta('[[chats/2026-08-19/biologie-traces/turn-01]]')).toBe(
      'chats/2026-08-19/biologie-traces/turn-01.md'
    )
    // the transcripts already on disk keep resolving
    expect(parseTraceMeta('chats/2026-08-19/biologie-traces/turn-01.md')).toBe(
      'chats/2026-08-19/biologie-traces/turn-01.md'
    )
    expect(
      parseChatTurns(
        '## atomik <!-- trace:[[chats/2026-08-19/biologie-traces/turn-01]] -->\n\nanswer\n'
      )[0]?.trace
    ).toBe('chats/2026-08-19/biologie-traces/turn-01.md')
  })
})

describe('writing the trace (CP-MVP-011 S07g)', () => {
  const persistInput = (over: Record<string, unknown> = {}) => ({
    ...baseInput(),
    chat: 'chats/2026-08-19/biologie.md',
    consulted: baseInput().consulted,
    ...over
  })

  it('writes one note per answer and returns its path', async () => {
    const written: Array<{ relPath: string; content: string }> = []
    const path = await persistAgentTrace(
      persistInput() as never,
      async (relPath, content) => {
        written.push({ relPath, content })
      }
    )
    expect(path).toBe('chats/2026-08-19/biologie-traces/turn-01.md')
    expect(written).toHaveLength(1)
    expect(written[0]!.content).toContain('"name": "search_wiki"')
  })

  it('traces a turn that called NO tool — the one the owner had no record of', async () => {
    // S07h: the first exchange of the owner's bench answered "je ne trouve
    // aucune information" with no tools, and got no trace. That was the turn
    // most worth auditing.
    const written: string[] = []
    const path = await persistAgentTrace(
      persistInput({ executions: [] }) as never,
      async (relPath) => {
        written.push(relPath)
      }
    )
    expect(path).toBe('chats/2026-08-19/biologie-traces/turn-01.md')
    expect(written).toHaveLength(1)
  })

  it('writes nothing before the transcript exists', async () => {
    const path = await persistAgentTrace(
      persistInput({ chat: null }) as never,
      async () => undefined
    )
    expect(path).toBeNull()
  })

  it('retries a taken name instead of clobbering it', async () => {
    const taken = new Set(['chats/2026-08-19/biologie-traces/turn-01.md'])
    const path = await persistAgentTrace(
      persistInput() as never,
      async (relPath) => {
        if (taken.has(relPath)) throw new Error('exists')
      }
    )
    expect(path).toBe('chats/2026-08-19/biologie-traces/turn-01-2.md')
  })

  it('loses the audit rather than the answer when the vault refuses', async () => {
    // The answer is the user's work; a failed trace must not throw into the
    // run that produced it.
    const path = await persistAgentTrace(persistInput() as never, async () => {
      throw new Error('read-only vault')
    })
    expect(path).toBeNull()
  })
})

describe('the chat view wires the trace (CP-MVP-011 S07g)', () => {
  it('writes the trace BEFORE the turn that links it', () => {
    const write = view.indexOf('const tracePath = await persistAgentTrace(')
    const turn = view.indexOf("await persistTurn(\n              'atomik'")
    expect(write).toBeGreaterThan(-1)
    expect(turn).toBeGreaterThan(write)
    expect(view).toContain(
      'tracePath ? `trace:${serializeTraceMeta(tracePath)}` : undefined'
    )
  })

  it('records the preference the send actually carried', () => {
    expect(view).toContain('const toolPreference = wiki')
    expect(view).toContain('...(toolPreference ? { tools: toolPreference } : {})')
    expect(view).toContain('tools: toolPreference,')
  })

  it('offers the trace as a link on the answer it explains', () => {
    expect(view).toContain('className="icon-button chat-trace"')
    expect(view).toContain('aria-label="Open the agent trace"')
    expect(view).toContain('revealNote(state, paneId, turn.trace as string)')
  })
})
