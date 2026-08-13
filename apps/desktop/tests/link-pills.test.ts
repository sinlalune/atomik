/**
 * Link pills (CP-MVP-009 S03) — kind classification, nearest-wins
 * wikilink resolution, and the post-render decoration swap.
 */
import { describe, expect, it } from 'vitest'
import {
  classifyLinkKind,
  decorateLinkTitles,
  decorateWikiLinks,
  firstHeadingOf,
  pillDisplayText,
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

describe('firstHeadingOf (S05e/S06b: the note TITLE, H1 preferred)', () => {
  it('finds the first H1', () => {
    expect(firstHeadingOf("# L'ethos\n\nbody")).toBe("L'ethos")
    expect(firstHeadingOf('intro\n\n# Real Title \nrest')).toBe('Real Title')
  })

  it('H1 wins over an earlier deeper heading', () => {
    expect(firstHeadingOf('## Section\n\n# The Title\n')).toBe('The Title')
  })

  it('falls back to the first heading of any level (owner notes open on ##)', () => {
    expect(firstHeadingOf("## L'ethos\n\nbody")).toBe("L'ethos")
    expect(firstHeadingOf('### Deep\nbody')).toBe('Deep')
  })

  it('ignores headings inside fenced code, and reports none honestly', () => {
    expect(firstHeadingOf('```\n# Not a title\n```\n\n## Real\n')).toBe('Real')
    expect(firstHeadingOf('no headings at all')).toBeNull()
  })

  it('accepts the indentation markdown accepts (S07b: the owner\'s " # L\'ethos")', () => {
    expect(firstHeadingOf(" # L'ethos\n\nbody")).toBe("L'ethos")
    expect(firstHeadingOf('   ## Trois espaces\n')).toBe('Trois espaces')
    // four spaces is an indented CODE block, not a heading
    expect(firstHeadingOf('    # Code, not a title\n')).toBeNull()
  })

  it('drops a closing hash run ("# Title #")', () => {
    expect(firstHeadingOf('# Le logos #\n')).toBe('Le logos')
    expect(firstHeadingOf('# C# et F#\n')).toBe('C# et F#')
  })
})

describe('pillDisplayText (S07b: the title, not the file name)', () => {
  it('a pill naming the file shows the note title', () => {
    expect(pillDisplayText('crédibilité', 'crédibilité.md', 'La crédibilité')).toBe(
      'La crédibilité'
    )
    // the @ menu's own form: stem text, path target
    expect(
      pillDisplayText('ai-generation', 'notes/ai-generation.md', 'AI generation')
    ).toBe('AI generation')
    // a wikilink whose target IS a path
    expect(
      pillDisplayText('notes/ai-generation.md', 'notes/ai-generation.md', 'AI generation')
    ).toBe('AI generation')
  })

  it('deliberate wording inside a sentence is never rewritten', () => {
    expect(pillDisplayText('ce concept', 'crédibilité.md', 'La crédibilité')).toBe(
      'ce concept'
    )
    // even a typo'd link text is the author's text, not the file's name
    expect(
      pillDisplayText('Ethymology', 'philosophy/Etymology.md', 'Etymology')
    ).toBe('Ethymology')
  })

  it('falls back to the authored text when there is no title to show', () => {
    expect(pillDisplayText('crédibilité', 'crédibilité.md', null)).toBe('crédibilité')
    expect(pillDisplayText('crédibilité', null, 'La crédibilité')).toBe('crédibilité')
    expect(pillDisplayText('crédibilité', 'crédibilité.md', '')).toBe('crédibilité')
  })

  it('matches a percent-encoded href (markdown-it normalizes accents)', () => {
    expect(
      pillDisplayText('crédibilité', 'cr%C3%A9dibilit%C3%A9.md', 'La crédibilité')
    ).toBe('La crédibilité')
    expect(pillDisplayText('a', 'a%ZZ.md', 'Broken escape')).toBe('a')
  })

  it('matching is case-insensitive and ignores surrounding spaces', () => {
    expect(pillDisplayText(' CRÉDIBILITÉ ', 'crédibilité.md', 'La crédibilité')).toBe(
      'La crédibilité'
    )
  })
})

describe('decorateLinkTitles (S07b, read view)', () => {
  const titles: Record<string, string> = {
    'crédibilité.md': 'La crédibilité',
    'notes/ai-generation.md': 'AI generation'
  }
  const titleOf = ({ rel, href }: { rel: string | null; href: string | null }) =>
    titles[rel ?? href ?? ''] ?? null

  it('swaps a resolved wiki pill onto the target title', () => {
    const html =
      '<a href="#" data-wiki="crédibilité" data-rel="crédibilité.md" class="link-pill link-pill--note">crédibilité</a>'
    expect(decorateLinkTitles(html, titleOf)).toContain('>La crédibilité</a>')
  })

  it('swaps an md-link pill (the @ menu form)', () => {
    const html =
      '<a href="notes/ai-generation.md" class="link-pill link-pill--note">ai-generation</a>'
    expect(decorateLinkTitles(html, titleOf)).toContain('>AI generation</a>')
  })

  it('swaps a pill whose href is percent-encoded', () => {
    const encoded: Record<string, string> = {
      'cr%C3%A9dibilit%C3%A9.md': 'La crédibilité'
    }
    const html =
      '<a href="cr%C3%A9dibilit%C3%A9.md" class="link-pill link-pill--note">crédibilité</a>'
    expect(
      decorateLinkTitles(html, ({ href }) => encoded[href ?? ''] ?? null)
    ).toContain('>La crédibilité</a>')
  })

  it('keeps the edge mark inside the pill untouched', () => {
    const html =
      '<a href="#" data-wiki="crédibilité" data-rel="crédibilité.md" class="link-pill link-pill--note">crédibilité<span class="edge-mark" data-edge-label="repose-sur" title="⟶ repose sur"></span></a>'
    const out = decorateLinkTitles(html, titleOf)
    expect(out).toContain('>La crédibilité<span class="edge-mark"')
    expect(out).toContain('data-edge-label="repose-sur"')
  })

  it('leaves unknown targets, external links and prose alone', () => {
    const html =
      '<a href="https://example.org" class="link-pill link-pill--web">example</a>' +
      '<a href="#" data-wiki="ghost" class="link-pill link-pill--note link-pill--broken">ghost</a>' +
      '<p>crédibilité in prose</p>'
    expect(decorateLinkTitles(html, titleOf)).toBe(html)
  })

  it('escapes a title carrying markup characters', () => {
    const html =
      '<a href="#" data-wiki="x" data-rel="x.md" class="link-pill link-pill--note">x</a>'
    const out = decorateLinkTitles(html, () => 'A & B <tag>')
    expect(out).toContain('>A &amp; B &lt;tag&gt;</a>')
  })
})
