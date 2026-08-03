import type { GenerationParams } from '../../../shared/generation-params'
import type {
  AiOperation,
  AiSelection
} from '../../../shared/ipc-contract'
import {
  type BuiltinOverrides,
  type DestinationKind,
  type NoteContext,
  type WireSystemPlanEntry
} from '../../../shared/prompt-composition'
import {
  defaultNewNotePath,
  ensureMdExtension,
  newNotePathForSelection
} from './ai-helpers'
import {
  composeSystemStack,
  expandInstruction,
  extractNoteLinks,
  linkedNoteCandidates,
  type PromptFile
} from './prompts'

/**
 * The shared run pipeline (CP-MVP-008 S05a) — extracted from AiPanel
 * so the inline preview (S05) and the chat column (S06) run THE SAME
 * request preparation: instruction layers expand, note links resolve
 * into linked-note selections, the landing-point context is captured,
 * the system stack composes, and the operation + its inspectable
 * sent-request record are built in one place. Pure over injected
 * readers — testable without a vault or a DOM.
 */

export type SentRequest = {
  instruction: string
  systemPrompt: string | null
  preset: string | null
  selection: {
    relPath: string
    from: number
    to: number
    chars: number
    wholeNote: boolean
    excerpt: string
    content: string
  }
  linkedNotes: Array<{ relPath: string; content: string }>
  noteContext?: NoteContext
  /** Sampling overrides that rode the run (S05d); absent = defaults. */
  params?: GenerationParams
  /** Built-in block overrides that rode the run (S07b3) — the
   *  inspector composes with them, so display = sent. */
  builtins?: BuiltinOverrides
  /** The system plan that rode the run (S07b8) — inspector parity. */
  systemPlan?: WireSystemPlanEntry[]
  destination: DestinationKind
}

export type AiRunInputs = {
  noteRelPath: string
  /** Full buffer at run time. */
  doc: string
  /** Live editor selection (empty text = whole-note scope). */
  selection: { from: number; to: number; text: string }
  /** Raw layered instruction (directives intact). */
  instruction: string
  preset?: string
  /** Ordered system stack (prompt relPaths). */
  systemStack: string[]
  /** The note's resolved prompts (award of the awaited load). */
  prompts: PromptFile[]
  destination: DestinationKind
  /** The path field's current value ('' or the -ai default = untouched). */
  newNotePath: string
  /** Sampling overrides from the options menu (S05d). */
  params?: GenerationParams
  /** Resolved built-in block overrides (S07b3, prompts/built-in/). */
  builtins?: BuiltinOverrides
  /** The arranged system section, wire form (S07b8) — when present
   *  it outranks systemStack. */
  systemPlan?: WireSystemPlanEntry[]
}

export type PreparedRun = {
  operation: AiOperation
  sent: SentRequest
}

const LINKED_NOTE_CAP = 6000

/** Builds the operation + sent-request record; null when there is
 *  nothing runnable (empty composed instruction). */
export async function prepareAiRun(
  inputs: AiRunInputs,
  readNote: (relPath: string) => Promise<{ content: string }>
): Promise<PreparedRun | null> {
  const text = expandInstruction(inputs.instruction, inputs.prompts).trim()
  if (text.length === 0) return null

  const raw = inputs.selection
  const doc = inputs.doc
  const selection: AiSelection = {
    relPath: inputs.noteRelPath,
    kind: 'text',
    content: raw.text.length > 0 ? raw.text : doc,
    range:
      raw.text.length > 0
        ? { from: raw.from, to: raw.to }
        : { from: 0, to: doc.length }
  }

  // Note links in the composed instruction → linked-note selections
  // (S04o): quotable reference material the checker can verify.
  const linkedSelections: AiSelection[] = []
  for (const link of extractNoteLinks(text)) {
    for (const candidate of linkedNoteCandidates(link.target, inputs.noteRelPath)) {
      if (
        candidate === inputs.noteRelPath ||
        linkedSelections.some((existing) => existing.relPath === candidate)
      ) {
        break
      }
      try {
        const file = await readNote(candidate)
        const content = file.content.slice(0, LINKED_NOTE_CAP)
        linkedSelections.push({
          relPath: candidate,
          kind: 'text',
          content,
          range: { from: 0, to: content.length }
        })
        break
      } catch {
        /* try the next candidate path */
      }
    }
  }

  const target =
    inputs.destination === 'new-note'
      ? {
          relPath: inputs.noteRelPath,
          destination: {
            kind: 'new-note' as const,
            newNotePath: ensureMdExtension(
              inputs.newNotePath.trim().length > 0 &&
                inputs.newNotePath.trim() !== defaultNewNotePath(inputs.noteRelPath)
                ? inputs.newNotePath.trim()
                : newNotePathForSelection(inputs.noteRelPath, raw.text)
            )
          }
        }
      : {
          relPath: inputs.noteRelPath,
          destination: { kind: inputs.destination }
        }

  // Landing-point context (S04l): bounded note state so the output
  // integrates without duplicating what already exists.
  const noteContext: NoteContext | undefined =
    target.destination.kind === 'append'
      ? { kind: 'append', tail: doc.slice(-3000) }
      : target.destination.kind === 'replace-selection'
        ? {
            kind: 'replace',
            before: doc.slice(
              Math.max(0, selection.range.from - 1500),
              selection.range.from
            ),
            after: doc.slice(selection.range.to, selection.range.to + 1500)
          }
        : undefined

  const systemPrompt = composeSystemStack(inputs.systemStack, inputs.prompts)

  const operation: AiOperation = {
    id: crypto.randomUUID(),
    input: [selection, ...linkedSelections],
    instruction: text,
    ...(inputs.preset ? { preset: inputs.preset } : {}),
    ...(systemPrompt ? { systemPrompt } : {}),
    ...(noteContext ? { noteContext } : {}),
    ...(inputs.params && Object.keys(inputs.params).length > 0
      ? { params: inputs.params }
      : {}),
    ...(inputs.builtins && Object.keys(inputs.builtins).length > 0
      ? { builtins: inputs.builtins }
      : {}),
    ...(inputs.systemPlan ? { systemPlan: inputs.systemPlan } : {}),
    target
  }

  return {
    operation,
    sent: {
      instruction: text,
      systemPrompt: systemPrompt.length > 0 ? systemPrompt : null,
      preset: inputs.preset ?? null,
      selection: {
        relPath: selection.relPath,
        from: selection.range.from,
        to: selection.range.to,
        chars: selection.content.length,
        wholeNote: raw.text.length === 0,
        excerpt:
          selection.content.length <= 200
            ? selection.content
            : `${selection.content.slice(0, 200)}…`,
        content: selection.content
      },
      linkedNotes: linkedSelections.map((linked) => ({
        relPath: linked.relPath,
        content: linked.content
      })),
      ...(noteContext ? { noteContext } : {}),
      ...(operation.params ? { params: operation.params } : {}),
      ...(operation.builtins ? { builtins: operation.builtins } : {}),
      ...(operation.systemPlan ? { systemPlan: operation.systemPlan } : {}),
      destination: target.destination.kind
    }
  }
}
