---
type: Atomik Coding Path
title: Cairn 2.0 — close the enforcement gaps, drain the legacy state, and extract the protocol from Atomik
description: Second operations path. Repairs the three checks that certify false statements, drains the state that predates each rule, then extracts Cairn into a portable specification and init kit.
tags: [cairn, ops, protocol, ci, enforcement, portability]
timestamp: 2026-08-24T00:00:00Z
atomik:
  id: CP-OPS-002
  status: running
  base_commit: 7aa3b1d
  branch: path/cp-ops-002
  writes:                    # ADVISORY — a signal, never a lock
    - tools/cairn-check.mjs
    - tools/cairn-check.test.mjs
    - tools/cairn-active.mjs
    - tools/cairn-audit.mjs
    - tools/cairn-rules.mjs
    - tools/cairn-rules.test.mjs
    - tools/cairn-new.mjs
    - cairn.config.json
    - .github/workflows/cairn.yml
    - docs/cairn/**
    - docs/adr/ADR-016-cairn-enforcement-integrity.md
    - docs/adr/ADR-017-path-lifecycle.md
    - docs/bedrock/24_24-doc-templates.md
    - docs/bedrock/index.md
    - docs/modules/index.md
    - docs/adr/index.md
    - atomik-project/coding-paths/paths.md
    - atomik-project/coding-paths/CP-OPS-002.md
    - atomik-project/coding-paths/index.md
    - atomik-project/sessions/**
    - atomik-project/audits/index.md
    - atomik-project/log/**
---

# CP-OPS-002 — Cairn 2.0

> **ACTIVATED 2026-08-24** after the owner ruled all eight decisions in the opening check
> ([session note](../sessions/2026-08-24-cp-ops-002-opening-check.md), agenda in
> [`docs/cairn/cairn-opening-check-agenda.md`](../../docs/cairn/cairn-opening-check-agenda.md)).
> Registered at `base_commit: 7aa3b1d` before its worktree branched.

## Why this path exists

The audit record — `docs/cairn/cairn-audit-2026-08-24.md` — found one failure mode
wearing six faces: **Cairn writes rules forward and never drains the state that predates
them.** Three checks currently report `OK` over conditions that are false on this trunk.

Ordering follows severity, not narrative. Enforcement integrity came first, because every
later step lands through the gates that were not gating — S01 and S02 are already done for
that reason. What remains is portability and hygiene.

## Steps

#### Landed in S00 — Restore the rebase gate in CI

Repaired directly at the owner's instruction before this path was opened. `resolveBranch()`
asks the host before the checkout; a new `branch-identity` rule fails closed when the
branch is undeterminable and guarded roots changed; `cairn.yml` checks out the pull
request HEAD sha so the gate judges the commit that lands rather than a merge preview
that contains the base by construction. Four regression tests.

#### Landed in S00 — Make the closing ceremony identifiable

Repaired with S01. Ceremonies are declared in frontmatter (`path:` + `ceremony: closing`)
and matched on exact path id; sixteen closure notes backfilled; three regression tests.
No grandfather set was added.

#### Landed in S00 — CI runs on path branches *(F8)*

Found after S01/S02: CI triggered on `push: master` and `pull_request` only, and every
path in this repository merges with a LOCAL merge commit — zero pull requests in history.
So no path-scoped rule had ever executed in CI. `push` now includes `'path/**'`, with a
`concurrency` group so a push-per-commit does not multiply runs.

#### Landed in S00 — `writes:` parsed from the frontmatter *(F9)*

The scan read the whole document, consumed `---` as a write surface, and refused the
trailing comment that the bedrock 24 template itself shows — so a path copied faithfully
from the template declared nothing and silently disabled `scope-drift`.

> **Status correction (third-party coherence audit, 2026-08-24).** An earlier version of
> this file marked S01/S02/S02b/S02c **DONE** and said they "landed on the trunk". Git
> disproves it: `HEAD` and `origin/master` are both `7aa3b1d` and every one of those
> changes is an uncommitted working-tree modification.
>
> Under Cairn's own completion definition — *"a step is not complete until its commit is
> online"* — the honest status is **implemented locally, uncommitted, not complete,
> awaiting adoption by the accepted path.**
>
> This is the most consequential incoherence the audit found, and it was in the execution
> plane rather than the documents: a path file claiming landed work that does not exist is
> exactly the failure the protocol is built to prevent, written by the audit that named it.
> The opening ceremony ratifies the set and the worktree adopts it; nothing is complete
> until then.

### S00 — Adopt the local repairs *(ruling 1)* — **COMPLETE**

The stash carried F1/F2/F8/F9 into this worktree and they land here, run through the
protocol they repair rather than around it. This is the first commit on a `path/*` branch
in this repository whose push will be seen by CI.

Contents: `resolveBranch()` + the fail-closed `branch-identity` rule (F1), frontmatter-based
`ceremonyFromSessions()` + 16 backfilled closure notes (F2), `push: path/**` with a
concurrency group and the PR-head checkout (F1/F8), frontmatter-scoped `parseWrites()` (F9),
the rule-table generator and its four guards, the audit record carrying F1–F15, the round-3
deliverables, and `index.html` restored behind a SUPERSEDED banner with `workflow.html`
byte-identical to master (ruling 4).

### S01 — Schema and doctrine fixes *(rulings 2 and 3)*

- pin the **root-level** session ceremony schema (`path:` / `ceremony:`) in
  `docs/bedrock/24_24-doc-templates.md`, and correct the D1 operator guide, which
  prescribes a nested form the live parser rejects *(F13)*;
- amend `atomik-project/coding-paths/paths.md` so a registration commit is
  **metadata-only** rather than "exactly two files", resolving the reported doctrine
  conflict with bedrock 24 *(F15)*.

### S03 — ~~Drain the grandfather set~~ — **owner-ruled, withdrawn**

Owner ruling (2026-08-24): CP-OPS-001 resolves this in the normal course. The set is
finite and drains when CP-MVP-011 and CP-MVP-012 land. Remaining residue, folded into
S07: state the migration window as a property in the specification, and delete
`LEGACY_UNREGISTERED_PATHS` when it empties so the exception does not outlive the
migration by inattention.

### S04 — Bound the ledger *(F4, medium — advisory)*

`log.md` was frozen so parallel paths stop colliding on one file, not for context cost —
that succeeded. Separately, the live path corpus (~85 k tokens) now has no upper bound and
a single path file exceeds 23 k. Not a defect; a boundary worth setting before it is hit.

- A path file keeps declaration, current ledger, next action. Completed steps roll to
  `atomik-project/coding-paths/history/<id>-S0N.md`, linked.
- Migrate `CP-MVP-008` (23.5 k tokens) first as the proof.
- Advisory `ledger-size` rule so the next one is noticed early.

### S05 — Backfill OKF *(closes F5, medium)*

- `index.md` for `docs/bedrock/`, `docs/adr/`, `docs/modules/`, `atomik-project/sessions/`,
  `atomik-project/audits/` — bedrock 26 routes agents through the nearest index and the
  three most-read directories have none.
- Frontmatter for all 15 ADRs.
- Extend schema validation beyond `coding-paths/`.

### S06 — Retire the drifted page *(closes F6, medium)*

- `docs/cairn/index.html` teaches the integrator model at ten sites. Rewrite against
  ADR-012, or replace it with a generated view of the specification.
- Give both HTML pages a dated status banner naming the ADR they render. The page drifted
  silently because nothing on it claimed a vintage.

### S06b — Close the F8 residual — **branch protection** *(ruling 6)*

The owner will configure GitHub branch protection on `master` requiring `cairn-check` and
`gates`; the agent cannot set it from the repository. Until it is on, the specification
states that CI **observes** rather than prevents. This step records the configuration and
updates the specification once it is live.

### S06c — Bind the coherence audit to the HEAD it reviewed *(ruling 7, F12)*

`cairn-audit` names a record for the current HEAD; committing it moves HEAD, so `--check`
can never match. All nine existing audits name a different commit from the one containing
them — seven exactly the parent.

- `--check` accepts a record naming HEAD **or any ancestor within this path's own commits**.
- Formalises what the nine files already do accidentally: no renaming, no migration, and
  every existing audit becomes retroactively valid.
- Regression test: a committed audit naming the parent commit satisfies `--check`.

### S06d — Drain the leftovers *(ruling 8)*

- **F7** — remove six secondary worktrees for already-merged paths, following the verified
  sequence in `paths.md`; delete the orphan `registration/cp-worktree-cleanup` branch.
- **F10** — `isFilled()` requires more than the placeholder's absence: a verdict and at
  least one non-empty findings section.

### S07a — ADR-017, the path lifecycle *(ruling 5, F11 + F15)*

Round 3's D2 declared `done` terminal and drew `running → archived`, contradicting bedrock
35 (*"a finished path moves to `done`, then `archived` — demotion, never deletion"*) and
ADR-012 (abandoned paths have no terminal transition). The validator checks current
statuses, never transitions.

- `ADR-017` settles `done → archived`, gives abandoned paths a terminal transition, and
  retires `active` from the vocabulary.
- D2 §2.2 is marked **proposed** until the ADR lands, then documents its outcome.

### S07 — Specification and lexicon

- `docs/cairn/specification.md`: planes (three conceptual, two repository — the audit
  found these routinely conflated), lifecycle, status vocabulary, the full rule table
  generated from `cairn-check.mjs` so the count cannot go stale again, and the
  blocking-rule admission test.
- `docs/cairn/lexicon.md`: one definition per term, each pointing at the file that
  enforces it. A term with no enforcing file is marked aspirational.
- Resolve `active` as dead status vocabulary (F11) with an ADR beside it — accepted by
  `schema`, rejected by `branch-path`, reserved for a path that is now closed.
- State the F8 workflow decision and the CP-MVP-011/012 migration window as *properties*,
  not omissions.
- Step-by-step operator guide for someone who does not already know the protocol.

### S08 — Extract Cairn from Atomik

Cairn is not portable today: `cairn-check.mjs` hardcodes `atomik-project/`, `apps/`,
`AREA_MAP`, and the grandfather set.

- `cairn.config.json` — plane roots, source roots, area map, trunk name.
- `tools/cairn-new.mjs` — registration commit and worktree in one command, so the
  registration precondition stops depending on memory.
- `cairn-init` seed template + the ex-nihilo bootstrap prompt.

### S09 — Greenfield pilot, coherence audit, closing ceremony, self-merge

Initialize one real ex-nihilo repository from the kit — the research-paper workspace the
brief names — and fix what the pilot finds before merging.

## Documentation coverage

**Required:** `paths.md`, bedrock 22/24/26/35, ADR-009, ADR-012,
`docs/cairn/cairn-audit-2026-08-24.md`.
**Conditional:** bedrock 17 (self-evolving docs) at S07; ADR-011 at S05.
**Deliberately excluded:** all `apps/` module notes — this path writes no product code.

## Work Ledger

| Field | Value |
| :-- | :-- |
| Status | draft — awaiting owner opening check |
| Base commit | not yet registered |
| Branch | not yet created |
| Steps complete | **S00** — the four repairs adopted into the path and pushed |
| Remaining | S04, S05, S06, S06b, S07, S08, S09 (S03 withdrawn by owner ruling) |
| Gates | `cairn-check` OK; validator suite 47/47 |
| Base commit | not yet registered; trunk is `7aa3b1d`, unchanged |
| Opening check | accepted 2026-08-24, eight rulings ([note](../sessions/2026-08-24-cp-ops-002-opening-check.md)) |
| Next action | S01 — pin the root-level ceremony schema in bedrock 24, correct the D1 operator guide, amend `paths.md` to metadata-only registration, with ADR-016 beside them |
| Worktree | `../4tom1k-cp-ops-002`, `node_modules` symlinked |
| Gates at S00 | `cairn-check` OK (2 advisory: no upstream yet, no audit yet) · 47/47 tests |
