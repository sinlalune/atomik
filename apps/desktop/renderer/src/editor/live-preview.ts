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
import type { SyntaxNode } from '@lezer/common'

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
export type LivePreviewKind =
  | 'hide'
  | 'line'
  | 'mark'
  | 'bullet'
  | 'hr'
  | 'task'
  | 'metadata'

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

class HrWidget extends WidgetType {
  override toDOM(): HTMLElement {
    const rule = document.createElement('span')
    rule.className = 'lp-hr'
    return rule
  }

  override eq(): boolean {
    return true
  }
}

/**
 * Folded frontmatter (owner follow-up: seamless mode must not open on a
 * screenful of metadata — read strips it entirely). Clicking the chip
 * puts the cursor inside, which reveals the raw block for editing.
 */
class MetadataChipWidget extends WidgetType {
  override toDOM(view: EditorView): HTMLElement {
    const chip = document.createElement('button')
    chip.type = 'button'
    chip.className = 'lp-metadata'
    chip.textContent = '⋯ metadata'
    chip.title = 'Show the note metadata (frontmatter)'
    chip.addEventListener('click', (event) => {
      event.preventDefault()
      const pos = view.posAtDOM(chip)
      view.dispatch({ selection: { anchor: pos } })
      view.focus()
    })
    return chip
  }

  override eq(): boolean {
    return true
  }
}

/**
 * Interactive task checkbox standing in for `[ ]` / `[x]`. Clicking it
 * toggles the marker IN THE BUFFER (an ordinary transaction: dirty flag,
 * auto-save, undo all apply). The marker position is resolved at click
 * time via posAtDOM — widgets must not hold offsets, they get reused.
 */
class CheckboxWidget extends WidgetType {
  constructor(private readonly checked: boolean) {
    super()
  }

  override toDOM(view: EditorView): HTMLElement {
    const box = document.createElement('input')
    box.type = 'checkbox'
    box.className = 'lp-task'
    box.checked = this.checked
    box.addEventListener('click', (event) => {
      event.preventDefault()
      const pos = view.posAtDOM(box)
      const marker = view.state.doc.sliceString(pos, pos + 3)
      if (!/^\[[ xX]\]$/.test(marker)) return
      view.dispatch({
        changes: {
          from: pos,
          to: pos + 3,
          insert: this.checked ? '[ ]' : '[x]'
        }
      })
    })
    return box
  }

