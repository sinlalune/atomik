---
type: Atomik Brief
title: Handoff — CP-OPS-002 S07i complete; the P0 and P1 v0.2 predicates are enforced
timestamp: 2026-08-26T00:00:00Z
atomik:
  path: CP-OPS-002
  branch: path/cp-ops-002
  candidate_step: S07j
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

## What S07h landed — the first v0.2 predicates

S07g corrected the specification and implemented nothing, by instruction. S07h
begins closing that gap in the order the review ranked it: the two P0 items
first, because those are where the protocol was breaking its own promises.

- The frontmatter reader now parses flow lists, block lists, and lists of maps —
  a named limited grammar, zero dependencies, so the `cairn-init` kit stays
  installable in a repository with no network.
- The ledger gained a `cairn-unit` block declaring step, **ledger ordinal**,
  type, and verification. The ordinal rather than an object id, because a block
  cannot truthfully name the commit that does not exist yet;
  `refs/cairn/checkpoints/<path-id>/<unit>` supplies the hash afterwards.
- `work-unit` (blocking) — a changed path record must carry a block with a valid
  type.
- `checkpoint-retention` (blocking + advisory) — every declared unit except the
  newest must resolve a local retention ref; unreadable refs are inconclusive
  and non-zero.
- `provisional` (blocking + advisory) — a ready path whose candidate range still
  contains a `Cairn-Provisional:` commit is blocked.

This repository migrated onto its own rules: units 01 and 02 are retained at
`e787174` and `d1f3830`, and unit 03 is this step. Checker suite 76 → 91, full
suite 123 → 138.

## What S07i landed — the record predicates

- `scope-digest` (blocking) — the resolved section is digested and compared at
  closure. Unreadable is inconclusive; naming no section is a failure.
- `closure-surface` (blocking) — closure may move `status`, `subject_commit`,
  `current_step`, `resolution`, and nothing else.
- `acceptance-drift` (blocking) — trunk delta since the accepted base against
  `writes:` ∪ `governs:`. A test pins the rejected alternative: a 200-file trunk
  delta touching nothing declared raises no finding.
- `advisory-disposition` (blocking) — set equality with the advisories raised.
  Stated limit: the comparison evaluates the closure commit, not the candidate.
- `role-collapse` (advisory) — one actor on both acceptances is visible, not
  forbidden.
- `scope-drift` promoted to blocking unless `writes:` moved in the same change.
- `migration-debt` (blocking) — `V02_MIGRATION_PATHS` holds `CP-OPS-002`, whose
  opening record is immutable and can never gain a digest. A listed path that
  archives or disappears produces a blocking finding telling the next writer to
  delete the entry, so the exception cannot outlive its migration.
- `work-unit` was tightened in the same step: the block must be for the step the
  record declares as `current_step`. The gate caught its own missing entry.

This path migrated onto the rules: `governs:` declares eight documents pinned at
exact blob ids. Checker suite 91 → 110, full suite 138 → 157.

## S07j — routes, brief schema, redaction

- `route` — vocabulary, the five full-route triggers, one-way escalation.
- `foundation` — write surface confined to `docs/**` plus draft path records.
- `brief-schema` — the frontmatter fields and seven capped sections.
- `redaction` — every `[redacted: <id>]` marker resolves to a redaction record.

Three rows stay unimplemented after all of it, and should: repair procedures
(no predicate exists), the answerable-alone contract (a judgement and a
benchmark), and the temporal half of retention (unobservable to a validator
that sees one commit).

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

**The standing constraint.** A conformance row moves off `not implemented` only
when a predicate actually exists, and moves to *partially* implemented when only
part of one does. Marking a row without landing its mechanism reproduces the
exact failure the v0.2 revision was written to correct.

## Verification contract

`npm run cairn-spec:build` must reproduce the checked-in HTML byte-for-byte, and
`npm run cairn-check:test`, `npm run cairn-check`, `npm run typecheck`,
`npm test`, and `npm run build` must all pass before a step is complete.
`tools/cairn-spec.test.mjs` pins the section headings, the `v0.2` version
string, the concept budget, and the nineteen resolved items.

## Resume instruction

Resolve the path from this worktree, compare this brief with the work ledger and
Git status, and continue from S07j. The v0.2 review and its resolution are
recorded in the S07g ledger entry and in ADR-019; do not ask the user to restate
either.
