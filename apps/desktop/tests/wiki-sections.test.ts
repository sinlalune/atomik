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

  it('stops ranking when the query matches the whole page (S07j)', () => {
    // Owner bench 2026-08-20: the model searched "réforme des retraites en
    // France en 2023" and got the article of that name, where every section
    // carries every query term. Ranking then measures keyword DENSITY, not
    // answering power — it picked §Manifestations over §Contenu. With no
    // signal to rank by, reading order is the honest answer.
    const onTopic: WikiSection[] = [
      { heading: '', text: 'La réforme des retraites de 2023 en France, vue générale.' },
      { heading: 'Contenu de la réforme', text: 'La réforme des retraites recule l age legal.' },
      { heading: 'Contexte', text: 'La réforme des retraites en France arrive apres 2019.' },
      {
        heading: 'Manifestations',
        text: 'La réforme des retraites en France en 2023 provoque des manifestations contre la réforme des retraites, encore et encore, longuement.'
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
