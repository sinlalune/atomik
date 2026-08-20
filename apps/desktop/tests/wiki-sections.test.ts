import { describe, expect, it } from 'vitest'
import { selectWikiSections, type WikiSection } from '../shared/wiki-sections'

const sections: WikiSection[] = [
  { heading: '', text: 'Lead about the subject, framed generally for a reader.' },
  { heading: 'Jeunesse', text: 'Born in Amiens, studied philosophy and finance.' },
  { heading: 'Carrière', text: 'Inspector of finances, then investment banker.' },
  {
    heading: 'Réforme des retraites',
    text: 'La réforme des retraites de 2023 recule l age de depart et provoque des greves.'
  }
]

describe('choosing what to read of an article (CP-MVP-011 S07i)', () => {
  it('spends the budget on the section that answers, not the first one', () => {
    // The owner's ruling: a limit without a relevance test is arbitrary.
    const selection = selectWikiSections(sections, 'réforme des retraites', 160)
    expect(selection.kept).toContain('Réforme des retraites')
    expect(selection.text).toContain('greves')
    expect(selection.skipped).toBeGreaterThan(0)
    expect(selection.truncated).toBe(true)
  })

  it('always keeps the lead — it is what says WHO the article is about', () => {
    const selection = selectWikiSections(sections, 'retraites', 120)
    expect(selection.kept[0]).toBe('(lead)')
    expect(selection.text.startsWith('Lead about the subject')).toBe(true)
  })

  it('caps the lead so it cannot crowd out the answer', () => {
    const long: WikiSection[] = [
      { heading: '', text: 'x'.repeat(5000) },
      { heading: 'Réforme', text: 'La réforme des retraites de 2023.' }
    ]
    const selection = selectWikiSections(long, 'réforme des retraites', 200)
    expect(selection.kept).toEqual(['(lead)', 'Réforme'])
    expect(selection.text).toContain('La réforme des retraites')
  })

  it('gives the lead the leftover budget when nothing competes', () => {
    const only: WikiSection[] = [{ heading: '', text: 'a'.repeat(500) }]
    const selection = selectWikiSections(only, 'anything', 100)
    expect(selection.text.length).toBe(100)
    expect(selection.truncated).toBe(true)
  })

  it('returns the kept sections in READING order, whatever their score', () => {
    const selection = selectWikiSections(sections, 'retraites jeunesse', 400)
    const order = selection.kept.filter((heading) => heading !== '(lead)')
    const positions = order.map((heading) =>
      sections.findIndex((section) => section.heading === heading)
    )
    expect([...positions]).toEqual([...positions].sort((a, b) => a - b))
  })

  it('labels an excerpt with its heading, so mid-article prose is not read as the article', () => {
    const selection = selectWikiSections(sections, 'retraites', 200)
    expect(selection.text).toContain('Réforme des retraites. La réforme')
  })

  it('scores a heading match strongly — a heading says what a section is FOR', () => {
    const noise: WikiSection[] = [
      { heading: '', text: 'lead' },
      { heading: 'Retraites', text: 'short body with no query words at all.' },
      {
        heading: 'Autre',
        text: 'a much longer body that never mentions the subject of the question.'
      }
    ]
    const selection = selectWikiSections(noise, 'retraites', 60)
    expect(selection.kept).toContain('Retraites')
    expect(selection.kept).not.toContain('Autre')
  })

  it('falls back to reading order when the query has no usable terms', () => {
    const selection = selectWikiSections(sections, '', 200)
    expect(selection.kept[0]).toBe('(lead)')
    expect(selection.kept[1]).toBe('Jeunesse')
  })

  it('reports nothing dropped when the whole article fits', () => {
    const selection = selectWikiSections(sections, 'retraites', 10_000)
    expect(selection.truncated).toBe(false)
    expect(selection.skipped).toBe(0)
    expect(selection.kept).toHaveLength(4)
  })

  it('never spends the budget on the apparatus (S07j re-bench)', () => {
    // The owner's second bench: "Réforme des retraites en France en 2010 —
    // read (lead), Notes et références". A reference list repeats the page
    // title in every citation, which is the densest possible match and the
    // emptiest possible reading.
    const withApparatus: WikiSection[] = [
      { heading: '', text: 'Lead of the 2010 pension reform article.' },
      {
        heading: 'Notes et références',
        text: 'Réforme des retraites, Le Monde, réforme des retraites, Libération, réforme des retraites.'
      },
      { heading: 'Voir aussi', text: 'Réforme des retraites en France en 2023.' },
      { heading: 'Bibliographie', text: 'Ouvrage sur la réforme des retraites.' },
      { heading: 'Contenu', text: 'Le texte recule l age de depart a 62 ans.' }
    ]
    const selection = selectWikiSections(withApparatus, 'réforme des retraites', 120)
    expect(selection.kept).not.toContain('Notes et références')
    expect(selection.kept).not.toContain('Voir aussi')
    expect(selection.kept).not.toContain('Bibliographie')
    expect(selection.kept).toEqual(['(lead)', 'Contenu'])
  })

  it('does not pretend to rank when the query IS the page title', () => {
    // Owner bench, third iteration (`macron-et-la-réforme-des-retraites-5`):
    // the model searched "Réforme des retraites en France en 2023" and got the
    // article of that name. Two term-frequency heuristics missed it — one
    // surviving term ("2023", also in the winning heading) was enough to make
    // the scorer confident, and §Manifestations et grèves took the budget for
    // a third bench running. Asking the TITLE is the direct instrument.
    const onTitle: WikiSection[] = [
      { heading: '', text: 'Lead of the article.' },
      { heading: 'Contexte', text: 'Le contexte de 2019 et la France.' },
      { heading: 'Contenu', text: 'Le recul de l age legal.' },
      {
        heading: 'Manifestations et grèves en 2023',
        text: 'Les manifestations de 2023 en France, longuement decrites, encore et encore, en France en 2023.'
      }
    ]
    const selection = selectWikiSections(
      onTitle,
      'Réforme des retraites en France en 2023',
      110,
      'Réforme des retraites en France en 2023'
    )
    expect(selection.focused).toBe(false)
    // reading order: the budget fills from the top, and the long section that
    // repeats the topic no longer buys its way to the front
    expect(selection.kept).toEqual(['(lead)', 'Contexte', 'Contenu'])
    expect(selection.kept).not.toContain('Manifestations et grèves en 2023')
  })

  it('still ranks when the query goes BEYOND the title', () => {
    const onTitle: WikiSection[] = [
      { heading: '', text: 'Lead of the article.' },
      { heading: 'Contexte', text: 'Le contexte de 2019.' },
      { heading: 'Motion de censure', text: 'La motion de censure rejetee a neuf voix.' },
      { heading: 'Manifestations', text: 'Les manifestations, longuement decrites.' }
    ]
    const selection = selectWikiSections(
      onTitle,
      'motion de censure',
      110,
      'Réforme des retraites en France en 2023'
    )
    expect(selection.focused).toBe(true)
    expect(selection.kept).toContain('Motion de censure')
  })

  it('ignores a term that saturates the page, and ranks on what is left', () => {
    // S07j's mean-share rule missed the owner's page: one discriminating term
    // ("2010") pulled the average under the threshold while "réforme",
    // "retraites", "des" and "en" still appeared everywhere. Per TERM now.
    const pages: WikiSection[] = [
      { heading: '', text: 'La réforme des retraites en France, lead.' },
      { heading: 'Contexte', text: 'La réforme des retraites arrive en 2019 en France.' },
      { heading: 'Mesures 2010', text: 'La réforme des retraites de 2010 en France recule l age.' },
      { heading: 'Suites', text: 'La réforme des retraites reste contestee en France.' }
    ]
    const selection = selectWikiSections(
      pages,
      'réforme des retraites en France 2010',
      110
    )
    expect(selection.focused).toBe(true)
    // only "2010" discriminates, and it points at exactly one section
    expect(selection.kept).toContain('Mesures 2010')
  })

  it('stops ranking when the query matches the whole page (S07j)', () => {
    // Owner bench 2026-08-20: the model searched "réforme des retraites en
    // France en 2023" and got the article of that name, where every section
    // carries every query term. Ranking then measures keyword DENSITY, not
    // answering power — it picked §Manifestations over §Contenu. With no
    // signal to rank by, reading order is the honest answer.
    // every section carries every query term: nothing left to rank on
    const onTopic: WikiSection[] = [
      {
        heading: '',
        text: 'La réforme des retraites en France en 2023, vue générale.'
      },
      {
        heading: 'Contenu de la réforme',
        text: 'La réforme des retraites en France en 2023 recule l age legal.'
      },
      {
        heading: 'Contexte',
        text: 'La réforme des retraites en France en 2023 succede a 2019.'
      },
      {
        heading: 'Manifestations',
        text: 'La réforme des retraites en France en 2023 provoque des manifestations contre la réforme des retraites en France en 2023, encore et encore, longuement.'
      }
    ]
    const selection = selectWikiSections(
      onTopic,
      'réforme des retraites en France en 2023',
      120
    )
    expect(selection.focused).toBe(false)
    // reading order, so the section right after the lead wins the budget
    expect(selection.kept).toEqual(['(lead)', 'Contenu de la réforme'])
  })

  it('still ranks when the query DOES discriminate inside the page', () => {
    const selection = selectWikiSections(sections, 'réforme des retraites', 160)
    expect(selection.focused).toBe(true)
    expect(selection.kept).toContain('Réforme des retraites')
  })

  it('survives an empty article', () => {
    expect(selectWikiSections([], 'anything', 100)).toEqual({
      text: '',
      truncated: false,
      kept: [],
      skipped: 0,
      focused: false
    })
  })
})
