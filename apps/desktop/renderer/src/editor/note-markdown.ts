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

export function noteMarkdown(): MarkdownIt {
  const md = new MarkdownIt({ html: false, linkify: false, breaks: true })
  taskLists(md)
  return md
}
