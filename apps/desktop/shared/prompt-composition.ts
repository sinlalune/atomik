/**
 * Prompt composition (CP-MVP-008 S04h→S04l) — ONE source of truth
 * shared by the Mistral adapter (main) and the sent-request inspector
 * (renderer): what the display shows and the copy yields IS what the
 * adapter sends, by construction. Pure strings, no process deps.
 *
 * S04l (owner directive: "the final request should be clearly layered
 * … your implementation should respect that template deterministically"):
 * both messages are built as a FIXED markdown template — `#` sections,
 * `##` subsections, `###` items — and every dynamic part (identity
 * stack, instruction, selections, note context) is INJECTED into its
 * slot. The instruction travels blockquoted (its own markdown must
 * read as quoted guidance, never as document structure — the S04k
 * bench). For append/replace the CURRENT NOTE STATE around the
 * landing point rides along so the model integrates without
 * duplicating what already exists.
 */

export const BUILT_IN_IDENTITY =
  'You are the AI assistant inside Atomik, a local-first knowledge workbench.'

export const GROUNDING_RULES: readonly string[] = [
  'Work ONLY from the instruction, the subject selections, and the note context provided in this request.',
  'The subject selection IS the subject of the request — the output stays ABOUT it from title to last line. Linked notes are supporting reference material for the specific parts the instruction points at; they must NEVER become the topic. File paths are provenance only; never infer the topic from a path or filename.',
  "Any headings or titles inside the instruction are STYLE/BEHAVIOR guidance only — the note's topic and title come from the subject selection, never from the instruction text.",
  'When you state something the selections or note context support, quote the supporting passage EXACTLY, character for character, so it can be verified mechanically.',
  'Quote ONLY text that appears in the subject selections or the note context. NEVER quote your own sentences back as if they were sources; when nothing supports a statement, state it plainly without any quote block.',
  'Never invent citations or sources.'
]

export type DestinationKind = 'replace-selection' | 'append' | 'new-note'

export const DESTINATION_BRIEF: Record<DestinationKind, string> = {
  'replace-selection':
    'Your whole reply REPLACES the selected passage in the note — return the replacement markdown only, reading seamlessly between the surrounding content shown in the note context.',
  append:
    'Your whole reply is APPENDED to the note as a new section — return that section as markdown, starting with a heading when one fits, continuing the heading hierarchy visible in the note context.',
  'new-note':
    'Your whole reply becomes a NEW standalone note — return complete note markdown, opening with a level-1 heading line for the title (do not repeat the # character inside the title text).'
}

export const CLOSING_RULE =
  'Return plain markdown — no preamble, no meta commentary about these instructions.'

/**
 * Built-in block registry (S07b3, owner: "I need to be able to manage
 * easily and completely every bit of token sent"): every fixed block
 * of the system template is a NAMED block with a default. A vault may
 * override any of them with `prompts/built-in/<id>.md` files (scoped,
 * nearest wins like every prompt); the override body replaces the
 * block VERBATIM. An untouched materialized file byte-matches its
 * default, so materializing alone never changes a request.
 */
export const BUILTIN_BLOCK_IDS = [
  'identity',
  'grounding-rules',
  'output-replace-selection',
  'output-append',
  'output-new-note',
  'closing-rule'
] as const

export type BuiltinBlockId = (typeof BUILTIN_BLOCK_IDS)[number]

export type BuiltinOverrides = Partial<Record<BuiltinBlockId, string>>

/** Each block's default = EXACTLY what composes without an override. */
export const BUILTIN_BLOCK_DEFAULTS: Record<BuiltinBlockId, string> = {
  identity: BUILT_IN_IDENTITY,
  'grounding-rules': GROUNDING_RULES.map((rule) => `- ${rule}`).join('\n'),
  'output-replace-selection': `- ${DESTINATION_BRIEF['replace-selection']}`,
  'output-append': `- ${DESTINATION_BRIEF.append}`,
  'output-new-note': `- ${DESTINATION_BRIEF['new-note']}`,
  'closing-rule': `- ${CLOSING_RULE}`
}

const outputBlockIdFor: Record<DestinationKind, BuiltinBlockId> = {
  'replace-selection': 'output-replace-selection',
  append: 'output-append',
  'new-note': 'output-new-note'
}

/**
 * SYSTEM message template:
 *   # Role        ← identity (stack, else the identity block)
 *   # Rules
 *   ## Grounding  ← the grounding-rules block
 *   ## Output     ← the destination's output block + closing block
 * Every non-stack slot resolves override-first (S07b3).
 */
