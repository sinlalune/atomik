import { chatTracePath } from '../editor/chat-file'
import {
  agentTraceRecordOf,
  serializeAgentTraceNote
} from '../../../shared/agent-trace'
import type { ConsultedMaterial } from '../../../shared/chat-citations'
import type { ContextPacket } from '../../../shared/context-packet'
import type {
  GenerationToolExecution,
  ResolvedGenerationToolPreference
} from '../../../shared/generation-tools'

/**
 * Writing the agent trace (CP-MVP-011 S07g) — the IO half of
 * `shared/agent-trace.ts`, kept out of ChatView so the rules below are
 * testable without a component.
 *
 * It writes through `createNote`, the same exclusive vault verb the
 * transcript itself is born with: parents are made by the verb, a taken name
 * is an error rather than a clobber, and the trace is an ordinary note the
 * owner can read, move, link or delete. No new door, no hidden store.
 */

const EMPTY_CONSULTED: ConsultedMaterial = {
  sources: [],
  media: [],
  notes: [],
  warnings: []
}

/** Same suffix ladder as `chatRelPath`: an exclusive create retries. */
const MAX_ATTEMPTS = 9

export type AgentTracePersistInput = {
  /** Null until the transcript exists — nothing to sit beside yet. */
  chat: string | null
  turn: number
  engine: string
  operationId: string
  bundleId: string
  grounding: { sensitivity: string } | null
  tools: ResolvedGenerationToolPreference | null
  threadTurns: number
  sent: readonly { kind: string; label: string; chars: number }[]
  packet?: ContextPacket
  executions: readonly GenerationToolExecution[]
  consulted?: ConsultedMaterial
  usage?: { inputTokens: number; outputTokens: number; basis: string }
  billing?: { currency: string; estimatedAmount: number; basis: string }
  durationMs?: number
  actionTraceIds: readonly string[]
  now?: () => Date
}

/**
 * Returns the trace's vault path, or null when there is nothing to audit.
 *
 * WHEN: EVERY answered turn, from S07h. The first rule was "only exchanges
 * with tool activity", and the owner's own bench refuted it in one file: turn
 * 1 answered *"Je ne trouve aucune information…"* with no tools and therefore
 * no trace — the exchange most worth auditing was the one with no record. An
 * audit trail with holes reads as a bug, and a no-tool turn still carries its
 * packet, its cost and the preference it ran under.
 *
 * FAILURE: a trace that cannot be written returns null instead of throwing.
 * The answer is the user's work and must land; the audit is not worth losing
 * it. The failure is not silent in the UI — the turn simply carries no trace
 * link while its consulted block still shows what was read, which is exactly
 * the shape of "the audit is missing".
 */
export async function persistAgentTrace(
  input: AgentTracePersistInput,
  /** The vault verb, INJECTED: this module stays free of `window`, so the
   *  rules above are unit-tested rather than asserted against source text. */
  createNote: (relPath: string, content: string) => Promise<unknown>
): Promise<string | null> {
  if (input.chat === null) return null
  const record = agentTraceRecordOf({
    chat: input.chat,
    turn: input.turn,
    timestamp: (input.now?.() ?? new Date()).toISOString(),
    engine: input.engine,
    operationId: input.operationId,
    bundleId: input.bundleId,
    grounding: input.grounding,
    tools: input.tools,
    threadTurns: input.threadTurns,
    sent: input.sent,
    ...(input.packet ? { packet: input.packet } : {}),
    executions: input.executions,
    consulted: input.consulted ?? EMPTY_CONSULTED,
    ...(input.usage ? { usage: input.usage } : {}),
    ...(input.billing ? { billing: input.billing } : {}),
    ...(input.durationMs !== undefined ? { durationMs: input.durationMs } : {}),
    actionTraceIds: input.actionTraceIds
  })
  const content = serializeAgentTraceNote(record)
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const relPath = chatTracePath(input.chat, input.turn, attempt)
    try {
      await createNote(relPath, content)
      return relPath
    } catch {
      /* taken name — try the next suffix, as the transcript's birth does */
    }
  }
  return null
}
