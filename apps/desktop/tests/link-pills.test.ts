/**
 * Link pills (CP-MVP-009 S03) — kind classification, nearest-wins
 * wikilink resolution, and the post-render decoration swap.
 */
import { describe, expect, it } from 'vitest'
import {
  classifyLinkKind,
  decorateWikiLinks,
  firstHeadingOf,
  resolveWikiTarget
} from '../renderer/src/editor/link-pills'
import { noteMarkdown } from '../renderer/src/editor/note-markdown'

describe('classifyLinkKind', () => {
  it('derives the node kind from the target string', () => {
    expect(classifyLinkKind('notes/attention.md')).toBe('note')
    expect(classifyLinkKind('notes/index.md')).toBe('folder')
    expect(classifyLinkKind('chats/2026-08-03/a.md')).toBe('chat')
    expect(classifyLinkKind('prompts/tone.md')).toBe('prompt')
    expect(classifyLinkKind('../sources/pdf/x/source.md')).toBe('pdf')
    expect(classifyLinkKind('../sources/pdf/x/source.md#page=3')).toBe('pdf-anchor')
    expect(classifyLinkKind('sources/web/x/source.md')).toBe('web')
    expect(classifyLinkKind('sources/captures/x/source.md')).toBe('capture')
    expect(classifyLinkKind('x/source.md')).toBe('source')
    expect(classifyLinkKind('https://example.org')).toBe('web')
    expect(classifyLinkKind('img/shot.png')).toBe('media')
    expect(classifyLinkKind('doc.pdf')).toBe('pdf')
  })

  it('returns null for non-edge targets (plain rendering)', () => {
    expect(classifyLinkKind('')).toBeNull()
    expect(classifyLinkKind('#section')).toBeNull()
    expect(classifyLinkKind('mailto:a@b.c')).toBeNull()
  })
})

describe('resolveWikiTarget', () => {
  const candidates = [
    { name: 'Attention', relPath: 'ai/Attention.md' },
    { name: 'attention', relPath: 'philosophy/attention.md' },
    { name: 'Query', relPath: 'ai/Query.md' }
  ]

  it('matches the filename stem case-insensitively, nearest first', () => {
    expect(resolveWikiTarget(candidates, 'attention')).toBe('ai/Attention.md')
    expect(resolveWikiTarget(candidates, 'QUERY')).toBe('ai/Query.md')
  })

  it('matches an explicit path with optional .md', () => {
    expect(resolveWikiTarget(candidates, 'philosophy/attention')).toBe(
      'philosophy/attention.md'
    )
    expect(resolveWikiTarget(candidates, 'ai/Query.md')).toBe('ai/Query.md')
  })

  it('misses honestly', () => {
    expect(resolveWikiTarget(candidates, 'unknown')).toBeNull()
    expect(resolveWikiTarget(candidates, '')).toBeNull()
    expect(resolveWikiTarget(candidates, 'wrong/path')).toBeNull()
  })
})

describe('decorateWikiLinks', () => {
  const md = noteMarkdown()

  it('resolved: gains data-rel and the real kind class', () => {
    const html = md.render('[[my chat]]')
    const out = decorateWikiLinks(html, () => 'chats/2026-08-03/my chat.md')
    expect(out).toContain('data-rel="chats/2026-08-03/my chat.md"')
    expect(out).toContain('link-pill--chat')
    expect(out).not.toContain('link-pill--note')
  })

  it('unresolved: gains the broken diagnostic modifier, no data-rel', () => {
    const html = md.render('[[ghost]]')
    const out = decorateWikiLinks(html, () => null)
    expect(out).toContain('link-pill--broken')
    expect(out).not.toContain('data-rel')
  })

  it('resolves each target independently and unescapes entities', () => {
    const html = md.render('[[a&b]] then [[real]]')
    const seen: string[] = []
    const out = decorateWikiLinks(html, (target) => {
      seen.push(target)
      return target === 'real' ? 'real.md' : null
    })
    expect(seen).toEqual(['a&b', 'real'])
    expect(out).toContain('link-pill--broken')
    expect(out).toContain('data-rel="real.md"')
  })

  it('leaves md-link pills untouched', () => {
    const html = md.render('[paper](x/source.md)')
    expect(decorateWikiLinks(html, () => null)).toBe(html)
  })
})

describe('firstHeadingOf (S05e: H1 over filename in graph sentences)', () => {
  it('finds the first H1', () => {
    expect(firstHeadingOf("# L'ethos\n\nbody")).toBe("L'ethos")
    expect(firstHeadingOf('intro\n\n# Real Title \nrest')).toBe('Real Title')
  })

  it('ignores deeper headings and missing H1s', () => {
    expect(firstHeadingOf('## Only h2\nbody')).toBeNull()
    expect(firstHeadingOf('no headings at all')).toBeNull()
  })
})
