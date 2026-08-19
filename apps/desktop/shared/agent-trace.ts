import type { ContextPacket } from './context-packet'
import type { ConsultedMaterial } from './chat-citations'
import type {
  GenerationToolExecution,
  GenerationToolResultStats,
  ResolvedGenerationToolPreference
} from './generation-tools'

/**
 * The agent trace, durable beside the transcript (CP-MVP-011 S07g).
 *
 * The owner benched the tool loop on 2026-08-18 and asked for the run to be
 * auditable after the fact — the architecture delegated, with one shape given:
 * *a separate folder linked from the chat note, with a JSON block*. This module
 * is that shape's pure half: it turns one finished exchange into a record and
 * a readable note. Nothing here touches the DOM, IPC or the filesystem.
 *
 * WHY a vault note and not the private ledger. `.atomik/usage/private/
 * actions.jsonl` (action-trace.ts) is telemetry: content-free by construction,
 * git-ignored, rebuildable, and — by 27 — never canonical. An audit the owner
 * reads is the opposite on every axis: it must name the query the model asked
 * and the article it read, it must survive a cache wipe, and it must diff.
 * So the two coexist and answer different questions — "what did this cost the
 * fleet" versus "what did THIS answer stand on". The ledger keeps its absolute
 * no-content rule; this file keeps a narrower one:
 *
 * ```text
 * RECORDED   what was ASKED (tool arguments), what was READ (identities:
 *            url, revision, licence, path, stage), and every FIGURE
 * NEVER      the fetched prose itself — article extracts, packet excerpts,
 *            the untrusted `content` a tool result carries to the model
 * ```
 *
 * That boundary is not squeamishness, it is 28 + ADR-015: consultation is
 * TRANSIENT. Writing the extract into the vault would make a durable copy of
 * public material through the back door, which is exactly what **Save as
 * source** (S08) exists to do deliberately, with revision and licence.
 */

/** One model-requested call, as the audit sees it. */
export type AgentTraceCall = {
  id: string
  name: string
  /** Model-written and recorded verbatim: the query IS the audit. */
  arguments: unknown
  ok: boolean
  stats: GenerationToolResultStats
  error?: { code: string; message: string }
}

export type AgentTraceRecord = {
  /** Bumped when a reader would misread an older file, never for additions. */
  version: 1
  chat: string
  /** Index of the ANSWER turn this trace belongs to, 0-based as in the file. */
  turn: number
  timestamp: string
  engine: string
  operationId: string
  bundleId: string
  request: {
    grounding: { sensitivity: string } | null
    tools: ResolvedGenerationToolPreference | null
    /** Prior turns replayed as history — a figure, never the text. */
    threadTurns: number
    sent: { kind: string; label: string; chars: number }[]
  }
  /** The deterministic pre-pass packet, figures and identities only. */
  packet: {
    id: string
    /** The verdict AND the terms behind it — `missingTerms` is precisely
     *  what sent the model outside, so an audit without it explains nothing. */
    coverage: {
      verdict: string
      matchedTerms: string[]
      missingTerms: string[]
    }
    stages: string[]
    candidates: number
    selected: number
    contextTokens: number
    entries: { path: string; stage: string; reason: string; tokens: number }[]
    omitted: { path: string; reason: string }[]
  } | null
  calls: AgentTraceCall[]
  read: {
    sources: {
      number?: number
      url: string
      kind: string
      title: string
      language: string
      revision: string | null
      accessedAt: string
      license: string | null
    }[]
    media: { url: string; title: string; creator: string; license: string }[]
    notes: { path: string; stage: string; tokens: number }[]
    warnings: { kind: string; message: string }[]
  }
  usage: { inputTokens: number; outputTokens: number; basis: string } | null
  billing: { currency: string; estimatedAmount: number; basis: string } | null
  durationMs: number | null
  /** The private ledger's ids for the same exchange — the two records join
   *  here, one-way: the audit points at telemetry, never the reverse. */
  actionTraceIds: string[]
}

export type AgentTraceInput = {
  chat: string
  turn: number
  timestamp: string
  engine: string
  operationId: string
  bundleId: string
  grounding: { sensitivity: string } | null
  tools: ResolvedGenerationToolPreference | null
  threadTurns: number
  sent: readonly { kind: string; label: string; chars: number }[]
  packet?: ContextPacket
  executions: readonly GenerationToolExecution[]
  consulted: ConsultedMaterial
  usage?: { inputTokens: number; outputTokens: number; basis: string }
  billing?: { currency: string; estimatedAmount: number; basis: string }
  durationMs?: number
  actionTraceIds: readonly string[]
}

