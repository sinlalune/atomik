/**
 * System-prompt composition (CP-MVP-008 S04h) — ONE source of truth
 * shared by the Mistral adapter (main) and the sent-request inspector
 * (renderer): what the display shows IS what the adapter sends, by
 * construction. Pure strings, no process dependencies.
 *
 * A prompt file / stack replaces only the IDENTITY line; the grounding
 * rules, the destination brief, and the closing rule compose on top
 * REGARDLESS — the exact-quote discipline feeds the deterministic
 * checker (28) and no prompt may opt out of it.
 */

export const BUILT_IN_IDENTITY =
  'You are the AI assistant inside Atomik, a local-first knowledge workbench.'

export const GROUNDING_RULES: readonly string[] = [
  'Work ONLY from the instruction and the provided selections.',
  'The selected text IS the subject of the request — answer about it. File paths are provenance only; never infer the topic from a path or filename.',
  'When you state something the selections support, quote the supporting passage EXACTLY, character for character, so it can be verified mechanically.',
  'Never invent citations or sources.'
]

export type DestinationKind = 'replace-selection' | 'append' | 'new-note'

export const DESTINATION_BRIEF: Record<DestinationKind, string> = {
  'replace-selection':
    'Your whole reply REPLACES the selected passage in the note — return the replacement markdown only.',
  append:
    'Your whole reply is APPENDED to the note as a new section — return that section as markdown, starting with a heading when one fits.',
  'new-note':
    'Your whole reply becomes a NEW standalone note — return complete note markdown, opening with a level-1 heading line for the title (do not repeat the # character inside the title text).'
}

export const CLOSING_RULE =
  'Return plain markdown — no preamble, no meta commentary about these instructions.'

/** The FINAL system prompt: [custom identity | built-in] + grounding
 *  rules + destination brief + closing rule, in that order. */
export function composeSystemPrompt(
  custom: string | undefined | null,
  destination: DestinationKind
): string {
  const identity = custom?.trim()
  return [
    identity && identity.length > 0 ? identity : BUILT_IN_IDENTITY,
    ...GROUNDING_RULES,
    DESTINATION_BRIEF[destination],
    CLOSING_RULE
  ].join('\n')
}

export type PromptSelection = { content: string; relPath: string }

/** Subject first, provenance last (S04d — the path must never outweigh
 *  the subject). */
const selectionBlock = (selection: PromptSelection, index: number): string =>
  [
    `### Subject selection ${index + 1}`,
    '',
    '```',
    selection.content,
    '```',
    `(provenance: \`${selection.relPath}\`)`
  ].join('\n')

/** The FINAL user message: instruction + subject blocks. */
export function composeUserMessage(
  instruction: string,
  selections: PromptSelection[]
): string {
  return [`Instruction: ${instruction}`, '', ...selections.map(selectionBlock)].join(
    '\n'
  )
}

/** The whole request as portable text (S04i, owner: "copy the prompt
 *  to test it somewhere else"). */
export function requestAsText(
  systemPrompt: string,
  userMessage: string
): string {
  return `=== SYSTEM ===\n${systemPrompt}\n\n=== USER ===\n${userMessage}\n`
}
