import { StateEffect, StateField, type Extension } from '@codemirror/state'
import {
  Decoration,
  EditorView,
  WidgetType,
  type DecorationSet
} from '@codemirror/view'
import type { ClaimRecord, TraceSummary } from '../../../shared/ipc-contract'
import {
  composeSystemPrompt,
  composeUserMessage,
  requestAsText,
  type DestinationKind
} from '../../../shared/prompt-composition'
import type { SentRequest } from './ai-run'
import { copyText } from './clipboard'
import { noteMarkdown } from './note-markdown'

/**
 * The inline AI preview (CP-MVP-008 S05b) — a quick request's proposal
 * renders IN the note, over the target range, as a CodeMirror block
 * widget (the live-preview WidgetType pattern): accept / edit /
 * reject + the compact claim strip + the trace badge, with cancel
 * while running. The preview is VISUAL ONLY — the buffer changes
 * exactly once, on accept, through the host's applyChange + save path
 * (06: accept is the single moment a diff is born).
 *
 * A StateField so the whole mapping is computable from EditorState
 * alone (headless-testable); the anchor maps through document changes,
 * so edits elsewhere never leave the widget on stale offsets.
 */

export type InlineAiPhase = 'running' | 'review' | 'error'

export type InlineAiState = {
  phase: InlineAiPhase
  /** Target range in the CURRENT doc (mapped through changes). */
  anchor: { from: number; to: number }
  destination: DestinationKind
  /** Path the create-proposal lands at (new-note only). */
  newNotePath?: string
  /** Proposal text (review), pre-edit. */
  proposal: string
  claims: ClaimRecord[]
  trace: TraceSummary | null
  /** Selection text captured at run time (auto-link label). */
  selectedText: string
  bundleId: string | null
  /** The composed request (S05c: inline runs keep the inspector —
   *  losing it when the panel stopped opening was a regression). */
  sent: SentRequest | null
  error?: string
  /** Bumped on every transition so the widget re-renders. */
  version: number
}

export type InlineAiHandlers = {
  onAccept: (editedText: string) => void
  onReject: () => void
  onCancel: () => void
}

export type InlineAiValue = {
  state: InlineAiState
  handlers: InlineAiHandlers
}

/** Set (or clear, with null) the inline preview. */
export const setInlineAi = StateEffect.define<InlineAiValue | null>()

export const inlineAiField = StateField.define<InlineAiValue | null>({
  create: () => null,
  update(value, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setInlineAi)) value = effect.value
    }
    if (value && tr.docChanged) {
      value = {
        ...value,
        state: {
          ...value.state,
          anchor: {
            from: tr.changes.mapPos(value.state.anchor.from),
            to: tr.changes.mapPos(value.state.anchor.to)
          }
        }
      }
    }
    return value
  },
  provide: (field) =>
    EditorView.decorations.from(field, (value) =>
      value ? computeInlineAiDecorations(value) : Decoration.none
    )
})

/** Pure decoration builder (exported for headless tests): a highlight
 *  mark over the target range (replace only, non-empty) + the block
 *  widget after the anchor. */
export function computeInlineAiDecorations(value: InlineAiValue): DecorationSet {
  const { anchor, destination } = value.state
  const decorations = []
  if (destination === 'replace-selection' && anchor.to > anchor.from) {
    decorations.push(
      Decoration.mark({ class: 'cm-inline-ai-target', inlineAi: 'target' }).range(
        anchor.from,
        anchor.to
      )
    )
  }
  decorations.push(
    Decoration.widget({
      widget: new InlineAiWidget(value),
      side: 1,
      block: true,
      inlineAi: 'panel'
    }).range(anchor.to)
  )
  return Decoration.set(decorations, true)
}

const LABEL_STRIP_MAX = 8

class InlineAiWidget extends WidgetType {
  constructor(private readonly value: InlineAiValue) {
    super()
  }

  override eq(other: InlineAiWidget): boolean {
    return other.value.state.version === this.value.state.version
  }

  override ignoreEvent(): boolean {
    // the widget owns its clicks/typing; CM must not treat them as
    // editor interactions
    return true
  }

