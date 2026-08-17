import { describe, expect, it } from 'vitest'
import {
  citationSourcesOf,
  citedSentenceStart,
  findCitationMarkers,
  parseCitedMeta,
  serializeCitedMeta
} from '../shared/chat-citations'
import {
  appendChatTurn,
  parseChatTurns,
  withSentMetaOnLastYou
} from '../renderer/src/editor/chat-file'
import { parsePacketMeta, serializePacketMeta } from '../shared/context-packet'

/**
 * Citations (CP-MVP-010 S08). A grounded answer that cannot be traced is
 * worse than an ungrounded one — it borrows the vault's authority
 * without offering the way to check it. These tests pin the three things
 * that make tracing real: markers become links, a number nobody sent
 * stays visible, and the map survives a reopened transcript.
 */

const SOURCES = citationSourcesOf([
  { path: 'concepts/ethos.md', title: "L'éthos" },
  { path: 'concepts/pathos.md', title: 'Pathos' }
])

describe('findCitationMarkers', () => {
  it('locates a marker and maps it to its note — the ANSWER is untouched', () => {
    const answer = "L'éthos est la crédibilité [1]."
    const { markers, cited } = findCitationMarkers(answer, SOURCES)
    expect(cited).toEqual([SOURCES[0]])
    expect(markers).toHaveLength(1)
    expect(answer.slice(markers[0]!.from, markers[0]!.to)).toBe('[1]')
  })

  it('handles a grouped marker and reports each source once', () => {
    const { markers, cited } = findCitationMarkers('Les deux preuves [1, 2].', SOURCES)
    expect(markers[0]!.numbers).toEqual([1, 2])
    expect(cited.map((source: { number: number }) => source.number)).toEqual([1, 2])
  })

  it('reports an invented number instead of hiding it', () => {
    const { unresolved, cited } = findCitationMarkers('Selon [7].', SOURCES)
    expect(unresolved).toEqual([7])
    expect(cited).toEqual([])
  })

  it('does not mistake a reference-style link or an image for a citation', () => {
    expect(findCitationMarkers('voir [texte][1] et ![alt][2]', SOURCES).markers).toEqual([])
  })

  it('finds nothing when the answer cites nothing', () => {
    const { markers, cited, unresolved } = findCitationMarkers('Pas de citation.', SOURCES)
    expect(markers).toEqual([])
    expect(cited).toEqual([])
    expect(unresolved).toEqual([])
  })
})

describe('the citation map survives the transcript', () => {
  it('round-trips through the heading comment, beside the run metrics', () => {
    const meta = serializeCitedMeta(SOURCES)
    expect(meta).toBe('1=concepts/ethos.md|2=concepts/pathos.md')
    expect(parseCitedMeta(meta as string)).toEqual([
      { number: 1, path: 'concepts/ethos.md' },
      { number: 2, path: 'concepts/pathos.md' }
    ])

    const file = appendChatTurn('---\ntype: Atomik Chat\n---\n\n## you\n\nq\n', 'atomik', 'a [1].', [
      'run:in=10|out=20',
      `cited:${meta}`
    ])
    const turns = parseChatTurns(file)
    expect(turns.at(-1)).toMatchObject({
      role: 'atomik',
      text: 'a [1].',
      run: { inputTokens: 10, outputTokens: 20 },
      cited: [
        { number: 1, path: 'concepts/ethos.md' },
        { number: 2, path: 'concepts/pathos.md' }
      ]
    })
  })

  it('reads a hand-mangled map as no map, never as a crash', () => {
    expect(parseCitedMeta('garbage')).toBeNull()
    expect(serializeCitedMeta([])).toBeNull()
  })
})

describe('the packet shape survives a closed tab (S08d)', () => {
  it('round-trips through the you-turn heading, beside the sent breakdown', () => {
    const packet = {
      entries: [
        { path: 'concepts/ethos.md', stage: 'lexical' },
        { path: 'concepts/pathos.md', stage: 'link' }
      ]
    } as never
    const meta = serializePacketMeta(packet)
    expect(meta).toBe('lexical:concepts/ethos.md|link:concepts/pathos.md')

    const file = withSentMetaOnLastYou(
      '---\ntype: Atomik Chat\n---\n\n## you\n\nquestion\n',
      'system=100|instruction=20',
      [`packet:${meta}`]
    )
    const turn = parseChatTurns(file)[0]!
    expect(turn.sent?.map((part) => part.kind)).toEqual(['system', 'instruction'])
    expect(turn.packet).toEqual([
      { stage: 'lexical', path: 'concepts/ethos.md' },
      { stage: 'link', path: 'concepts/pathos.md' }
    ])
  })

  it('reads a mangled packet comment as no packet', () => {
    expect(parsePacketMeta('nonsense')).toBeNull()
    expect(parsePacketMeta('unknown-stage:a.md')).toBeNull()
  })
})

describe('where a cited sentence begins (S10g)', () => {
  const start = (text: string, marker: string): string => {
    const at = text.indexOf(marker)
    return text.slice(citedSentenceStart(text, at), at).trim()
  }

  it('covers the sentence a marker sits inside', () => {
    const text = 'XML is a format for data 1. It defines rules for encoding 2.'
    expect(start(text, '1')).toBe('XML is a format for data')
    expect(start(text, '2')).toBe('It defines rules for encoding')
  })

  it('covers the QUOTE when the marker follows its closing punctuation', () => {
    // the case that produced an empty extent: the citation comes after
    // the full stop and the closing guillemet, so a naive "previous
    // boundary" search found the end of the very sentence to include
    const text = 'Selon la note : « L\'ethos est une preuve rhétorique. » 1'
    expect(start(text, '1')).toBe("L'ethos est une preuve rhétorique. »")
  })

  it('handles several sentences and stops at the previous one', () => {
    const text = 'First one. Second one! Third one? The fourth is cited 3.'
    expect(start(text, '3')).toBe('The fourth is cited')
  })

  it('falls back to the start of the text when there is no earlier sentence', () => {
    expect(citedSentenceStart('Only one sentence cited 1.', 24)).toBe(0)
    expect(citedSentenceStart('', 0)).toBe(0)
  })

  it('does not walk past an ellipsis or an abbreviation-free start', () => {
    const text = 'Il cite Aristote… La suite est de lui 1.'
    expect(start(text, '1')).toBe('La suite est de lui')
  })
})