/**
 * The record for one finished exchange. PURE and total: a missing packet, a
 * failed call or an engine that reports nothing all produce a valid record,
 * because an audit that only exists for the happy path audits nothing.
 */
export function agentTraceRecordOf(input: AgentTraceInput): AgentTraceRecord {
  return {
    version: 1,
    chat: input.chat,
    turn: input.turn,
    timestamp: input.timestamp,
    engine: input.engine,
    operationId: input.operationId,
    bundleId: input.bundleId,
    request: {
      grounding: input.grounding,
      tools: input.tools,
      threadTurns: input.threadTurns,
      sent: input.sent.map((part) => ({
        kind: part.kind,
        label: part.label,
        chars: part.chars
      }))
    },
    packet:
      input.packet === undefined
        ? null
        : {
            id: input.packet.id,
            coverage: {
              verdict: input.packet.coverage.verdict,
              matchedTerms: input.packet.coverage.matchedTerms,
              missingTerms: input.packet.coverage.missingTerms
            },
            stages: input.packet.retrieval.stages,
            candidates: input.packet.retrieval.candidates,
            selected: input.packet.retrieval.selected,
            contextTokens: input.packet.retrieval.contextTokens,
            // excerpt deliberately absent — see the no-prose rule above
            entries: input.packet.entries.map((entry) => ({
              path: entry.path,
              stage: entry.stage,
              reason: entry.reason,
              tokens: entry.tokens
            })),
            omitted: input.packet.omitted.map((entry) => ({
              path: entry.path,
              reason: entry.reason
            }))
          },
    calls: input.executions.map((execution) => ({
      id: execution.call.id,
      name: execution.call.name,
      arguments: execution.call.arguments,
      ok: execution.result.ok,
      stats: execution.result.stats,
      // `content` is the untrusted prose the model was handed — never here
      ...(execution.result.error ? { error: execution.result.error } : {})
    })),
    read: {
      sources: input.consulted.sources.map((source) => ({
        ...(source.number === undefined ? {} : { number: source.number }),
        url: source.url,
        kind: source.kind,
        title: source.title,
        language: source.language,
        revision: source.revision,
        accessedAt: source.accessedAt,
        license: source.license?.name ?? null
      })),
      media: input.consulted.media.map((item) => ({
        url: item.url,
        title: item.title,
        creator: item.creator,
        license: item.license.name
      })),
      notes: input.consulted.notes.map((note) => ({
        path: note.path,
        stage: note.stage,
        tokens: note.tokens
      })),
      warnings: input.consulted.warnings.map((warning) => ({
        kind: warning.kind,
        message: warning.message
      }))
    },
    usage: input.usage ?? null,
    billing: input.billing ?? null,
    durationMs: input.durationMs ?? null,
    actionTraceIds: [...input.actionTraceIds]
  }
}

const AGENT_TRACE_NOTE_TYPE = 'Atomik Agent Trace'

/** The fence a reader — human or machine — looks for. */
export const AGENT_TRACE_FENCE = '```json'

/**
 * The note. Frontmatter so it is an ordinary vault note (04) that lists,
 * links and syncs like any other; prose so a reader opening it cold knows
 * what they are looking at and what it deliberately omits; ONE fenced JSON
 * block so a machine — or a later inspector — parses it without a parser.
 */
export function serializeAgentTraceNote(record: AgentTraceRecord): string {
  return [
    '---',
    `type: ${AGENT_TRACE_NOTE_TYPE}`,
    `chat: ${record.chat}`,
    `turn: ${record.turn}`,
    `timestamp: ${record.timestamp}`,
    `engine: ${record.engine}`,
    '---',
    '',
    `# Agent trace — [${record.chat}](<${record.chat}>)`,
    '',
    'What the answer in that transcript actually did: the tools the model',
    'chose, the arguments it wrote, what came back, and what it cost. The',
    'fetched text itself is NOT here — consultation stays transient, and',
    '**Save as source** is the gesture that makes material durable.',
    '',
    AGENT_TRACE_FENCE,
    JSON.stringify(record, null, 2),
    '```',
    ''
  ].join('\n')
}

/** Lenient inverse — a hand-edited or truncated note reads as no record. */
export function parseAgentTraceNote(content: string): AgentTraceRecord | null {
  const start = content.indexOf(AGENT_TRACE_FENCE)
  if (start < 0) return null
  const from = start + AGENT_TRACE_FENCE.length
  const end = content.indexOf('```', from)
  if (end < 0) return null
  try {
    const parsed: unknown = JSON.parse(content.slice(from, end))
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      (parsed as { version?: unknown }).version !== 1
    ) {
      return null
    }
    return parsed as AgentTraceRecord
  } catch {
    return null
  }
}
