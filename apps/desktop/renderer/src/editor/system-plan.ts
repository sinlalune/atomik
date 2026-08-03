import {
  BUILTIN_BLOCK_DEFAULTS,
  BUILTIN_BLOCK_IDS,
  DEFAULT_SYSTEM_PLAN,
  type BuiltinBlockId,
  type BuiltinOverrides,
  type DestinationKind,
  type SystemPlanBlockId,
  type WireSystemPlanEntry
} from '../../../shared/prompt-composition'
import { BUILTIN_SUBFOLDER, type PromptFile } from './prompts'

/**
 * UI-side system plan (S07b8): what the "system" section edits. An
 * entry is a built-in block ref or a system-prompt file ref; the wire
 * form resolves prompt refs to their (layer-expanded) bodies at send
 * time — a stale ref simply drops, never wedges a run. Serialized
 * compactly for chat tab params so a conversation KEEPS its arranged
 * system across messages, remounts, and restarts.
 */

export type SystemPlanEntry =
  | { kind: 'builtin'; id: SystemPlanBlockId }
  | { kind: 'prompt'; relPath: string }

export const defaultSystemPlan = (): SystemPlanEntry[] =>
  DEFAULT_SYSTEM_PLAN.map((entry) =>
    'block' in entry
      ? { kind: 'builtin', id: entry.block }
      : { kind: 'prompt', relPath: '' }
  )

export function isDefaultSystemPlan(plan: SystemPlanEntry[]): boolean {
  const fallback = defaultSystemPlan()
  return (
    plan.length === fallback.length &&
    plan.every(
      (entry, index) =>
        entry.kind === 'builtin' &&
        fallback[index]!.kind === 'builtin' &&
        entry.id === (fallback[index] as { id: SystemPlanBlockId }).id
    )
  )
}

/** `b:<id>` / `p:<relPath>` list, JSON-serialized for a tab param. */
export function serializeSystemPlan(plan: SystemPlanEntry[]): string {
  return JSON.stringify(
    plan.map((entry) =>
      entry.kind === 'builtin' ? `b:${entry.id}` : `p:${entry.relPath}`
    )
  )
}

/** Absent/garbage params read as the DEFAULT plan — a conversation
 *  never loses its system to a bad byte. */
export function parseSystemPlan(raw: string | undefined): SystemPlanEntry[] {
  if (raw === undefined || raw.length === 0) return defaultSystemPlan()
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return defaultSystemPlan()
    const plan: SystemPlanEntry[] = []
    for (const item of parsed.slice(0, 16)) {
      if (typeof item !== 'string') return defaultSystemPlan()
      if (item.startsWith('b:')) {
        const id = item.slice(2)
        if (id === 'output' || (BUILTIN_BLOCK_IDS as readonly string[]).includes(id)) {
          plan.push({ kind: 'builtin', id: id as SystemPlanBlockId })
        }
      } else if (item.startsWith('p:') && item.length > 2) {
        plan.push({ kind: 'prompt', relPath: item.slice(2) })
      } else {
        return defaultSystemPlan()
      }
    }
    return plan
  } catch {
    return defaultSystemPlan()
  }
}

/** Wire form: prompt refs resolve to bodies (already layer-expanded by
 *  the prompt loader); refs that no longer resolve drop silently. */
export function wireSystemPlan(
  plan: SystemPlanEntry[],
  prompts: PromptFile[]
): WireSystemPlanEntry[] {
  const byPath = new Map(prompts.map((prompt) => [prompt.relPath, prompt]))
  const wire: WireSystemPlanEntry[] = []
  for (const entry of plan) {
    if (entry.kind === 'builtin') {
      wire.push({ block: entry.id })
    } else {
      const prompt = byPath.get(entry.relPath)
      if (prompt && prompt.body.length > 0) {
        wire.push({ body: prompt.body, label: prompt.title })
      }
    }
  }
  return wire
}

const BLOCK_LABELS: Record<SystemPlanBlockId, string> = {
  identity: 'identity',
  'grounding-rules': 'grounding rules',
  output: 'output brief',
  'output-replace-selection': 'output · replace',
  'output-append': 'output · append',
  'output-new-note': 'output · new note',
  'closing-rule': 'closing rule'
}

export const systemPlanEntryLabel = (
  entry: SystemPlanEntry,
  prompts: PromptFile[]
): string =>
  entry.kind === 'builtin'
    ? BLOCK_LABELS[entry.id]
    : (prompts.find((prompt) => prompt.relPath === entry.relPath)?.title ??
      entry.relPath.split('/').at(-1)?.replace(/\.md$/i, '') ??
      entry.relPath)

const outputIdFor: Record<DestinationKind, BuiltinBlockId> = {
  'replace-selection': 'output-replace-selection',
  append: 'output-append',
  'new-note': 'output-new-note'
}

/** The entry's CURRENT body — override-aware, destination-resolved —
 *  for hover previews and token figures (display = sent). */
export function systemPlanEntryBody(
  entry: SystemPlanEntry,
  destination: DestinationKind,
  builtins: BuiltinOverrides,
  prompts: PromptFile[]
): string {
  if (entry.kind === 'prompt') {
    return prompts.find((prompt) => prompt.relPath === entry.relPath)?.body ?? ''
  }
  const id = entry.id === 'output' ? outputIdFor[destination] : entry.id
  return builtins[id]?.trim() || BUILTIN_BLOCK_DEFAULTS[id]
}

/** The vault file behind an entry, when one exists to edit: a prompt's
 *  own file, or a built-in's materialized override (root scope). */
export function systemPlanEntryFile(
  entry: SystemPlanEntry,
  destination: DestinationKind
): string | null {
  if (entry.kind === 'prompt') return entry.relPath
  const id = entry.id === 'output' ? outputIdFor[destination] : entry.id
  return `prompts/${BUILTIN_SUBFOLDER}/${id}.md`
}

/** In-place move used by the ◂ ▸ reorder affordances. */
export function moveSystemPlanEntry(
  plan: SystemPlanEntry[],
  index: number,
  delta: -1 | 1
): SystemPlanEntry[] {
  const target = index + delta
  if (index < 0 || index >= plan.length || target < 0 || target >= plan.length)
    return plan
  const next = [...plan]
  const [moved] = next.splice(index, 1)
  next.splice(target, 0, moved!)
  return next
}
