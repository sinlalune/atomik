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

describe('the wiki tool control (CP-MVP-011 S07a)', () => {
  it('defaults OFF and only then sends a tool preference', () => {
    // The owner's ruling: "possibility to enable it". A thread must not reach
    // the network because it was opened.
    expect(view).toContain('const [wiki, setWiki] = useState(false)')
    // `tools` rides the operation only while the toggle is on. S07g named
    // the preference so the agent trace can record what the send carried;
    // the conditional it guards is the same one.
    expect(view).toContain('const toolPreference = wiki')
    expect(view).toContain('...(toolPreference ? { tools: toolPreference } : {})')
    expect(view).toContain("mode: 'model' as const")
    expect(view).toMatch(/wikiReach,\s*\n\s*wikiSources/)
  })

  it('mirrors the vault tool: a toggle, a reach, and one switch per source', () => {
    expect(view).toContain('aria-label="Wikimedia lookup"')
    expect(view).toContain('aria-pressed={wiki}')
    expect(view).toContain('reach · {wikiReach}')
    for (const label of ['wikipedia', 'wikidata', 'image', 'etymology']) {
      expect(view).toContain(`'${label}'`)
    }
    expect(view).toContain('aria-pressed={wikiSources[key]}')
  })

  it('disables the image switch when its entity source is off', () => {
    // Commons media is resolved through Wikidata's P18; without that leg the
    // switch would be a control that cannot work.
    expect(view).toContain("disabled={key === 'media' && !wikiSources.wikidata}")
  })

  it('styles a source switch so on and off are distinguishable', () => {
    const on = cssRule(".chat-tool.chat-src[aria-pressed='true']")
    const off = cssRule(".chat-tool.chat-src[aria-pressed='false']")
    expect(on).toContain('var(--accent)')
    expect(off).toContain('line-through')
  })

  it('derives the edition from the locale and refuses an unsafe label', () => {
    expect(view).toContain('function wikiLanguageOf()')
    expect(view).toContain("/^[a-z]{2,3}$/.test(primary) ? primary : 'en'")
  })
})

describe('the consulted-sources surface (CP-MVP-011 S07b)', () => {
  const block = readFileSync(
    new URL('../renderer/src/workspace/ConsultedBlock.tsx', import.meta.url),
    'utf8'
  )

  it('attaches what was consulted to the ANSWER, not to the question', () => {
    // The packet belongs to the you-turn it was compiled for; the sources
    // belong to the answer that read them.
    expect(view).toContain('consultedByTurn.current.set(')
    expect(view).toContain('priorTurns.length + 1')
    expect(view).toContain('consultedMaterialOf(result.toolExecutions)')
  })

  it('leads the ANSWER with the image, not the provenance block (S07h)', () => {
    // Owner bench, twice: "would want it first and well presented", then
    // "photo still after text". S07e put it first INSIDE the consulted block,
    // which still renders after the prose and the citation footer.
    const media = view.indexOf('<ConsultedMediaBlock')
    const body = view.indexOf('<ClaimBody')
    const block = view.indexOf('<ConsultedBlock')
    expect(media).toBeGreaterThan(-1)
    expect(media).toBeLessThan(body)
    expect(body).toBeLessThan(block)
    const consulted = readFileSync(
      new URL('../renderer/src/workspace/ConsultedBlock.tsx', import.meta.url),
      'utf8'
    )
    // the provenance block no longer renders media itself
    const blockStart = consulted.indexOf('export function ConsultedBlock(')
    expect(consulted.slice(blockStart)).not.toContain('material.media')
  })

  it('keeps attribution beside the image rather than in a tooltip', () => {
    expect(block).toContain('chat-consulted-credit')
    expect(block).toMatch(/\{item\.creator\}/)
    expect(block).toMatch(/\{item\.license\.name\}/)
    const credit = cssRule('.chat-consulted-credit')
    expect(credit).toContain('var(--muted)')
  })

  it('shows the revision that was actually read', () => {
    expect(block).toContain('function revisionLabel')
    expect(block).toContain('rev ')
    expect(block).toContain('revision not exposed')
  })

  it('offers the edition as a choice, seeded from the locale', () => {
    expect(view).toContain('lang · {wikiLang}')
    expect(view).toContain('useState(wikiLanguageOf)')
    expect(view).toContain('function WIKI_EDITIONS()')
  })
})
