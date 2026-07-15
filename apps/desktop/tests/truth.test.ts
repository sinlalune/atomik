import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import type { AiSelection } from '../shared/ipc-contract'
import { labelClaims, type ClaimCandidate } from '../electron-main/truth'

const selection: AiSelection = {
  relPath: 'notes/attention.md',
  kind: 'text',
  content:
    'Attention compares a query vector with key vectors to decide how strongly to combine value vectors.',
  range: { from: 120, to: 220 }
}

const candidate = (
  text: string,
  assertedForm?: ClaimCandidate['assertedForm']
): ClaimCandidate =>
  assertedForm
    ? { blockId: 'b1', text, assertedForm }
    : { blockId: 'b1', text }

describe('labelClaims — the mechanical labeling rule (06)', () => {
  it('source-backed ONLY via exact containment, with hashed evidence', () => {
    const quote = 'query vector with key vectors'
    const { claims, evidence } = labelClaims([selection], [candidate(quote)])
    expect(claims[0]!.label).toBe('source-backed')
    expect(claims[0]!.evidenceIds).toHaveLength(1)
    expect(evidence[0]!.quote).toBe(quote)
    expect(evidence[0]!.source.relPath).toBe('notes/attention.md')
    expect(evidence[0]!.quoteSha256).toBe(
      createHash('sha256').update(quote, 'utf8').digest('hex')
    )
  })

  it('a paraphrase is NOT source-backed — no fuzzy generosity', () => {
    const paraphrase = 'Attention matches queries against keys to weight values.'
    const { claims, evidence } = labelClaims([selection], [candidate(paraphrase)])
    expect(claims[0]!.label).toBe('model-only')
    expect(evidence).toHaveLength(0)
  })

  it('asserted FORMS are honored; evidence outranks them', () => {
    const { claims } = labelClaims(
      [selection],
      [
        candidate('An interpretation of the mechanism.', 'interpretive'),
        candidate('Stated without a citation.', 'needs-citation'),
        // an exact quote stays source-backed even if called interpretive
        candidate('key vectors to decide', 'interpretive')
      ]
    )
    expect(claims.map((claim) => claim.label)).toEqual([
      'interpretive',
      'needs-citation',
      'source-backed'
    ])
  })

  it('a provider cannot smuggle a label: unknown forms fall to model-only', () => {
    const smuggled = {
      blockId: 'b1',
      text: 'Trust me, this is grounded.',
      assertedForm: 'source-backed'
    } as unknown as ClaimCandidate
    const { claims } = labelClaims([selection], [smuggled])
    expect(claims[0]!.label).toBe('model-only')
    expect(claims[0]!.evidenceIds).toEqual([])
  })

  it('is reproducible: same inputs, same labels (M2 acceptance)', () => {
    const candidates = [
      candidate('query vector with key vectors'),
      candidate('A free-floating statement.'),
      candidate('A reading of it.', 'interpretive')
    ]
    const first = labelClaims([selection], candidates).claims.map((c) => c.label)
    const second = labelClaims([selection], candidates).claims.map((c) => c.label)
    expect(first).toEqual(second)
    expect(first).toEqual(['source-backed', 'model-only', 'interpretive'])
  })

  it('empty and whitespace-only candidates never become source-backed', () => {
    const { claims } = labelClaims([selection], [candidate('   ')])
    expect(claims[0]!.label).toBe('model-only')
  })

  it('web provenance rides the evidence when the caller resolved it (S06)', () => {
    const readerSelection: AiSelection = {
      ...selection,
      relPath: 'sources/web/guide/reader.md'
    }
    const provenance = new Map([
      [
        'sources/web/guide/reader.md',
        {
          url: 'https://example.org/guide',
          dossierPath: 'sources/web/guide/source.md',
          accessedAt: '2026-07-13T10:00:00Z',
          title: 'A guide'
        }
      ]
    ])
    const { evidence } = labelClaims(
      [readerSelection],
      [candidate('query vector with key vectors')],
      provenance
    )
    expect(evidence[0]!.source.url).toBe('https://example.org/guide')
    expect(evidence[0]!.source.dossierPath).toBe('sources/web/guide/source.md')
    expect(evidence[0]!.source.accessedAt).toBe('2026-07-13T10:00:00Z')
    // the anchor stays intact beside the provenance
    expect(evidence[0]!.source.relPath).toBe('sources/web/guide/reader.md')
    expect(evidence[0]!.source.range).toEqual({ from: 120, to: 220 })
  })

  it('no provenance entry → the evidence shape is unchanged (no url keys)', () => {
    const { evidence } = labelClaims(
      [selection],
      [candidate('query vector with key vectors')],
      new Map()
    )
    expect(evidence[0]!.source).toEqual({
      relPath: 'notes/attention.md',
      range: { from: 120, to: 220 }
    })
  })
})
