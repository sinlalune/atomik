import MarkdownIt from 'markdown-it'
import { matchDecorationAt, matchWikilinkAt, type EdgeDecoration } from '../../../shared/edge-grammar'
import { classifyLinkKind, linkKindDescription } from './link-pills'
import { richMarkdownPlaceholders } from './rich-markdown/markdown-plugin'
import { stripHtmlComments } from '../../../shared/html-comments'

/**
 * The ONE note renderer (CP-MVP-008 S05g, owner: "task list doesnt
 * [render] anywhere") — every surface that shows a note as HTML (read
 * view, AI panel blocks, inline preview, tab simulation) builds its
 * MarkdownIt HERE, so rendering conventions can't drift per surface.
 *
 * Config: html off (untrusted content stays text), linkify off,
 * breaks on (a single Enter IS a line break — the note-taking
 * expectation). Plus a hand-rolled GFM task-list rule (15: zero new
 * dependencies): `- [ ]` / `- [x]` items render as disabled
 * checkboxes, read-only — toggling stays an EDIT, in the editor.
 */

function taskLists(md: MarkdownIt): void {
  md.core.ruler.after('inline', 'atomik-task-lists', (state) => {
    const tokens = state.tokens
    for (let index = 2; index < tokens.length; index += 1) {
      const inline = tokens[index]!
      if (inline.type !== 'inline') continue
      if (tokens[index - 1]!.type !== 'paragraph_open') continue
      if (tokens[index - 2]!.type !== 'list_item_open') continue
      const first = inline.children?.[0]
      if (!first || first.type !== 'text') continue
      const match = /^\[( |x|X)\] /.exec(first.content)
      if (!match) continue
      const checked = match[1]!.toLowerCase() === 'x'
      first.content = first.content.slice(4)
      const checkbox = new state.Token('html_inline', '', 0)
      checkbox.content = `<input type="checkbox" class="task-checkbox" disabled${checked ? ' checked' : ''}> `
      inline.children!.unshift(checkbox)
      tokens[index - 2]!.attrJoin('class', 'task-item')
    }
    return true
  })
}

/**
 * Source-true block spacing (S05o, owner: read showed a gap after
 * `### Key Ideas` where the source has NO blank line — fixed CSS
 * margins can never track the author's blank lines). markdown-it
 * records each block's start line (`token.map`); this rule marks
 * every top-level block with its ACTUAL preceding blank-line count:
 * 0 → `md-tight` (no gap, like the editor), 1 → the default
 * one-line gap, N → an explicit N-line margin. Read spacing IS the
 * source, byte for byte.
 *
 * S05p: the count comes from the SOURCE lines above the block, not
 * from the previous token's map end — list maps swallow their
 * trailing blank line ([start, blank+1]), which made every block
 * after a list read as tight.
 */
const BLOCK_TOKENS = new Set([
  'fence',
  'hr',
  'code_block',
  'html_block',
  'atomik_math_block'
])

function sourceGaps(md: MarkdownIt): void {
  md.core.ruler.push('atomik-source-gaps', (state) => {
    const lines = state.src.split('\n')
    let seenFirst = false
    for (const token of state.tokens) {
      if (token.level !== 0 || !token.map) continue
      if (!token.type.endsWith('_open') && !BLOCK_TOKENS.has(token.type)) continue
      if (seenFirst) {
        let blankLines = 0
        for (let line = token.map[0] - 1; line >= 0 && lines[line]!.trim() === ''; line -= 1) {
          blankLines += 1
        }
        if (blankLines === 0) {
          token.attrJoin('class', 'md-tight')
        } else if (blankLines > 1) {
          token.attrSet(
            'style',
            `margin-top: calc(${blankLines} * var(--note-block-gap))`
          )
        }
      }
      seenFirst = true
    }
    return true
  })
}

/**
 * Semantic edges (CP-MVP-009 S03, bedrock 20 recast + ADR-011): every
 * link is an edge of the knowledge graph and renders as a type pill;
 * `[[target]]{label}` and `[text](href){label}` grow a label chip.
 * The grammar comes from shared/edge-grammar — the ONE parser (the
 * Lezer editor extension and the index scan consume the same module),
 * so the rendering can never fork from the law.
 *
 * Wikilinks render with `data-wiki` and a default note pill; surfaces
 * with vault knowledge resolve them post-render (link-pills'
 * decorateWikiLinks: real kind class + `data-rel`, or the broken
 * diagnostic modifier — never auto-created).
 */
