import { describe, expect, it } from 'vitest'
import {
  BM25_K1,
  commonTermsOf,
  buildRetrievalIndex,
  documentFields,
  extractMatches,
  FIELD_WEIGHTS,
  foldTerm,
  parseQuery,
  patchRetrievalIndex,
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

    // requireAll speaks of the terms that RANK (S08i): both `ethos` and
    // `rhetorique` name notes here, and only one document carries both.
    expect(searchIndex(index, 'ethos rhetorique').length).toBeGreaterThan(1)
    expect(
      searchIndex(index, 'ethos rhetorique', { requireAll: true }).map((h) => h.path)
    ).toEqual(['concepts/ethos.md'])
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

describe('incremental patching (S03)', () => {
  const patched = (patches: Parameters<typeof patchRetrievalIndex>[1]) =>
    serializeRetrievalIndex(patchRetrievalIndex(buildRetrievalIndex(VAULT), patches))
  const rebuilt = (files: typeof VAULT) =>
    serializeRetrievalIndex(buildRetrievalIndex(files))

  it('a saved document patches to exactly what a rebuild would produce', () => {
    const edited = { path: 'concepts/pathos.md', content: '# Pathos revu\n\nLe pathos, autrement.\n' }
    expect(patched([edited])).toBe(
      rebuilt(VAULT.map((file) => (file.path === edited.path ? edited : file)))
    )
  })

  it('a created and a deleted document do the same', () => {
    const born = { path: 'concepts/logos.md', content: '# Logos\n\nLa raison du discours.\n' }
    expect(patched([born])).toBe(rebuilt([...VAULT, born]))

    expect(patched([{ path: 'concepts/pathos.md', removed: true }])).toBe(
      rebuilt(VAULT.filter((file) => file.path !== 'concepts/pathos.md'))
    )
  })

  it('keeps ranking correct after a patch — the point of patching', () => {
    const index = patchRetrievalIndex(buildRetrievalIndex(VAULT), [
      { path: 'concepts/ethos.md', content: '# Autre sujet\n\nPlus rien sur le sujet précédent.\n' }
    ])
    // The word is gone from the note's text, so only the FILENAME can
    // still match it — a good reminder that path is one of the six fields.
    const stale = searchIndex(index, 'ethos').find(
      (hit) => hit.path === 'concepts/ethos.md'
    )!
    expect(stale.fields.map((field) => field.field)).toEqual(['path'])
    expect(searchIndex(index, 'sujet')[0]!.path).toBe('concepts/ethos.md')
  })

  it('ignores a patch for a document that was never indexed being removed', () => {
    expect(patched([{ path: 'ghost.md', removed: true }])).toBe(rebuilt(VAULT))
  })
})

describe('common words rank nothing (S08b, owner bench round 4)', () => {
  // "parle moi de l'éthos" retrieved SVG, Sociologie and three daily
  // notes: `de`, `moi` and `parle` are in half the vault, and their
  // small contributions accumulated.
  const CORPUS = [
    { path: 'ethos.md', content: "# L'éthos\n\nParle de la crédibilité de l'orateur.\n" },
    { path: 'svg.md', content: '# SVG\n\nParle de vecteurs, de formats, de rendu.\n' },
    { path: 'socio.md', content: '# Sociologie\n\nParle de groupes et de normes.\n' },
    { path: 'journal.md', content: '# 2026-08-04\n\nJe parle de tout et de rien.\n' }
  ]
  const index = buildRetrievalIndex(CORPUS)

  it('ignores a term the vault is full of', () => {
    expect(commonTermsOf(index, "parle moi de l'éthos").sort()).toEqual(['de', 'parle'])
    const hits = searchIndex(index, "parle moi de l'éthos")
    expect(hits).toHaveLength(1)
    expect(hits[0]!.path).toBe('ethos.md')
    expect(hits[0]!.terms).toEqual(['ethos'])
  })

  it('still ranks those words when they are the whole question', () => {
    // nothing else to go on: a query of only common words returns
    // nothing rather than everything, which is the honest answer
    expect(searchIndex(index, 'de')).toEqual([])
  })

  it('leaves a discriminating word alone however often it appears in ONE note', () => {
    const repeated = buildRetrievalIndex([
      { path: 'a.md', content: `# A\n\n${'ethos '.repeat(50)}\n` },
      { path: 'b.md', content: '# B\n\nAutre chose.\n' },
      { path: 'c.md', content: '# C\n\nAutre chose encore.\n' }
    ])
    expect(commonTermsOf(repeated, 'ethos')).toEqual([])
    expect(searchIndex(repeated, 'ethos')[0]!.path).toBe('a.md')
  })
})

describe('principal subject ranking (S08e, owner bench round 7)', () => {
  // "Que peux tu me dire de platon (Plato) ?" — one question, one
  // subject, and six words of politeness that are not rare enough to be
  // dropped as common yet common enough to rank long notes.
  // Twenty notes: `peux` and `dire` sit in nine of them — under the
  // common ceiling, far over the subject threshold — while `plato` sits
  // in two. That spread is what a real vault looks like, and it is
  // exactly where ranking on every term failed.
  const CORPUS = [
    { path: 'plato.md', content: '# Plato\n\nUn philosophe grec.\n' },
    { path: 'stoic.md', content: '# From Plato to Stoicism\n\nPlato et les stoïciens.\n' },
    ...Array.from({ length: 9 }, (_, index) => ({
      path: `filler-${index}.md`,
      content: `# Filler ${index}\n\nCe que tu peux dire, tu peux le dire ici.\n`
    })),
    ...Array.from({ length: 9 }, (_, index) => ({
      path: `other-${index}.md`,
      content: `# Other ${index}\n\nUn sujet sans rapport.\n`
    }))
  ]
  const index = buildRetrievalIndex(CORPUS)

  it('ranks on the subject, not on the words around it', () => {
    const hits = searchIndex(index, 'Que peux tu me dire de platon (Plato) ?')
    expect(hits.map((hit) => hit.path)).toEqual(['plato.md', 'stoic.md'])
    // and the row can say WHY: only the informative term ranked
    expect(hits[0]!.terms).toEqual(['plato'])
  })

  it('keeps every term when they are equally rare', () => {
    const hits = searchIndex(index, 'plato stoicism')
    expect(hits[0]!.path).toBe('stoic.md')
    expect(hits[0]!.terms.sort()).toEqual(['plato', 'stoicism'])
  })

  it('still answers a question made only of filler', () => {
    // nothing is more principal than anything else, so the filler is
    // all there is to go on — better than answering nothing
    expect(searchIndex(index, 'peux dire').length).toBeGreaterThan(0)
  })
})

describe('the vault names its own subjects (S08f)', () => {
  // The case a frequency rule alone gets wrong: the subject IS a common
  // word in this vault, because the vault is about it.
  const CORPUS = [
    { path: 'note.md', content: '# Note\n\nCe qu est une note dans Atomik.\n' },
    ...Array.from({ length: 8 }, (_, index) => ({
      path: `journal-${index}.md`,
      content: `# Journal ${index}\n\nUne note rapide sur un sujet quelconque.\n`
    })),
    ...Array.from({ length: 8 }, (_, index) => ({
      path: `other-${index}.md`,
      content: `# Autre ${index}\n\nRien de particulier ici.\n`
    }))
  ]
  const index = buildRetrievalIndex(CORPUS)

  it('treats a word that NAMES a note as the subject, whatever its frequency', () => {
    const hits = searchIndex(index, 'quest ce quune note ?')
    expect(hits[0]!.path).toBe('note.md')
    expect(hits[0]!.terms).toContain('note')
  })

  it('still ignores a word that names nothing and is everywhere', () => {
    expect(commonTermsOf(index, 'une note')).toContain('une')
  })
})

describe('phrasing versus subject (S08i, owner bench round 9)', () => {
  // "what plato brought to philosphy" retrieved a note called `bibi`
  // because its HEADING contained "what" — and then bibi's neighbours
  // arrived behind it through expansion.
  const CORPUS = [
    { path: 'plato.md', content: '# Plato\n\nLe philosophe.\n' },
    { path: 'stoicism.md', content: '# From Plato to Stoicism\n\nSuite.\n' },
    { path: 'bibi.md', content: '# bibi\n\n## what I did today\n\nDes choses.\n' },
    { path: 'heroes.md', content: '# Superheroes\n\n## what powers\n\nDes pouvoirs.\n' },
    // `what` and `to` behave like question words do in a real vault:
    // scattered through many notes, rare enough to escape the common
    // ceiling, common enough to drown a subject if they ranked.
    ...Array.from({ length: 12 }, (_, index) => ({
      path: `misc-${index}.md`,
      content: `# Divers ${index}\n\n## what happened\n\nUn texte to be read.\n`
    }))
  ]
  const index = buildRetrievalIndex(CORPUS)

  it('keeps only the words the vault has notes NAMED after', () => {
    const hits = searchIndex(index, 'what plato brought to philosphy')
    expect(hits.map((hit) => hit.path)).toEqual(['plato.md', 'stoicism.md'])
    expect(hits.every((hit) => hit.terms.includes('plato'))).toBe(true)
  })

  it('does not let a question-shaped TITLE make a question word a subject', () => {
    const withQuestion = buildRetrievalIndex([
      ...CORPUS,
      { path: 'what-is-ethos.md', content: '# What is an ethos ?\n\nUne définition.\n' }
    ])
    const hits = searchIndex(withQuestion, 'what plato brought to philosphy')
    expect(hits.map((hit) => hit.path)).toEqual(['plato.md', 'stoicism.md'])
  })

  it('still answers when the vault names nothing in the query', () => {
    const hits = searchIndex(index, 'pouvoirs')
    expect(hits[0]!.path).toBe('heroes.md')
  })
})

describe('title is not heading (S08j, owner bench round 10)', () => {
  const CORPUS = [
    { path: 'plato.md', content: '# Plato\n\nLe philosophe.\n' },
    // the folder-index convention writes this heading into EVERY index
    { path: 'bibi/index.md', content: '# bibi\n\n## What is inside\n\n- log.md\n' },
    ...Array.from({ length: 10 }, (_, index) => ({
      path: `misc-${index}.md`,
      content: `# Divers ${index}\n\n## What is inside\n\nDu texte.\n`
    }))
  ]
  const index = buildRetrievalIndex(CORPUS)

  it('a title reach matches what a note is CALLED, not its sections', () => {
    const titles = searchIndex(index, 'what plato', { sensitivity: 'titles' })
    expect(titles.map((hit) => hit.path)).toEqual(['plato.md'])
  })

  it('the full reach still sees section headings', () => {
    const parsed = documentFields('bibi/index.md', CORPUS[1]!.content)
    expect(parsed.title).toBe('bibi')
    expect(parsed.fields.heading).toContain('What is inside')
    expect(parsed.fields.title).toBe('bibi')
  })
})

describe('a function word inside a title is still a function word (S08l)', () => {
  // "From Plato to Stoicism" puts `to` in a TITLE, so the naming signal
  // called it a subject. At a title reach that was invisible; at `full`
  // it matched the body of every English note.
  const CORPUS = [
    { path: 'plato.md', content: '# Plato\n\nAncient philosopher.\n' },
    { path: 'stoicism.md', content: '# From Plato to Stoicism\n\nA path.\n' },
    ...Array.from({ length: 14 }, (_, index) => ({
      path: `misc-${index}.md`,
      content: `# Divers ${index}\n\nSomething to read, related to nothing.\n`
    }))
  ]
  const index = buildRetrievalIndex(CORPUS)

  it('does not let it rank at the widest reach either', () => {
    const hits = searchIndex(index, 'what plato brought to philosphy', {
      sensitivity: 'full'
    })
    expect(hits.map((hit) => hit.path)).toEqual(['plato.md', 'stoicism.md'])
    expect(hits.every((hit) => !hit.terms.includes('to'))).toBe(true)
  })

  it('a query of words that are in nearly every note answers nothing', () => {
    // "everywhere is nowhere" holds even after the retry: `something`,
    // `to` and `read` are in 14 of these 16 notes, so there is no
    // question left to answer. The retry rescues an OVER-NARROWED
    // query, not an empty one (S08e covers that case).
    expect(searchIndex(index, 'something to read', { sensitivity: 'full' })).toEqual([])
  })
})

describe('a vault may contain the word "constructor" (S10)', () => {
  // Found by the first bench on a real corpus — the repository's own
  // docs. `terms` is a plain object, so reading terms['constructor']
  // returned Object.prototype's member and crashed on .push.
  const CORPUS = [
    { path: 'js.md', content: '# JS\n\nA constructor builds an object; toString prints it.\n' },
    { path: 'proto.md', content: '# Proto\n\nOn parle de __proto__ et de valueOf.\n' },
    { path: 'other.md', content: '# Autre\n\nRien de tout cela.\n' }
  ]

  it('indexes and finds words that are Object members', () => {
    const index = buildRetrievalIndex(CORPUS)
    expect(searchIndex(index, 'constructor')[0]!.path).toBe('js.md')
    expect(searchIndex(index, 'valueof')[0]!.path).toBe('proto.md')
    expect(searchIndex(index, 'tostring')[0]!.path).toBe('js.md')
  })

  it('survives the JSON round trip, where the prototype comes back', () => {
    const parsed = JSON.parse(serializeRetrievalIndex(buildRetrievalIndex(CORPUS)))
    expect(searchIndex(parsed, 'constructor')[0]!.path).toBe('js.md')
    expect(searchIndex(parsed, 'zzz-nothing')).toEqual([])
  })
})
