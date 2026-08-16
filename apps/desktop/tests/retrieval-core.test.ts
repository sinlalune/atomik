import { describe, expect, it } from 'vitest'
import {
  BM25_K1,
  buildRetrievalIndex,
  documentFields,
  extractMatches,
  FIELD_WEIGHTS,
  foldTerm,
  parseQuery,
  searchIndex,
  serializeRetrievalIndex,
  tokenize
} from '../shared/retrieval-core'

/**
 * The lexical core (CP-MVP-010 S02, ADR-013). Pure module, so every rule
 * that matters is pinned here rather than by running the app: folding,
 * field extraction, ranking order, phrases, and the round-trip identity
 * the index owes bedrock 03/33 as a derived artifact.
 */

const VAULT = [
  {
    path: 'concepts/ethos.md',
    content:
      '---\ntitle: "L\'éthos"\ntags: [rhetorique, credibilite]\n---\n\n # L\'éthos\n\n' +
      "L'éthos est la crédibilité de l'orateur. Il [[pathos]]{oppose-a} le pathos.\n\n" +
      '## Construction\n\nUne posture se construit avant le discours.\n'
  },
  {
    path: 'concepts/pathos.md',
    content:
      '# Pathos\n\nLe pathos joue sur les émotions de l\'auditoire.\n' +
      'Voir [la crédibilité](<concepts/ethos.md>){depend-de}.\n'
  },
  {
    path: 'projects/rhetorique/index.md',
    content: '# Rhétorique\n\nUn projet sur les trois preuves.\n'
  },
  { path: 'sources/web/curlew/snapshot.mhtml' }
]

describe('tokenizer (S01 pins: folding, elision, kebab, positions)', () => {
  it('folds diacritics and case so ethos finds éthos', () => {
    expect(foldTerm('Éthos')).toBe('ethos')
    expect(tokenize('L\'éthos').map((token) => token.term)).toEqual(['ethos'])
  })

  it('splits French elision and drops the one-letter clitic', () => {
    expect(tokenize("l'orateur et d'autres").map((t) => t.term)).toEqual([
      'orateur',
      'et',
      'autres'
    ])
  })

  it('indexes a kebab label whole AND in parts', () => {
    expect(tokenize('oppose-a').map((token) => token.term)).toEqual([
      'oppose-a',
      'oppose',
      'a'
    ])
  })

  it('gives every token its offsets and an ordinal for phrases', () => {
    const tokens = tokenize('le pathos joue')
    expect(tokens.map((token) => token.position)).toEqual([0, 1, 2])
    expect('le pathos joue'.slice(tokens[1]!.start, tokens[1]!.end)).toBe('pathos')
  })
})

describe('field extraction', () => {
  it('reads title from frontmatter, then H1, then the stem', () => {
    expect(documentFields('a.md', '---\ntitle: Dossier\n---\n# Ignored\n').title).toBe(
      'Dossier'
    )
    expect(documentFields('a.md', ' # Indented heading\n').title).toBe(
      'Indented heading'
    )
    expect(documentFields('folder/plain-note.md', 'no heading\n').title).toBe(
      'plain-note'
    )
  })

  it('separates headings, frontmatter values, link text and body', () => {
    const parsed = documentFields(VAULT[0]!.path, VAULT[0]!.content)
    expect(parsed.fields.heading).toContain('Construction')
    expect(parsed.fields.frontmatter).toContain('rhetorique')
    // frontmatter KEYS are schema, not knowledge
    expect(parsed.fields.frontmatter).not.toContain('tags')
    expect(parsed.fields.link).toContain('pathos')
    expect(parsed.fields.link).toContain('oppose-a')
    expect(parsed.fields.body).toContain('crédibilité')
    expect(parsed.fields.body).not.toContain('## Construction')
  })

  it('indexes a non-markdown file by path alone', () => {
    const parsed = documentFields('sources/web/curlew/snapshot.mhtml')
    expect(parsed.title).toBe('snapshot')
    expect(parsed.fields.body).toBe('')
    expect(parsed.fields.path).toContain('curlew')
  })
})