function semanticEdges(md: MarkdownIt): void {
  const pushChip = (
    state: { push: (type: string, tag: string, nesting: 0 | 1 | -1) => { meta?: unknown } },
    deco: EdgeDecoration
  ): void => {
    const chip = state.push('edge_chip', '', 0)
    chip.meta = deco
  }

  md.inline.ruler.before('link', 'atomik-wikilink', (state, silent) => {
    const match = matchWikilinkAt(state.src, state.pos)
    if (!match) return false
    if (!silent) {
      const open = state.push('link_open', 'a', 1)
      open.attrSet('href', '#')
      open.attrSet('data-wiki', match.target)
      const text = state.push('text', '', 0)
      text.content = match.target
      // the graph mark lives INSIDE the pill (S05d owner correction)
      if (match.decoration) pushChip(state, match.decoration)
      state.push('link_close', 'a', -1)
    }
    state.pos += match.length
    return true
  })

  // `[text](href){label}` — the chip only when the brace group is a
  // valid decoration IMMEDIATELY after a link (ADR-011 adjacency:
  // pending text or any other predecessor leaves it prose).
  md.inline.ruler.push('atomik-edge-chip', (state, silent) => {
    if (state.src.charCodeAt(state.pos) !== 0x7b /* { */) return false
    if (state.pending.length > 0) return false
    const last = state.tokens[state.tokens.length - 1]
    if (!last || last.type !== 'link_close') return false
    const deco = matchDecorationAt(state.src, state.pos)
    if (!deco) return false
    if (!silent) {
      // re-open the just-closed anchor so the graph mark renders
      // INSIDE the pill (S05d owner correction: nothing sits beside
      // the pill — the mark is part of it)
      const close = state.tokens.pop()!
      pushChip(state, { label: deco.label, reverse: deco.reverse })
      state.tokens.push(close)
    }
    state.pos += deco.length
    return true
  })

  // The typed-edge GRAPH MARK (S05d, owner vision: "a labelized
  // version of the graph relation … on hovering an in-pills graph
  // link icon"): a small icon inside the pill; its title reads the
  // relation as a sentence. The factory only knows label + target —
  // surfaces with the subject (useVaultNote, live) upgrade the title
  // to "subject label target" via decorateEdgeMarks.
  md.renderer.rules['edge_chip'] = (tokens, idx) => {
    const { label, reverse } = tokens[idx]!.meta as EdgeDecoration
    const escaped = md.utils.escapeHtml(label)
    const human = md.utils.escapeHtml(label.replace(/-/g, ' '))
    return `<span class="edge-mark${reverse ? ' edge-mark--rev' : ''}" data-edge-label="${escaped}"${
      reverse ? ' data-edge-rev="1"' : ''
    } title="${reverse ? '⟵' : '⟶'} ${human}"></span>`
  }

  md.renderer.rules['link_open'] = (tokens, idx, options, _env, self) => {
    const token = tokens[idx]!
    const kind =
      token.attrGet('data-wiki') !== null
        ? 'note'
        : classifyLinkKind(token.attrGet('href') ?? '')
    if (kind !== null) {
      token.attrJoin('class', `link-pill link-pill--${kind}`)
      const description = linkKindDescription(kind)
      if (description !== null) token.attrSet('aria-description', description)
    }
    return self.renderToken(tokens, idx, options)
  }
}

export function noteMarkdown(): MarkdownIt {
  const md = new MarkdownIt({ html: false, linkify: false, breaks: true })
  // S07j (owner bench): `html: false` ESCAPES comments instead of dropping
  // them, so a chat transcript rendered its own `<!-- sent: … -->` heading
  // bookkeeping as prose. Strip them from the source — turning `html` on to
  // hide them would let model output inject raw markup (13).
  md.core.ruler.before('normalize', 'atomik_strip_comments', (state) => {
    if (state.src.includes('<!--')) state.src = stripHtmlComments(state.src)
  })
  richMarkdownPlaceholders(md)
  taskLists(md)
  sourceGaps(md)
  semanticEdges(md)
  // S05t (owner: "it is justifying differently"): read's leaf text
  // blocks wrap under white-space: break-spaces so a space at the
  // wrap point takes width exactly like the editor. That only works
  // if no RAW newline reaches those blocks — the default break rules
  // emit '<br>\n', and break-spaces would render that '\n' as a
  // second, phantom line break.
  md.renderer.rules.softbreak = () => '<br>'
  md.renderer.rules.hardbreak = () => '<br>'
  return md
}
