import { describe, expect, it } from 'vitest'
import {
  citationSourcesOf,
  parseCitedMeta,
  rewriteCitations,
  serializeCitedMeta
} from '../shared/chat-citations'
import { appendChatTurn, parseChatTurns } from '../renderer/src/editor/chat-file'

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

describe('rewriteCitations', () => {
  it('turns a marker into a real link to its note', () => {
    const { markdown, cited } = rewriteCitations(
      "L'éthos est la crédibilité [1].",
      SOURCES
    )
    expect(markdown).toBe(
      "L'éthos est la crédibilité [1](<concepts/ethos.md>)."
    )
    expect(cited).toEqual([SOURCES[0]])
  })

  it('handles a grouped marker and reports each source once', () => {
    const { markdown, cited } = rewriteCitations('Les deux preuves [1, 2].', SOURCES)
    expect(markdown).toContain('[1](<concepts/ethos.md>)[2](<concepts/pathos.md>)')
    expect(cited.map((source) => source.number)).toEqual([1, 2])
  })

  it('keeps an invented number visible instead of dropping it', () => {
    const { markdown, unresolved, cited } = rewriteCitations('Selon [7].', SOURCES)
    expect(markdown).toBe('Selon [7].')
    expect(unresolved).toEqual([7])
    expect(cited).toEqual([])
  })

  it('never touches code — arr[0] is not a citation', () => {
    const answer = 'Voir `arr[1]` et:\n\n```js\nconst x = arr[1]\n```\n\nPuis [1].'
    const { markdown } = rewriteCitations(answer, SOURCES)
    expect(markdown).toContain('`arr[1]`')
    expect(markdown).toContain('const x = arr[1]')
    expect(markdown).toContain('Puis [1](<concepts/ethos.md>).')
  })

  it('leaves a phrase-level link alone — it is already a citation', () => {
    const answer = 'Voir [la crédibilité](<concepts/ethos.md>).'
    expect(rewriteCitations(answer, SOURCES).markdown).toBe(answer)
  })

  it('does nothing when the answer cites nothing', () => {
    const { markdown, cited, unresolved } = rewriteCitations('Pas de citation.', SOURCES)
    expect(markdown).toBe('Pas de citation.')
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
