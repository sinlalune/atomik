import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { CHAT_LOG_A11Y } from '../renderer/src/workspace/chat-presentation'
import { noteMarkdown } from '../renderer/src/editor/note-markdown'
import { decorateWikiLinks } from '../renderer/src/editor/link-pills'
import { resolveWikiTarget, type WikiCandidate } from '../shared/graph-core'

const css = readFileSync(
  new URL('../renderer/src/styles.css', import.meta.url),
  'utf8'
)
const view = readFileSync(
  new URL('../renderer/src/workspace/ChatView.tsx', import.meta.url),
  'utf8'
)

function cssRule(selector: string): string {
  const start = css.indexOf(`${selector} {`)
  if (start < 0) throw new Error(`missing CSS rule: ${selector}`)
  const end = css.indexOf('\n}', start)
  if (end < 0) throw new Error(`unterminated CSS rule: ${selector}`)
  return css.slice(start, end)
}

describe('chat message presentation (CP-FEEDBACK S02)', () => {
  it('exposes chronological additions as a polite conversation log', () => {
    expect(CHAT_LOG_A11Y).toEqual({
      role: 'log',
      'aria-label': 'Conversation',
      'aria-live': 'polite',
      'aria-relevant': 'additions'
    })
    expect(view).toContain('{...CHAT_LOG_A11Y}')
    expect(view).toContain('aria-busy={running}')
  })

  it('centres one conversation lane, with user right and Atomik left inside it', () => {
    expect(view).toContain('className="chat-thread"')

    const thread = cssRule('.chat-thread')
    expect(thread).toContain('width: 100%')
    expect(thread).toContain('max-width: var(--chat-measure)')
    expect(thread).toContain('margin-inline: auto')
    expect(thread).toContain('flex-direction: column')

    const user = cssRule('.chat-turn.role-you')
    expect(user).toContain('align-self: flex-end')
    expect(user).toContain('max-width: 85%')
    expect(user).not.toContain('margin-inline-end')
    expect(user).toContain('border: 1px solid var(--border)')
    expect(user).toContain('background: var(--code-bg)')

    const assistant = cssRule('.chat-turn.role-atomik')
    expect(assistant).toContain('align-self: stretch')
    expect(assistant).toContain('width: 100%')
    expect(assistant).toContain('margin-inline: 0')
    expect(assistant).not.toContain('margin-inline: auto')
    expect(assistant).toContain('border: 0')
    expect(assistant).toContain('background: transparent')

    const body = cssRule('.chat-turn-body')
    expect(body).toContain('margin-inline: 0')
  })
})

describe('pointing wikilinks in chat (CP-AI-CAPABILITIES S02)', () => {
  const candidates: readonly WikiCandidate[] = [
    { name: 'Attention', relPath: 'notes/Attention.md' },
    { name: 'Softmax', relPath: 'notes/Softmax.md' }
  ]
  const rendered = (markdown: string): string =>
    decorateWikiLinks(noteMarkdown().render(markdown), (target) =>
      resolveWikiTarget(candidates, target)
    )

  it('resolves a pointed note to a real target', () => {
    const html = rendered('See [[Attention]] for the mechanism.')
    expect(html).toContain('data-wiki="Attention"')
    expect(html).toContain('data-rel="notes/Attention.md"')
  })

  it('leaves an unresolved target inert — a diagnostic, never an auto-create', () => {
    const html = rendered('See [[Nonexistent]] for nothing.')
    expect(html).toContain('link-pill--broken')
    expect(html).not.toContain('data-rel=')
  })

  it('routes a pointing click by the RESOLVED target, after citations', () => {
    // Citation keeps its own gesture and returns first; pointing is the
    // second, distinct affordance. Bedrock 28 + the CP-MVP-010 bench ruling:
    // a citation must not borrow the link pill, so the two never merge.
    expect(view).toContain("'a[data-citation]'")
    expect(view).toContain("'a[data-wiki]'")
    const citationAt = view.indexOf("'a[data-citation]'")
    const wikiAt = view.indexOf("'a[data-wiki]'")
    expect(citationAt).toBeLessThan(wikiAt)
    expect(view).toContain("rel.endsWith('.md')")
  })

  it('resolves candidates once per view, not once per streamed token', () => {
    // An answer streams; an IPC round trip per chunk would be absurd.
    expect(view).toContain('function useWikiCandidates')
    const hook = view.slice(view.indexOf('function useWikiCandidates'))
    expect(hook.slice(0, hook.indexOf('return candidates'))).toContain('}, [])')
  })

  it('builds candidates from the vault root — a conversation has no sibling', () => {
    expect(view).toContain("wikiCandidatesFor('', index.nodes)")
  })
})