  override eq(other: CheckboxWidget): boolean {
    return other.checked === this.checked
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
  Strikethrough: 'lp-strike'
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

  // Frontmatter folds to a chip while the selection is elsewhere (read
  // strips it entirely; live must not open on a screenful of metadata).
  // Any selection touching its lines reveals the raw block, dim mono.
  const fmEnd = frontmatterEnd(state)
  if (fmEnd > 0) {
    const fmLastLine = state.doc.lineAt(fmEnd).number
    if (active.from <= fmLastLine) {
      addLineDecos(0, fmEnd, 'lp-frontmatter')
    } else {
      decorations.push(
        Decoration.replace({
          lp: 'metadata' as LivePreviewKind,
          widget: new MetadataChipWidget()
        }).range(0, fmEnd)
      )
    }
  }

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
        case 'Link':
          // Only a REAL link ([text](url)) gets link treatment. The
          // parser also emits Link nodes for bare [text] (unresolved
          // reference shorthand), which the read view renders literally
          // — live must match it (owner report: bracket text turned
          // into green links in live only).
          if (node.node.getChild('URL') && node.from < node.to) {
            decorations.push(markDeco('lp-link').range(node.from, node.to))
          }
          return
        case 'HeaderMark':
          // ATX '#'s (space eaten) and Setext underlines both vanish.
          if (!isActiveAt(node.from)) hideMark(node.from, node.to, true)
          return
        case 'EmphasisMark':
        case 'StrikethroughMark':
          if (!isActiveAt(node.from)) hideMark(node.from, node.to)
          return
        case 'CodeMark': {
          // Inline backticks hide. Fence marks fold too (owner follow-up:
          // blocks must render like read): away from the cursor the fence
          // line empties into a tinted padding line of the block; the
          // active line shows them dimmed for editing.
          const parent = node.node.parent
          if (parent?.name === 'InlineCode' && !isActiveAt(node.from)) {
            hideMark(node.from, node.to)
          } else if (parent?.name === 'FencedCode') {
            if (!isActiveAt(node.from)) hideMark(node.from, node.to)
            else decorations.push(markDeco('lp-dim').range(node.from, node.to))
          }
          return
        }
        case 'CodeInfo':
          if (!isActiveAt(node.from)) hideMark(node.from, node.to)
          else decorations.push(markDeco('lp-dim').range(node.from, node.to))
          return
        case 'LinkMark': {
          // Brackets fold only inside a real link; bare [text] (and
          // image syntax, unrendered for now) stays literal like read.
          const parent = node.node.parent
          if (parent?.name !== 'Link' || !parent.getChild('URL')) return
          if (!isActiveAt(node.from)) hideMark(node.from, node.to)
          return
        }
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
          if (isActiveAt(node.from)) return
          // Task items render only their checkbox: the list dash (and
          // its trailing space) folds away entirely.
          if (node.node.parent?.getChild('Task')) {
            hideMark(node.from, node.to, true)
            return
          }
          const text = state.doc.sliceString(node.from, node.to)
          if (/^[-*+]$/.test(text)) {
            decorations.push(bullet.range(node.from, node.to))
          }
          return
        }
        case 'TaskMarker': {
          if (isActiveAt(node.from)) return
          const checked = /x/i.test(
            state.doc.sliceString(node.from, node.to)
          )
          decorations.push(
            Decoration.replace({
              lp: 'task' as LivePreviewKind,
              widget: new CheckboxWidget(checked)
            }).range(node.from, node.to)
          )
          const task = node.node.parent
          if (checked && task && task.to > node.to) {
            decorations.push(markDeco('lp-done').range(node.to, task.to))
          }
          return
        }
        case 'HorizontalRule':
          if (!isActiveAt(node.from)) {
            decorations.push(
              Decoration.replace({
                lp: 'hr' as LivePreviewKind,
                widget: new HrWidget()
              }).range(node.from, node.to)
            )
          }
          return
        case 'Table':
          addLineDecos(node.from, node.to, 'lp-table')
          return
        case 'TableDelimiter':
          decorations.push(markDeco('lp-dim').range(node.from, node.to))
          return
        case 'TableCell':
          if (node.node.parent?.name === 'TableHeader' && node.from < node.to) {
            decorations.push(markDeco('lp-strong').range(node.from, node.to))
          }
          return
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

/** The URL of the markdown Link enclosing `pos`, or null. Pure — the
 *  Ctrl/Cmd+click handler and its tests share it. */
export function linkHrefAt(state: EditorState, pos: number): string | null {
  let node: SyntaxNode | null = syntaxTree(state).resolveInner(pos, 0)
  while (node && node.name !== 'Link') node = node.parent
  if (!node) return null
  const url = node.getChild('URL')
  return url ? state.doc.sliceString(url.from, url.to) : null
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

/**
 * The complete live-preview extension. With `onFollowLink`, Ctrl/Cmd+
 * click on a link reports its raw href (the host resolves and opens);
 * a plain click still just places the cursor.
 */
export function livePreview(options?: {
  onFollowLink?: (href: string) => void
}): Extension {
  const follow = options?.onFollowLink
  const extensions: Extension[] = [livePreviewField]
  if (follow) {
    extensions.push(
      EditorView.domEventHandlers({
        mousedown: (event, view) => {
          if (event.button !== 0 || !(event.ctrlKey || event.metaKey)) {
            return false
          }
          const pos = view.posAtCoords({ x: event.clientX, y: event.clientY })
          if (pos === null) return false
          const href = linkHrefAt(view.state, pos)
          if (!href) return false
          event.preventDefault()
          follow(href)
          return true
        }
      })
    )
  }
  return extensions
}
