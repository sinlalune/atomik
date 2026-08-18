import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { consultedMaterialOf } from '../shared/chat-citations'

const wikimediaExecution = (bundle: unknown) => ({
  result: { ok: true },
  payload: { kind: 'wikimedia', bundle }
})

const article = (title: string, url: string) => ({
  kind: 'wikipedia-article',
  text: 'bounded text',
  source: {
    project: 'wikipedia',
    language: 'fr',
    title,
    pageId: 1,
    revision: { id: 238521024, timestamp: null },
    canonicalUrl: url,
    accessedAt: '2026-08-18T15:32:06.111Z',
    license: { name: 'CC BY-SA 4.0', url: 'https://creativecommons.org/x' }
  }
})

describe('what an answer consulted (CP-MVP-011 S07b)', () => {
  it('names each page once, with the exact revision that was read', () => {
    const material = consultedMaterialOf([
      wikimediaExecution({
        results: [
          article('Marie Curie', 'https://fr.wikipedia.org/wiki/Marie_Curie')
        ],
        media: [],
        warnings: []
      }),
      // The same page reached again by a second call is still ONE source.
      wikimediaExecution({
        results: [
          article('Marie Curie', 'https://fr.wikipedia.org/wiki/Marie_Curie'),
          article('Pierre Curie', 'https://fr.wikipedia.org/wiki/Pierre_Curie')
        ],
        media: [],
        warnings: []
      })
    ])

    expect(material.sources.map((source) => source.title)).toEqual([
      'Marie Curie',
      'Pierre Curie'
    ])
    expect(material.sources[0]).toMatchObject({
      kind: 'wikipedia-article',
      project: 'wikipedia',
      language: 'fr',
      revision: '238521024',
      license: { name: 'CC BY-SA 4.0' }
    })
  })

  it('shows a Wikidata entity by its label, never by its QID', () => {
    const material = consultedMaterialOf([
      wikimediaExecution({
        results: [
          {
            kind: 'wikidata-entity',
            id: 'Q7186',
            label: 'Marie Curie',
            source: {
              project: 'wikidata',
              language: 'fr',
              title: 'Q7186',
              revision: { id: 2532255818, timestamp: null },
              canonicalUrl: 'https://www.wikidata.org/wiki/Q7186',
              accessedAt: '2026-08-18T15:32:07.881Z',
              license: { name: 'CC0', url: 'https://creativecommons.org/zero' }
            }
          }
        ],
        media: [],
        warnings: []
      })
    ])
    expect(material.sources[0]?.title).toBe('Marie Curie')
  })

  it('drops media that lost any part of its attribution', () => {
    const complete = {
      originalUrl: 'https://upload.wikimedia.org/a.jpg',
      thumbnailUrl: 'https://upload.wikimedia.org/a-thumb.jpg',
      fileTitle: 'File:Curie.jpg',
      creator: 'Unknown author',
      width: 200,
      height: 300,
      source: {
        canonicalUrl: 'https://commons.wikimedia.org/wiki/File:Curie.jpg',
        license: { name: 'Public domain', url: 'https://commons.example/pd' }
      }
    }
    const material = consultedMaterialOf([
      wikimediaExecution({
        results: [],
        media: [
          complete,
          // No creator — withheld upstream, and withheld again here so a
          // presentation bug can never publish an uncredited image.
          { ...complete, originalUrl: 'https://upload.wikimedia.org/b.jpg', creator: '' },
          {
            ...complete,
            originalUrl: 'https://upload.wikimedia.org/c.jpg',
            source: { canonicalUrl: 'https://commons.example/c', license: null }
          }
        ],
        warnings: []
      })
    ])
    expect(material.media).toHaveLength(1)
    expect(material.media[0]).toMatchObject({
      creator: 'Unknown author',
      license: { name: 'Public domain' }
    })
  })

  it('carries corpus and truncation warnings through, deduplicated', () => {
    const warning = {
      kind: 'corpus-unavailable',
      message: 'wikidata was unavailable (rate-limit); these results come from the other corpus only'
    }
    const material = consultedMaterialOf([
      wikimediaExecution({ results: [], media: [], warnings: [warning] }),
      wikimediaExecution({ results: [], media: [], warnings: [warning] })
    ])
    expect(material.warnings).toEqual([warning])
  })

  it('surfaces notes the model pulled in by CALLING search_vault', () => {
    // S07c, owner bench: this retrieval happened mid-answer and had no
    // surface at all — the pre-pass packet opens from the question's pill,
    // but a tool-driven read was invisible.
    const material = consultedMaterialOf([
      {
        result: { ok: true },
        payload: {
          kind: 'vault-context',
          packet: {
            entries: [
              {
                path: 'notes/zidane.md',
                title: 'Zinedine Zidane',
                stage: 'title',
                reason: 'title matches the question',
                tokens: 180
              },
              // The same note reached twice stays one entry.
              { path: 'notes/zidane.md', title: 'Zinedine Zidane', stage: 'title' }
            ]
          }
        }
      }
    ])
    expect(material.notes).toEqual([
      {
        path: 'notes/zidane.md',
        title: 'Zinedine Zidane',
        stage: 'title',
        reason: 'title matches the question',
        tokens: 180
      }
    ])
    expect(material.sources).toEqual([])
  })

  it('invents nothing from a failed or payload-less call', () => {
    const material = consultedMaterialOf([
      { result: { ok: false } },
      { result: { ok: true } }
    ])
    expect(material).toEqual({ sources: [], media: [], notes: [], warnings: [] })
  })
})

describe('the media host the renderer may load (S07b)', () => {
  it('opens the image policy to exactly one pinned Wikimedia host', () => {
    const html = readFileSync(
      new URL('../renderer/index.html', import.meta.url),
      'utf8'
    )
    const policy = /content="([^"]+)"/.exec(html)?.[1] ?? ''
    const imgSrc = /img-src ([^;]+)/.exec(policy)?.[1]?.trim()
    // A transient Commons thumbnail is explicitly allowed by this path;
    // everything else stays local, and no other remote host joins img-src.
    expect(imgSrc).toBe("'self' data: https://upload.wikimedia.org")
    expect(policy).toContain("default-src 'self'")
    expect(policy).toContain("script-src 'self'")
  })
})
