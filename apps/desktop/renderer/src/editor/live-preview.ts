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
import { normalizeLabel, parseEdges } from '../../../shared/edge-grammar'
import { addLabel, editLabel, findEdgeAt, flipDirection } from './edge-author'
import { labelsInDoc, mergeVocabulary } from './edge-complete'
import type { AtomikApi } from '../../../shared/ipc-contract'
import {
  classifyLinkKind,
  edgeSentence,
  firstHeadingOf,
  linkKindDescription,
  pillDisplayText,
  resolveRelativeTarget,
  resolveWikiTarget,
  type LinkKind,
  type WikiCandidate
} from './link-pills'
import { applyRotation } from '../source/rotate'
import { getCachedImage, isCachedDataUrl, setCachedImage } from '../vault/image-cache'
import {
  DEFAULT_RICH_LIMITS,
  type RichRendererKind,
  type RichTheme
} from './rich-markdown/contracts'
import {
  hydrateRichMarkdown,
  type RichHydration
} from './rich-markdown/hydration'
import {
  discoverDollarMath,
  richKindForFence,
  type SourceRange
} from './rich-markdown/syntax'

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
  | 'edge'
  | 'math'
  | 'mermaid'
  | 'vega-lite'
  | 'code'
  | 'rich-limit'

const DEFAULT_RICH_THEME: RichTheme = { name: 'system', scheme: 'light' }

/** Theme is explicit state for async widgets: a compartment reconfigure
 * rebuilds them when the app theme changes instead of leaving stale output. */
export const richThemeFacet = Facet.define<RichTheme, RichTheme>({
  combine: (values) => values[0] ?? DEFAULT_RICH_THEME
})

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

// The image bytes live in the SHARED bounded cache (vault/image-cache):
// live and read mode render the same assets, and the cache is cleared on
// vault switch / invalidated on rotation (perf audit 2026-07-15 — the
// old module-level Map here grew forever and served stale bytes).

class ImageWidget extends WidgetType {
  /** Cache state when the decoration was built: two widgets are equal
   *  only if the image data they would render is also the same. */
  private readonly builtWith: string | undefined

  constructor(
    private readonly vaultRel: string,
    private readonly alt: string
  ) {
    super()
    this.builtWith = getCachedImage(vaultRel)
  }

