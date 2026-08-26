---
type: Atomik Brief
title: Handoff — CP-OPS-002 S07g complete; the Cairn v0.2 specification has landed
timestamp: 2026-08-26T00:00:00Z
atomik:
  path: CP-OPS-002
  branch: path/cp-ops-002
  candidate_step: S08
---

# Resume CP-OPS-002 here

## Repository state

- Worktree `../4tom1k-cp-ops-002`, branch `path/cp-ops-002`, tracking
  `origin/path/cp-ops-002`.
- Registered at `base_commit: 7aa3b1d` by trunk commit `df875e6`.
- **S07f** landed the canonical specification project and candidate-bound
  closure. **S07g** revised that specification to v0.2. Both are completed
  remote checkpoints.
- `ADR-018` and `ADR-019` are both `proposed`. ADR-018 stays proposed because
  v0.2 amends two of its operating rules; ADR-019 records that amendment.

## What S07g landed

The Cairn specification is now v0.2, revised against a nineteen-item external
review supplied by the user. **Specification text only** — no checker rule was
implemented, by explicit instruction, and every added requirement carries a
conformance-matrix row whose reference-tools column says `not implemented`.

- **Checkpoint retention** under `refs/cairn/checkpoints/<path-id>/<n>` before
  any rewriting push, because rebase-before-close orphaned every checkpoint the
  ledger named.
- **Provisional commits** — pushed, marked `Cairn-Provisional:`, never a
  checkpoint or resume point, folded before the candidate exists — replacing the
  rule that kept the most losable state in the protocol unpushed.
- **The handoff-brief contract**: frontmatter fields, seven capped sections, a
  ~1200-token budget, eight answerable-alone questions, and cold resume as the
  pilot's primary metric.
- **Field-level closure**, **scope digests**, **candidate base `T`** with an
  **acceptance-drift** predicate over `writes:` ∪ `governs:`, **structured
  advisory dispositions**, **recorded roles** with a collapsed-actor advisory,
  and **blocking scope drift** unless the declaration moves in the same commit.
- **The lightweight route as the default**, with `route: full` required by five
  named triggers and one-way escalation — the counterweight to nine tightenings.
- **Typed work units**, **repair procedures**, and a **redaction ceremony**.
- **Object-format-agnostic identity**, a **reconciled lifecycle** table and
  diagram, and the **Git glossary split** from Cairn concepts with no article
  added.
- **Foundation and adoption paths** for a repository's own first hour and for
  brownfield entry.

Concept budget held at 66. Suite 118 → 123.

## S08 — extract Cairn from Atomik

`cairn-check.mjs` still hardcodes `atomik-project/`, `apps/`, `AREA_MAP`, and
the grandfather set. S08 delivers:

- `cairn.config.json` — plane roots, source roots, area map, trunk name, and
  `"enforcement": "local" | "ci" | "protected"`, plus the v0.2 fields the
  configuration reference now specifies (`defaultRoute`,
  `checkpointRetentionRef`, `scopeDigestAlgorithm`, `briefBudgetTokens`);
- `cairn-check` printing the declared tier in its header line, so "CI observes"
  versus "CI prevents" is generated rather than written into drifting prose;
- `tools/cairn-new.mjs` — registration commit and worktree in one command;
- `cairn-init` — a tier-0/1 seed: validator, config, docs skeleton, workflow.
  No host configuration, nothing to click.

**The standing constraint from S07g.** Fourteen conformance rows say `not
implemented` on purpose. They move to `implemented` only when a predicate
actually exists, in this path or a successor. Marking a row without landing its
mechanism reproduces the exact failure the v0.2 revision was written to correct.

## Verification contract

`npm run cairn-spec:build` must reproduce the checked-in HTML byte-for-byte, and
`npm run cairn-check:test`, `npm run cairn-check`, `npm run typecheck`,
`npm test`, and `npm run build` must all pass before a step is complete.
`tools/cairn-spec.test.mjs` pins the section headings, the `v0.2` version
string, the concept budget, and the nineteen resolved items.

## Resume instruction

Resolve the path from this worktree, compare this brief with the work ledger and
Git status, and continue from S08. The v0.2 review and its resolution are
recorded in the S07g ledger entry and in ADR-019; do not ask the user to restate
either.
