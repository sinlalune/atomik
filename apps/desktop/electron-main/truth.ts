import { createHash } from 'node:crypto'
import { randomUUID } from 'node:crypto'
import type {
  AiSelection,
  ClaimRecord,
  EvidenceRecord,
  TruthLabel
} from '../shared/ipc-contract'

/**
 * Mechanical truth labeling (06 §Mechanical labeling rule) — the
 * incubating truth-core validator (14: "truth validators do not call AI").
 *
 * The provider proposes CLAIM CANDIDATES that can assert only a FORM
 * (interpretive / needs-citation) — the type carries no label field, so a
 * provider cannot grade its own groundedness even by accident.
 * `source-backed` exists solely as the OUTPUT of the deterministic check
 * below: exact containment of the claim text in a supplied selection,
 * hashed for reproducibility. Everything else defaults to model-only.
 * A model grading itself is confidence theater; this module is the
 * alternative (05/06).
 */

export type ClaimCandidate = {
  blockId: string
  text: string
  /** Provider-assertable FORM only. Anything else is ignored. */
  assertedForm?: 'interpretive' | 'needs-citation'
}

const sha256 = (text: string): string =>
  createHash('sha256').update(text, 'utf8').digest('hex')

/**
 * Labels candidates against the operation's selections. Deterministic:
 * identical inputs yield identical labels/evidence (ids aside).
 */
export function labelClaims(
  selections: AiSelection[],
  candidates: ClaimCandidate[]
): { claims: ClaimRecord[]; evidence: EvidenceRecord[] } {
  const claims: ClaimRecord[] = []
  const evidence: EvidenceRecord[] = []

  for (const candidate of candidates) {
    const text = candidate.text.trim()
    const supporting = selections.find((selection) =>
      selection.content.includes(text)
    )

    let label: TruthLabel
    const evidenceIds: string[] = []

    if (supporting && text.length > 0) {
      // Derivable from the supplied selection: the ONLY road to
      // source-backed. It also outranks any asserted form — an exact
      // quote is evidence regardless of what the provider calls it.
      label = 'source-backed'
      const record: EvidenceRecord = {
        id: `ev_${randomUUID()}`,
        source: {
          relPath: supporting.relPath,
          range: supporting.range
        },
        quote: text,
        quoteSha256: sha256(text)
      }
      evidence.push(record)
      evidenceIds.push(record.id)
    } else if (candidate.assertedForm === 'interpretive') {
      label = 'interpretive'
    } else if (candidate.assertedForm === 'needs-citation') {
      label = 'needs-citation'
    } else {
      // Default for every unproven factual statement — including any
      // smuggled assertedForm value the type system didn't anticipate.
      label = 'model-only'
    }

    claims.push({
      id: `claim_${randomUUID()}`,
      blockId: candidate.blockId,
      text,
      label,
      evidenceIds
    })
  }

  return { claims, evidence }
}