  override toDOM(): HTMLElement {
    const { state, handlers } = this.value
    const root = document.createElement('div')
    root.className = `cm-inline-ai phase-${state.phase}`

    const header = document.createElement('div')
    header.className = 'cm-inline-ai-head'
    const title = document.createElement('span')
    title.className = 'cm-inline-ai-title'
    title.textContent =
      state.phase === 'running'
        ? 'AI · running…'
        : state.phase === 'error'
          ? 'AI · failed'
          : state.destination === 'new-note'
            ? `AI · new note → ${state.newNotePath ?? ''}`
            : `AI · ${state.destination === 'append' ? 'append' : 'replace'}`
    header.appendChild(title)
    if (state.trace) {
      const badge = document.createElement('span')
      badge.className = 'cm-inline-ai-trace'
      badge.textContent = `${state.trace.location} · ${state.trace.model} · ${state.trace.wallMs}ms`
      badge.title = `trace ${state.trace.traceId} — ~${state.trace.estimatedInputTokens}→${state.trace.estimatedOutputTokens} tok · ${state.trace.estimatedExternalCost.amount} ${state.trace.estimatedExternalCost.currency}`
      header.appendChild(badge)
    }
    root.appendChild(header)

    if (state.phase === 'running') {
      const cancel = document.createElement('button')
      cancel.type = 'button'
      cancel.textContent = 'Cancel'
      cancel.setAttribute('aria-label', 'Cancel this request')
      cancel.addEventListener('click', () => handlers.onCancel())
      root.appendChild(cancel)
      return root
    }

    if (state.phase === 'error') {
      const message = document.createElement('div')
      message.className = 'cm-inline-ai-error'
      message.textContent = state.error ?? 'the request failed'
      root.appendChild(message)
      const dismiss = document.createElement('button')
      dismiss.type = 'button'
      dismiss.textContent = 'Dismiss'
      dismiss.setAttribute('aria-label', 'Dismiss')
      dismiss.addEventListener('click', () => handlers.onReject())
      root.appendChild(dismiss)
      return root
    }

    // review (S05d transparency, owner: "a continuity of the rest of
    // note content … framing an already existing text"): the proposal
    // renders as regular note markdown; edit toggles the raw textarea.
    let editedValue = state.proposal
    let editing = false
    const body = document.createElement('div')
    body.className = 'cm-inline-ai-body'
    const renderBody = (): void => {
      body.textContent = ''
      if (editing) {
        const editor = document.createElement('textarea')
        editor.className = 'cm-inline-ai-proposal'
        editor.value = editedValue
        editor.rows = Math.min(14, Math.max(3, editedValue.split('\n').length))
        editor.setAttribute(
          'aria-label',
          'Proposed text — editable before accepting'
        )
        editor.addEventListener('input', () => {
          editedValue = editor.value
        })
        body.appendChild(editor)
        editor.focus()
      } else {
        const rendered = document.createElement('div')
        rendered.className = 'markdown-body cm-inline-ai-rendered'
        rendered.innerHTML = noteMarkdown().render(editedValue)
        body.appendChild(rendered)
      }
    }
    renderBody()
    root.appendChild(body)

    if (state.claims.length > 0) {
      const strip = document.createElement('div')
      strip.className = 'cm-inline-ai-claims'
      for (const claim of state.claims.slice(0, LABEL_STRIP_MAX)) {
        const chip = document.createElement('span')
        chip.className = `truth-chip label-${claim.label}`
        chip.textContent = claim.label
        chip.title = claim.text
        strip.appendChild(chip)
      }
      if (state.claims.length > LABEL_STRIP_MAX) {
        const more = document.createElement('span')
        more.className = 'cm-inline-ai-more'
        more.textContent = `+${state.claims.length - LABEL_STRIP_MAX}`
        strip.appendChild(more)
      }
      root.appendChild(strip)
    }

    const actions = document.createElement('div')
    actions.className = 'cm-inline-ai-actions'
    if (state.sent) {
      const sent = state.sent
      const copy = document.createElement('button')
      copy.type = 'button'
      copy.textContent = 'copy request'
      copy.title = 'Copy the full request (system + user) for testing elsewhere'
      copy.setAttribute('aria-label', 'Copy the full request')
      copy.addEventListener('click', () => {
        const text = requestAsText(
          composeSystemPrompt(sent.systemPrompt, sent.destination),
          composeUserMessage(
            sent.instruction,
            [
              { content: sent.selection.content, relPath: sent.selection.relPath },
              ...sent.linkedNotes
            ],
            sent.noteContext
          )
        )
        void copyText(text).then((ok) => {
          copy.textContent = ok ? 'copied ✓' : 'copy failed'
          setTimeout(() => {
            copy.textContent = 'copy request'
          }, 1500)
        })
      })
      actions.appendChild(copy)
    }
    const edit = document.createElement('button')
    edit.type = 'button'
    edit.textContent = 'edit'
    edit.setAttribute('aria-label', 'Toggle raw editing')
    edit.addEventListener('click', () => {
      editing = !editing
      edit.textContent = editing ? 'preview' : 'edit'
      renderBody()
    })
    actions.appendChild(edit)
    const accept = document.createElement('button')
    accept.type = 'button'
    accept.textContent = '✓ Accept'
    accept.setAttribute('aria-label', 'Accept the proposal')
    accept.addEventListener('click', () => handlers.onAccept(editedValue))
    const reject = document.createElement('button')
    reject.type = 'button'
    reject.textContent = '✕ Reject'
    reject.setAttribute('aria-label', 'Reject the proposal')
    reject.addEventListener('click', () => handlers.onReject())
    actions.appendChild(accept)
    actions.appendChild(reject)
    root.appendChild(actions)
    return root
  }
}

export function inlineAi(): Extension {
  return [inlineAiField]
}