describe('ranking', () => {
  const index = buildRetrievalIndex(VAULT)

  it('finds an accented note through an unaccented query', () => {
    const hits = searchIndex(index, 'ethos')
    expect(hits[0]!.path).toBe('concepts/ethos.md')
    expect(hits.map((hit) => hit.path)).toContain('concepts/pathos.md') // link text
  })

  it('ranks a title match above a body mention', () => {
    const hits = searchIndex(index, 'pathos')
    expect(hits[0]!.path).toBe('concepts/pathos.md')
    expect(hits[0]!.fields[0]!.field).toBe('title')
    expect(hits[0]!.score).toBeGreaterThan(hits[1]!.score)
  })

  it('reports which fields carried the score and which terms matched', () => {
    const hit = searchIndex(index, 'construction')[0]!
    expect(hit.fields.map((field) => field.field)).toEqual(['heading'])
    expect(hit.terms).toEqual(['construction'])
  })

  it('honours the scope filter, the limit, and requireAll', () => {
    const scoped = searchIndex(index, 'rhetorique', {
      accept: (path) => path.startsWith('projects/')
    })
    expect(scoped.map((hit) => hit.path)).toEqual(['projects/rhetorique/index.md'])

    expect(searchIndex(index, 'pathos', { limit: 1 })).toHaveLength(1)

    expect(searchIndex(index, 'pathos emotions').length).toBeGreaterThan(1)
    expect(
      searchIndex(index, 'pathos emotions', { requireAll: true }).map((h) => h.path)
    ).toEqual(['concepts/pathos.md'])
  })

  it('treats a quoted phrase as a filter, not a bonus', () => {
    expect(parseQuery('"trois preuves"').phrases).toEqual([['trois', 'preuves']])
    expect(searchIndex(index, '"trois preuves"').map((hit) => hit.path)).toEqual([
      'projects/rhetorique/index.md'
    ])
    // same words, wrong order: not a phrase
    expect(searchIndex(index, '"preuves trois"')).toEqual([])
  })

  it('returns nothing for an unknown term and never throws on an empty index', () => {
    expect(searchIndex(index, 'zzz-nothing')).toEqual([])
    expect(searchIndex(buildRetrievalIndex([]), 'ethos')).toEqual([])
  })
})

describe('the index as a derived artifact (03/33)', () => {
  it('rebuilds byte-identical from the files alone, in any input order', () => {
    const first = serializeRetrievalIndex(buildRetrievalIndex(VAULT))
    const shuffled = serializeRetrievalIndex(
      buildRetrievalIndex([...VAULT].reverse())
    )
    expect(shuffled).toBe(first)
    expect(JSON.parse(first).version).toBe(1)
  })

  it('keeps the pinned scoring constants where the ledger says they are', () => {
    expect(BM25_K1).toBe(1.2)
    expect(FIELD_WEIGHTS.title).toBeGreaterThan(FIELD_WEIGHTS.body)
    expect(FIELD_WEIGHTS.heading).toBeGreaterThan(FIELD_WEIGHTS.link)
  })
})

describe('snippets', () => {
  it('locates terms by line with a highlight span, headings marked', () => {
    const matches = extractMatches(VAULT[0]!.content!, ['construction'])
    expect(matches[0]).toMatchObject({ kind: 'heading', line: 10 })
    expect(matches[0]!.excerpt).toBe('## Construction')

    const body = extractMatches(VAULT[1]!.content!, ['emotions'])
    expect(body[0]!.kind).toBe('text')
    const [start, end] = body[0]!.span
    expect(foldTerm(body[0]!.excerpt.slice(start, end))).toContain('emotions')
  })

  it('caps the matches per file and ignores unknown terms', () => {
    const repeated = Array.from({ length: 20 }, () => 'repeat me').join('\n')
    expect(extractMatches(repeated, ['repeat'])).toHaveLength(6)
    expect(extractMatches(repeated, ['repeat'], { maxMatches: 2 })).toHaveLength(2)
    expect(extractMatches(repeated, [])).toEqual([])
  })
})
