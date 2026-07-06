import { syntaxTree } from '@codemirror/language'
import {
  StateField,
  type EditorState,
  type Extension,
  type Range
} from '@codemirror/state'
import {
  Decoration,
  EditorView,
  WidgetType,
  type DecorationSet
} from '@codemirror/view'

/**
 * Live preview (owner feedback on MVP-001: "seamless like Obsidian").
 * The buffer stays the RAW Markdown — 11/27 byte fidelity is untouched;
 * this is decoration only. Formatting marks (#, **, ` , [](), >, -) are
 * HIDDEN and their content styled while the cursor is elsewhere; any
 * line the selection touches shows its full syntax again, so editing is
 * always plain-text editing. A StateField (not a ViewPlugin) so the
 * whole mapping is computable from EditorState alone — unit-testable
 * without a DOM. Recomputed on every doc/selection change over the full
 * document: fine at note scale, an M8-class perf seam beyond it.
 */

/** Spec tag so tests (and debugging) can classify decorations. */
export type LivePreviewKind = 'hide' | 'line' | 'mark' | 'bullet'

class BulletWidget extends WidgetType {
  override toDOM(): HTMLElement {
    const span = document.createElement('span')
    span.className = 'lp-bullet'
    span.textContent = '•'
    return span
  }

  override eq(): boolean {
    return true
  }
}

const hide = Decoration.replace({ lp: 'hide' as LivePreviewKind })
const bullet = Decoration.replace({
  lp: 'bullet' as LivePreviewKind,
  widget: new BulletWidget()
})
const lineDeco = (className: string): Decoration =>
  Decoration.line({ lp: 'line' as LivePreviewKind, class: className })
const markDeco = (className: string): Decoration =>
  Decoration.mark({ lp: 'mark' as LivePreviewKind, class: className })

const HEADING_LINES: Record<string, string> = {
  ATXHeading1: 'lp-h1',
  ATXHeading2: 'lp-h2',
  ATXHeading3: 'lp-h3',
  ATXHeading4: 'lp-h4',
  ATXHeading5: 'lp-h5',
  ATXHeading6: 'lp-h6',
  SetextHeading1: 'lp-h1',
  SetextHeading2: 'lp-h2'
}

const INLINE_STYLES: Record<string, string> = {
  Emphasis: 'lp-em',
  StrongEmphasis: 'lp-strong',
  InlineCode: 'lp-code',
  Strikethrough: 'lp-strike',
  Link: 'lp-link'
}

/** Marks are revealed on every line the selection touches. */
function activeLineRange(state: EditorState): { from: number; to: number } {
  const { from, to } = state.selection.main
  return {
    from: state.doc.lineAt(from).number,
    to: state.doc.lineAt(to).number
  }
}

/**
 * End offset of a leading YAML frontmatter block (`---` … `---`/`...`),
 * 0 when absent. The markdown grammar has no frontmatter node, so the
 * paragraph-before-`---` misparses as a giant setext heading; the whole
 * block is styled as one dim unit instead and every other decoration
 * inside it is suppressed. Frontmatter stays fully visible and editable
 * (11: it is part of the raw note).
 */
export function frontmatterEnd(state: EditorState): number {
  if (state.doc.lines < 2 || state.doc.line(1).text.trim() !== '---') return 0
  const lastLine = Math.min(state.doc.lines, 100)
  for (let n = 2; n <= lastLine; n += 1) {
    const text = state.doc.line(n).text.trim()
    if (text === '---' || text === '...') return state.doc.line(n).to
  }
  return 0
}