  override toDOM(view: EditorView): HTMLElement {
    const host = document.createElement('span')
    host.className = 'lp-image'
    const cached = getCachedImage(this.vaultRel)
    if (isCachedDataUrl(cached)) {
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
      setCachedImage(this.vaultRel, 'loading')
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
            setCachedImage(this.vaultRel, dataUrl)
            try {
              view.dispatch({ effects: imageCacheBump.of(null) })
            } catch {
              /* view already destroyed */
            }
          },
          () => {
            setCachedImage(this.vaultRel, 'failed')
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

const richHydrations = new WeakMap<HTMLElement, RichHydration>()

/**
 * A disposable live-mode projection over an unchanged replacement range.
 * Clicking the result moves the cursor back onto that range; the next state
 * computation removes the widget and reveals the literal delimiters/source.
 */
class RichBlockWidget extends WidgetType {
  constructor(
    private readonly kind: Extract<
      RichRendererKind,
      'math' | 'mermaid' | 'vega-lite' | 'code'
    >,
    private readonly source: string,
    private readonly display: boolean,
    private readonly info: string,
    private readonly theme: RichTheme
  ) {
    super()
  }

  override toDOM(view: EditorView): HTMLElement {
    const doc = view.dom.ownerDocument
    const root = doc.createElement('span')
    root.className = [
      'lp-rich-widget',
      `lp-${this.kind}-widget`,
      this.display ? 'lp-rich-widget--display' : ''
    ]
      .filter(Boolean)
      .join(' ')

    const block = doc.createElement('span')
    block.className = this.display
      ? `rich-markdown-block rich-markdown-${this.kind}`
      : `rich-markdown-inline rich-markdown-${this.kind}`
    block.dataset['richBlock'] = ''
    block.dataset['richKind'] = this.kind
    block.dataset['richInfo'] = this.info
    block.setAttribute('role', 'group')
    block.setAttribute(
      'aria-label',
      this.kind === 'mermaid'
        ? 'Mermaid source'
        : this.kind === 'vega-lite'
          ? 'Vega-Lite source'
          : this.kind === 'code'
            ? 'Code source'
          : this.display
            ? 'Display math'
            : 'Inline math'
    )

    const source = doc.createElement('code')
    source.dataset['richSource'] = ''
    source.textContent = this.source
    const output = doc.createElement('span')
    output.dataset['richOutput'] = ''
    output.hidden = true
    const status = doc.createElement('span')
    status.dataset['richStatus'] = ''
    status.setAttribute('role', 'status')
    status.hidden = true
    block.append(source, output, status)
    root.appendChild(block)

    const hydration = hydrateRichMarkdown(root, { theme: this.theme })
    richHydrations.set(root, hydration)
    root.addEventListener('mousedown', (event) => {
      if (event.button !== 0) return
      const target = event.target as Element | null
      if (target?.closest?.('[data-rich-interactive]')) return
      event.preventDefault()
      view.dispatch({ selection: { anchor: view.posAtDOM(root) } })
      view.focus()
    })
    return root
  }

  override destroy(dom: HTMLElement): void {
    richHydrations.get(dom)?.dispose()
    richHydrations.delete(dom)
  }

  override eq(other: RichBlockWidget): boolean {
    return (
      other.kind === this.kind &&
      other.source === this.source &&
      other.display === this.display &&
      other.info === this.info &&
      other.theme.name === this.theme.name &&
      other.theme.scheme === this.theme.scheme
    )
  }
}

class RichLimitWidget extends WidgetType {
  override toDOM(view: EditorView): HTMLElement {
    const status = view.dom.ownerDocument.createElement('span')
    status.className = 'lp-rich-limit'
    status.setAttribute('role', 'status')
    status.textContent = `Rich block limit reached (${DEFAULT_RICH_LIMITS.maxBlocks}); remaining rich source stays editable. `
    return status
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

/**
 * Semantic edges in live (CP-MVP-009 S04; S04b owner bench round 1:
 * "same rendering as read mode" — full parity, the earlier neutral
 * version retired). ADR-011 through the SAME shared/edge-grammar
 * module as read and the coming index — the grammar cannot fork.
 * Away from the cursor every link (wikilink OR standard md link)
 * renders as the read view's kind pill + label chip; the touched line
 * reveals raw syntax like every other mark. Wikilink resolution uses
 * the same nearest-wins candidates as read, fed into
 * `wikiCandidatesField` by the host at mount — null = not loaded yet
 * (pills stay neutral, never a broken flash before the vault answers).
 */
/** How pill clicks navigate (S04c owner bench round 2: "we can't
 *  interact with link in live mode as in obsidian"): LEFT click on a
 *  pill FOLLOWS the link (Obsidian's live-preview model), RIGHT click
 *  reveals the raw syntax for editing. `href` follows a raw md href
 *  (host resolves against the note, externals stay inert per 13);
 *  `rel` opens an already-resolved vault path (wikilinks). */
export type EdgeFollow = {
  href: (raw: string) => void
  rel: (relPath: string) => void
}

const edgeFollowFacet = Facet.define<EdgeFollow, EdgeFollow | null>({
  combine: (values) => values[0] ?? null
})

export const setWikiCandidates = StateEffect.define<WikiCandidate[]>()

/** The VAULT-WIDE label vocabulary (S06): host-fed from the index so
 *  the widened pill's datalist offers every label the owner has used,
 *  not just this document's (merged with doc-local labels at open
 *  time, which covers unsaved edits). */
export const setVocabulary = StateEffect.define<string[]>()

export const vocabularyField = StateField.define<string[]>({
  create: () => [],
  update: (value, tr) => {
    for (const effect of tr.effects) {
      if (effect.is(setVocabulary)) return effect.value
    }
    return value
  }
})

export const wikiCandidatesField = StateField.define<WikiCandidate[] | null>({
  create: () => null,
  update: (value, tr) => {
    for (const effect of tr.effects) {
      if (effect.is(setWikiCandidates)) return effect.value
    }
    return value
  }
})

export type EdgeFollowTarget = { kind: 'href' | 'rel'; target: string } | null

class LinkPillWidget extends WidgetType {
  constructor(
    private readonly text: string,
    private readonly kind: LinkKind,
    private readonly broken: boolean,
    private readonly label: string | null,
    private readonly reverse: boolean,
    private readonly follow: EdgeFollowTarget,
    /** The linked note's TITLE when the index resolved it (S06b) —
     *  computed at DECORATION time and part of eq, so a widget whose
     *  title changed (candidates arriving) is rebuilt instead of
     *  reused with a stale sentence. */
    private readonly targetTitle: string | null
  ) {
    super()
  }

  override toDOM(view: EditorView): HTMLElement {
    const wrap = document.createElement('span')
    wrap.className = 'edge-widget'
    this.renderBaseline(view, wrap)
    return wrap
  }

  private subjectOf(view: EditorView): string {
    // H1 first (S05e owner: the note's real name), filename fallback.
    const text = view.state.doc.toString()
    const body = text.slice(frontmatterEnd(view.state))
    const heading = firstHeadingOf(body)
    if (heading) return heading
    const notePath = view.state.facet(notePathFacet)
    return (notePath?.split('/').pop() ?? '').replace(/\.md$/i, '') || 'this note'
  }

  private renderBaseline(view: EditorView, wrap: HTMLElement): void {
    wrap.textContent = ''
    wrap.classList.remove('edge-widget--editing')
    const pill = document.createElement('span')
    pill.className = `link-pill link-pill--${this.kind}${
      this.broken ? ' link-pill--broken' : ''
    }`
    const text = document.createElement('span')
    text.className = 'pill-text'
    text.textContent = this.text
    pill.appendChild(text)
    const kindDescription = linkKindDescription(this.kind)
    if (kindDescription !== null) {
      pill.setAttribute('aria-description', kindDescription)
    }
    const actionTitle = this.broken
      ? `unresolved: ${this.text} — click to edit`
      : `${this.follow?.target ?? this.text} — right-click to edit`
    pill.title = kindDescription
      ? `${kindDescription} — ${actionTitle}`
      : actionTitle
    if (this.follow) {
      const target = this.follow
      pill.addEventListener('mousedown', (event) => {
        if (event.button !== 0) return
        if (event.target instanceof HTMLElement && event.target.closest('button')) return
        // hash/mailto have no follow action — leave the click to CM
        // (cursor placement = edit), never a consumed no-op (S04d)
        if (target.kind === 'href' && /^(mailto:|#)/.test(target.target)) return
        const handlers = view.state.facet(edgeFollowFacet)
        if (!handlers) return
        event.preventDefault()
        event.stopPropagation()
        if (target.kind === 'rel') handlers.rel(target.target)
        else handlers.href(target.target)
      })
    }
    // Right click = edit: place the cursor at the pill so the active
    // line reveals the raw syntax (broken pills get this on left
    // click too, via CM's default cursor placement).
    pill.addEventListener('contextmenu', (event) => {
      event.preventDefault()
      view.dispatch({ selection: { anchor: view.posAtDOM(wrap) } })
      view.focus()
    })
    if (this.label === null) {
      // Untyped: the "+" INSIDE the pill (owner vision), hover-revealed.
      const add = document.createElement('button')
      add.type = 'button'
      add.className = 'pill-add'
      add.textContent = '+'
      add.title = 'add edge label'
      add.addEventListener('mousedown', (event) => {
        event.preventDefault()
        event.stopPropagation()
      })
      add.addEventListener('click', (event) => {
        event.preventDefault()
        event.stopPropagation()
        this.openEditor(view, wrap)
      })
      pill.appendChild(add)
    } else {
      // Typed: the GRAPH MARK inside the pill (S05d owner vision) —
      // hover reads the relation as a sentence ("L'ethos repose sur
      // fiabilité"), click opens the editor.
      const mark = document.createElement('button')
      mark.type = 'button'
      mark.className = `edge-mark${this.reverse ? ' edge-mark--rev' : ''}`
      // target side: the linked note's H1 when the index resolved it
      // (S06; candidates carry titles), else the typed text
      mark.title = edgeSentence(
        this.subjectOf(view),
        this.label,
        this.targetTitle ?? this.text,
        this.reverse
      )
      mark.addEventListener('mousedown', (event) => {
        event.preventDefault()
        event.stopPropagation()
      })
      mark.addEventListener('click', (event) => {
        event.preventDefault()
        event.stopPropagation()
        this.openEditor(view, wrap)
      })
      pill.appendChild(mark)
    }
    wrap.appendChild(pill)
  }

  /** THE pill widens (owner vision): the input lives INSIDE the pill
   *  after its text, borderless, with the document vocabulary as a
   *  datalist; ⇄ flips a typed edge in place. Enter commits (empty =
   *  remove, leading ^ = reverse; keyup backstop for the
   *  datalist-popup-eats-keydown case); Esc or clicking away cancels.
   *  In-widget DOM edits are safe again since S05c killed the real
   *  render bug (nested replace decorations). */
  private openEditor(view: EditorView, wrap: HTMLElement): void {
    wrap.textContent = ''
    wrap.classList.add('edge-widget--editing')
    const pill = document.createElement('span')
    pill.className = `link-pill link-pill--${this.kind} link-pill--editing`
    const kindDescription = linkKindDescription(this.kind)
    if (kindDescription !== null) {
      pill.setAttribute('aria-description', kindDescription)
    }
    const text = document.createElement('span')
    text.className = 'pill-text'
    text.textContent = this.text
    pill.appendChild(text)

    const listId = `edge-labels-${Math.floor(Math.random() * 1e9)}`
    const datalist = document.createElement('datalist')
    datalist.id = listId
    // vault vocabulary first (most-used, S06), then labels only this
    // buffer knows yet (unsaved edits)
    for (const label of mergeVocabulary(
      view.state.field(vocabularyField, false) ?? [],
      labelsInDoc(view.state.doc.toString())
    )) {
      const option = document.createElement('option')
      option.value = label
      datalist.appendChild(option)
    }
    pill.appendChild(datalist)

    const input = document.createElement('input')
    input.className = 'pill-input'
    input.setAttribute('list', listId)
    input.placeholder = 'label (^ = reverse)'
    input.setAttribute('aria-label', 'edge label')
    input.value = this.label === null ? '' : `${this.reverse ? '^' : ''}${this.label}`
    let done = false
    const cancel = (): void => {
      if (done) return
      done = true
      this.renderBaseline(view, wrap)
    }
    const commit = (): void => {
      if (done) return
      done = true
      const edge = findEdgeAt(view.state.doc.toString(), view.posAtDOM(wrap))
      if (!edge) {
        done = false
        return cancel()
      }
      const raw = input.value.trim()
      const reverse = raw.startsWith('^')
      const label = normalizeLabel(reverse ? raw.slice(1) : raw)
      let change = null
      if (edge.decoration === null) {
        change = addLabel(edge, label, reverse)
      } else if (label.length > 0 && reverse !== edge.decoration.reverse) {
        const brace = `{${edge.decoration.reverse ? '^' : ''}${edge.decoration.label}}`
        change = {
          from: edge.end - brace.length,
          to: edge.end,
          insert: `{${reverse ? '^' : ''}${label}}`
        }
      } else {
        change = editLabel(edge, label)
      }
      view.focus()
      if (change) view.dispatch({ changes: change })
      else this.renderBaseline(view, wrap)
    }
    input.addEventListener('keydown', (event) => {
      event.stopPropagation()
      if (event.key === 'Enter') {
        event.preventDefault()
        commit()
      } else if (event.key === 'Escape') {
        event.preventDefault()
        cancel()
        view.focus()
      }
    })
    // Backstop: with the datalist popup open, Chrome delivers no Enter
    // KEYDOWN — the keyup still arrives.
    input.addEventListener('keyup', (event) => {
      event.stopPropagation()
      if (event.key === 'Enter') commit()
    })
    input.addEventListener('blur', () => cancel())
    input.addEventListener('mousedown', (event) => event.stopPropagation())
    pill.appendChild(input)

    if (this.label !== null) {
      const flip = document.createElement('button')
      flip.type = 'button'
      flip.className = 'pill-flip'
      flip.textContent = '⇄'
      flip.title = `flip direction (now: ${this.reverse ? 'reverse' : 'forward'})`
      flip.addEventListener('mousedown', (event) => {
        event.preventDefault()
        event.stopPropagation()
      })
      flip.addEventListener('click', (event) => {
        event.preventDefault()
        event.stopPropagation()
        if (done) return
        done = true
        const edge = findEdgeAt(view.state.doc.toString(), view.posAtDOM(wrap))
        const change = edge ? flipDirection(edge) : null
        view.focus()
        if (change) view.dispatch({ changes: change })
      })
      pill.appendChild(flip)
    }
    wrap.appendChild(pill)
    input.focus()
    input.select()
  }

  override eq(other: LinkPillWidget): boolean {
    return (
      other.text === this.text &&
      other.kind === this.kind &&
      other.broken === this.broken &&
      other.label === this.label &&
      other.reverse === this.reverse &&
      other.follow?.kind === this.follow?.kind &&
      other.follow?.target === this.follow?.target &&
      other.targetTitle === this.targetTitle
    )
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

  type LiveRichRange = SourceRange & {
    kind: Extract<
      RichRendererKind,
      'math' | 'mermaid' | 'vega-lite' | 'code'
    >
    source: string
    display: boolean
    info: string
  }
  const tree = syntaxTree(state)
  const protectedRanges: SourceRange[] = fmEnd > 0 ? [{ from: 0, to: fmEnd }] : []
  const fencedRich: LiveRichRange[] = []
  tree.iterate({
    enter: (node) => {
      if (node.name === 'InlineCode') {
        protectedRanges.push({ from: node.from, to: node.to })
        return false
      }
      if (node.name !== 'FencedCode') return
      protectedRanges.push({ from: node.from, to: node.to })
      if (node.from < fmEnd) return false
      const infoNode = node.node.getChild('CodeInfo')
      const info = infoNode
        ? state.doc.sliceString(infoNode.from, infoNode.to).trim()
        : ''
      const kind = richKindForFence(info) ?? 'code'
      const code = node.node.getChild('CodeText')
      fencedRich.push({
        from: node.from,
        to: node.to,
        kind,
        source: code ? state.doc.sliceString(code.from, code.to) : '',
        display: true,
        info: info.trim().split(/\s+/, 1)[0]?.toLowerCase() || kind
      })
      return false
    }
  })

  const richRanges: LiveRichRange[] = [
    ...discoverDollarMath(state.doc.toString(), protectedRanges).map((span) => ({
      ...span,
      kind: 'math' as const,
      info: span.display ? 'display' : 'inline'
    })),
    ...fencedRich
  ].sort((a, b) => a.from - b.from)
  const mathRanges = richRanges.filter((range) => range.kind === 'math')
  const replacedRichRanges: SourceRange[] = []
  const richTheme = state.facet(richThemeFacet)

  for (const [index, rich] of richRanges.entries()) {
    if (index >= DEFAULT_RICH_LIMITS.maxBlocks) {
      decorations.push(
        Decoration.widget({
          lp: 'rich-limit' as LivePreviewKind,
          side: -1,
          widget: new RichLimitWidget()
        }).range(rich.from)
      )
      break
    }
    const firstLine = state.doc.lineAt(rich.from).number
    const lastLine = state.doc.lineAt(rich.to).number
    const touched = active.from <= lastLine && active.to >= firstLine
    if (touched) continue
    replacedRichRanges.push({ from: rich.from, to: rich.to })
    decorations.push(
      Decoration.replace({
        lp: rich.kind as LivePreviewKind,
        richKind: rich.kind,
        richDisplay: rich.display,
        richSource: rich.source,
        richTheme: richTheme.name,
        ...(rich.kind === 'math'
          ? {
              mathDisplay: rich.display,
              mathSource: rich.source,
              mathTheme: richTheme.name
            }
          : {}),
        widget: new RichBlockWidget(
          rich.kind,
          rich.source,
          rich.display,
          rich.info,
          richTheme
        )
      }).range(rich.from, rich.to)
    )
  }

  tree.iterate({
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
            // S05q (owner): the marker's following space stayed as
            // TEXT after the bullet widget, offsetting the first
            // line one space right of its wraps (read has no such
            // space — text starts at the padding edge). Swallow it
            // into the replaced range.
            const markEnd =
              state.doc.sliceString(node.to, node.to + 1) === ' '
                ? node.to + 1
                : node.to
            decorations.push(bullet.range(node.from, markEnd))
          }
          // S05m: the ITEM LINE gets a class so live can hang-indent
          // like the read view (wrapped text aligns under the text,
          // not under the bullet).
          decorations.push(
            lineDeco('lp-li').range(state.doc.lineAt(node.from).from)
          )
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
          if (
            replacedRichRanges.some(
              (range) => range.from === node.from && range.to === node.to
            )
          ) {
            return false
          }
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

  // Semantic edges (S04; S04b: full read parity). The shared grammar
  // scans the raw doc (it already skips fences, inline code, and
  // images); every link away from the cursor replaces with the read
  // pill + chip. Wikilinks resolve against the host-fed candidates
  // (null = not loaded → neutral note pill, never a broken flash).
  const candidates = state.field(wikiCandidatesField, false) ?? null
  const notePath = state.facet(notePathFacet)
  const edgeRanges: [number, number][] = []
  for (const edge of parseEdges(state.doc.toString())) {
    if (edge.start < fmEnd) continue
    if (isActiveAt(edge.start)) continue
    // A link-shaped TeX fragment belongs to the math expression. A link that
    // encloses math still wins as one edge pill (normal Markdown precedence).
    if (
      mathRanges.some(
        (math) => math.from <= edge.start && edge.end <= math.to
      )
    ) {
      continue
    }
    let kind: LinkKind | null
    let broken = false
    let follow: EdgeFollowTarget = null
    if (edge.kind === 'wikilink') {
      if (candidates === null) {
        kind = 'note'
      } else {
        const rel = resolveWikiTarget(candidates, edge.target)
        kind = rel === null ? 'note' : (classifyLinkKind(rel) ?? 'note')
        broken = rel === null
        if (rel !== null) follow = { kind: 'rel', target: rel }
      }
    } else {
      // hash/mailto stay plain — read leaves them un-pilled too
      kind = classifyLinkKind(edge.target)
      follow = { kind: 'href', target: edge.target }
    }
    if (kind === null) continue
    // The linked note's title for the relation sentence (S06b): wiki
    // pills resolved above; md links resolve their href the way the
    // index does. Computed HERE so it rides widget equality — a
    // widget reused after candidates arrive kept a stale sentence.
    let resolvedPath: string | null = null
    if (edge.kind === 'wikilink') {
      resolvedPath = follow?.kind === 'rel' ? follow.target : null
    } else if (notePath && !/^(https?:|mailto:|#)/i.test(edge.target)) {
      resolvedPath = resolveRelativeTarget(notePath, edge.target)
    }
    const targetTitle =
      (resolvedPath
        ? candidates?.find((c) => c.relPath === resolvedPath)?.title
        : undefined) ?? null
    edgeRanges.push([edge.start, edge.end])
    decorations.push(
      Decoration.replace({
        lp: 'edge' as LivePreviewKind,
        edgeKind: kind,
        edgeBroken: broken,
        edgeFollow: follow,
        widget: new LinkPillWidget(
          // S07b: read parity — a pill naming the FILE shows the
          // note's title (same pure rule both surfaces).
          pillDisplayText(
            edge.text,
            resolvedPath ?? (edge.kind === 'wikilink' ? edge.target : null),
            targetTitle
          ),
          kind,
          broken,
          edge.decoration?.label ?? null,
          edge.decoration?.reverse ?? false,
          follow,
          targetTitle
        )
      }).range(edge.start, edge.end)
    )
  }

  // Replace ranges must not nest. Edge pills keep their structural line
  // decorations; rich widgets own their complete range, including fenced-code
  // line chrome. A link enclosing math wins, while link-shaped TeX was skipped
  // above so the math widget wins in the opposite containment direction.
  const filtered = decorations.filter((deco) => {
    const spec = deco.value.spec as { lp?: LivePreviewKind }
    const insideEdge = edgeRanges.some(
      ([from, to]) => deco.from >= from && deco.to <= to
    )
    if (spec.lp === 'edge') return true
    if (spec.lp === 'math') return !insideEdge
    if (spec.lp === 'mermaid') return !insideEdge
    if (spec.lp === 'vega-lite') return !insideEdge
    if (spec.lp === 'code') return !insideEdge
    if (insideEdge) return spec.lp === 'line'
    return !replacedRichRanges.some(
      (range) => deco.from >= range.from && deco.to <= range.to
    )
  })
  return Decoration.set(filtered, true)
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
      transaction.reconfigured ||
      transaction.effects.some(
        (effect) => effect.is(imageCacheBump) || effect.is(setWikiCandidates)
      ) ||
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
  /** How an already-resolved vault path opens (wiki pill click, S04c);
   *  falls back to onFollowLink when absent. */
  onFollowRel?: (relPath: string) => void
  /** Vault-relative note path; enables image embeds. */
  notePath?: string
  /** App theme snapshot; changing it rebuilds disposable rich widgets. */
  theme?: RichTheme
}): Extension {
  const follow = options?.onFollowLink
  const extensions: Extension[] = [
    richThemeFacet.of(options?.theme ?? DEFAULT_RICH_THEME),
    livePreviewField
  ]
  if (follow || options?.onFollowRel) {
    extensions.push(
      edgeFollowFacet.of({
        href: follow ?? (() => {}),
        rel: options?.onFollowRel ?? follow ?? (() => {})
      })
    )
  }
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