export function composeSystemPrompt(
  custom: string | undefined | null,
  destination: DestinationKind,
  builtins?: BuiltinOverrides
): string {
  const block = (id: BuiltinBlockId): string =>
    builtins?.[id]?.trim() || BUILTIN_BLOCK_DEFAULTS[id]
  const identity = custom?.trim()
  return [
    '# Role',
    '',
    identity && identity.length > 0 ? identity : block('identity'),
    '',
    '# Rules',
    '',
    '## Grounding',
    '',
    block('grounding-rules'),
    '',
    '## Output',
    '',
    block(outputBlockIdFor[destination]),
    block('closing-rule')
  ].join('\n')
}

export type PromptSelection = { content: string; relPath: string }

/** Note state around the landing point (S04l): bounded excerpts the
 *  renderer captures at run time — read-only context so the output
 *  integrates without duplication. */
export type NoteContext =
  | { kind: 'append'; tail: string }
  | { kind: 'replace'; before: string; after: string }

const fenced = (language: string, content: string): string[] => [
  '```' + language,
  content,
  '```'
]

const selectionSection = (selection: PromptSelection, index: number): string[] => [
  `### Selection ${index + 1}`,
  '',
  ...fenced('text', selection.content),
  '',
  `(provenance: \`${selection.relPath}\` — location only, not the topic)`
]

function noteContextSection(context: NoteContext): string[] {
  if (context.kind === 'append') {
    return [
      '## Note context — read-only, never repeat it in the output',
      '',
      '### The note currently ends with',
      '',
      ...fenced('markdown', context.tail),
      '',
      '### Landing point',
      '',
      'Your reply will be APPENDED right after the ending shown above. Continue its heading hierarchy and do NOT duplicate sections, headings, or content that already exist.'
    ]
  }
  return [
    '## Note context — read-only, never repeat it in the output',
    '',
    '### Content immediately BEFORE the replaced passage',
    '',
    ...fenced('markdown', context.before),
    '',
    '### Content immediately AFTER the replaced passage',
    '',
    ...fenced('markdown', context.after),
    '',
    '### Landing point',
    '',
    'Your reply REPLACES the subject selection between the two excerpts above. It must read seamlessly from the BEFORE text into your reply and on into the AFTER text — no duplicated phrases, no broken sentences.'
  ]
}

/**
 * USER message template:
 *   # Request
 *   ## Instruction — quoted style/behavior guidance
 *   ## Subject          ← the selections (the topic lives here)
 *   ## Note context     ← current state + landing point (append/replace)
 *   ## Steps            ← explicit integration order
 */
export function composeUserMessage(
  instruction: string,
  selections: PromptSelection[],
  noteContext?: NoteContext
): string {
  // Convention (S04o): the FIRST selection is the subject; any
  // further selections are LINKED NOTES the instruction referenced.
  // S05d (owner): linked notes lead the request as a PRIOR-KNOWLEDGE
  // context bundle — reference is encoded before the task; and the
  // steps follow the owner's canon: subject → linked notes → style →
  // (note context) → output.
  const [subject, ...linked] = selections
  const quoted = instruction
    .split('\n')
    .map((line) => (line.trim().length > 0 ? `> ${line}` : '>'))
    .join('\n')
  const stepLines = [
    'Identify the subject from the Subject section — it alone sets the topic.',
    ...(linked.length > 0
      ? [
          'Draw on the linked notes where the instruction refers to them, quoting them exactly when used.'
        ]
      : []),
    'Apply the style and behavior from the quoted instruction.',
    ...(noteContext
      ? [
          'Check the note context: integrate with the existing structure and never duplicate it.'
        ]
      : []),
    'Write the output following the Output rules — nothing else.'
  ]
  return [
    '# Request',
    '',
    ...(linked.length > 0
      ? [
          '## Prior knowledge — linked notes (context bundle, read-only, quotable)',
          '',
          ...linked.flatMap((note, index) => [
            `### Linked note ${index + 1} — \`${note.relPath}\``,
            '',
            ...fenced('markdown', note.content),
            ''
          ])
        ]
      : []),
    '## Instruction — style and behavior guidance (quoted)',
    '',
    quoted,
    '',
    '## Subject',
    '',
    ...(subject ? [...selectionSection(subject, 0), ''] : []),
    ...(noteContext ? [...noteContextSection(noteContext), ''] : []),
    '## Steps',
    '',
    ...stepLines.map((line, index) => `${index + 1}. ${line}`)
  ].join('\n')
}

/** The whole request as portable text (S04i, owner: "copy the prompt
 *  to test it somewhere else"). */
export function requestAsText(
  systemPrompt: string,
  userMessage: string
): string {
  return `=== SYSTEM ===\n${systemPrompt}\n\n=== USER ===\n${userMessage}\n`
}
