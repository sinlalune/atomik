import { randomUUID } from 'node:crypto'
import { labelClaims, type ClaimCandidate } from './truth'
import type {
  AiDestination,
  AiOperation,
  AiOutputBlock,
  AiResponseBundle,
  AiSelection,
  ProposedFileChange,
  WebEvidenceProvenance
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
/** System prompts are prompt-FILE bodies (S03) — roomier than an
 *  instruction, still bounded below renderer state. */
const MAX_SYSTEM_PROMPT = 8000
/** Per-part cap on landing-point excerpts (S04l). */
const MAX_NOTE_CONTEXT = 8000

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
  const systemPrompt = value['systemPrompt']
  if (systemPrompt !== undefined) {
    if (typeof systemPrompt !== 'string' || systemPrompt.length === 0 || systemPrompt.length > MAX_SYSTEM_PROMPT) return false
  }
  const noteContext = value['noteContext']
  if (noteContext !== undefined) {
    if (!isRecord(noteContext)) return false
    if (noteContext['kind'] === 'append') {
      if (typeof noteContext['tail'] !== 'string' || noteContext['tail'].length > MAX_NOTE_CONTEXT) return false
    } else if (noteContext['kind'] === 'replace') {
      if (typeof noteContext['before'] !== 'string' || noteContext['before'].length > MAX_NOTE_CONTEXT) return false
      if (typeof noteContext['after'] !== 'string' || noteContext['after'].length > MAX_NOTE_CONTEXT) return false
    } else {
      return false
    }
  }
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

/** EXACT slice of the selection (containment-checkable, unlike excerpt). */
const exactQuote = (selection: AiSelection, max = 160): string =>
  selection.content.slice(0, max).trim()

/** Strips markdown blockquote markers so already-quoted material (an @
 *  quote block is a common selection) can be re-quoted without nesting
 *  garbage — excerpt's whitespace collapse turned per-line '> ' into
 *  literal mid-sentence '>' (owner report, S06b). DISPLAY-side only:
 *  selections, claim candidates, and evidence keep the RAW bytes — the
 *  containment check and the 05 anchors refer to the buffer as it is. */
const dequote = (text: string): string =>
  text
    .split('\n')
    .map((line) => line.replace(/^[ \t]*(?:>[ \t]?)+/, ''))
    .join('\n')

/** A well-formed quote block from raw selection text: de-quote, cap,
 *  then re-quote line by line (a blank line stays inside the block). */
function quoteBlock(text: string, max: number): string {
  const clean = dequote(text).trim()
  const capped = clean.length <= max ? clean : `${clean.slice(0, max)}…`
  return capped
    .split('\n')
    .map((line) => (line.trim().length > 0 ? `> ${line.trimEnd()}` : '>'))
    .join('\n')
}

/** Deterministic placeholder prose, clearly marked as mock output. The
 *  claim CANDIDATE reproduces the selection exactly (raw bytes, so the
 *  truth checker can derive source-backed); the DISPLAYED quote is
 *  de-quoted + re-quoted so an already-quoted selection stays readable;
 *  the other statements exist to exercise the remaining labels. */
function mockAnswer(operation: AiOperation, selection: AiSelection): string {
  const preset = operation.preset ?? 'free'
  return [
    `**[mock · ${preset}]** Response to: *${excerpt(operation.instruction)}*`,
    '',
    `Your selection says:`,
    '',
    quoteBlock(selection.content, 160),
    '',
    'This is a deterministic placeholder: the real provider adapter',
    'arrives behind the same channel at M7+. Mock placeholders carry no',
    'factual value. This pattern is described in the standard literature.',
    'One way to read the selection: it behaves like a note-taking',
    'lookup table.'
  ].join('\n')
}

/** Claim candidates covering the four MVP labels on every response —
 *  candidates can assert FORM only; labels come from the checker. */
function mockCandidates(
  selection: AiSelection,
  answerBlockId: string
): ClaimCandidate[] {
  return [
    { blockId: answerBlockId, text: exactQuote(selection) },
    {
      blockId: answerBlockId,
      text: 'Mock placeholders carry no factual value.'
    },
    {
      blockId: answerBlockId,
      text: 'This pattern is described in the standard literature.',
      assertedForm: 'needs-citation'
    },
    {
      blockId: answerBlockId,
      text: 'One way to read the selection: it behaves like a note-taking lookup table.',
      assertedForm: 'interpretive'
    }
  ]
}

/** '/'-separated relative link from one vault note to another (the link
 *  router resolves hrefs relative to the note; root-absolute is a dead
 *  click). */
function relativeLink(fromRelPath: string, toRelPath: string): string {
  const fromDirs = fromRelPath.split('/').slice(0, -1)
  const toParts = toRelPath.split('/')
  let common = 0
  while (
    common < fromDirs.length &&
    common < toParts.length - 1 &&
    fromDirs[common] === toParts[common]
  ) {
    common += 1
  }
  const ups = fromDirs.slice(common).map(() => '..')
  return [...ups, ...toParts.slice(common)].join('/') || toRelPath
}

/** The provenance line a note carries when the selection lives in a web
 *  reader (09: "create note with URL/provenance"). Shared with the real
 *  adapters (S02) — one citation shape across engines. */
export function provenanceLine(
  webSource: WebEvidenceProvenance,
  targetRelPath: string
): string {
  const accessed = webSource.accessedAt
    ? ` — accessed ${webSource.accessedAt.slice(0, 10)}`
    : ''
  const name = webSource.title ?? webSource.url
  const dossier = relativeLink(targetRelPath, webSource.dossierPath)
  return `Source: [${name}](${webSource.url})${accessed} · [dossier](${dossier})`
}

/** The text the patch proposes, shaped by the destination. */
function mockProposedText(
  operation: AiOperation,
  selection: AiSelection,
  webSource?: WebEvidenceProvenance
): string {
  const preset = operation.preset ?? 'free'
  const stamp = `> **[mock ${preset}]** ${excerpt(operation.instruction, 120)}`
  const destination = operation.target.destination
  switch (destination.kind) {
    case 'replace-selection':
      return `${selection.content}\n\n${stamp}\n>\n> Placeholder rewrite of the selection above.`
    case 'append':
      return `\n## [mock] ${excerpt(operation.instruction, 60)}\n\n${stamp}\n>\n> Placeholder section derived from «${excerpt(dequote(selection.content))}».\n${webSource ? `\n${provenanceLine(webSource, operation.target.relPath)}\n` : ''}`
    case 'new-note':
      return `# ${excerpt(operation.instruction, 60)}\n\n${stamp}\n\nSource selection (from \`${selection.relPath}\`):\n\n${quoteBlock(selection.content, 400)}\n${webSource ? `\n${provenanceLine(webSource, destination.newNotePath)}\n` : ''}`
  }
}

export function runAiOperation(
  operation: unknown,
  provenance?: Map<string, WebEvidenceProvenance>
): AiResponseBundle {
  if (!isValidAiOperation(operation)) {
    throw new Error('ai: rejected operation')
  }
  const selection = operation.input[0] as AiSelection
  const webSource = provenance?.get(selection.relPath)

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
  const proposedText = mockProposedText(operation, selection, webSource)
  const file: ProposedFileChange =
    destination.kind === 'replace-selection'
      ? {
          relPath: operation.target.relPath,
          kind: 'replace-range',
          range: selection.range,
          newText: proposedText
        }
      : destination.kind === 'append'
        ? {
            relPath: operation.target.relPath,
            kind: 'append',
            newText: proposedText
          }
        : {
            relPath: destination.newNotePath,
            kind: 'create',
            newText: proposedText
          }

  // Mechanical labeling (S10): the mock proposes candidates (form-only
  // assertions); the deterministic checker assigns every label.
  // Web provenance rides the evidence records (S06 — resolved by the
  // caller from the dossier; this module stays fs-free).
  const { claims, evidence } = labelClaims(
    operation.input,
    mockCandidates(selection, (blocks[0] as AiOutputBlock).id),
    provenance
  )

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
    claims,
    evidence,
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
