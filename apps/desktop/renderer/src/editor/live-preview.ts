import { syntaxTree } from '@codemirror/language'
import {
  Facet,
  StateEffect,
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
import type { AtomikApi } from '../../../shared/ipc-contract'
import { applyRotation } from '../source/rotate'

/** The preload bridge, reached at call time only (this module is also
 *  imported by headless node tests, which never render widgets). */
const atomik = (): AtomikApi =>
  (globalThis as unknown as { atomik: AtomikApi }).atomik

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
  | 'table'
  | 'image'

/**
 * The note's vault-relative path, needed to resolve image embeds. Views
 * without it (tests, non-vault surfaces) simply render no image widgets.
 */
export const notePathFacet = Facet.define<string, string | null>({
  combine: (values) => values[0] ?? null
})

const INLINABLE_IMAGE = /\.(jpe?g|png|webp|heic|heif)$/i

/**
 * Vault-relative resolution for an embed destination, matching the read
 * pipeline: relative only, `..` never escapes the root, angle-bracket
 * and percent-encoded destinations both arrive decoded from the parser.
 */
export function resolveEmbedPath(
  notePath: string,
  destination: string
): string | null {
  const raw = destination.replace(/^<|>$/g, '')
  let decoded = raw
  try {
    decoded = decodeURIComponent(raw)
  } catch {
    /* keep raw */
  }
  if (decoded.length === 0 || decoded.startsWith('/')) return null
  if (!INLINABLE_IMAGE.test(decoded)) return null
  const segments = notePath.split('/').slice(0, -1)
  for (const part of decoded.split('/')) {
    if (part === '' || part === '.') continue
    if (part === '..') {
      if (segments.length === 0) return null
      segments.pop()
      continue
    }
    segments.push(part)
  }
  return segments.length > 0 ? segments.join('/') : null
}

/** Bumped whenever an async image fetch settles: the field recomputes so
 *  placeholder chips become images (or honest broken chips). */
export const imageCacheBump = StateEffect.define<null>()

/** vault relPath → data URL | 'loading' | 'failed'. Module-level on
 *  purpose: the bytes are identical across every view of the note. */
const imageDataCache = new Map<string, string | 'loading' | 'failed'>()

/** Test seam. */
export function primeImageCache(relPath: string, dataUrl: string): void {
  imageDataCache.set(relPath, dataUrl)
}

class ImageWidget extends WidgetType {
  /** Cache state when the decoration was built: two widgets are equal
   *  only if the image data they would render is also the same. */
  private readonly builtWith: string | undefined

  constructor(
    private readonly vaultRel: string,
    private readonly alt: string
  ) {
    super()
    this.builtWith = imageDataCache.get(vaultRel)
  }

  override toDOM(view: EditorView): HTMLElement {
    const host = document.createElement('span')
    host.className = 'lp-image'
    const cached = imageDataCache.get(this.vaultRel)
    if (typeof cached === 'string' && cached !== 'loading' && cached !== 'failed') {
      const img = document.createElement('img')
      img.src = cached
      img.alt = this.alt
      host.appendChild(img)
      // Clicking the rendered image puts the cursor on the embed, which
      // reveals the raw syntax for editing (the table-widget pattern).
      host.addEventListener('click', (event) => {
        event.preventDefault()
        view.dispatch({ selection: { anchor: view.posAtDOM(host) } })
        view.focus()
      })
      return host
    }
    host.classList.add('lp-image-pending')
    host.textContent = cached === 'failed' ? `image not found: ${this.alt}` : '… image'
    if (cached === undefined) {
      imageDataCache.set(this.vaultRel, 'loading')
      atomik()
        .readSourceAsset(this.vaultRel)
        .then(async (asset) =>
          applyRotation(
            `data:${asset.mimeType};base64,${asset.base64}`,
            asset.rotation,
            asset.mimeType
          )
        )
        .then(
          (dataUrl) => {
            imageDataCache.set(this.vaultRel, dataUrl)
            try {
              view.dispatch({ effects: imageCacheBump.of(null) })
            } catch {
              /* view already destroyed */
            }
          },
          () => {
            imageDataCache.set(this.vaultRel, 'failed')
            try {
              view.dispatch({ effects: imageCacheBump.of(null) })
            } catch {
              /* view already destroyed */
            }
          }
        )
    }
    return host
  }

  override eq(other: ImageWidget): boolean {
    return (
      other.vaultRel === this.vaultRel &&
      other.alt === this.alt &&
      other.builtWith === this.builtWith
    )
  }
}

/**
 * Minimal GFM table parse for the rendered widget: header row,
 * delimiter row (validated, discarded), body rows. Cell text stays
 * plain — inline markdown inside cells is a later refinement.
 */
export function parseTable(
  source: string
): { header: string[]; rows: string[][] } | null {
  const lines = source
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
  if (lines.length < 2) return null
  const cells = (line: string): string[] =>
    line
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map((cell) => cell.trim())
  if (!/^[\s|:-]+$/.test(lines[1] as string)) return null
  return {
    header: cells(lines[0] as string),
    rows: lines.slice(2).map(cells)
  }
}

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
 * Rendered table (owner round 3: live must render tables like read).
 * Clicking anywhere in it puts the cursor inside the raw block, which
 * reveals the source for editing.
 */
class TableWidget extends WidgetType {
  constructor(private readonly source: string) {
    super()
  }

  override toDOM(view: EditorView): HTMLElement {
    const host = document.createElement('span')
    host.className = 'lp-table-widget'
    const parsed = parseTable(this.source)
    if (!parsed) {
      host.textContent = this.source
      return host
    }
    const table = document.createElement('table')
    const thead = table.createTHead().insertRow()
    for (const cell of parsed.header) {
      const th = document.createElement('th')
      th.textContent = cell
      thead.appendChild(th)
    }
    const body = table.createTBody()
    for (const row of parsed.rows) {
      const tr = body.insertRow()
      for (const cell of row) tr.insertCell().textContent = cell
    }
    host.appendChild(table)
    host.addEventListener('click', (event) => {
      event.preventDefault()
      view.dispatch({ selection: { anchor: view.posAtDOM(host) } })
      view.focus()
    })
    return host
  }

  override eq(other: TableWidget): boolean {
    return other.source === this.source
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
        case 'Image': {
          // `![alt](dest)` renders as the actual image away from the
          // cursor (owner report: embeds showed raw text in live). The
          // touched line reveals the raw syntax, like every other mark.
          const notePath = state.facet(notePathFacet)
          if (!notePath || isActiveAt(node.from)) return
          const url = node.node.getChild('URL')
          if (!url) return
          const vaultRel = resolveEmbedPath(
            notePath,
            state.doc.sliceString(url.from, url.to)
          )
          if (!vaultRel) return
          const alt = /!\[([^\]]*)\]/.exec(
            state.doc.sliceString(node.from, node.to)
          )?.[1]
          decorations.push(
            Decoration.replace({
              lp: 'image' as LivePreviewKind,
              widget: new ImageWidget(vaultRel, alt || vaultRel)
            }).range(node.from, node.to)
          )
          return false
        }
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
        case 'Table': {
          // Away from the cursor the whole block renders as a REAL table
          // (owner round 3); touched, it shows raw with the mono styling.
          const firstLine = state.doc.lineAt(node.from).number
          const lastLine = state.doc.lineAt(node.to).number
          const touched = active.from <= lastLine && active.to >= firstLine
          if (!touched) {
            decorations.push(
              Decoration.replace({
                lp: 'table' as LivePreviewKind,
                widget: new TableWidget(
                  state.doc.sliceString(node.from, node.to)
                )
              }).range(node.from, node.to)
            )
            return false
          }
          addLineDecos(node.from, node.to, 'lp-table')
          return
        }
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
        case 'FencedCode': {
          addLineDecos(node.from, node.to, 'lp-fence')
          // first/last lines carry read's rounded corners; with the
          // fence marks folded they read as the block's padding
          const first = state.doc.lineAt(node.from)
          const last = state.doc.lineAt(node.to)
          decorations.push(lineDeco('lp-fence-first').range(first.from))
          if (last.from !== first.from) {
            decorations.push(lineDeco('lp-fence-last').range(last.from))
          }
          return
        }
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
      transaction.effects.some((effect) => effect.is(imageCacheBump)) ||
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
  /** Vault-relative note path; enables image embeds. */
  notePath?: string
}): Extension {
  const follow = options?.onFollowLink
  const extensions: Extension[] = [livePreviewField]
  if (options?.notePath) {
    extensions.push(notePathFacet.of(options.notePath))
  }
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
