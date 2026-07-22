import MarkdownIt from 'markdown-it'

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
 * records each block's source lines (`token.map`); this rule marks
 * every top-level block with its ACTUAL preceding blank-line count:
 * 0 → `md-tight` (no gap, like the editor), 1 → the default
 * one-line gap, N → an explicit N-line margin. Read spacing IS the
 * source, byte for byte.
 */
const BLOCK_TOKENS = new Set(['fence', 'hr', 'code_block', 'html_block'])

function sourceGaps(md: MarkdownIt): void {
  md.core.ruler.push('atomik-source-gaps', (state) => {
    let previousEnd: number | null = null
    for (const token of state.tokens) {
      if (token.level !== 0 || !token.map) continue
      if (!token.type.endsWith('_open') && !BLOCK_TOKENS.has(token.type)) continue
      if (previousEnd !== null) {
        const blankLines = token.map[0] - previousEnd
        if (blankLines <= 0) {
          token.attrJoin('class', 'md-tight')
        } else if (blankLines > 1) {
          token.attrSet(
            'style',
            `margin-top: calc(${blankLines} * var(--note-block-gap))`
          )
        }
      }
      previousEnd = token.map[1]
    }
    return true
  })
}

export function noteMarkdown(): MarkdownIt {
  const md = new MarkdownIt({ html: false, linkify: false, breaks: true })
  taskLists(md)
  sourceGaps(md)
  return md
}
