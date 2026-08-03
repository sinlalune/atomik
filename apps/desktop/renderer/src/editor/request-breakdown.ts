import type { AiOperation } from '../../../shared/ipc-contract'
import {
  composeUserMessage,
  requestAsText,
  systemTextOf
} from '../../../shared/prompt-composition'

/**
 * Sent-request breakdown (CP-MVP-008 S07b4, owner: "I need pills that
 * retrace the context (system, prompts, notes, other text document,
 * medias) with the associated amount of token in each pills"): the
 * chat's input total, EXPLAINED. The parts re-compose the operation
 * through the SAME shared composers the adapter uses, so the pills
 * account for the request that actually travels — including the
 * template scaffolding, which gets its own part instead of hiding in
 * the total. Token figures use the adapter's chars/4 heuristic and
 * are labeled estimated wherever they land.
 */

export type RequestPartKind =
  | 'system'
  | 'history'
  | 'instruction'
  | 'context'
  | 'document'
  | 'note-context'
  | 'template'

export type RequestPart = {
  kind: RequestPartKind
  /** Pill text — the relPath basename for note-borne parts. */
  label: string
  chars: number
  /** chars/4, labeled estimated in every surface. */
  tokensEst: number
}

export type RequestBreakdown = {
  parts: RequestPart[]
  /** Estimate over the WHOLE wire request (system + history + user). */
  totalTokensEst: number
  /** Portable copy — system + user, the inline inspector's format. */
  requestText: string
}

const estimateTokens = (chars: number): number =>
  chars === 0 ? 0 : Math.max(1, Math.ceil(chars / 4))

const baseName = (relPath: string): string =>
  relPath.split('/').at(-1)?.replace(/\.md$/i, '') ?? relPath

/** Re-composes the operation and attributes every char of it. */
export function requestBreakdown(operation: AiOperation): RequestBreakdown {
  const systemText = systemTextOf(operation)
  const userText = composeUserMessage(
    operation.instruction,
    operation.input.map((selection) => ({
      content: selection.content,
      relPath: selection.relPath
    })),
    operation.noteContext
  )
  const thread = operation.thread ?? []
  const threadChars = thread.reduce((sum, turn) => sum + turn.content.length, 0)

  const parts: RequestPart[] = []
  const push = (kind: RequestPartKind, label: string, chars: number): void => {
    parts.push({ kind, label, chars, tokensEst: estimateTokens(chars) })
  }

  push('system', 'system', systemText.length)
  if (thread.length > 0) {
    push(
      'history',
      `history · ${thread.length} turn${thread.length > 1 ? 's' : ''}`,
      threadChars
    )
  }
  push('instruction', 'instruction', operation.instruction.length)
  operation.input.forEach((selection, index) => {
    // a contextless chat anchors on its own transcript with an EMPTY
    // selection — a 0-token pill explains nothing, skip it (S07b10)
    if (selection.content.length === 0) return
    push(
      index === 0 ? 'context' : 'document',
      baseName(selection.relPath),
      selection.content.length
    )
  })
  const noteContextChars =
    operation.noteContext === undefined
      ? 0
      : operation.noteContext.kind === 'append'
        ? operation.noteContext.tail.length
        : operation.noteContext.before.length +
          operation.noteContext.after.length
  if (noteContextChars > 0) push('note-context', 'note state', noteContextChars)

  // The user-message scaffolding (headings, steps, provenance lines,
  // fences) — never hidden inside the other parts. The system message
  // is already fully attributed to its own pill.
  const dynamicUserChars =
    operation.instruction.length +
    operation.input.reduce((sum, selection) => sum + selection.content.length, 0) +
    noteContextChars
  const templateChars = Math.max(0, userText.length - dynamicUserChars)
  if (templateChars > 0) push('template', 'template', templateChars)

  return {
    parts,
    totalTokensEst: estimateTokens(
      systemText.length + threadChars + userText.length
    ),
    requestText: requestAsText(systemText, userText)
  }
}
