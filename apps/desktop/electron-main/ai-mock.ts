import { randomUUID } from 'node:crypto'
import type {
  AiDestination,
  AiOperation,
  AiOutputBlock,
  AiResponseBundle,
  AiSelection,
  ProposedFileChange
} from '../shared/ipc-contract'

/**
 * Mocked AI provider (S08) — the incubating ai-core seat (14). It lives in
 * the main process because that is where real providers belong (12: keys
 * and calls behind the trusted boundary); swapping the mock for a provider
 * adapter later changes nothing renderer-side.
 *
 * Invariant worth repeating: this module is PURE COMPUTE. It never touches
 * the filesystem — accepted patches flow through the user-approved editor
 * buffer + vault verbs, inheriting their guarantees (06 safety rule).
 * Deterministic by design: same operation in, same bundle out (testable).
 */

const MAX_INSTRUCTION = 4000
const MAX_SELECTION = 100_000
const MAX_ID = 128

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isValidSelection(value: unknown): value is AiSelection {
  if (!isRecord(value)) return false
  if (typeof value['relPath'] !== 'string' || value['relPath'].length === 0) return false
  if (value['kind'] !== 'text') return false
  if (typeof value['content'] !== 'string' || value['content'].length > MAX_SELECTION) return false
  const range = value['range']
  if (!isRecord(range)) return false
  const from = range['from']
  const to = range['to']
  return (
    typeof from === 'number' &&
    typeof to === 'number' &&
    Number.isInteger(from) &&
    Number.isInteger(to) &&
    from >= 0 &&
    to >= from
  )
}

function isValidDestination(value: unknown): value is AiDestination {
  if (!isRecord(value)) return false
  if (value['kind'] === 'replace-selection' || value['kind'] === 'append') return true
  if (value['kind'] === 'new-note') {
    const path = value['newNotePath']
    return typeof path === 'string' && path.length > 0 && path.length <= 500
  }
  return false
}

export function isValidAiOperation(value: unknown): value is AiOperation {
  if (!isRecord(value)) return false
  if (typeof value['id'] !== 'string' || value['id'].length === 0 || value['id'].length > MAX_ID) return false
  if (typeof value['instruction'] !== 'string' || value['instruction'].length === 0 || value['instruction'].length > MAX_INSTRUCTION) return false
  if (value['preset'] !== undefined && typeof value['preset'] !== 'string') return false
  const input = value['input']
  if (!Array.isArray(input) || input.length === 0 || input.length > 8) return false
  if (!input.every(isValidSelection)) return false
  const target = value['target']
  if (!isRecord(target)) return false
  if (typeof target['relPath'] !== 'string' || target['relPath'].length === 0) return false
  return isValidDestination(target['destination'])
}

const excerpt = (text: string, max = 80): string => {
  const clean = text.replace(/\s+/g, ' ').trim()
  return clean.length <= max ? clean : `${clean.slice(0, max)}…`
}

/** Deterministic placeholder prose, clearly marked as mock output. */
function mockAnswer(operation: AiOperation, selection: AiSelection): string {
  const preset = operation.preset ?? 'free'
  return [
    `**[mock · ${preset}]** Response to: *${excerpt(operation.instruction)}*`,
    '',
    `Working on the selection «${excerpt(selection.content)}» from`,
    `\`${selection.relPath}\` (${selection.content.length} chars).`,
    '',
    'This is a deterministic placeholder: the real provider adapter',
    'arrives behind the same channel at M7+. The pipeline around it —',
    'selection, bundle, patch preview, accept/edit/reject — is the real',
    'thing being exercised here (06).'
  ].join('\n')
}

/** The text the patch proposes, shaped by the destination. */
function mockProposedText(
  operation: AiOperation,
  selection: AiSelection
): string {
  const preset = operation.preset ?? 'free'
  const stamp = `> **[mock ${preset}]** ${excerpt(operation.instruction, 120)}`
  switch (operation.target.destination.kind) {
    case 'replace-selection':
      return `${selection.content}\n\n${stamp}\n>\n> Placeholder rewrite of the selection above.`
    case 'append':
      return `\n## [mock] ${excerpt(operation.instruction, 60)}\n\n${stamp}\n>\n> Placeholder section derived from «${excerpt(selection.content)}».\n`
    case 'new-note':
      return `# ${excerpt(operation.instruction, 60)}\n\n${stamp}\n\nSource selection (from \`${selection.relPath}\`):\n\n> ${excerpt(selection.content, 400)}\n`
  }
}

export function runAiOperation(operation: unknown): AiResponseBundle {
  if (!isValidAiOperation(operation)) {
    throw new Error('ai: rejected operation')
  }
  const selection = operation.input[0] as AiSelection

  const blocks: AiOutputBlock[] = [
    {
      id: randomUUID(),
      kind: 'markdown',
      role: 'answer',
      content: mockAnswer(operation, selection)
    },
    {
      id: randomUUID(),
      kind: 'markdown',
      role: 'question',
      content: `- What should a real provider do differently with «${excerpt(selection.content, 60)}»?`
    }
  ]

  const destination = operation.target.destination
  const file: ProposedFileChange =
    destination.kind === 'replace-selection'
      ? {
          relPath: operation.target.relPath,
          kind: 'replace-range',
          range: selection.range,
          newText: mockProposedText(operation, selection)
        }
      : destination.kind === 'append'
        ? {
            relPath: operation.target.relPath,
            kind: 'append',
            newText: mockProposedText(operation, selection)
          }
        : {
            relPath: destination.newNotePath,
            kind: 'create',
            newText: mockProposedText(operation, selection)
          }

  return {
    id: randomUUID(),
    operationId: operation.id,
    blocks,
    patchProposals: [
      {
        id: randomUUID(),
        operationId: operation.id,
        files: [file],
        status: 'pending'
      }
    ],
    // Shapes ship from the first mock (06/roadmap M2); content arrives
    // with S10 (mechanical labels) and later real verification.
    claims: [],
    evidence: [],
    verification: [],
    uncertainties: [
      {
        message: 'Mock provider: placeholder content, no factual value.',
        severity: 'info'
      }
    ],
    actionTraceIds: []
  }
}