export function computeLivePreviewDecorations(
  state: EditorState
): DecorationSet {
  const decorations: Range<Decoration>[] = []
  const active = activeLineRange(state)
  const isActiveAt = (pos: number): boolean => {
    const line = state.doc.lineAt(pos).number
    return line >= active.from && line <= active.to
  }
  /** Hides a mark plus one following space (the `# ` / `> ` shapes). */
  const hideMark = (from: number, to: number, eatSpace = false): void => {
    const end =
      eatSpace && state.doc.sliceString(to, to + 1) === ' ' ? to + 1 : to
    if (end > from) decorations.push(hide.range(from, end))
  }
  const addLineDecos = (from: number, to: number, className: string): void => {
    const first = state.doc.lineAt(from).number
    const last = state.doc.lineAt(to).number
    for (let n = first; n <= last; n += 1) {
      const line = state.doc.line(n)
      decorations.push(lineDeco(className).range(line.from))
    }
  }

  const fmEnd = frontmatterEnd(state)
  if (fmEnd > 0) addLineDecos(0, fmEnd, 'lp-frontmatter')

  syntaxTree(state).iterate({
    enter: (node) => {
      // Nothing inside the frontmatter block gets markdown treatment.
      if (node.name !== 'Document' && node.from < fmEnd) return false
      const heading = HEADING_LINES[node.name]
      if (heading) {
        addLineDecos(node.from, node.to, heading)
        return
      }
      const inline = INLINE_STYLES[node.name]
      if (inline) {
        if (node.from < node.to) {
          decorations.push(markDeco(inline).range(node.from, node.to))
        }
        return
      }
      switch (node.name) {
        case 'HeaderMark':
          // ATX '#'s (space eaten) and Setext underlines both vanish.
          if (!isActiveAt(node.from)) hideMark(node.from, node.to, true)
          return
        case 'EmphasisMark':
        case 'StrikethroughMark':
          if (!isActiveAt(node.from)) hideMark(node.from, node.to)
          return
        case 'CodeMark': {
          // Inline backticks hide; fence marks stay (dimmed) — a fenced
          // block whose fences vanish is disorienting while editing.
          const parent = node.node.parent
          if (parent?.name === 'InlineCode' && !isActiveAt(node.from)) {
            hideMark(node.from, node.to)
          } else if (parent?.name === 'FencedCode') {
            decorations.push(markDeco('lp-dim').range(node.from, node.to))
          }
          return
        }
        case 'CodeInfo':
          decorations.push(markDeco('lp-dim').range(node.from, node.to))
          return
        case 'LinkMark':
          if (!isActiveAt(node.from)) hideMark(node.from, node.to)
          return
        case 'URL': {
          // In [text](url): hide '(url)' away from the cursor. The parens
          // are plain text between LinkMarks in some grammar versions, so
          // eat them when adjacent.
          if (node.node.parent?.name !== 'Link' || isActiveAt(node.from)) return
          const before =
            state.doc.sliceString(node.from - 1, node.from) === '('
              ? node.from - 1
              : node.from
          const after =
            state.doc.sliceString(node.to, node.to + 1) === ')'
              ? node.to + 1
              : node.to
          hideMark(before, after)
          return
        }
        case 'ListMark': {
          const text = state.doc.sliceString(node.from, node.to)
          if (/^[-*+]$/.test(text) && !isActiveAt(node.from)) {
            decorations.push(bullet.range(node.from, node.to))
          }
          return
        }
        case 'Blockquote':
          addLineDecos(node.from, node.to, 'lp-quote')
          return
        case 'QuoteMark':
          if (!isActiveAt(node.from)) hideMark(node.from, node.to, true)
          return
        case 'FencedCode':
          addLineDecos(node.from, node.to, 'lp-fence')
          return
        default:
          return
      }
    }
  })

  return Decoration.set(decorations, true)
}

export const livePreviewField = StateField.define<DecorationSet>({
  create: computeLivePreviewDecorations,
  update(value, transaction) {
    // The third condition catches the background parser advancing on a
    // large document (its progress transactions change neither doc nor
    // selection, but the tree identity moves).
    if (
      transaction.docChanged ||
      transaction.selection ||
      syntaxTree(transaction.state) !== syntaxTree(transaction.startState)
    ) {
      return computeLivePreviewDecorations(transaction.state)
    }
    return value
  },
  provide: (field) => EditorView.decorations.from(field)
})

/** The complete live-preview extension. */
export function livePreview(): Extension {
  return [livePreviewField]
}
